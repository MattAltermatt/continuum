import { describe, expect, it } from 'vitest';
import { balance } from '../balance';
import type { Content } from '../data/types';
import type { GameEvent, GameState } from './types';
import { enqueue, firstRunnable, fullItem, missingInput, newState, removeAction, settle, stepQueue } from './queue';
import { unitThreshold } from './costs';

const content: Content = {
  roster: [
    { id: 'forage', name: 'Forage', icon: 'sprout' },
    { id: 'mine', name: 'Mine', icon: 'pickaxe' },
    { id: 'build', name: 'Build', icon: 'house' },
    { id: 'craft', name: 'Craft', icon: 'wrench' },
  ],
  items: {
    berries: { id: 'berries', name: 'berries', kind: 'food', cap: 20, healPerUnit: 4 },
    stone: { id: 'stone', name: 'stone', kind: 'material', cap: 5 },
    cabin: { id: 'cabin', name: 'cabin', kind: 'structure', cap: 1 },
  },
  actions: {
    forage: { id: 'forage', verb: 'forage', noun: 'berries', expCost: 1, producedItem: 'berries', producedAmount: 1, itemCosts: [], isOneTime: false },
    mine: { id: 'mine', verb: 'mine', noun: 'stone', expCost: 1, producedItem: 'stone', producedAmount: 1, itemCosts: [], isOneTime: false },
    cabin: { id: 'cabin', verb: 'build', noun: 'a cabin', expCost: 6, producedItem: 'cabin', producedAmount: 1, itemCosts: [{ item: 'stone', amount: 6 }], isOneTime: true, healthDecayMultiplier: 0.5 },
    // Four units over 0.2 XP: a unit every 0.05, less than one tick's 0.1, so a single tick crosses two thresholds.
    quick: { id: 'quick', verb: 'craft', noun: 'a quick thing', expCost: 0.2, itemCosts: [{ item: 'stone', amount: 4 }], isOneTime: true },
  },
};

/** Ticks to complete `expCost` at multiplier 1. Floating point: ten 0.1s are 0.999..., so +1. */
const ticksFor = (expCost: number) => Math.floor(expCost / balance.skills.baseTickExp) + 1;

/**
 * What step() does minus the clock and health, which are Task 4's: settle, then
 * work the queue if anything can run. Events are accumulated across every tick,
 * because the tick an event happens on is rarely the last one run.
 */
function run(state: GameState, n: number): { s: GameState; events: GameEvent[] } {
  let s = state;
  const events: GameEvent[] = [];
  for (let i = 0; i < n; i++) {
    const settled = settle(s, content);
    if (settled !== s) events.push(...settled.events);
    s = settled;
    const index = firstRunnable(s, content);
    if (index === -1) continue;
    s = stepQueue(s, content, index);
    events.push(...s.events);
  }
  return { s, events };
}

const ofType = (events: GameEvent[], type: GameEvent['type']) => events.filter((e) => e.type === type);

describe('enqueue and remove', () => {
  it('appends by default and puts front entries first', () => {
    let s = enqueue(newState(content.roster), content, 'forage');
    s = enqueue(s, content, 'mine', { front: true });
    expect(s.queue.map((e) => e.actionId)).toEqual(['mine', 'forage']);
  });
  it('holds one entry per action: a second enqueue of anything already queued is a no-op', () => {
    const once = enqueue(newState(content.roster), content, 'forage');
    expect(enqueue(once, content, 'forage')).toBe(once);
    const cabin = enqueue(newState(content.roster), content, 'cabin');
    expect(enqueue(cabin, content, 'cabin')).toBe(cabin);
  });
  it('a dead run takes no orders: enqueue and removeAction leave it untouched', () => {
    const queued = enqueue(newState(content.roster), content, 'forage');
    const dead = { ...queued, dead: true };
    expect(enqueue(dead, content, 'mine')).toBe(dead);
    expect(enqueue(dead, content, 'forage', { front: true })).toBe(dead);
    expect(removeAction(dead, 'forage')).toBe(dead);
  });
  it('refuses a one-time action already completed this run', () => {
    expect(enqueue({ ...newState(content.roster), completedOneTime: ['cabin'] }, content, 'cabin').queue).toHaveLength(0);
  });
  it('front on an action already queued moves that entry to the front, keeping its progress', () => {
    let s = enqueue(newState(content.roster), content, 'forage');
    s = enqueue(s, content, 'mine');
    s = run(s, 3).s;                                         // forage has progress
    s = enqueue(s, content, 'mine', { front: true });
    expect(s.queue.map((e) => e.actionId)).toEqual(['mine', 'forage']);
    expect(s.queue[1]!.progress).toBeGreaterThan(0);
    expect(s.queue).toHaveLength(2);
  });
  it('removeAction removes by action id, and is the same object when there is nothing to remove', () => {
    let s = enqueue(newState(content.roster), content, 'forage');
    s = enqueue(s, content, 'mine');
    expect(removeAction(s, 'forage').queue.map((e) => e.actionId)).toEqual(['mine']);
    expect(removeAction(s, 'cabin')).toBe(s);
  });
});

