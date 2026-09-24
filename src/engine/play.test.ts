import { describe, expect, it } from 'vitest';
import { balance } from '../balance';
import type { Book } from '../data/types';
import { declaredTicks, everyRowInOrder, formatGameTime, play, type Policy } from './play';
import { enqueue } from './queue';

const hour = balance.time.ticksPerMinute * 60;

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

/**
 * Each case plays whole books, headless: under a second or two on a laptop,
 * past vitest's 5 s default on a slower CI runner (a two-policy case took 5.02 s).
 */
describe('play', { timeout: 30_000 }, () => {
  it('finishes a small book in life 1', () => {
    const run = play(monumentBook(3, 30), everyRowInOrder);
    expect(run.outcome).toBe('finished');
    expect(run.lives).toBe(1);
    expect(run.ticksPerLife).toHaveLength(1);
    expect(run.totalTicks).toBe(run.ticksPerLife[0]);
    expect(run.totalTicks).toBeGreaterThan(0);
  });
  it('finishes a larger book after dying, and every life is counted', () => {
    const run = play(monumentBook(150, 1500), everyRowInOrder);
    expect(run.outcome).toBe('finished');
    expect(run.lives).toBeGreaterThan(1);
    expect(run.ticksPerLife).toHaveLength(run.lives);
    expect(run.totalTicks).toBe(run.ticksPerLife.reduce((a, b) => a + b, 0));
  });
  it('a policy that checks in every 5 seconds is asked about once per 5 seconds of game time', () => {
    let calls = 0;
    const every5: Policy = { ...everyRowInOrder, name: 'every 5 s', checkEverySeconds: 5, decide: (s, book) => { calls += 1; return everyRowInOrder.decide(s, book); } };
    const run = play(monumentBook(150, 1500), every5);
    expect(run.outcome).toBe('finished');
    const perInterval = 5 * balance.time.ticksPerMinute / 60;
    // one call at the start of each life, then one per interval
    expect(calls).toBeGreaterThanOrEqual(Math.floor(run.totalTicks / perInterval));
    expect(calls).toBeLessThanOrEqual(Math.ceil(run.totalTicks / perInterval) + run.lives);
  });
  it('a stall between check-ins is not a freeze: the policy is asked at once, and the book finishes', () => {
    // One row per ask, asked rarely: Mine fills its stack and leaves the queue, time stops,
    // and only an ask right then (not 1000 s later) queues the monument that spends the stone.
    const rows = ['mine', 'monument'];
    let calls = 0;
    const oneAtATime: Policy = {
      name: 'one at a time', sane: false, checkEverySeconds: 1000,
      decide: (s, book) => { const id = rows[calls]; calls += 1; return id === undefined ? s : enqueue(s, book, id); },
    };
    const run = play(monumentBook(3, 30), oneAtATime);
    expect(run.outcome).toBe('finished');
    expect(run.lives).toBe(1);
    expect(calls).toBe(2);   // the first ask, and the ask the stall triggered
  });
  it('stops frozen, alive, when nothing the policy queues can run', () => {
    const run = play(frozenBook(), everyRowInOrder);
    expect(run.outcome).toBe('frozen');
    expect(run.lives).toBe(1);
    expect(run.ticksPerLife[0]).toBeGreaterThan(0);
    // alive: it froze well inside the first life a sane policy lives (panel measured 1.86 min)
    expect(run.ticksPerLife[0]).toBeLessThan(balance.play.minLifeMinutes * balance.time.ticksPerMinute);
  });
  // A ceiling of 1/6 day (4 h of game time) keeps the give-up tests fast; the default is 60 days.
  const quick = { ...balance.play, maxBookDays: 1 / 6 };
  const limit = declaredTicks({ days: quick.maxBookDays });

  it('gives up at the ceiling when the finish is out of reach, after several lives', () => {
    const run = play(monumentBook(100000, 1e9), everyRowInOrder, quick);
    expect(run.outcome).toBe('never-finishes');
    expect(run.lives).toBeGreaterThan(1);
    expect(run.totalTicks).toBe(limit + 1);   // stops on the first tick past it
  });
  it('the ceiling ignores what the book claims', () => {
    const b = monumentBook(100000, 1e9);
    for (const length of [{ hours: 1 }, { days: 50 }]) {
      expect(play({ ...b, length }, everyRowInOrder, quick).totalTicks).toBe(limit + 1);
    }
  });
  it('gives up on a book whose one life never ends', () => {
    // a repeatable x0.5 row that produces nothing and costs nothing: it compounds forever, so decay goes to zero
    const b = monumentBook(100000, 1e9);
    const endless: Book = {
      ...b,
      chapters: [{ ...b.chapters[0]!, order: ['forage', 'balm', 'mine', 'shelter', 'monument'] }],
      actions: { ...b.actions, balm: { id: 'balm', verb: 'forage', noun: 'balm', expCost: 1, itemCosts: [], isOneTime: false, healthDecayMultiplier: 0.5 } },
    };
    const run = play(endless, everyRowInOrder, quick);
    expect(run.outcome).toBe('never-finishes');
    expect(run.lives).toBe(1);   // the premise: nothing ever died
    expect(run.totalTicks).toBe(limit + 1);
  });
});

describe('game time', () => {
  it('declared lengths convert to ticks', () => {
    expect(declaredTicks({ hours: 2 })).toBe(2 * hour);
    expect(declaredTicks({ days: 3 })).toBe(72 * hour);
  });
  it('is shown in hours up to 48, in whole days past it', () => {
    expect(formatGameTime(0.2 * hour)).toBe('< 1 h');
    expect(formatGameTime(0.7 * hour)).toBe('1 h');   // rounds to 1: shown as hours, not '< 1 h'
    expect(formatGameTime(5.3 * hour)).toBe('5 h');
    expect(formatGameTime(48 * hour)).toBe('48 h');
    expect(formatGameTime(48.4 * hour)).toBe('48 h');
    expect(formatGameTime(48.6 * hour)).toBe('2 days');
    expect(formatGameTime(97 * hour)).toBe('4 days');
    expect(formatGameTime(233 * hour)).toBe('10 days');
    expect(formatGameTime(278 * hour)).toBe('12 days');
  });
});
