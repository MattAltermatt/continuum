import { describe, expect, it } from 'vitest';
import { balance } from '../balance';
import type { Book } from './types';
import { validateBook } from './validate';

/** A minimal valid book to break in one place per test. */
const good: Book = {
  id: 'test', name: 'Test', version: 1, finish: 'hut', length: { hours: 1 },
  roster: [{ id: 'forage', name: 'Forage', icon: 'sprout' }, { id: 'build', name: 'Build', icon: 'house' }],
  chapters: [{ head: { numeral: 'I', chapter: 'One', story: 'A start.' }, order: ['forage', 'hut'], event: 'hut' }],
  items: {
    berries: { id: 'berries', name: 'berries', kind: 'food', healPerUnit: 4 },
    hut: { id: 'hut', name: 'hut', kind: 'key' },
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
    const c: Book = { ...good, items: { ...good.items, rock: { id: 'stone', name: 'stone', kind: 'material' } } };
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
    const twice: Book = { ...good, chapters: [good.chapters[0]!, { head: { numeral: 'II', chapter: 'Two', story: 'Again.' }, order: ['hut'], event: 'hut' }] };
    expect(validateBook(twice)).toContainEqual(expect.stringMatching(/hut.*more than one chapter/));
  });
  it('rejects a first chapter with no row that needs nothing in hand', () => {
    const b = withActions({ hut: good.actions.hut! }, ['hut']);
    expect(validateBook({ ...b, roster: [good.roster[1]!] })).toContainEqual(expect.stringMatching(/first chapter/));
  });
  it('asks the first chapter to open, not any chapter: a free row in chapter II does not count', () => {
    const head = good.chapters[0]!.head;
    const b: Book = { ...good, chapters: [{ head, order: ['hut'], event: 'hut' }, { head, order: ['forage'], event: 'forage' }] };
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
  it('rejects a finish that is not the last chapter\'s event', () => {
    const shed = { ...good.actions.hut!, id: 'shed', producedItem: undefined, itemCosts: [] };
    const b: Book = {
      ...good, actions: { ...good.actions, shed },
      chapters: [good.chapters[0]!, { head: { numeral: 'II', chapter: 'Two', story: 'Later.' }, order: ['shed'], event: 'shed' }],
    };
    expect(validateBook(b)).toContainEqual('finish "hut" is not the last chapter\'s event');
    // In the last chapter, but not its event.
    const inside: Book = { ...b, finish: 'hut', chapters: [{ ...b.chapters[1]!, order: ['forage', 'hut', 'shed'], event: 'shed' }] };
    expect(validateBook(inside)).toContainEqual('finish "hut" is not the last chapter\'s event');
  });
  it('rejects a chapter event that is not one of its rows, or is repeatable', () => {
    const outside: Book = { ...good, chapters: [{ ...good.chapters[0]!, event: 'ghost' }] };
    expect(validateBook(outside)).toContainEqual('chapter 1\'s event "ghost" is not one of its rows');
    const repeat: Book = { ...good, chapters: [{ ...good.chapters[0]!, event: 'forage' }] };
    expect(validateBook(repeat)).toContainEqual('chapter 1\'s event "forage" is repeatable; it must be one-time');
  });
  it('rejects a chapter event that is not its last one-time row', () => {
    const shed = { id: 'shed', verb: 'build', noun: 'a shed', expCost: 1, itemCosts: [], isOneTime: true };
    const b: Book = { ...good, actions: { ...good.actions, shed }, chapters: [{ ...good.chapters[0]!, order: [...good.chapters[0]!.order, 'shed'] }] };
    expect(validateBook(b)).toContainEqual('chapter 1\'s event "hut" is not its last one-time row');
  });
  it('rejects a row that costs one item twice', () => {
    const b = withActions({ ...good.actions, hut: { ...good.actions.hut!, itemCosts: [{ item: 'berries', amount: 1 }, { item: 'berries', amount: 2 }] } });
    expect(validateBook(b)).toContainEqual('row "hut" costs "berries" twice');
  });
  it('rejects a need the book does not define', () => {
    const b = withActions({ ...good.actions, hut: { ...good.actions.hut!, needs: [{ item: 'map', amount: 1 }] } });
    expect(validateBook(b)).toContainEqual('row "hut" needs "map", which the book does not define');
  });
  it('rejects a hurts that is not a positive number', () => {
    for (const hurts of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      const b = withActions({ ...good.actions, hut: { ...good.actions.hut!, hurts } });
      expect(validateBook(b)).toContainEqual(`row "hut" hurts by ${hurts}, which is not a positive number`);
    }
  });
  it('rejects an effect on a repeatable row', () => {
    for (const effect of [{ healthDecayMultiplier: 0.8 }, { capacityBonus: 5 }, { gear: { skill: 'forage', multiplier: 1.25 } }]) {
      const b = withActions({ ...good.actions, forage: { ...good.actions.forage!, ...effect } });
      expect(validateBook(b)).toContainEqual('row "forage" has an effect but is repeatable');
    }
  });
  it('rejects a capacity bonus that is not a positive whole number', () => {
    for (const capacityBonus of [0, -5, 2.5]) {
      const b = withActions({ ...good.actions, hut: { ...good.actions.hut!, capacityBonus } });
      expect(validateBook(b)).toContainEqual(`row "hut" raises the stack by ${capacityBonus}, which is not a positive whole number`);
    }
  });
  it('rejects gear with a bad multiplier or a skill outside the roster', () => {
    const bad = withActions({ ...good.actions, hut: { ...good.actions.hut!, gear: { skill: 'forage', multiplier: 0 } } });
    expect(validateBook(bad)).toContainEqual('row "hut" gears by 0, which is not a positive number');
    const stranger = withActions({ ...good.actions, hut: { ...good.actions.hut!, gear: { skill: 'fly', multiplier: 2 } } });
    expect(validateBook(stranger)).toContainEqual('row "hut" gears "fly", which is not in the roster');
  });
  it('rejects a food that does not heal, and a non-food that does', () => {
    const hungry: Book = { ...good, items: { ...good.items, berries: { id: 'berries', name: 'berries', kind: 'food' } } };
    expect(validateBook(hungry)).toContainEqual('food "berries" heals undefined, which is not a positive number');
    const zero: Book = { ...good, items: { ...good.items, berries: { id: 'berries', name: 'berries', kind: 'food', healPerUnit: 0 } } };
    expect(validateBook(zero)).toContainEqual('food "berries" heals 0, which is not a positive number');
    const stone: Book = { ...good, items: { ...good.items, hut: { id: 'hut', name: 'hut', kind: 'key', healPerUnit: 2 } } };
    expect(validateBook(stone)).toContainEqual('item "hut" is not food but heals');
  });
  it('rejects a need or a cost of more than one of a key, which is held once', () => {
    const needs = withActions({ ...good.actions, forage: { ...good.actions.forage!, needs: [{ item: 'hut', amount: 2 }] } });
    expect(validateBook(needs)).toContainEqual('row "forage" needs 2 of the key "hut", and a key is held once');
    const costs = withActions({ ...good.actions, forage: { ...good.actions.forage!, itemCosts: [{ item: 'hut', amount: 3 }] } });
    expect(validateBook(costs)).toContainEqual('row "forage" costs 3 of the key "hut", and a key is held once');
    const one = withActions({ ...good.actions, forage: { ...good.actions.forage!, needs: [{ item: 'hut', amount: 1 }] } });
    expect(validateBook(one).some((p) => p.includes('held once'))).toBe(false);
  });
  it('rejects a cost or a need of an amount that is not a positive whole number', () => {
    for (const amount of [0, -1, 1.5, Number.NaN]) {
      const costs = withActions({ ...good.actions, hut: { ...good.actions.hut!, itemCosts: [{ item: 'berries', amount }] } });
      expect(validateBook(costs)).toContainEqual(`row "hut" costs ${amount} of "berries", which is not a positive whole number`);
      const needs = withActions({ ...good.actions, hut: { ...good.actions.hut!, needs: [{ item: 'berries', amount }] } });
      expect(validateBook(needs)).toContainEqual(`row "hut" needs ${amount} of "berries", which is not a positive whole number`);
    }
  });
  it('a key amount that is not a positive whole number is reported as that alone, not also as more than one of a key', () => {
    const costs = withActions({ ...good.actions, forage: { ...good.actions.forage!, itemCosts: [{ item: 'hut', amount: 0 }] } });
    expect(validateBook(costs).filter((p) => p.startsWith('row "forage"'))).toEqual(['row "forage" costs 0 of "hut", which is not a positive whole number']);
    const needs = withActions({ ...good.actions, forage: { ...good.actions.forage!, needs: [{ item: 'hut', amount: 0 }] } });
    expect(validateBook(needs).filter((p) => p.startsWith('row "forage"'))).toEqual(['row "forage" needs 0 of "hut", which is not a positive whole number']);
    // And a whole amount past one is the key rule's alone.
    const two = withActions({ ...good.actions, forage: { ...good.actions.forage!, needs: [{ item: 'hut', amount: 2 }] } });
    expect(validateBook(two).filter((p) => p.startsWith('row "forage"'))).toEqual(['row "forage" needs 2 of the key "hut", and a key is held once']);
  });
  it('rejects a produced amount that is not a positive whole number, and says nothing of one left out', () => {
    for (const producedAmount of [0, -1, 0.5, Number.NaN]) {
      const b = withActions({ ...good.actions, forage: { ...good.actions.forage!, producedAmount } });
      expect(validateBook(b)).toContainEqual(`row "forage" produces ${producedAmount} at a time, which is not a positive whole number`);
    }
    expect(validateBook(withActions({ ...good.actions, forage: { ...good.actions.forage!, producedAmount: undefined } }))).toEqual([]);
  });
  it('rejects an XP cost that is not a positive finite number, and accepts a fractional one', () => {
    for (const expCost of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      const b = withActions({ ...good.actions, hut: { ...good.actions.hut!, expCost } });
      expect(validateBook(b)).toContainEqual(`row "hut" takes ${expCost} XP to complete, which is not a positive number`);
    }
    expect(validateBook(withActions({ ...good.actions, hut: { ...good.actions.hut!, expCost: 0.5 } }))).toEqual([]);
  });
  it('rejects a completion bigger than an empty stack holds, a decay multiplier that is not positive, and an empty one-unit name', () => {
    const big = withActions({ ...good.actions, forage: { ...good.actions.forage!, producedAmount: balance.inventory.stackCap + 1 } });
    expect(validateBook(big)).toContainEqual(expect.stringMatching(/more than an empty stack of "berries" holds at the base cap/));
    const fits = withActions({ ...good.actions, forage: { ...good.actions.forage!, producedAmount: balance.inventory.stackCap } });
    expect(validateBook(fits).some((p) => p.includes('empty stack'))).toBe(false);
    for (const m of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      const b = withActions({ ...good.actions, hut: { ...good.actions.hut!, healthDecayMultiplier: m } });
      expect(validateBook(b)).toContainEqual(`row "hut" multiplies decay by ${m}, which is not a positive number`);
    }
    const named: Book = { ...good, items: { ...good.items, berries: { ...good.items.berries!, one: ' ' } } };
    expect(validateBook(named)).toContainEqual('item "berries" has an empty name for one unit');
    const key = withActions({ ...good.actions, hut: { ...good.actions.hut!, producedAmount: 2 } });
    expect(validateBook(key)).toContainEqual('row "hut" produces 2 at a time, more than an empty stack of "hut" holds at the base cap (1)');
  });
  it('counts needs in the opening-row rule: a row that needs a key does not open the book', () => {
    const b = withActions({ ...good.actions, forage: { ...good.actions.forage!, needs: [{ item: 'hut', amount: 1 }] } });
    expect(validateBook(b)).toContainEqual(expect.stringMatching(/first chapter/));
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