describe('missingInput, fullItem, firstRunnable', () => {
  it('a free action is always runnable; a costed one needs its due units', () => {
    const free = enqueue(newState(content.roster), content, 'forage');
    expect(firstRunnable(free, content)).toBe(0);
    const broke = enqueue(newState(content.roster), content, 'cabin');
    expect(missingInput(broke, content, broke.queue[0]!)).toBe('stone');
    expect(firstRunnable(broke, content)).toBe(-1);
    expect(firstRunnable({ ...broke, inventory: { stone: 1 } }, content)).toBe(0);
  });
  it('an entry owes its next unit only once progress reaches that unit\'s threshold', () => {
    const s = enqueue(newState(content.roster), content, 'cabin');
    const midway = { ...s.queue[0]!, progress: 1.5, costsConsumed: 2 };   // unit 2 falls due at progress 2
    expect(missingInput(s, content, midway)).toBeNull();
    const atThreshold = { ...midway, progress: unitThreshold(content.actions.cabin!, 2) };
    expect(missingInput(s, content, atThreshold)).toBe('stone');
    expect(missingInput({ ...s, inventory: { stone: 1 } }, content, atThreshold)).toBeNull();
  });
  it('a producer with no room for one more completion is full, and full is not runnable', () => {
    const s = enqueue({ ...newState(content.roster), inventory: { stone: 5 } }, content, 'mine');
    expect(fullItem(s, content, s.queue[0]!)).toBe('stone');
    expect(firstRunnable(s, content)).toBe(-1);
    expect(fullItem({ ...s, inventory: { stone: 4 } }, content, s.queue[0]!)).toBeNull();
  });
  it('sees past the stalled flag: a flagged entry whose input has arrived is runnable', () => {
    const { s } = run(enqueue({ ...newState(content.roster), inventory: { stone: 1 } }, content, 'cabin'), 30);
    expect(s.queue[0]!.stalled).toBe(true);
    expect(firstRunnable(s, content)).toBe(-1);
    expect(firstRunnable({ ...s, inventory: { stone: 3 } }, content)).toBe(0);
  });
});

describe('settle', () => {
  it('flags a never-started entry that cannot pay, emits stalled once, and does no work', () => {
    const s = enqueue(newState(content.roster), content, 'cabin');
    const once = settle(s, content);
    expect(once.queue[0]!.stalled).toBe(true);
    expect(once.events).toEqual([{ type: 'stalled', actionId: 'cabin', item: 'stone' }]);
    expect(once.queue[0]!.progress).toBe(0);
    expect(settle(once, content)).toBe(once);
  });
  it('unflags a waiting entry the moment it can pay, with resumed', () => {
    const waiting = settle(enqueue(newState(content.roster), content, 'cabin'), content);
    const fed = settle({ ...waiting, inventory: { stone: 1 } }, content);
    expect(fed.queue[0]!.stalled).toBe(false);
    expect(fed.events).toEqual([{ type: 'resumed', actionId: 'cabin' }]);
  });
  it('drops a producer queued onto a full stack, with full, before any work', () => {
    const s = enqueue({ ...newState(content.roster), inventory: { stone: 5 } }, content, 'mine');
    const settled = settle(s, content);
    expect(settled.queue).toHaveLength(0);
    expect(settled.events).toEqual([{ type: 'full', actionId: 'mine', item: 'stone' }]);
    expect(settled.skills.mine!.core.exp).toBe(0);
  });
  it('is the same object when nothing changes', () => {
    const s = enqueue(newState(content.roster), content, 'forage');
    expect(settle(s, content)).toBe(s);
  });
});

