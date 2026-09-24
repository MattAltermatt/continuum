import { describe, expect, it } from 'vitest';
import { balance } from '../balance';
import type { Book } from './types';
import { validateBook } from './validate';

/** A minimal valid book to break in one place per test. */
const good: Book = {
  id: 'test', name: 'Test', version: 1, finish: 'hut', length: { hours: 1 },
  roster: [{ id: 'forage', name: 'Forage', icon: 'sprout' }, { id: 'build', name: 'Build', icon: 'house' }],
  chapters: [{ head: { numeral: 'I', chapter: 'One', story: 'A start.' }, order: ['forage', 'hut'] }],
  items: {
    berries: { id: 'berries', name: 'berries', kind: 'food', cap: 20, healPerUnit: 4 },
    hut: { id: 'hut', name: 'hut', kind: 'structure', cap: 1 },
  },
  actions: {
    forage: { id: 'forage', verb: 'forage', noun: 'berries', expCost: 1, producedItem: 'berries', producedAmount: 1, itemCosts: [], isOneTime: false },
    hut: { id: 'hut', verb: 'build', noun: 'a hut', expCost: 6, producedItem: 'hut', producedAmount: 1, itemCosts: [{ item: 'berries', amount: 3 }], isOneTime: true },
  },
};

const withActions = (actions: Book['actions'], order?: readonly string[]): Book =>
  ({ ...good, actions, chapters: [{ ...good.chapters[0]!, order: order ?? Object.keys(actions) }] });

