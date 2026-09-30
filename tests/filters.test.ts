import { describe, expect, it } from 'vitest';
import {
  CATEGORIES,
  CATEGORY_FILTER_LABELS,
  STATUS_FILTER_LABELS,
  STATUSES,
  createItem,
  filterFromIndexes,
  visibleItems,
  type Item,
} from '../app/lib/tracker';

describe('filterFromIndexes', () => {
  it('maps index 0 to "all" and the rest to statuses/categories in order', () => {
    expect(filterFromIndexes(0, 0)).toEqual({ status: 'all', category: 'all', query: '' });
    expect(filterFromIndexes(1, 4, 'x')).toEqual({ status: 'in-progress', category: 'book', query: 'x' });
    expect(filterFromIndexes(99, -1)).toEqual({ status: 'all', category: 'all', query: '' });
  });

  it('labels line up with the underlying lists', () => {
    expect(STATUS_FILTER_LABELS).toHaveLength(STATUSES.length + 1);
    expect(CATEGORY_FILTER_LABELS).toEqual(['All', ...CATEGORIES.map((c) => c.label)]);
  });

  it('filters the library by category', () => {
    const book = createItem({ title: 'Dune', category: 'book', total: '400' }, 1, 'b') as Item;
    const game = createItem({ title: 'Celeste', category: 'game' }, 2, 'g') as Item;
    const index = CATEGORY_FILTER_LABELS.indexOf('Books');
    expect(visibleItems([book, game], filterFromIndexes(0, index)).map((i) => i.id)).toEqual(['b']);
  });
});
