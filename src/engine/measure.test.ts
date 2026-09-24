import { describe, expect, it } from 'vitest';
import { balance } from '../balance';
import { saltRoad } from '../data/salt-road';
import type { Book } from '../data/types';
import { PLAY_VERSION, declaredTicks, everyRowInOrder, formatGameTime, measure, type PlayFlag, type Policy } from './play';
import { enqueue } from './queue';

/**
 * Forage feeds, Mine yields stone, a shelter slows decay like The Salt Road's
 * cabin, and the monument sinks `stone` and finishes the book.
 */
function monumentBook(stone: number, expCost: number): Book {
  return {
    id: 'monument', name: 'Monument', version: 1, finish: 'monument', length: { hours: 1 },
    roster: [
      { id: 'forage', name: 'Forage', icon: 'sprout' },
      { id: 'mine', name: 'Mine', icon: 'pickaxe' },
      { id: 'build', name: 'Build', icon: 'house' },
    ],
    chapters: [{ head: { numeral: 'I', chapter: 'One', story: 'A start.' }, order: ['forage', 'mine', 'shelter', 'monument'] }],
    items: {
      berries: { id: 'berries', name: 'berries', kind: 'food', cap: 20, healPerUnit: 4 },
      stone: { id: 'stone', name: 'stone', kind: 'material', cap: 5 },
      shelter: { id: 'shelter', name: 'shelter', kind: 'structure', cap: 1 },
      monument: { id: 'monument', name: 'monument', kind: 'structure', cap: 1 },
    },
    actions: {
      forage: { id: 'forage', verb: 'forage', noun: 'berries', expCost: 4.2, producedItem: 'berries', producedAmount: 1, itemCosts: [], isOneTime: false },
      mine: { id: 'mine', verb: 'mine', noun: 'stone', expCost: 6, producedItem: 'stone', producedAmount: 1, itemCosts: [], isOneTime: false },
      shelter: { id: 'shelter', verb: 'build', noun: 'a shelter', expCost: 60, producedItem: 'shelter', producedAmount: 1, itemCosts: [{ item: 'stone', amount: 6 }], isOneTime: true, healthDecayMultiplier: 0.8 },
      monument: { id: 'monument', verb: 'build', noun: 'a monument', expCost, producedItem: 'monument', producedAmount: 1, itemCosts: [{ item: 'stone', amount: stone }], isOneTime: true },
    },
  };
}

/** The monument costs gold, which nothing produces: Forage and Mine fill, then nothing can run. */
function frozenBook(): Book {
  const b = monumentBook(3, 30);
  return {
    ...b,
    items: { ...b.items, gold: { id: 'gold', name: 'gold', kind: 'material', cap: 5 } },
    actions: { ...b.actions, monument: { ...b.actions.monument!, itemCosts: [{ item: 'gold', amount: 1 }] } },
  };
}


const hour = balance.time.ticksPerMinute * 60;
const shortLife = (flags: readonly PlayFlag[]) => flags.filter((f): f is Extract<PlayFlag, { kind: 'short-life' }> => f.kind === 'short-life');

/** Every tick, the rows in reverse chapter order: the monument first. It never eats (Forage comes last and never runs), so it is not sane. Measured to finish on a different total. */
const monumentFirst: Policy = {
  name: 'monument first', sane: false, checkEverySeconds: 0,
  decide: (s, book) => [...book.chapters.flatMap((c) => c.order)].reverse().reduce((acc, id) => enqueue(acc, book, id), s),
};

/**
 * Each case plays whole books, headless: under a second or two on a laptop,
 * past vitest's 5 s default on a slower CI runner (a two-policy case took 5.02 s).
 */