describe('running a free repeatable action', () => {
  it('produces one berries per completion, keeps repeating, and emits completed', () => {
    let r = run(enqueue(newState(content.roster), content, 'forage'), ticksFor(1));
    expect(r.s.inventory.berries).toBe(1);
    expect(r.s.queue).toHaveLength(1);
    expect(r.events).toContainEqual({ type: 'completed', actionId: 'forage', oneTime: false });
    r = run(r.s, ticksFor(1));
    expect(r.s.inventory.berries).toBe(2);
  });
  it('awards tick XP to the verb skill on both ledgers', () => {
    const s = stepQueue(enqueue(newState(content.roster), content, 'forage'), content, 0);
    expect(s.skills.forage!.core.exp).toBeCloseTo(balance.skills.baseTickExp, 9);
    expect(s.skills.forage!.run.exp).toBeCloseTo(balance.skills.baseTickExp, 9);
    expect(s.skills.mine!.core.exp).toBe(0);
  });
  it('emits coreLevel when a core level lands', () => {
    const { s, events } = run(enqueue(newState(content.roster), content, 'forage'), ticksFor(balance.skills.coreMastery.baseExp));
    expect(s.skills.forage!.core.level).toBe(1);
    expect(events).toContainEqual({ type: 'coreLevel', skill: 'forage', level: 1 });
  });
  it('stops at a full stack: the completion that fills it lands, then the entry leaves with full, and the XP stays', () => {
    const { s, events } = run(enqueue({ ...newState(content.roster), inventory: { stone: 4 } }, content, 'mine'), 30);
    expect(s.inventory.stone).toBe(5);
    expect(s.queue).toHaveLength(0);
    expect(ofType(events, 'completed')).toHaveLength(1);
    expect(events).toContainEqual({ type: 'full', actionId: 'mine', item: 'stone' });
    expect(s.skills.mine!.core.exp).toBeGreaterThan(0);
  });
});

describe('the cabin: costs drain into the work, and the stall is not an error', () => {
  it('spends the first stone just to begin', () => {
    const s = stepQueue(enqueue({ ...newState(content.roster), inventory: { stone: 5 } }, content, 'cabin'), content, 0);
    expect(s.inventory.stone).toBe(4);
    expect(s.queue[0]?.costsConsumed).toBe(1);
  });
  it('stalls in place at the unpaid unit\'s threshold, keeping progress, and emits stalled exactly once', () => {
    const { s, events } = run(enqueue({ ...newState(content.roster), inventory: { stone: 2 } }, content, 'cabin'), 30);
    const cabin = s.queue[0]!;
    expect(cabin.stalled).toBe(true);
    expect(cabin.costsConsumed).toBe(2);
    expect(cabin.progress).toBe(unitThreshold(content.actions.cabin!, 2));
    // XP is the progress made, not the ticks spent: the clamped tick earns only what it applied.
    expect(s.skills.build!.core.exp).toBeCloseTo(cabin.progress, 9);
    expect(s.skills.build!.run.exp).toBeCloseTo(cabin.progress, 9);
    expect(s.inventory.stone).toBe(0);
    expect(ofType(events, 'stalled')).toEqual([{ type: 'stalled', actionId: 'cabin', item: 'stone' }]);
  });
  it('runs the first runnable entry behind a stalled one', () => {
    let { s } = run(enqueue({ ...newState(content.roster), inventory: { stone: 1 } }, content, 'cabin'), 30);
    expect(s.queue[0]?.stalled).toBe(true);
    s = enqueue(s, content, 'mine');
    expect(firstRunnable(s, content)).toBe(1);
    const r = run(s, ticksFor(1));
    expect(r.events).toContainEqual({ type: 'completed', actionId: 'mine', oneTime: false });
  });
  it('resumes from exactly where it stopped once the stone arrives, and emits resumed', () => {
    const { s } = run(enqueue({ ...newState(content.roster), inventory: { stone: 1 } }, content, 'cabin'), 30);
    const before = s.queue[0]!;
    const r = run({ ...s, inventory: { stone: 5 } }, 1);
    expect(r.s.queue[0]?.stalled).toBe(false);
    // Exactly one tick of work on top of where it stopped, and exactly the one owed unit paid: nothing re-paid, nothing skipped.
    expect(r.s.queue[0]!.progress).toBeCloseTo(before.progress + balance.skills.baseTickExp, 9);
    expect(r.s.queue[0]!.costsConsumed).toBe(before.costsConsumed + 1);
    expect(r.s.inventory.stone).toBe(4);
    expect(r.events).toContainEqual({ type: 'resumed', actionId: 'cabin' });
  });
  it('completes as one-time: produces the cabin, slows the clock, leaves the queue, records it', () => {
    let { s } = run(enqueue({ ...newState(content.roster), inventory: { stone: 5 } }, content, 'cabin'), 70);
    expect(s.queue[0]?.stalled).toBe(true);   // 6 needed, 5 held: stalls at the last unit
    s = run({ ...s, inventory: { stone: 1 } }, 20).s;
    expect(s.inventory.cabin).toBe(1);
    expect(s.inventory.stone).toBe(0);
    expect(s.queue).toHaveLength(0);
    expect(s.completedOneTime).toEqual(['cabin']);
    expect(s.completionCounts.cabin).toBe(1);
    expect(s.decayMultiplier).toBe(0.5);
  });
});

