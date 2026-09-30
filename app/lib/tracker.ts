/**
 * TrackIt core: pure logic for tracking anime, manga, movies, books, games
 * and podcasts. No NativeScript imports, so it runs under Vitest in Node.
 */

export const CATEGORIES = [
  { id: 'anime', label: 'Anime', unit: 'episodes' },
  { id: 'manga', label: 'Manga', unit: 'chapters' },
  { id: 'movie', label: 'Movies', unit: 'parts' },
  { id: 'book', label: 'Books', unit: 'pages' },
  { id: 'game', label: 'Games', unit: 'hours' },
  { id: 'podcast', label: 'Podcasts', unit: 'episodes' },
] as const;
export type Category = (typeof CATEGORIES)[number]['id'];

export const STATUSES = [
  { id: 'in-progress', label: 'In progress' },
  { id: 'planned', label: 'Planned' },
  { id: 'completed', label: 'Completed' },
  { id: 'dropped', label: 'Dropped' },
] as const;
export type Status = (typeof STATUSES)[number]['id'];

export interface Item {
  id: string;
  title: string;
  category: Category;
  status: Status;
  progress: number;
  /** 0 = unknown length. */
  total: number;
  /** 0 = unrated, otherwise 1-5. */
  rating: number;
  updatedAt: number;
}

const CATEGORY_IDS = CATEGORIES.map((c) => c.id) as string[];
const STATUS_IDS = STATUSES.map((s) => s.id) as string[];

export function unitFor(category: Category): string {
  return CATEGORIES.find((c) => c.id === category)?.unit ?? 'items';
}

export function newId(now = Date.now(), random = Math.random): string {
  return `${now.toString(36)}${random().toString(36).slice(2, 7)}`;
}

/** Zero-width characters and BOM, which `trim()` keeps but nobody can see. */
const INVISIBLE = /[\u200B-\u200D\u2060\uFEFF]/g;

/**
 * Whole-number percentage that only reads 100% when the part really equals
 * the whole (199/200 is 99%, not a rounded-up 100%).
 */
export function percent(part: number, whole: number): number {
  if (whole <= 0) return 0;
  if (part >= whole) return 100;
  return Math.min(99, Math.round((part / whole) * 100));
}

export type NewItemInput = { title: string; category: string; total?: string };

/** Validate and build a new item; returns an error message instead when invalid. */
export function createItem(input: NewItemInput, now = Date.now(), id = newId(now)): Item | string {
  const title = input.title.trim();
  if (!title.replace(INVISIBLE, '').trim()) return 'Title is required.';
  // Code points, so a title with emoji is measured the way the user sees it.
  if ([...title].length > 120) return 'Title is too long (max 120 characters).';
  if (!CATEGORY_IDS.includes(input.category)) return 'Pick a category.';
  const totalText = (input.total ?? '').trim();
  if (totalText && !/^\d{1,5}$/.test(totalText)) return 'Length must be a whole number (or blank if unknown).';
  return {
    id,
    title,
    category: input.category as Category,
    status: 'planned',
    progress: 0,
    total: totalText ? Number(totalText) : 0,
    rating: 0,
    updatedAt: now,
  };
}

/**
 * Change progress by `delta`, clamped to [0, total] (no upper bound when the
 * total is unknown). Starting a planned item marks it in progress; reaching
 * the total completes it; going back from completed resumes it.
 */
export function bumpProgress(item: Item, delta: number, now = Date.now()): Item {
  const upper = item.total > 0 ? item.total : Number.MAX_SAFE_INTEGER;
  const progress = Math.max(0, Math.min(upper, item.progress + delta));
  let status: Status = item.status;
  if (item.total > 0 && progress >= item.total) status = 'completed';
  else if (progress > 0 && (status === 'planned' || status === 'completed' || status === 'dropped')) status = 'in-progress';
  return { ...item, progress, status, updatedAt: now };
}

export function setStatus(item: Item, status: Status, now = Date.now()): Item {
  const progress = status === 'completed' && item.total > 0 ? item.total : status === 'planned' ? 0 : item.progress;
  return { ...item, status, progress, updatedAt: now };
}

