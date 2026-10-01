import { describe, expect, it } from 'vitest';
import {
  bumpProgress,
  createItem,
  parseItems,
  percent,
  progressLabel,
  setRating,
  setStatus,
  stats,
  visibleItems,
  type Item,
} from '../app/lib/tracker';

const item = (over: Partial<Item> = {}): Item => ({
  id: 'i',
  title: 'Frieren',
  category: 'anime',
  status: 'planned',
  progress: 0,
  total: 28,
  rating: 0,
  updatedAt: 0,
  ...over,
});

describe('createItem', () => {
  it('builds a planned item', () => {
    expect(createItem({ title: ' Dune ', category: 'book', total: '412' }, 5, 'x')).toEqual({
      id: 'x', title: 'Dune', category: 'book', status: 'planned', progress: 0, total: 412, rating: 0, updatedAt: 5,
    });
    expect((createItem({ title: 'Podcast', category: 'podcast' }) as Item).total).toBe(0);
  });
  it('rejects bad input', () => {
    expect(createItem({ title: ' ', category: 'book' })).toMatch(/Title/);
    expect(createItem({ title: 'X', category: 'tv' })).toMatch(/category/);
    expect(createItem({ title: 'X', category: 'book', total: '-3' })).toMatch(/whole number/);
  });
});

describe('progress', () => {
  it('starts, clamps and completes', () => {
    expect(bumpProgress(item(), 1, 9)).toMatchObject({ progress: 1, status: 'in-progress', updatedAt: 9 });
    expect(bumpProgress(item({ progress: 27, status: 'in-progress' }), 5)).toMatchObject({ progress: 28, status: 'completed' });
    expect(bumpProgress(item({ progress: 2 }), -10).progress).toBe(0);
  });
  it('resumes a completed item when going back', () => {
    expect(bumpProgress(item({ progress: 28, status: 'completed' }), -1).status).toBe('in-progress');
  });
  it('has no upper bound for unknown lengths', () => {
    expect(bumpProgress(item({ total: 0, progress: 500 }), 1)).toMatchObject({ progress: 501, status: 'in-progress' });
  });
  it('labels progress with units', () => {
    expect(progressLabel(item({ progress: 14 }))).toBe('14 / 28 episodes (50%)');
    expect(progressLabel(item({ category: 'manga', total: 0, progress: 7 }))).toBe('7 chapters');
  });
});

describe('status and rating', () => {
  it('completing fills progress; planning resets it', () => {
    expect(setStatus(item({ progress: 3 }), 'completed').progress).toBe(28);
    expect(setStatus(item({ progress: 3 }), 'planned').progress).toBe(0);
    expect(setStatus(item({ progress: 3 }), 'dropped').progress).toBe(3);
  });
  it('clamps ratings', () => {
    expect(setRating(item(), 4.4).rating).toBe(4);
    expect(setRating(item(), 9).rating).toBe(0);
  });
});

describe('visibleItems and stats', () => {
  const list = [
    item({ id: 'a', title: 'One Piece', category: 'manga', status: 'in-progress', updatedAt: 1 }),
    item({ id: 'b', title: 'Dune', category: 'book', status: 'completed', rating: 5, updatedAt: 3 }),
    item({ id: 'c', title: 'Elden Ring', category: 'game', status: 'dropped', rating: 2, updatedAt: 2 }),
    item({ id: 'd', title: 'Dune Part Two', category: 'movie', status: 'in-progress', updatedAt: 4 }),
  ];
  it('orders in-progress first then most recent', () => {
    expect(visibleItems(list).map((i) => i.id)).toEqual(['d', 'a', 'b', 'c']);
  });
  it('filters by status, category and query', () => {
    expect(visibleItems(list, { query: 'dune' }).map((i) => i.id)).toEqual(['d', 'b']);
    expect(visibleItems(list, { status: 'completed' }).map((i) => i.id)).toEqual(['b']);
    expect(visibleItems(list, { category: 'manga', status: 'all' }).map((i) => i.id)).toEqual(['a']);
  });
  it('summarises the library', () => {
    const s = stats(list);
    expect(s.total).toBe(4);
    expect(s.byStatus).toEqual({ 'in-progress': 2, planned: 0, completed: 1, dropped: 1 });
    expect(s.byCategory.find((c) => c.id === 'book')?.count).toBe(1);
    expect(s.averageRating).toBe(3.5);
    expect(s.completionRate).toBe(50);
    expect(stats([])).toMatchObject({ averageRating: null, completionRate: null });
  });
});

describe('parseItems', () => {
  it('tolerates corrupt data and drops malformed entries', () => {
    expect(parseItems(undefined)).toEqual([]);
    expect(parseItems('{oops')).toEqual([]);
    const good = item();
    expect(parseItems(JSON.stringify([good, { ...good, category: 'tv' }, { id: 1 }]))).toEqual([good]);
  });
});

describe('pass 3 edge cases', () => {
  const base: Item = {
    id: 'a', title: 'Show', category: 'anime', status: 'in-progress', progress: 0, total: 0, rating: 0, updatedAt: 0,
  };
  it('never shows 100% before the last episode', () => {
    expect(percent(199, 200)).toBe(99);
    expect(percent(200, 200)).toBe(100);
    expect(percent(1, 300)).toBe(0);
    expect(progressLabel({ ...base, progress: 199, total: 200 })).toBe('199 / 200 episodes (99%)');
  });
  it('does not report 100% finished when something was dropped', () => {
    const items: Item[] = Array.from({ length: 200 }, (_, n) => ({ ...base, id: String(n), status: 'completed' }));
    items[0] = { ...items[0], status: 'dropped' };
    expect(stats(items).completionRate).toBe(99);
  });
  it('rejects invisible-only titles and counts emoji titles by character', () => {
    expect(createItem({ title: '\u200B\u2060', category: 'anime' }, 1, 'x')).toBe('Title is required.');
    expect(typeof createItem({ title: '🎬'.repeat(100), category: 'movie' }, 1, 'x')).toBe('object');
  });
  it('drops stored items with negative counts or out-of-range ratings', () => {
    const json = JSON.stringify([base, { ...base, id: 'b', progress: -3 }, { ...base, id: 'c', rating: 9 }, { ...base, id: 'd', rating: 2.5 }]);
    expect(parseItems(json).map((i) => i.id)).toEqual(['a']);
  });
});
