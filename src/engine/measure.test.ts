import { describe, expect, it } from 'vitest';
import { balance } from '../balance';
import type { Book } from '../data/types';
import { windwardRun } from '../data/windward-run';
import { PLAY_VERSION, declaredTicks, attentive, handsOn, measure, type PlayFlag, type Policy } from './play';
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
    chapters: [{ head: { numeral: 'I', chapter: 'One', story: 'A start.' }, order: ['forage', 'mine', 'shelter', 'monument'], event: 'monument' }],
    items: {
      berries: { id: 'berries', name: 'berries', kind: 'food', healPerUnit: 4 },
      stone: { id: 'stone', name: 'stone', kind: 'material' },
      shelter: { id: 'shelter', name: 'shelter', kind: 'key' },
      monument: { id: 'monument', name: 'monument', kind: 'key' },
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
    items: { ...b.items, gold: { id: 'gold', name: 'gold', kind: 'material' } },
    actions: { ...b.actions, monument: { ...b.actions.monument!, itemCosts: [{ item: 'gold', amount: 1 }] } },
  };
}


const hour = balance.time.ticksPerMinute * 60;
const shortLife = (flags: readonly PlayFlag[]) => flags.filter((f): f is Extract<PlayFlag, { kind: 'short-life' }> => f.kind === 'short-life');

/** When the queue is empty, the rows in reverse chapter order: the monument first. Forage comes last, behind whatever pops first, so it is not sane. Measured to finish on a different total (2.16 h against attentive's 1.87 h). */
const monumentFirst: Policy = {
  name: 'monument first', sane: false, checkEverySeconds: 0,
  decide: (s, book) => s.queue.length > 0 ? s : [...book.chapters.flatMap((c) => c.order)].reverse().reduce((acc, id) => enqueue(acc, book, id), s),
};

/**
 * Each case plays whole books, headless: under a second or two on a laptop,
 * past vitest's 5 s default on a slower CI runner (a two-policy case took 5.02 s).
 */