export function setRating(item: Item, rating: number, now = Date.now()): Item {
  const r = Math.round(rating);
  return { ...item, rating: r >= 1 && r <= 5 ? r : 0, updatedAt: now };
}

/** "12 / 24 episodes (50%)", "7 chapters" when the length is unknown. */
export function progressLabel(item: Item): string {
  const unit = unitFor(item.category);
  if (item.total > 0) {
    const pct = percent(item.progress, item.total);
    return `${item.progress} / ${item.total} ${unit} (${pct}%)`;
  }
  return `${item.progress} ${unit}`;
}

export type Filter = { status?: Status | 'all'; category?: Category | 'all'; query?: string };

const STATUS_ORDER: Record<Status, number> = { 'in-progress': 0, planned: 1, completed: 2, dropped: 3 };

/** Filter, then show in-progress first and most recently touched first. */
export function visibleItems(items: Item[], filter: Filter = {}): Item[] {
  const q = (filter.query ?? '').trim().toLowerCase();
  return items
    .filter((i) => !filter.status || filter.status === 'all' || i.status === filter.status)
    .filter((i) => !filter.category || filter.category === 'all' || i.category === filter.category)
    .filter((i) => !q || i.title.toLowerCase().includes(q))
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || b.updatedAt - a.updatedAt);
}

export type Stats = {
  total: number;
  byStatus: Record<Status, number>;
  byCategory: { id: Category; label: string; count: number }[];
  averageRating: number | null;
  completionRate: number | null;
};

export function stats(items: Item[]): Stats {
  const byStatus = { 'in-progress': 0, planned: 0, completed: 0, dropped: 0 } as Record<Status, number>;
  for (const i of items) byStatus[i.status] += 1;
  const rated = items.filter((i) => i.rating > 0);
  const finished = byStatus.completed + byStatus.dropped;
  return {
    total: items.length,
    byStatus,
    byCategory: CATEGORIES.map((c) => ({ id: c.id, label: c.label, count: items.filter((i) => i.category === c.id).length })),
    averageRating: rated.length ? Math.round((rated.reduce((s, i) => s + i.rating, 0) / rated.length) * 10) / 10 : null,
    completionRate: finished ? percent(byStatus.completed, finished) : null,
  };
}

function isItem(v: unknown): v is Item {
  const o = v as Partial<Item> | null;
  return (
    !!o &&
    typeof o.id === 'string' &&
    typeof o.title === 'string' &&
    CATEGORY_IDS.includes(o.category as string) &&
    STATUS_IDS.includes(o.status as string) &&
    [o.progress, o.total, o.rating, o.updatedAt].every((n) => typeof n === 'number' && Number.isFinite(n)) &&
    (o.progress as number) >= 0 &&
    (o.total as number) >= 0 &&
    Number.isInteger(o.rating) &&
    (o.rating as number) >= 0 &&
    (o.rating as number) <= 5
  );
}

/** Corrupt or foreign stored data yields [] instead of crashing the app. */
export function parseItems(json: string | undefined | null): Item[] {
  if (!json) return [];
  try {
    const data: unknown = JSON.parse(json);
    return Array.isArray(data) ? data.filter(isItem) : [];
  } catch {
    return [];
  }
}

/** Segmented-bar options: index 0 is "All", then STATUSES / CATEGORIES in order. */
export const STATUS_FILTER_LABELS = ['All', 'Doing', 'Planned', 'Done', 'Dropped'] as const;
export const CATEGORY_FILTER_LABELS = ['All', ...CATEGORIES.map((c) => c.label)];

/** Maps the Library tab's segmented-bar indexes (+ search text) to a Filter; out-of-range means "all". */
export function filterFromIndexes(statusIndex: number, categoryIndex: number, query = ''): Filter {
  return {
    status: statusIndex > 0 ? (STATUSES[statusIndex - 1]?.id ?? 'all') : 'all',
    category: categoryIndex > 0 ? (CATEGORIES[categoryIndex - 1]?.id ?? 'all') : 'all',
    query,
  };
}
