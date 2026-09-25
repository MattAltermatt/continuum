import { describe, expect, it } from 'vitest';
import { balance } from '../balance';
import type { Book } from '../data/types';
import { windwardRun } from '../data/windward-run';
import { canJit } from './automation';
import { declaredTicks, attentive, formatGameTime, freezeCause, handsOn, play, prioritized, type Policy } from './play';
import { fixture, withOrder } from './fixture';
import { stops } from './fight';
import { setAutomation, unlockAt } from './automation';
import { enqueue, newState } from './queue';
import { setPaused, step } from './tick';
import type { GameState } from './types';

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
    chapters: [{ head: { numeral: 'I', chapter: 'One', story: 'A start.' }, pages: [{ name: '', order: ['forage', 'mine', 'shelter', 'monument'], closes: 'monument' }] }],
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

/**
 * The monument book with no shelter on the monument's page, so the monument,
 * which closes the page, waits on nothing (spec 2026-09-24-pages section 4.2):
 * for a test about when the policy is asked, not about the page.
 */
function bareMonument(stone: number, expCost: number): Book {
  const b = monumentBook(stone, expCost);
  return { ...b, chapters: [withOrder(b.chapters[0]!, ['forage', 'mine', 'monument'])] };
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

/**
 * Each case plays whole books, headless: under a second or two on a laptop,
 * past vitest's 5 s default on a slower CI runner (a two-policy case took 5.02 s).
 */
describe('play', { timeout: 30_000 }, () => {
  it('finishes a small book in life 1', () => {
    const run = play(monumentBook(3, 30), attentive);
    expect(run.outcome).toBe('finished');
    expect(run.lives).toBe(1);
    expect(run.ticksPerLife).toHaveLength(1);
    expect(run.totalTicks).toBe(run.ticksPerLife[0]);
    expect(run.totalTicks).toBeGreaterThan(0);
  });
  it('finishes a larger book after dying, and every life is counted', () => {
    const run = play(monumentBook(150, 1500), attentive);
    expect(run.outcome).toBe('finished');
    expect(run.lives).toBeGreaterThan(1);
    expect(run.ticksPerLife).toHaveLength(run.lives);
    expect(run.totalTicks).toBe(run.ticksPerLife.reduce((a, b) => a + b, 0));
  });
  it('a policy that checks in every 5 seconds is asked about once per 5 seconds of game time', () => {
    // Only the interval asks are counted. The play also asks the moment time stops (a drained
    // queue), which the attentive player relies on (one fill per ask); those asks are told apart
    // by the clock: under an interval since the last ask in the same life.
    let intervalAsks = 0;
    let stallAsks = 0;
    let last = { life: 0, at: 0 };
    const perInterval = 5 * balance.time.ticksPerMinute / 60;
    const every5: Policy = {
      ...attentive, name: 'every 5 s', checkEverySeconds: 5,
      decide: (s, book) => {
        if (s.life === last.life && s.runTicks - last.at < perInterval) stallAsks += 1;
        else intervalAsks += 1;
        last = { life: s.life, at: s.runTicks };
        return attentive.decide(s, book);
      },
    };
    const run = play(monumentBook(150, 1500), every5);
    expect(run.outcome).toBe('finished');
    // one at the start of each life, then one per interval; a stall ask restarts the interval, so it can cost one
    expect(intervalAsks).toBeLessThanOrEqual(Math.ceil(run.totalTicks / perInterval) + run.lives);
    expect(intervalAsks).toBeGreaterThanOrEqual(Math.floor(run.totalTicks / perInterval) - stallAsks);
    expect(stallAsks).toBeLessThan(intervalAsks);
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
    const run = play(bareMonument(3, 30), oneAtATime);
    expect(run.outcome).toBe('finished');
    expect(run.lives).toBe(1);
    expect(calls).toBe(2);   // the first ask, and the ask the stall triggered
  });
  it('a queue drained on an asked tick is not a freeze', () => {
    // Asked every tick. The first empty queue gets Mine: it fills to the cap and resolve pops it
    // full on an asked tick, with no time passing. The second gets the monument. Under the
    // round-one rule (no advance on an asking step) the drained ask read frozen.
    let emptyAsks = 0;
    const twoAsks: Policy = {
      name: 'two asks', sane: false, checkEverySeconds: 0,
      decide: (s, book) => {
        if (s.queue.length > 0) return s;
        emptyAsks += 1;
        return emptyAsks === 1 ? enqueue(s, book, 'mine') : emptyAsks === 2 ? enqueue(s, book, 'monument') : s;
      },
    };
    const run = play(bareMonument(3, 30), twoAsks);
    expect(run.outcome).toBe('finished');
    expect(emptyAsks).toBe(2);
  });
  it('a dry ask queues food plus at most the first unfinished one-time and its makers, never the event early', () => {
    // The monument book: food (Forage) + Mine + the shelter; the monument only once the shelter is built.
    let most = 0;
    let dryAsks = 0;
    let early = 0;
    const watch: Policy = {
      ...attentive,
      decide: (s, book) => {
        const next = attentive.decide(s, book);
        if (s.queue.length === 0) { dryAsks += 1; most = Math.max(most, next.queue.length); }
        if (!next.completedOneTime.includes('shelter') && next.queue.some((e) => e.actionId === 'monument')) early += 1;
        return next;
      },
    };
    expect(play(monumentBook(150, 1500), watch).outcome).toBe('finished');
    expect(dryAsks).toBeGreaterThan(0);
    expect(most).toBeGreaterThan(0);
    expect(most).toBeLessThanOrEqual(4);
    expect(early).toBe(0);
  });
  it('prioritized leaves its automated upgrade to the idle fill and does not hand-queue the event over it', () => {
    // The shelter's chip is earned and Mine's too (so the shelter can start by JIT); the monument's is not.
    const b = monumentBook(150, 1500);
    const counts = { shelter: balance.automation.unlockOneTime, mine: balance.automation.unlockRepeatable, forage: balance.automation.unlockRepeatable };
    // Berries at their cap (#77: an empty queue refills a JIT food before the idle fill), so JIT has nothing to
    // do and the idle fill is what runs. Stone is not food (#79) and needs no filling; it is kept for the setup.
    const full = balance.inventory.stackCap;
    const s = setPaused({ ...newState(b.roster), completionCounts: counts, inventory: { berries: full, stone: full } }, 'none');
    const asked = prioritized.decide(s, b);
    expect(asked.automation).toMatchObject({ shelter: 'high', mine: 'jit' });
    expect(asked.queue.some((e) => e.actionId === 'monument')).toBe(false);
    const next = step(asked, b);
    expect(next.events).toContainEqual({ type: 'automated', actionId: 'shelter', why: 'idle' });
  });
  it('prioritized with its upgrade set but blocked, and the event chip off, hand-queues the event (no freeze)', () => {
    // The shelter's chip is earned and set, but Mine's is not: the shelter cannot start, so the idle fill
    // will not take it, and the event must not wait on it (withholding it froze a life in round five).
    const b = monumentBook(150, 1500);
    const counts = { shelter: balance.automation.unlockOneTime, forage: balance.automation.unlockRepeatable };
    const s = setPaused({ ...newState(b.roster), completionCounts: counts, inventory: { berries: 1 } }, 'none');
    const asked = prioritized.decide(s, b);
    expect(asked.automation).toMatchObject({ shelter: 'high' });
    expect(asked.queue.some((e) => e.actionId === 'monument')).toBe(true);
  });
  it('prioritized sets each chip as it arrives: jit where canJit allows, high for a one-time, low for the event', () => {
    const b = monumentBook(150, 1500);
    const all = Object.fromEntries(Object.values(b.actions).map((a) => [a.id, a.isOneTime ? balance.automation.unlockOneTime : balance.automation.unlockRepeatable]));
    const asked = prioritized.decide(setPaused({ ...newState(b.roster), completionCounts: all, inventory: { berries: 1 } }, 'none'), b);
    expect(asked.automation).toEqual({ forage: 'jit', mine: 'jit', shelter: 'high', monument: 'low' });
  });
  it('a dry ask queues only the port\'s first unfinished one-time, behind its maker', () => {
    // Two one-times before the event: only the first (and its stone maker) goes in; the second waits for a later ask.
    const base = monumentBook(150, 1500);
    const shed = { id: 'shed', verb: 'build', noun: 'a shed', expCost: 6, itemCosts: [{ item: 'stone', amount: 2 }], isOneTime: true };
    const b: Book = { ...base, actions: { ...base.actions, shed }, chapters: [withOrder(base.chapters[0]!, ['forage', 'mine', 'shelter', 'shed', 'monument'])] };
    // A berry on hand, so the hungry branch (food first, then return) does not fire.
    const asked = attentive.decide(setPaused({ ...newState(b.roster), inventory: { berries: 1 } }, 'none'), b);
    expect(asked.queue.map((e) => e.actionId)).toEqual(['forage', 'mine', 'shelter']);
  });
  it('handsOn never sets automation; attentive sets only rows canJit allows, only to jit', () => {
    const seen = (p: Policy) => {
      const modes = new Map<string, string>();
      const watch: Policy = { ...p, decide: (s, book) => { const next = p.decide(s, book); for (const [k, v] of Object.entries(next.automation)) modes.set(k, v); return next; } };
      return { modes, watch };
    };
    const b = monumentBook(150, 1500);
    const hands = seen(handsOn);
    expect(play(b, hands.watch).outcome).toBe('finished');
    expect(hands.modes.size).toBe(0);
    const att = seen(attentive);
    expect(play(b, att.watch).outcome).toBe('finished');
    expect(att.modes.size).toBeGreaterThan(0);
    for (const [id, mode] of att.modes) {
      expect(mode, id).toBe('jit');
      expect(canJit(b, b.actions[id]!), id).toBe(true);
    }
  });
  it('a book whose finish is reached reads finished, not a death', () => {
    const run = play(monumentBook(3, 30), attentive);
    expect(run.outcome).toBe('finished');
    expect(run.lives).toBe(1);
  });
  it('chaptersPerLife: lives that cast off to port II and die there read 1, and so does the finishing life', () => {
    // Two ports: the shelter casts off, the monument (in port II, with its own food row) finishes.
    const b = monumentBook(150, 1500);
    const two: Book = {
      ...b,
      chapters: [
        { head: b.chapters[0]!.head, pages: [{ name: '', order: ['forage', 'mine', 'shelter'], closes: 'shelter' }] },
        { head: { numeral: 'II', chapter: 'Two', story: 'Later.' }, pages: [{ name: '', order: ['forage2', 'mine2', 'monument'], closes: 'monument' }] },
      ],
      actions: { ...b.actions, forage2: { ...b.actions.forage!, id: 'forage2' }, mine2: { ...b.actions.mine!, id: 'mine2' } },
    };
    const run = play(two, attentive);
    expect(run.outcome).toBe('finished');
    expect(run.lives).toBeGreaterThan(1);
    expect(run.chaptersPerLife).toHaveLength(run.lives);
    expect(run.chaptersPerLife.slice(0, -1).every((c) => c === 1)).toBe(true);
    expect(run.chaptersPerLife[run.lives - 1]).toBe(two.chapters.length - 1);
  });
  it('chaptersPerLife has one entry per life', () => {
    const run = play(monumentBook(150, 1500), attentive);
    expect(run.lives).toBeGreaterThan(1);
    expect(run.chaptersPerLife).toHaveLength(run.lives);
    expect(run.chaptersPerLife.every((c) => c === 0)).toBe(true);   // one chapter
  });
  it('stops frozen, alive, when nothing the policy queues can run', () => {
    const run = play(frozenBook(), attentive);
    expect(run.outcome).toBe('frozen');
    expect(run.frozen).toEqual({ cause: 'book' });
    expect(run.lives).toBe(1);
    expect(run.ticksPerLife[0]).toBeGreaterThan(0);
    // alive: it froze well inside the first life a sane policy lives (re-measured: 2.01 min)
    expect(run.ticksPerLife[0]).toBeLessThan(balance.play.minLifeMinutes * balance.time.ticksPerMinute);
  });
  it('a freeze the policy caused names the row a person could have started (#69)', () => {
    const idle: Policy = { name: 'idle', sane: false, checkEverySeconds: 0, decide: (s) => s };
    const run = play(monumentBook(3, 30), idle);
    expect(run.outcome).toBe('frozen');
    expect(run.frozen).toEqual({ cause: 'policy', row: 'mine' });   // stone for the shelter; berries move nothing on
  });
  it('a run that did not freeze carries no freeze cause', () => {
    expect(play(monumentBook(3, 30), attentive).frozen).toBeUndefined();
  });
  describe('a fight that would stop (#74)', () => {
    // The fixture's raid hurts and is the port's only one-time; a pass is in hand. Salvage is always there to run
    // instead, so a raid that would kill stops (case 2) rather than carrying on as the only row (case 3).
    const book: Book = { ...fixture, id: 'raid-book', name: 'Raid', version: 1, length: { hours: 1 },
      actions: { ...fixture.actions, raid: { ...fixture.actions.raid!, healthRate: -1 } },
      chapters: [withOrder(fixture.chapters[0]!, ['fish', 'salvage', 'raid']), fixture.chapters[1]!] };
    const low = (fish: number) => setPaused({ ...newState(book.roster), health: 0.3, inventory: { pass: 1, fish }, work: { raid: { progress: 5, costsConsumed: 0 } } }, 'none');
    it('is a freeze the policy caused, found only by Shift+play: the plain press backs off, the forced one fights', () => {
      const s = low(0);
      expect(stops(s, book, book.actions.raid!)).toBe(true);
      expect(freezeCause(s, book)).toEqual({ cause: 'policy', row: 'raid' });
    });
    it('the measuring players fish while fishing can start, and force the fight once it cannot', () => {
      // A fish in hand, but just eaten one: the cooldown keeps the next bite out of the window.
      const one = { ...low(1), foodCooldowns: { fish: balance.health.foodCooldownTicks } };
      expect(stops(one, book, book.actions.raid!)).toBe(true);
      const fishing = attentive.decide(one, book);
      expect(fishing.queue.map((e) => e.actionId)).toEqual(['fish']);
      const full = { ...low(balance.inventory.stackCap), foodCooldowns: { fish: balance.health.foodCooldownTicks } };
      expect(stops(full, book, book.actions.raid!)).toBe(true);
      const forced = attentive.decide(full, book);
      expect(forced.queue[0]).toMatchObject({ actionId: 'raid', forced: true });
      // The prioritized player puts the raid on a chip: automated, it fights on by itself, so nothing is forced.
      const chipped = prioritized.decide({ ...full, completionCounts: { raid: unlockAt(book, book.actions.raid!) } }, book);
      expect(chipped.automation.raid).toBeDefined();
      expect(chipped.queue.some((e) => e.forced === true)).toBe(false);
    });
    it('under case 1 they leave the time-buying to automation: the fight is queued plain, never forced', () => {
      const one = { ...low(1), foodCooldowns: { fish: balance.health.foodCooldownTicks }, completionCounts: { fish: unlockAt(book, book.actions.fish!) }, automation: { fish: 'jit' as const } };
      expect(stops(one, book, book.actions.raid!)).toBe(false);
      const d = attentive.decide(one, book);
      expect(d.queue.some((e) => e.forced === true)).toBe(false);
      expect(d.queue.map((e) => e.actionId)).toContain('raid');
    });
  });
  // A ceiling of 1/6 day (4 h of game time) keeps the give-up tests fast; the default is 60 days.
  const quick = { ...balance.play, maxBookDays: 1 / 6 };
  const limit = declaredTicks({ days: quick.maxBookDays });

  it('gives up at the ceiling when the finish is out of reach, after several lives', () => {
    const run = play(monumentBook(3, 1e9), attentive, quick);
    expect(run.outcome).toBe('never-finishes');
    expect(run.lives).toBeGreaterThan(1);
    expect(run.totalTicks).toBe(limit + 1);   // stops on the first tick past it
  });
  it('the ceiling ignores what the book claims', () => {
    const b = monumentBook(3, 1e9);
    for (const length of [{ hours: 1 }, { days: 50 }]) {
      expect(play({ ...b, length }, attentive, quick).totalTicks).toBe(limit + 1);
    }
  });
  it('gives up on a book whose one life never ends', () => {
    // a repeatable x0.5 row that produces nothing and costs nothing: it compounds forever, so decay goes to zero
    const b = monumentBook(100000, 1e9);
    const endless: Book = {
      ...b,
      chapters: [withOrder(b.chapters[0]!, ['forage', 'balm', 'mine', 'shelter', 'monument'])],
      actions: { ...b.actions, balm: { id: 'balm', verb: 'forage', noun: 'balm', expCost: 1, itemCosts: [], isOneTime: false, healthDecayMultiplier: 0.5 } },
    };
    // The attentive player queues food and one-times, never a repeatable that makes nothing: this one runs the balm.
    const balmer: Policy = { name: 'balm', sane: false, checkEverySeconds: 0, decide: (s, book) => (s.queue.length > 0 ? s : enqueue(s, book, 'balm')) };
    const run = play(endless, balmer, quick);
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

describe('prioritized, when automation leaves the queue empty (#78 task 6)', () => {
  it('presses the next one-time by hand, chip or not, and time passes: the freeze a halved-costs book reached', () => {
    // The state the probe froze in: the hull, net and satchel chipped high, Salvage not yet earned, fish full.
    const book = windwardRun;
    const chips = { hull: 'high', net: 'high', satchel: 'high', sails: 'low', fish: 'jit' } as const;
    const counts = Object.fromEntries(Object.keys(chips).map((id) => [id, unlockAt(book, book.actions[id]!)]));
    const s: GameState = setPaused({ ...newState(book.roster), completionCounts: counts, automation: chips, inventory: { 'cloud-fish': balance.inventory.stackCap } }, 'none');
    expect(step(s, book).runTicks).toBe(s.runTicks);
    const decided = prioritized.decide(s, book);
    expect(decided.queue.map((e) => e.actionId)).toContain('hull');
    expect(step(decided, book).runTicks).toBeGreaterThan(s.runTicks);
  });
});

describe('touches and hurt share', () => {
  const book = monumentBook(3, 30);
  it('one ask that changed the state is one touch, whatever it queued; an ask that changed nothing is none', () => {
    // One ask queues three orders (one touch); every later ask returns the state as it is. The run then freezes
    // once the orders are spent, so the count is exactly one, not a function of how fast berries are eaten.
    const once: Policy = {
      name: 'three at once', sane: false, checkEverySeconds: 0,
      decide: (s, b) => (s.queue.length > 0 || (s.completionCounts.shelter ?? 0) > 0 ? s : ['forage', 'mine', 'shelter'].reduce((acc, id) => enqueue(acc, b, id), s)),
    };
    const run = play(book, once);
    expect(run.outcome).toBe('frozen');
    expect(run.touchesPerLife).toEqual([1]);
  });
  it('a chip switched is a touch, like an order', () => {
    // The book earns a chip at one completion: one ask orders forage (a touch), a later ask switches it to JIT
    // (a touch), and every ask after that changes nothing. Two touches in the one life; the run freezes when the
    // full stack blocks JIT's idle fill.
    const ready = { ...book, automation: { unlockRepeatable: 1 } };
    let switched = false;
    const chip: Policy = {
      name: 'one chip', sane: false, checkEverySeconds: 0,
      decide: (s, b) => {
        if ((s.completionCounts.forage ?? 0) >= 1 && !switched) { switched = true; return setAutomation(s, b, 'forage', 'jit'); }
        return switched || s.queue.length > 0 ? s : enqueue(s, b, 'forage');
      },
    };
    const run = play(ready, chip);
    expect(run.outcome).toBe('frozen');
    expect(run.touchesPerLife[0]).toBe(2);
  });
  it('hurt share is the share of ticks the working row drained on, the killing tick included; 0 for a book that does not hurt', () => {
    expect(play(book, attentive).hurtShare).toBe(0);
    // The monument drains: it hurts on every tick it works, and the run still finishes.
    const fight = { ...book, actions: { ...book.actions, monument: { ...book.actions.monument!, healthRate: -0.1 } } };
    const run = play(fight, attentive);
    expect(run.outcome).toBe('finished');
    expect(run.hurtShare).toBeGreaterThan(0);
    expect(run.hurtShare).toBeLessThanOrEqual(1);
    // Every row drains, so nothing calm can run instead and the fight guard lets the drain go on (#74 case 3):
    // 3 hp a tick kills a fresh player on tick 34, and every tick of every life is a hurt tick, the killing one included.
    const killer = { ...book, actions: Object.fromEntries(Object.entries(book.actions).map(([id, a]) => [id, { ...a, healthRate: -30 }])) };
    const dead = play(killer, attentive, { ...balance.play, maxBookDays: 1 / 24 / 60 });
    expect(dead.lives).toBeGreaterThan(1);
    expect(dead.hurtShare).toBe(1);   // without the killing tick it would be (total - deaths) / total
  });
  it('the completing tick counts for the row that completed, not for whatever is on top after it', () => {
    // One hurting one-time row that is the finish: every tick drains, and the last one pops the queue empty, so a
    // counter that read the top after the tick would miss it (30 ticks at 0.1 xp a tick; 29/30 without the event).
    const one: Book = {
      id: 'one', name: 'One', version: 1, finish: 'stand', length: { hours: 1 },
      roster: [{ id: 'fight', name: 'Fight', icon: 'sword' }], items: {},
      chapters: [{ head: { numeral: 'I', chapter: 'One', story: '.' }, pages: [{ name: '', order: ['stand'], closes: 'stand' }] }],
      actions: { stand: { id: 'stand', verb: 'fight', noun: 'it', expCost: 3, itemCosts: [], isOneTime: true, healthRate: -1 } },
    };
    expect(play(one, attentive)).toMatchObject({ outcome: 'finished', totalTicks: 30, hurtShare: 1 });
  });
});
