import { describe, expect, it } from 'vitest';
import { balance } from '../balance';
import { fixture } from './fixture';
import type { Content } from '../data/types';
import { unlockAt } from './automation';
import { damagePerTick, hurtsPerSecond } from './health';
import { deathSummary } from './rebirth';
import { ticksPerSecond } from './time';
import { enqueue, newState } from './queue';
import { setPaused, step } from './tick';
import type { GameState } from './types';

const content = fixture;
const live = (s: GameState) => setPaused(s, 'none');
const fresh = () => newState(content.roster);

describe('step', () => {
  it('does nothing while paused', () => {
    const s = enqueue(fresh(), content, 'fish');
    expect(step(s, content)).toBe(s);
  });
  it('does nothing with an empty queue: time passes only while work happens (decision #41)', () => {
    const s = live(fresh());
    expect(step(s, content)).toBe(s);
  });
  it('a top that cannot start pops and says why without the clock, then nothing happens', () => {
    const s = live(enqueue(fresh(), content, 'hull'));
    const after = step(s, content);
    expect(after.runTicks).toBe(0);
    expect(after.health).toBe(s.health);
    expect(after.queue).toEqual([]);
    expect(after.events).toEqual([{ type: 'short', actionId: 'hull', item: 'scrap', amount: 8, maker: 'salvage', gap: 'unearned' }]);
    expect(step(after, content)).toBe(after);
  });
  it('a producer on a full stack leaves without the clock', () => {
    const s = live(enqueue({ ...fresh(), inventory: { fish: balance.inventory.stackCap } }, content, 'fish'));
    const after = step(s, content);
    expect(after.queue).toHaveLength(0);
    expect(after.runTicks).toBe(0);
    expect(after.events).toEqual([{ type: 'popped', actionId: 'fish', reason: 'full' }]);
    expect(step(after, content)).toBe(after);
  });
  it('advances the run clock, applies decay, and works the top', () => {
    const s = step(live(enqueue(fresh(), content, 'fish')), content);
    expect(s.runTicks).toBe(1);
    expect(s.health).toBeCloseTo(balance.health.base - damagePerTick(1, 1), 9);
    expect(s.skills.fish!.core.exp).toBeGreaterThan(0);
  });
  it('decays before it eats: a bite that fits only after this tick\'s damage is taken', () => {
    const s = step(live(enqueue({ ...fresh(), health: 96.005, inventory: { fish: 1 } }, content, 'salvage')), content);
    expect(s.inventory.fish).toBe(0);
    expect(s.health).toBeCloseTo(96.005 - damagePerTick(1, 1) + 4, 9);
  });
  it('stops ticking after death', () => {
    const s = step(live(enqueue({ ...fresh(), health: 0.0001 }, content, 'fish')), content);
    expect(s.dead).toBe(true);
    expect(s.events).toContainEqual({ type: 'died', runTicks: 1 });
    expect(step(s, content)).toBe(s);
  });
  it('setPaused cannot lift or change death\'s system pause', () => {
    const dead = { ...fresh(), dead: true, paused: 'system' as const };
    expect(setPaused(dead, 'none')).toBe(dead);
    expect(setPaused(dead, 'player')).toBe(dead);
  });
});

describe('hurts (section 6.1)', () => {
  const hurting: Content = { ...content, actions: { ...content.actions, raid: { ...content.actions.raid!, hurts: 1 } } };
  const raidOn = (extra: Partial<GameState> = {}): GameState => live({ ...fresh(), inventory: { pass: 1 }, queue: [{ id: 0, actionId: 'raid', mode: 'once', by: 'player' }], nextEntryId: 1, work: { raid: { progress: 5, costsConsumed: 0 } }, ...extra });
  it('a hurting top loses decay plus its hurt per tick', () => {
    const s = raidOn();
    const after = step(s, hurting);
    expect(hurtsPerSecond(s, hurting)).toBe(1);
    expect(after.health).toBeCloseTo(balance.health.base - damagePerTick(1, 1) - 1 / ticksPerSecond(), 12);
  });
  it('with JIT food on top instead, decay only, and the fight keeps its work', () => {
    const s = raidOn({ completionCounts: { fish: unlockAt(content.actions.fish!) }, automation: { fish: 'jit' } });
    const after = step(s, hurting);
    expect(after.queue.map((e) => e.actionId)).toEqual(['fish', 'raid']);
    expect(after.health).toBeCloseTo(balance.health.base - damagePerTick(1, 1), 12);
    expect(after.work.raid).toEqual({ progress: 5, costsConsumed: 0 });
  });
  it('a hurt that takes health to zero dies with the run clock, and the card names the row', () => {
    const s = raidOn({ health: damagePerTick(1, 1) + 0.05 });
    const after = step(s, hurting);
    expect(after.dead).toBe(true);
    expect(after.events).toContainEqual({ type: 'died', runTicks: 1 });
    expect(deathSummary(after, hurting).during).toBe('raid');
  });
  it('a death to decay under a top that does not hurt names no row', () => {
    const dead = step(live(enqueue({ ...fresh(), health: 0.0001 }, content, 'fish')), content);
    expect(dead.dead).toBe(true);
    expect(deathSummary(dead, content).during).toBeNull();
  });
});
