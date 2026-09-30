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

export type NewItemInput = { title: string; category: string; total?: string };

/** Validate and build a new item; returns an error message instead when invalid. */
export function createItem(input: NewItemInput, now = Date.now(), id = newId(now)): Item | string {
  const title = input.title.trim();
  if (!title) return 'Title is required.';
  if (title.length > 120) return 'Title is too long (max 120 characters).';
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
    const pct = Math.round((Math.min(item.progress, item.total) / item.total) * 100);
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
    completionRate: finished ? Math.round((byStatus.completed / finished) * 100) : null,
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
    [o.progress, o.total, o.rating, o.updatedAt].every((n) => typeof n === 'number' && Number.isFinite(n))
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
