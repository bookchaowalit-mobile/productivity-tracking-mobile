import { ApplicationSettings, Dialogs, ItemEventData, Observable, ObservableArray, PropertyChangeData } from '@nativescript/core';
import {
  CATEGORIES,
  STATUSES,
  CATEGORY_FILTER_LABELS,
  bumpProgress,
  createItem,
  filterFromIndexes,
  parseItems,
  progressLabel,
  setRating,
  setStatus,
  stats,
  visibleItems,
  type Item,
} from './lib/tracker';

const STORAGE_KEY = 'trackit.items.v1';
type Row = { id: string; title: string; subtitle: string };

function labelOf<T extends { id: string; label: string }>(list: readonly T[], id: string): string {
  return list.find((x) => x.id === id)?.label ?? id;
}

export class TrackerViewModel extends Observable {
  private items: Item[] = parseItems(ApplicationSettings.getString(STORAGE_KEY));
  readonly rows = new ObservableArray<Row>();
  query = '';
  statusIndex = 0;
  categoryIndex = 0;
  readonly categoryFilters = CATEGORY_FILTER_LABELS.map((title) => ({ title }));
  emptyText = '';
  summary = '';
  statusLines = '';
  categoryLines = '';

  constructor() {
    super();
    this.on(Observable.propertyChangeEvent, (data) => {
      const e = data as PropertyChangeData;
      if (e.propertyName === 'query' || e.propertyName === 'statusIndex' || e.propertyName === 'categoryIndex') this.refresh();
    });
    this.refresh();
  }

  private save(items: Item[]) {
    this.items = items;
    ApplicationSettings.setString(STORAGE_KEY, JSON.stringify(items));
    this.refresh();
  }

  private replace(updated: Item) {
    this.save(this.items.map((i) => (i.id === updated.id ? updated : i)));
  }

  private visible(): Item[] {
    return visibleItems(this.items, filterFromIndexes(this.statusIndex, this.categoryIndex, this.query));

  }

  refresh() {
    const visible = this.visible();
    this.rows.splice(
      0,
      this.rows.length,
      ...visible.map((i) => ({
        id: i.id,
        title: i.title,
        subtitle: [
          labelOf(CATEGORIES, i.category),
          labelOf(STATUSES, i.status),
          progressLabel(i),
          i.rating ? '★'.repeat(i.rating) : '',
        ]
          .filter(Boolean)
          .join(' · '),
      })),
    );
    this.set('emptyText', visible.length ? '' : this.items.length ? 'Nothing matches this filter.' : 'Nothing tracked yet — tap "Add item".');

    const s = stats(this.items);
    this.set(
      'summary',
      `${s.total} tracked` +
        (s.averageRating !== null ? ` · avg rating ${s.averageRating}` : '') +
        (s.completionRate !== null ? ` · ${s.completionRate}% finished, not dropped` : ''),
    );
    this.set('statusLines', STATUSES.map((st) => `${st.label}: ${s.byStatus[st.id]}`).join('\n'));
    this.set('categoryLines', s.byCategory.map((c) => `${c.label}: ${c.count}`).join('\n'));
  }

  async onAdd() {
    const title = await Dialogs.prompt({ title: 'Add to TrackIt', message: 'Title', okButtonText: 'Next', cancelButtonText: 'Cancel' });
    if (!title.result) return;
    const categoryLabel = await Dialogs.action('Category', 'Cancel', CATEGORIES.map((c) => c.label));
    const category = CATEGORIES.find((c) => c.label === categoryLabel);
    if (!category) return;
    const total = await Dialogs.prompt({
      title: title.text,
      message: `Length in ${category.unit} (leave blank if unknown)`,
      okButtonText: 'Add',
      cancelButtonText: 'Cancel',
    });
    if (!total.result) return;
    const created = createItem({ title: title.text, category: category.id, total: total.text });
    if (typeof created === 'string') {
      await Dialogs.alert({ title: 'Could not add', message: created, okButtonText: 'OK' });
      return;
    }
    this.save([created, ...this.items]);
  }

  async onItemTap(args: ItemEventData) {
    const row = this.rows.getItem(args.index);
    const item = this.items.find((i) => i.id === row?.id);
    if (!item) return;
    const choice = await Dialogs.action(item.title, 'Cancel', [
      '+1',
      '+5',
      '-1',
      'Mark completed',
      'Mark dropped',
      'Move to planned',
      'Rate…',
      'Delete',
    ]);
    switch (choice) {
      case '+1':
      case '+5':
      case '-1':
        this.replace(bumpProgress(item, Number(choice)));
        break;
      case 'Mark completed':
        this.replace(setStatus(item, 'completed'));
        break;
      case 'Mark dropped':
        this.replace(setStatus(item, 'dropped'));
        break;
      case 'Move to planned':
        this.replace(setStatus(item, 'planned'));
        break;
      case 'Rate…': {
        const stars = await Dialogs.action('Rating', 'Cancel', ['★', '★★', '★★★', '★★★★', '★★★★★', 'Clear rating']);
        if (stars && stars !== 'Cancel') this.replace(setRating(item, stars === 'Clear rating' ? 0 : stars.length));
        break;
      }
      case 'Delete':
        if (await Dialogs.confirm({ title: 'Delete', message: `Remove "${item.title}"?`, okButtonText: 'Delete', cancelButtonText: 'Keep' })) {
          this.save(this.items.filter((i) => i.id !== item.id));
        }
        break;
    }
  }
}
