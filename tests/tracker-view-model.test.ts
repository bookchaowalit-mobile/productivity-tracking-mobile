import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * TrackerViewModel wires the pure tracker logic to NativeScript storage, dialogs
 * and bindings. @nativescript/core needs a device runtime, so it is replaced by
 * a small in-memory fake that keeps the parts the view model relies on:
 * Observable.set() emitting propertyChange, ObservableArray splice/getItem,
 * ApplicationSettings strings, and scripted Dialogs answers.
 */
const fake = vi.hoisted(() => {
  const store = new Map<string, string>();
  const answers: unknown[] = [];
  const next = () => Promise.resolve(answers.shift());

  class Observable {
    static propertyChangeEvent = 'propertyChange';
    private handlers: ((data: unknown) => void)[] = [];
    on(_event: string, cb: (data: unknown) => void) {
      this.handlers.push(cb);
    }
    set(name: string, value: unknown) {
      const self = this as unknown as Record<string, unknown>;
      if (self[name] === value) return;
      self[name] = value;
      for (const cb of this.handlers) cb({ propertyName: name, value });
    }
  }

  class ObservableArray<T> {
    private data: T[] = [];
    get length() {
      return this.data.length;
    }
    splice(start: number, count: number, ...items: T[]) {
      return this.data.splice(start, count, ...items);
    }
    getItem(i: number) {
      return this.data[i];
    }
    toArray() {
      return [...this.data];
    }
  }

  const ApplicationSettings = {
    getString: (key: string) => store.get(key),
    setString: (key: string, value: string) => void store.set(key, value),
  };

  const Dialogs = {
    prompt: vi.fn(next),
    action: vi.fn(next),
    alert: vi.fn(() => Promise.resolve()),
    confirm: vi.fn(next),
  };

  return { store, answers, Observable, ObservableArray, ApplicationSettings, Dialogs };
});

vi.mock('@nativescript/core', () => ({
  Observable: fake.Observable,
  ObservableArray: fake.ObservableArray,
  ApplicationSettings: fake.ApplicationSettings,
  Dialogs: fake.Dialogs,
}));

import { TrackerViewModel } from '../app/tracker-view-model';
import type { Item } from '../app/lib/tracker';

const KEY = 'trackit.items.v1';

const item = (over: Partial<Item>): Item => ({
  id: 'x',
  title: 'X',
  category: 'anime',
  status: 'planned',
  progress: 0,
  total: 12,
  rating: 0,
  updatedAt: 1,
  ...over,
});

const saved = (): Item[] => JSON.parse(fake.store.get(KEY) ?? '[]');
const titles = (vm: TrackerViewModel) => (vm.rows as unknown as { toArray(): { title: string }[] }).toArray().map((r) => r.title);

beforeEach(() => {
  fake.store.clear();
  fake.answers.length = 0;
  vi.clearAllMocks();
});

describe('TrackerViewModel', () => {
  it('starts empty with a hint, and ignores corrupt storage', () => {
    fake.store.set(KEY, '{not json');
    const vm = new TrackerViewModel();
    expect(vm.rows.length).toBe(0);
    expect(vm.emptyText).toBe('Nothing tracked yet — tap "Add item".');
    expect(vm.summary).toBe('0 tracked');
  });

  it('loads stored items, shows subtitles and re-filters when bound properties change', () => {
    fake.store.set(
      KEY,
      JSON.stringify([
        item({ id: 'a', title: 'Frieren', status: 'in-progress', progress: 6, total: 28, rating: 5, updatedAt: 2 }),
        item({ id: 'b', title: 'Dune', category: 'book', status: 'completed', progress: 412, total: 412, updatedAt: 3 }),
      ]),
    );
    const vm = new TrackerViewModel();
    expect(titles(vm)).toEqual(['Frieren', 'Dune']);
    expect(vm.rows.getItem(0).subtitle).toBe('Anime · In progress · 6 / 28 episodes (21%) · ★★★★★');
    expect(vm.summary).toBe('2 tracked · avg rating 5 · 100% finished, not dropped');
    expect(vm.categoryLines.split('\n')).toContain('Books: 1');

    vm.set('query', 'dune');
    expect(titles(vm)).toEqual(['Dune']);
    vm.set('query', 'zzz');
    expect(vm.emptyText).toBe('Nothing matches this filter.');
    vm.set('query', '');
    vm.set('categoryIndex', 4); // "Books"
    expect(titles(vm)).toEqual(['Dune']);
  });

  it('adds an item through the dialogs and persists it', async () => {
    const vm = new TrackerViewModel();
    fake.answers.push({ result: true, text: '  Severance  ' }, 'Movies', { result: true, text: '2' });
    await vm.onAdd();
    expect(saved()).toHaveLength(1);
    expect(saved()[0]).toMatchObject({ title: 'Severance', category: 'movie', total: 2, status: 'planned' });
    expect(titles(vm)).toEqual(['Severance']);
  });

  it('shows the validation error and saves nothing for a bad length', async () => {
    const vm = new TrackerViewModel();
    fake.answers.push({ result: true, text: 'Hades' }, 'Games', { result: true, text: '12.5' });
    await vm.onAdd();
    expect(fake.Dialogs.alert).toHaveBeenCalledWith(expect.objectContaining({ message: 'Length must be a whole number (or blank if unknown).' }));
    expect(fake.store.has(KEY)).toBe(false);
    expect(vm.rows.length).toBe(0);
  });

  it('stops adding when the category picker is cancelled', async () => {
    const vm = new TrackerViewModel();
    fake.answers.push({ result: true, text: 'Hades' }, 'Cancel');
    await vm.onAdd();
    expect(fake.Dialogs.prompt).toHaveBeenCalledTimes(1);
    expect(fake.store.has(KEY)).toBe(false);
  });

  it('applies row actions to the tapped item: progress, rating, delete', async () => {
    fake.store.set(KEY, JSON.stringify([item({ id: 'a', title: 'Frieren', total: 28 })]));
    const vm = new TrackerViewModel();

    fake.answers.push('+5');
    await vm.onItemTap({ index: 0 } as never);
    expect(saved()[0]).toMatchObject({ progress: 5, status: 'in-progress' });

    fake.answers.push('Rate…', '★★★');
    await vm.onItemTap({ index: 0 } as never);
    expect(saved()[0].rating).toBe(3);

    fake.answers.push('Mark completed');
    await vm.onItemTap({ index: 0 } as never);
    expect(saved()[0]).toMatchObject({ progress: 28, status: 'completed' });

    fake.answers.push('Delete', false);
    await vm.onItemTap({ index: 0 } as never);
    expect(saved()).toHaveLength(1);

    fake.answers.push('Delete', true);
    await vm.onItemTap({ index: 0 } as never);
    expect(saved()).toEqual([]);
    expect(vm.emptyText).toBe('Nothing tracked yet — tap "Add item".');
  });
});