describe('the run multiplier', () => {
  it('a one-time build multiplies the decay multiplier, it does not replace it', () => {
    let { s } = run(enqueue({ ...newState(content.roster), decayMultiplier: 0.5, inventory: { stone: 5 } }, content, 'cabin'), 70);
    s = run({ ...s, inventory: { stone: 1 } }, 20).s;
    expect(s.decayMultiplier).toBe(0.25);
  });
});

describe('progress never runs past an unpaid unit', () => {
  it('completes on the tick progress reaches expCost exactly (0.1 + 0.1 is exactly 0.2)', () => {
    const { events } = run(enqueue({ ...newState(content.roster), inventory: { stone: 4 } }, content, 'quick'), 2);
    expect(ofType(events, 'completed')).toHaveLength(1);
  });
  it('a tick that crosses two thresholds pays both, and every unit is paid before completion', () => {
    const { s, events } = run(enqueue({ ...newState(content.roster), inventory: { stone: 4 } }, content, 'quick'), 5);
    expect(ofType(events, 'completed')).toHaveLength(1);
    expect(s.inventory.stone).toBe(0);
  });
  it('a tick that crosses an unpayable threshold clamps progress to it and waits owing one unit', () => {
    const { s } = run(enqueue({ ...newState(content.roster), inventory: { stone: 1 } }, content, 'quick'), 3);
    expect(s.queue[0]!.stalled).toBe(true);
    expect(s.queue[0]!.costsConsumed).toBe(1);
    expect(s.queue[0]!.progress).toBe(unitThreshold(content.actions.quick!, 1));
    // The one working tick made 0.05 of progress before the clamp, not its 0.1: XP is what was made.
    expect(s.skills.craft!.core.exp).toBeCloseTo(0.05, 9);
  });
  it('the completing tick cannot pass the last unpaid unit: it waits below expCost instead of completing', () => {
    const { s, events } = run(enqueue({ ...newState(content.roster), inventory: { stone: 3 } }, content, 'quick'), 5);
    expect(ofType(events, 'completed')).toHaveLength(0);
    expect(s.queue[0]!.stalled).toBe(true);
    expect(s.queue[0]!.costsConsumed).toBe(3);
    expect(s.queue[0]!.progress).toBeLessThan(content.actions.quick!.expCost);
  });
});

describe('a verb with no skill state', () => {
  it('throws: a validated book cannot produce one, so a fixture that does is a bug', () => {
    const chop: Content = {
      ...content,
      actions: { chop: { id: 'chop', verb: 'chop', noun: 'wood', expCost: 1, itemCosts: [], isOneTime: false } },
    };
    const s = enqueue(newState(content.roster), chop, 'chop');
    expect(() => stepQueue(s, chop, 0)).toThrow(/chop/);
  });
});