describe('measure', { timeout: 30_000 }, () => {
  it('stamps the book, the play, the game and the bounds it was measured with', () => {
    const r = measure(monumentBook(3, 30), [attentive], 'test-1');
    expect(r).toMatchObject({ bookId: 'monument', bookVersion: 1, playVersion: PLAY_VERSION, gameVersion: 'test-1', declared: { hours: 1 }, bounds: balance.play });
    expect(r.runs).toHaveLength(1);
    expect(measure({ ...monumentBook(3, 30), version: 2 }, [attentive], 'test-1').bookVersion).toBe(2);
    const other = { ...balance.play, maxLifeMinutes: 5 };
    expect(measure(monumentBook(3, 30), [attentive], 'test-1', other).bounds).toEqual(other);
  });
  it('the play version is locked together with its bounds', () => {
    // Change one, and this fails until the other has been looked at: a bound
    // change is a rules change, and a reading must say which rules took it.
    expect({ PLAY_VERSION, bounds: balance.play, policy: balance.policy }).toEqual({
      PLAY_VERSION: 3,
      bounds: { maxBookDays: 60, minBookHours: 24, maxLifeMinutes: 60, minLifeMinutes: 10, lengthTolerance: 0.25, hoursShownUpTo: 48 },
      policy: { checkEverySeconds: 30 },
    });
  });
  it('the range spans the finished runs', () => {
    const r = measure(monumentBook(150, 1500), [attentive, monumentFirst], 'test');
    const [a, b] = r.runs.map((run) => run.totalTicks);
    expect(a).not.toBe(b);   // the precondition: the two policies measure differently
    expect(r.range).toEqual({ min: Math.min(a!, b!), max: Math.max(a!, b!) });
  });
  it('the range is null and never-finishes is flagged when nothing finished', () => {
    // A small stone cost with a finish out of reach (a 100000-stone sink once queued 40,005 entries
    // in one ask under an earlier policy): cheap to play, and never done.
    const r = measure(monumentBook(3, 1e9), [attentive], 'test', { ...balance.play, maxBookDays: 1 / 6 });
    expect(r.range).toBeNull();
    expect(r.flags).toContainEqual({ kind: 'never-finishes', policy: attentive.name });
  });
  it('flags a frozen run with the life it froze in', () => {
    expect(measure(frozenBook(), [attentive], 'test').flags).toContainEqual({ kind: 'frozen', policy: attentive.name, life: 1, cause: 'book' });
  });
  it('a book can freeze in a later life, and the flag names that life', () => {
    // Levels carry over: a faster later life fills a 200-stack before decay kills it,
    // and then nothing it can run is left. A bag raising the shared cap by 195 is how
    // the format holds 300 (re-measured with the attentive player: 195 froze in life 1 at 10.9 min;
    // 295 fills berries to 300 by hand and dies at 13.0 min in life 1, which earns Forage its chip;
    // in life 2 Forage is on JIT, so once the shelter and the bag are built the only order left is the
    // monument no row can supply, and it freezes at 1.5 min).
    const b = frozenBook();
    const later: Book = {
      ...b,
      chapters: [{ ...b.chapters[0]!, order: ['forage', 'mine', 'shelter', 'bag', 'monument'] }],
      actions: { ...b.actions, bag: { id: 'bag', verb: 'build', noun: 'a bag', expCost: 1, itemCosts: [], isOneTime: true, capacityBonus: 295 } },
    };
    const r = measure(later, [attentive], 'test');
    expect(r.runs[0]!.outcome).toBe('frozen');
    expect(r.runs[0]!.lives).toBeGreaterThan(1);
    expect(r.flags).toContainEqual({ kind: 'frozen', policy: attentive.name, life: r.runs[0]!.lives, cause: 'book' });
  });
  it('flags a short life when a sane policy walks into a decay trap, and not without the trap', () => {
    const b = monumentBook(150, 1500);
    const trap: Book = {
      ...b,
      chapters: [{ ...b.chapters[0]!, order: ['forage', 'curse', 'mine', 'shelter', 'monument'] }],
      items: { ...b.items, curse: { id: 'curse', name: 'curse', kind: 'key' } },
      actions: { ...b.actions, curse: { id: 'curse', verb: 'build', noun: 'a cursed shrine', expCost: 1, producedItem: 'curse', producedAmount: 1, itemCosts: [], isOneTime: true, healthDecayMultiplier: 3 } },
    };
    const trapped = measure(trap, [attentive], 'test');
    expect(trapped.runs[0]!.outcome).toBe('finished');   // it plays long overall; its lives are short (re-measured: 11.4 h, 70 lives)
    const flags = shortLife(trapped.flags);
    expect(flags).toHaveLength(1);   // one per policy
    const died = trapped.runs[0]!.ticksPerLife.slice(0, -1);
    const line = balance.play.minLifeMinutes * balance.time.ticksPerMinute;
    expect(flags[0]!.lives).toBe(died.filter((t) => t < line).length);
    expect(flags[0]!.ticks).toBe(Math.min(...died));
    expect(trapped.runs[0]!.ticksPerLife[flags[0]!.life - 1]).toBe(flags[0]!.ticks);
    // The control clears the line with the attentive player (re-measured: shortest death 13.39 min; the trap's 8.53 min).
    const control = measure(b, [attentive], 'test');
    expect(shortLife(control.flags)).toEqual([]);
    expect(trapped.runs[0]!.ticksPerLife[0]!).toBeLessThan(control.runs[0]!.ticksPerLife[0]!);
  });
  it('short-life counts only the lives under the line', () => {
    const b = monumentBook(150, 1500);
    const died = measure(b, [attentive], 'test').runs[0]!.ticksPerLife.slice(0, -1);
    const sorted = [...died].sort((x, y) => x - y);
    const lineTicks = sorted[Math.floor(sorted.length / 2)]!;   // the median: some lives under it, some not
    const f = shortLife(measure(b, [attentive], 'test', { ...balance.play, minLifeMinutes: lineTicks / balance.time.ticksPerMinute }).flags);
    const under = died.filter((t) => t < lineTicks).length;
    expect(under).toBeGreaterThan(0);
    expect(under).toBeLessThan(died.length);
    expect(f).toHaveLength(1);
    expect(f[0]!.lives).toBe(under);
  });
  it('an insane policy dying fast is not a short-life flag', () => {
    const starve: Policy = { name: 'starve', sane: false, checkEverySeconds: 0, decide: (s, book) => attentive.decide(s, { ...book, chapters: [{ ...book.chapters[0]!, order: ['mine', 'monument'] }] }) };
    const r = measure(monumentBook(150, 1500), [starve], 'test');
    expect(r.runs[0]!.ticksPerLife[0]!).toBeLessThan(balance.play.minLifeMinutes * balance.time.ticksPerMinute);   // it does die fast
    expect(shortLife(r.flags)).toEqual([]);
  });
  it('flags a life past the per-life cap, and keeps playing', () => {
    const r = measure(monumentBook(150, 1500), [attentive], 'test', { ...balance.play, maxLifeMinutes: 1 });
    expect(r.runs[0]!.outcome).toBe('finished');
    const long = r.flags.filter((f) => f.kind === 'long-life');
    expect(long).toHaveLength(r.runs[0]!.lives);   // every life of this book is over a minute
    expect(long[0]).toEqual({ kind: 'long-life', policy: attentive.name, life: 1, ticks: r.runs[0]!.ticksPerLife[0] });
  });
  it('a life exactly at the per-life cap is not long', () => {
    const first = measure(monumentBook(150, 1500), [attentive], 'test').runs[0]!.ticksPerLife[0]!;
    const r = measure(monumentBook(150, 1500), [attentive], 'test', { ...balance.play, maxLifeMinutes: first / balance.time.ticksPerMinute });
    expect(r.flags.some((f) => f.kind === 'long-life' && f.life === 1)).toBe(false);
  });
  it('flags a measured length off the declared one by more than the tolerance, on either side', () => {
    const b = monumentBook(3, 30);
    const measured = measure(b, [attentive], 'test').runs[0]!.totalTicks;
    const hours = measured / hour;
    expect(measure({ ...b, length: { hours } }, [attentive], 'test').flags.some((f) => f.kind === 'off-length')).toBe(false);
    // inside the band, not equal: the tolerance itself is what keeps these quiet
    for (const claim of [hours * 1.2, hours * 0.85]) {
      expect(measure({ ...b, length: { hours: claim } }, [attentive], 'test').flags.some((f) => f.kind === 'off-length')).toBe(false);
    }
    for (const claim of [hours * 2, hours / 2]) {
      const off = measure({ ...b, length: { hours: claim } }, [attentive], 'test').flags;
      expect(off).toContainEqual({ kind: 'off-length', declared: declaredTicks({ hours: claim }), min: measured, max: measured });
    }
  });
  it('off-length reads the short end against the low side and the long end against the high side', () => {
    const b = monumentBook(150, 1500);
    const pair = [attentive, monumentFirst];
    // The two policies measure 14% apart (re-measured: 1.87 h and 2.16 h), inside the 25%
    // tolerance, so the sides are read with a 1% tolerance.
    const narrow = { ...balance.play, lengthTolerance: 0.01 };
    const r0 = measure(b, pair, 'test', narrow);
    const { min, max } = r0.range!;
    expect(r0.runs.every((run) => run.outcome === 'finished')).toBe(true);
    expect(min).toBeLessThan(max * (1 - narrow.lengthTolerance));   // precondition
    // declared at max: only the short run can fall under the low side
    expect(measure({ ...b, length: { hours: max / hour } }, pair, 'test', narrow).flags).toContainEqual(expect.objectContaining({ kind: 'off-length', min, max }));
    // declared at min: only the long run can pass the high side
    expect(measure({ ...b, length: { hours: min / hour } }, pair, 'test', narrow).flags).toContainEqual(expect.objectContaining({ kind: 'off-length', min, max }));
  });
  it('flags a book that measures under the 24-hour floor, and not one over it', () => {
    const r = measure(monumentBook(150, 1500), [attentive], 'test');   // about 1.9 h
    expect(r.flags).toContainEqual({ kind: 'too-short', min: r.range!.min, floor: declaredTicks({ hours: balance.play.minBookHours }) });
    const lower = measure(monumentBook(150, 1500), [attentive], 'test', { ...balance.play, minBookHours: 1 });
    expect(lower.flags.some((f) => f.kind === 'too-short')).toBe(false);
  });
  it('off-length and too-short read the bounds passed in, to the exact tick', () => {
    const b = monumentBook(3, 30);
    const measured = measure(b, [attentive], 'test').runs[0]!.totalTicks;
    const hours = measured / hour;
    expect(declaredTicks({ hours })).toBe(measured);   // the round trip is exact for this book
    const exact = { ...balance.play, lengthTolerance: 0 };
    expect(measure({ ...b, length: { hours } }, [attentive], 'test', exact).flags.some((f) => f.kind === 'off-length')).toBe(false);
    for (const claim of [hours * 1.2, hours * 0.85]) {
      expect(measure({ ...b, length: { hours: claim } }, [attentive], 'test', exact).flags.some((f) => f.kind === 'off-length')).toBe(true);
    }
    const atFloor = measure(b, [attentive], 'test', { ...balance.play, minBookHours: hours }).flags;
    expect(atFloor.some((f) => f.kind === 'too-short')).toBe(false);
  });
  it('too-short reads the shortest finished run', () => {
    // a floor between the two runs (re-measured: 1.87 h and 2.16 h): only the short one is under it
    const r = measure(monumentBook(150, 1500), [attentive, monumentFirst], 'test', { ...balance.play, minBookHours: 2 });
    expect(r.range!.min).toBeLessThan(declaredTicks({ hours: 2 }));
    expect(r.range!.max).toBeGreaterThan(declaredTicks({ hours: 2 }));
    expect(r.flags).toContainEqual({ kind: 'too-short', min: r.range!.min, floor: declaredTicks({ hours: 2 }) });
  });
  // Characterization (plan 2026-09-23-the-windward-run, the reading after code panel round two: 30.69 h and
  // 30.33 h). No flag means the range sits inside 30 h +-25% and over the 24 h floor, and no life is short or
  // long. Spec section 11's target 8: the automating player finishes within 25% of the hands-on one, deliberately
  // the same number as the length tolerance (the spec names 25% for both). At today's reading the length flag
  // would fire first; the line bites on its own for a book whose hands-on run is short (a 3-chip canapé with
  // pirates at 520 reads 36.5 h against 24.5 h, no flag). Two whole-book plays: a slow runner gets 60 s.
  it('The Windward Run v1, end to end', () => {
    const r = measure(windwardRun, [attentive, handsOn], 'test');
    expect(r.bookVersion).toBe(1);
    expect(r.runs.map((run) => run.outcome)).toEqual(['finished', 'finished']);
    expect(r.range).not.toBeNull();
    expect(r.flags).toEqual([]);
    const [auto, byHand] = r.runs;
    expect(auto!.totalTicks).toBeLessThanOrEqual(byHand!.totalTicks * (1 + balance.play.lengthTolerance));
  }, 60_000);
});
