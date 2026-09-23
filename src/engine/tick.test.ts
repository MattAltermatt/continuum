import { describe, expect, it } from 'vitest';
import { balance } from '../balance';
import type { Content } from '../data/types';
import { enqueue, newState } from './queue';
import { damagePerTick } from './health';
import { setPaused, step } from './tick';
import type { GameState } from './types';

const content: Content = {
  items: {
    berries: { id: 'berries', name: 'berries', kind: 'food', cap: 20, healPerUnit: 4 },
    stone: { id: 'stone', name: 'stone', kind: 'material', cap: 5 },
    cabin: { id: 'cabin', name: 'cabin', kind: 'structure', cap: 1 },
  },
  actions: {
    forage: { id: 'forage', verb: 'forage', noun: 'berries', expCost: 1, producedItem: 'berries', producedAmount: 1, itemCosts: [], isOneTime: false },
    cabin: { id: 'cabin', verb: 'build', noun: 'a cabin', expCost: 6, producedItem: 'cabin', producedAmount: 1, itemCosts: [{ item: 'stone', amount: 6 }], isOneTime: true },
  },
};

const live = (s: GameState) => setPaused(s, 'none');

describe('step', () => {
  it('does nothing while paused', () => {
    const s = enqueue(newState(), content, 'forage');
    expect(step(s, content)).toBe(s);
  });
  it('does nothing with an empty queue: time passes only while work happens (decision #41)', () => {
    const s = live(newState());
    expect(step(s, content)).toBe(s);
  });
  it('a never-started entry that cannot run is flagged and reported without the clock, then nothing happens', () => {
    const s = live(enqueue(newState(), content, 'cabin'));
    const after = step(s, content);
    expect(after.runTicks).toBe(0);
    expect(after.health).toBe(s.health);
    expect(after.queue[0]!.stalled).toBe(true);
    expect(after.events).toEqual([{ type: 'stalled', actionId: 'cabin', item: 'stone' }]);
    expect(step(after, content)).toBe(after);
  });
  it('a producer on a full stack leaves without the clock', () => {
    const s = live(enqueue({ ...newState(), inventory: { berries: 20 } }, content, 'forage'));
    const after = step(s, content);
    expect(after.queue).toHaveLength(0);
    expect(after.runTicks).toBe(0);
    expect(after.events).toEqual([{ type: 'full', actionId: 'forage', item: 'berries' }]);
    expect(step(after, content)).toBe(after);
  });
  it('a waiting entry resumes on its own the tick its input is there, and that tick counts', () => {
    let s = live(enqueue({ ...newState(), inventory: { stone: 1 } }, content, 'cabin'));
    for (let i = 0; i < 30; i++) s = step(s, content);
    expect(s.queue[0]!.stalled).toBe(true);
    expect(step(s, content)).toBe(s);
    const fed = step({ ...s, inventory: { stone: 5 } }, content);
    expect(fed.queue[0]!.stalled).toBe(false);
    expect(fed.runTicks).toBe(s.runTicks + 1);
    expect(fed.events).toContainEqual({ type: 'resumed', actionId: 'cabin' });
  });
  it('advances the run clock, applies decay, and works the queue', () => {
    const s = step(live(enqueue(newState(), content, 'forage')), content);
    expect(s.runTicks).toBe(1);
    expect(s.health).toBeCloseTo(balance.health.base - damagePerTick(1, 1), 9);   // decay is read at the tick's new clock
    expect(s.skills.forage.core.exp).toBeGreaterThan(0);
  });
  it('decays before it eats (MECHANICS section 2): a bite that fits only after this tick\'s damage is taken', () => {
    const s = step(live(enqueue({ ...newState(), health: 96.005, inventory: { berries: 1 } }, content, 'forage')), content);
    expect(s.inventory.berries).toBe(0);
    expect(s.health).toBeCloseTo(96.005 - damagePerTick(1, 1) + 4, 9);
  });
  it('stops ticking after death', () => {
    const s = step(live(enqueue({ ...newState(), health: 0.0001 }, content, 'forage')), content);
    expect(s.dead).toBe(true);
    expect(s.events).toContainEqual({ type: 'died', runTicks: 1 });
    expect(step(s, content)).toBe(s);
  });
  it('setPaused cannot lift or change death\'s system pause', () => {
    const dead = { ...newState(), dead: true, paused: 'system' as const };
    expect(setPaused(dead, 'none')).toBe(dead);
    expect(setPaused(dead, 'player')).toBe(dead);
  });
});