describe('measure', { timeout: 30_000 }, () => {
  it('stamps the book, the play, the game and the bounds it was measured with', () => {
    const r = measure(monumentBook(3, 30), [everyRowInOrder], 'test-1');
    expect(r).toMatchObject({ bookId: 'monument', bookVersion: 1, playVersion: PLAY_VERSION, gameVersion: 'test-1', declared: { hours: 1 }, bounds: balance.play });
    expect(r.runs).toHaveLength(1);
    expect(measure({ ...monumentBook(3, 30), version: 2 }, [everyRowInOrder], 'test-1').bookVersion).toBe(2);
    const other = { ...balance.play, maxLifeMinutes: 5 };
    expect(measure(monumentBook(3, 30), [everyRowInOrder], 'test-1', other).bounds).toEqual(other);
  });
  it('the play version is locked together with its bounds', () => {
    // Change one, and this fails until the other has been looked at: a bound
    // change is a rules change, and a reading must say which rules took it.
    expect({ PLAY_VERSION, bounds: balance.play }).toEqual({
      PLAY_VERSION: 1,
      bounds: { maxBookDays: 60, minBookHours: 24, maxLifeMinutes: 60, minLifeMinutes: 10, lengthTolerance: 0.25, hoursShownUpTo: 48 },
    });
  });
  it('the range spans the finished runs', () => {
    const r = measure(monumentBook(150, 1500), [everyRowInOrder, monumentFirst], 'test');
    const [a, b] = r.runs.map((run) => run.totalTicks);
    expect(a).not.toBe(b);   // the precondition: the two policies measure differently
    expect(r.range).toEqual({ min: Math.min(a!, b!), max: Math.max(a!, b!) });
  });
  it('the range is null and never-finishes is flagged when nothing finished', () => {
    const r = measure(monumentBook(100000, 1e9), [everyRowInOrder], 'test', { ...balance.play, maxBookDays: 1 / 6 });
    expect(r.range).toBeNull();
    expect(r.flags).toContainEqual({ kind: 'never-finishes', policy: everyRowInOrder.name });
  });
  it('flags a frozen run with the life it froze in', () => {
    expect(measure(frozenBook(), [everyRowInOrder], 'test').flags).toContainEqual({ kind: 'frozen', policy: everyRowInOrder.name, life: 1 });
  });
  it('a book can freeze in a later life, and the flag names that life', () => {
    // Levels carry over: a faster life 2 fills a 200-stone stack before decay kills it,
    // and then nothing it can run is left (code panel, measured: frozen in life 2).
    const b = frozenBook();
    const later: Book = { ...b, items: { ...b.items, stone: { ...b.items.stone!, cap: 200 } } };
    const r = measure(later, [everyRowInOrder], 'test');
    expect(r.runs[0]!.outcome).toBe('frozen');
    expect(r.runs[0]!.lives).toBeGreaterThan(1);
    expect(r.flags).toContainEqual({ kind: 'frozen', policy: everyRowInOrder.name, life: r.runs[0]!.lives });
  });
  it('flags a short life when a sane policy walks into a decay trap, and not without the trap', () => {
    const b = monumentBook(150, 1500);
    const trap: Book = {
      ...b,
      chapters: [{ ...b.chapters[0]!, order: ['forage', 'curse', 'mine', 'shelter', 'monument'] }],
      items: { ...b.items, curse: { id: 'curse', name: 'curse', kind: 'structure', cap: 1 } },
      actions: { ...b.actions, curse: { id: 'curse', verb: 'build', noun: 'a cursed shrine', expCost: 1, producedItem: 'curse', producedAmount: 1, itemCosts: [], isOneTime: true, healthDecayMultiplier: 3 } },
    };
    const trapped = measure(trap, [everyRowInOrder], 'test');
    expect(trapped.runs[0]!.outcome).toBe('finished');   // it plays long overall; its lives are short (about 20 h, measured)
    const flags = shortLife(trapped.flags);
    expect(flags).toHaveLength(1);   // one per policy
    const died = trapped.runs[0]!.ticksPerLife.slice(0, -1);
    const line = balance.play.minLifeMinutes * balance.time.ticksPerMinute;
    expect(flags[0]!.lives).toBe(died.filter((t) => t < line).length);
    expect(flags[0]!.ticks).toBe(Math.min(...died));
    expect(trapped.runs[0]!.ticksPerLife[flags[0]!.life - 1]).toBe(flags[0]!.ticks);
    // The control clears the line by 8 s at today's numbers (panel, measured: shortest life 10.14 min, life 3); #45 will move it.
    const control = measure(b, [everyRowInOrder], 'test');
    expect(shortLife(control.flags)).toEqual([]);
    expect(trapped.runs[0]!.ticksPerLife[0]!).toBeLessThan(control.runs[0]!.ticksPerLife[0]!);
  });
  it('short-life counts only the lives under the line', () => {
    const b = monumentBook(150, 1500);
    const died = measure(b, [everyRowInOrder], 'test').runs[0]!.ticksPerLife.slice(0, -1);
    const sorted = [...died].sort((x, y) => x - y);
    const lineTicks = sorted[Math.floor(sorted.length / 2)]!;   // the median: some lives under it, some not
    const f = shortLife(measure(b, [everyRowInOrder], 'test', { ...balance.play, minLifeMinutes: lineTicks / balance.time.ticksPerMinute }).flags);
    const under = died.filter((t) => t < lineTicks).length;
    expect(under).toBeGreaterThan(0);
    expect(under).toBeLessThan(died.length);
    expect(f).toHaveLength(1);
    expect(f[0]!.lives).toBe(under);
  });
  it('an insane policy dying fast is not a short-life flag', () => {
    const starve: Policy = { name: 'starve', sane: false, checkEverySeconds: 0, decide: (s, book) => everyRowInOrder.decide(s, { ...book, chapters: [{ ...book.chapters[0]!, order: ['mine', 'monument'] }] }) };
    const r = measure(monumentBook(150, 1500), [starve], 'test');
    expect(r.runs[0]!.ticksPerLife[0]!).toBeLessThan(balance.play.minLifeMinutes * balance.time.ticksPerMinute);   // it does die fast
    expect(shortLife(r.flags)).toEqual([]);
  });
  it('flags a life past the per-life cap, and keeps playing', () => {
    const r = measure(monumentBook(150, 1500), [everyRowInOrder], 'test', { ...balance.play, maxLifeMinutes: 1 });
    expect(r.runs[0]!.outcome).toBe('finished');
    const long = r.flags.filter((f) => f.kind === 'long-life');
    expect(long).toHaveLength(r.runs[0]!.lives);   // every life of this book is over a minute
    expect(long[0]).toEqual({ kind: 'long-life', policy: everyRowInOrder.name, life: 1, ticks: r.runs[0]!.ticksPerLife[0] });
  });
  it('a life exactly at the per-life cap is not long', () => {
    const first = measure(monumentBook(150, 1500), [everyRowInOrder], 'test').runs[0]!.ticksPerLife[0]!;
    const r = measure(monumentBook(150, 1500), [everyRowInOrder], 'test', { ...balance.play, maxLifeMinutes: first / balance.time.ticksPerMinute });
    expect(r.flags.some((f) => f.kind === 'long-life' && f.life === 1)).toBe(false);
  });
  it('flags a measured length off the declared one by more than the tolerance, on either side', () => {
    const b = monumentBook(3, 30);
    const measured = measure(b, [everyRowInOrder], 'test').runs[0]!.totalTicks;
    const hours = measured / hour;
    expect(measure({ ...b, length: { hours } }, [everyRowInOrder], 'test').flags.some((f) => f.kind === 'off-length')).toBe(false);
    // inside the band, not equal: the tolerance itself is what keeps these quiet
    for (const claim of [hours * 1.2, hours * 0.85]) {
      expect(measure({ ...b, length: { hours: claim } }, [everyRowInOrder], 'test').flags.some((f) => f.kind === 'off-length')).toBe(false);
    }
    for (const claim of [hours * 2, hours / 2]) {
      const off = measure({ ...b, length: { hours: claim } }, [everyRowInOrder], 'test').flags;
      expect(off).toContainEqual({ kind: 'off-length', declared: declaredTicks({ hours: claim }), min: measured, max: measured });
    }
  });
  it('off-length reads the short end against the low side and the long end against the high side', () => {
    const b = monumentBook(150, 1500);
    const pair = [everyRowInOrder, monumentFirst];
    const r0 = measure(b, pair, 'test');
    const { min, max } = r0.range!;
    expect(r0.runs.every((run) => run.outcome === 'finished')).toBe(true);
    expect(min).toBeLessThan(max * (1 - balance.play.lengthTolerance));   // precondition (measured 3.66 h and 7.18 h)
    // declared at max: only the short run can fall under the low side
    expect(measure({ ...b, length: { hours: max / hour } }, pair, 'test').flags).toContainEqual(expect.objectContaining({ kind: 'off-length', min, max }));
    // declared at min: only the long run can pass the high side
    expect(measure({ ...b, length: { hours: min / hour } }, pair, 'test').flags).toContainEqual(expect.objectContaining({ kind: 'off-length', min, max }));
  });
  it('flags a book that measures under the 24-hour floor, and not one over it', () => {
    const r = measure(monumentBook(150, 1500), [everyRowInOrder], 'test');   // about 3.7 h
    expect(r.flags).toContainEqual({ kind: 'too-short', min: r.range!.min, floor: declaredTicks({ hours: balance.play.minBookHours }) });
    const lower = measure(monumentBook(150, 1500), [everyRowInOrder], 'test', { ...balance.play, minBookHours: 1 });
    expect(lower.flags.some((f) => f.kind === 'too-short')).toBe(false);
  });
  it('off-length and too-short read the bounds passed in, to the exact tick', () => {
    const b = monumentBook(3, 30);
    const measured = measure(b, [everyRowInOrder], 'test').runs[0]!.totalTicks;
    const hours = measured / hour;
    expect(declaredTicks({ hours })).toBe(measured);   // the round trip is exact for this book
    const exact = { ...balance.play, lengthTolerance: 0 };
    expect(measure({ ...b, length: { hours } }, [everyRowInOrder], 'test', exact).flags.some((f) => f.kind === 'off-length')).toBe(false);
    for (const claim of [hours * 1.2, hours * 0.85]) {
      expect(measure({ ...b, length: { hours: claim } }, [everyRowInOrder], 'test', exact).flags.some((f) => f.kind === 'off-length')).toBe(true);
    }
    const atFloor = measure(b, [everyRowInOrder], 'test', { ...balance.play, minBookHours: hours }).flags;
    expect(atFloor.some((f) => f.kind === 'too-short')).toBe(false);
  });
  it('too-short reads the shortest finished run', () => {
    // a floor between the two runs (3.66 h and 7.18 h): only the short one is under it
    const r = measure(monumentBook(150, 1500), [everyRowInOrder, monumentFirst], 'test', { ...balance.play, minBookHours: 5 });
    expect(r.range!.min).toBeLessThan(declaredTicks({ hours: 5 }));
    expect(r.range!.max).toBeGreaterThan(declaredTicks({ hours: 5 }));
    expect(r.flags).toContainEqual({ kind: 'too-short', min: r.range!.min, floor: declaredTicks({ hours: 5 }) });
  });
});

/**
 * A characterization of The Salt Road v1 at today's placeholder numbers and the
 * stand-in policy (panel, measured: life 457, 120.6 h, shortest life 10.14 min at life 3, 8 s over the line). When
 * #45, #47, #21 or #44 lands, re-measure and update: a new flag here is the play
 * telling the truth about the change, not a test to bend.
 */
describe('The Salt Road v1, end to end', () => {
  it('finishes at the hall, measures 5 days, and raises no flag', () => {
    const r = measure(saltRoad, [everyRowInOrder], 'test');
    expect(r.runs[0]!.outcome).toBe('finished');
    expect(formatGameTime(r.range!.max)).toBe('5 days');
    expect(r.flags).toEqual([]);
  }, 60_000);
});