describe('validateBook', () => {
  it('accepts a well-formed book', () => {
    expect(validateBook(good)).toEqual([]);
  });
  it('rejects a row whose verb is not in the roster', () => {
    const b = withActions({ ...good.actions, chop: { ...good.actions.forage!, id: 'chop', verb: 'chop' } });
    expect(validateBook(b)).toContainEqual(expect.stringMatching(/chop.*roster/));
  });
  it('rejects a roster skill with no row', () => {
    const b: Book = { ...good, roster: [...good.roster, { id: 'fish', name: 'Fish', icon: 'fishing-rod' }] };
    expect(validateBook(b)).toContainEqual(expect.stringMatching(/fish.*no row/));
  });
  it('rejects two roster entries with one id', () => {
    const b: Book = { ...good, roster: [...good.roster, { id: 'forage', name: 'Forage again', icon: 'sprout' }] };
    expect(validateBook(b)).toContainEqual(expect.stringMatching(/forage.*twice/));
  });
  it('rejects an icon name outside the vocabulary', () => {
    const b: Book = { ...good, roster: [{ id: 'forage', name: 'Forage', icon: 'dragon' as never }, good.roster[1]!] };
    expect(validateBook(b)).toContainEqual(expect.stringMatching(/dragon/));
  });
  it('rejects a row that produces an item the book does not define', () => {
    const b = withActions({ ...good.actions, forage: { ...good.actions.forage!, producedItem: 'nuts' } });
    expect(validateBook(b)).toContainEqual(expect.stringMatching(/produces "nuts"/));
  });
  it('rejects a row that costs an item the book does not define', () => {
    const b = withActions({ ...good.actions, hut: { ...good.actions.hut!, itemCosts: [{ item: 'planks', amount: 1 }] } });
    expect(validateBook(b)).toContainEqual(expect.stringMatching(/costs "planks"/));
  });
  it('rejects an action whose record key differs from its id, and an item likewise', () => {
    const b = withActions({ ...good.actions, shed: { ...good.actions.hut!, id: 'hut' } }, ['forage', 'hut', 'shed']);
    expect(validateBook(b)).toContainEqual(expect.stringMatching(/"shed".*id is "hut"/));
    const c: Book = { ...good, items: { ...good.items, rock: { id: 'stone', name: 'stone', kind: 'material', cap: 5 } } };
    expect(validateBook(c)).toContainEqual(expect.stringMatching(/"rock".*id is "stone"/));
  });
  it('looks up own properties only: a cost, a product or an order id named like a prototype member is undefined', () => {
    const b = withActions({ ...good.actions, hut: { ...good.actions.hut!, itemCosts: [{ item: 'constructor', amount: 1 }] } });
    expect(validateBook(b)).toContainEqual(expect.stringMatching(/costs "constructor"/));
    const c = withActions({ ...good.actions, forage: { ...good.actions.forage!, producedItem: 'toString' } });
    expect(validateBook(c)).toContainEqual(expect.stringMatching(/produces "toString"/));
    // toString FIRST, so the first-chapter rule reaches it: with it last, `.some` stops at forage and the guard is never exercised.
    expect(() => validateBook(withActions(good.actions, ['toString', 'forage', 'hut']))).not.toThrow();
    expect(validateBook(withActions(good.actions, ['toString', 'forage', 'hut']))).toContainEqual(expect.stringMatching(/toString/));
  });
  it('rejects an empty book: no chapters means no first chapter', () => {
    const b: Book = { id: 'empty', name: 'Empty', version: 1, finish: 'none', length: { hours: 1 }, roster: [], chapters: [], items: {}, actions: {} };
    expect(validateBook(b)).toContainEqual(expect.stringMatching(/first chapter/));
  });
  it('rejects a chapter order naming an action the book lacks', () => {
    expect(validateBook(withActions(good.actions, ['forage', 'hut', 'ghost']))).toContainEqual(expect.stringMatching(/ghost/));
  });
  it('rejects an action that is in no chapter, and one that is in two', () => {
    expect(validateBook(withActions(good.actions, ['forage']))).toContainEqual(expect.stringMatching(/hut.*no chapter/));
    const twice: Book = { ...good, chapters: [good.chapters[0]!, { head: { numeral: 'II', chapter: 'Two', story: 'Again.' }, order: ['hut'] }] };
    expect(validateBook(twice)).toContainEqual(expect.stringMatching(/hut.*more than one chapter/));
  });
  it('rejects a first chapter with no row that needs nothing in hand', () => {
    const b = withActions({ hut: good.actions.hut! }, ['hut']);
    expect(validateBook({ ...b, roster: [good.roster[1]!] })).toContainEqual(expect.stringMatching(/first chapter/));
  });
  it('asks the first chapter to open, not any chapter: a free row in chapter II does not count', () => {
    const head = good.chapters[0]!.head;
    const b: Book = { ...good, chapters: [{ head, order: ['hut'] }, { head, order: ['forage'] }] };
    expect(validateBook(b)).toContainEqual(expect.stringMatching(/first chapter/));
  });
  it('rejects a version that is not a positive integer', () => {
    for (const version of [0, -1, 1.5, Number.NaN]) {
      expect(validateBook({ ...good, version })).toContainEqual(expect.stringMatching(/version/));
    }
  });
  it('rejects a finish that is not a row', () => {
    expect(validateBook({ ...good, finish: 'nothing' })).toContainEqual(expect.stringMatching(/finish "nothing" is not a row/));
  });
  it('rejects a finish that is repeatable', () => {
    expect(validateBook({ ...good, finish: 'forage' })).toContainEqual(expect.stringMatching(/finish "forage".*one-time/));
  });
  it('rejects a finish outside the last chapter', () => {
    const b: Book = { ...good, chapters: [good.chapters[0]!, { head: { numeral: 'II', chapter: 'Two', story: 'Later.' }, order: [] }] };
    expect(validateBook(b)).toContainEqual(expect.stringMatching(/finish "hut".*last chapter/));
  });
  it('rejects a length that is not a positive number', () => {
    for (const length of [{ hours: 0 }, { days: -2 }, { hours: Number.POSITIVE_INFINITY }, { hours: Number.NaN }, { days: Number.NaN }]) {
      expect(validateBook({ ...good, length })).toContainEqual(expect.stringMatching(/not a positive number/));
    }
  });
  it('rejects a length that names both hours and days', () => {
    const length = { hours: 1, days: 9999 } as unknown as Book['length'];   // the type forbids it; a JSON book can still say it
    expect(validateBook({ ...good, length })).toContainEqual(expect.stringMatching(/both hours and days/));
  });
  it('rejects a length past the ceiling, in days or in hours, and accepts one at it', () => {
    const max = balance.play.maxBookDays;
    expect(validateBook({ ...good, length: { days: max + 1 } })).toContainEqual(expect.stringMatching(/cannot be loaded/));
    expect(validateBook({ ...good, length: { hours: (max + 1) * 24 } })).toContainEqual(expect.stringMatching(/cannot be loaded/));
    expect(validateBook({ ...good, length: { days: max } })).toEqual([]);
  });
});
