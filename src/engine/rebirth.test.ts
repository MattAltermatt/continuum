import { describe, expect, it } from 'vitest';
import { balance } from '../balance';
import { newState } from './queue';
import { deathSummary, rebirth, rebirthGain } from './rebirth';
import type { GameState } from './types';

const minute = balance.time.ticksPerMinute;
const roster = [{ id: 'forage', name: 'Forage', icon: 'sprout' }, { id: 'mine', name: 'Mine', icon: 'pickaxe' }, { id: 'build', name: 'Build', icon: 'house' }] as const;

/** A dead state with every field away from its default, so a reset and a persist are both visible. */
function deadLife(): GameState {
  const fresh = newState(roster);
  return {
    ...fresh,
    runTicks: 10 * minute,
    health: 0,
    maxHealth: balance.health.base + 1,
    paused: 'system',
    dead: true,
    skills: { ...fresh.skills, forage: { core: { level: 3, exp: 2.5 }, run: { level: 2, exp: 1 } }, mine: { core: { level: 1, exp: 0 }, run: { level: 1, exp: 4 } } },
    inventory: { berries: 5, stone: 3 },
    foodCooldowns: { berries: 10 },
    queue: [{ actionId: 'hall', progress: 12, costsConsumed: 4, stalled: false }],
    completedOneTime: ['cabin'],
    completionCounts: { forage: 7, cabin: 1 },
    decayMultiplier: 0.8,
    events: [{ type: 'died', runTicks: 10 * minute }],
    life: 2,
    rebirthBonus: 1,
    lifeStartCore: { ...fresh.lifeStartCore, forage: 1, mine: 1 },
  };
}

describe('rebirthGain', () => {
  it('is growthRate ^ minutes - 1, pinned at the spec table', () => {
    expect(rebirthGain(5 * minute)).toBeCloseTo(0.6105, 4);
    expect(rebirthGain(10 * minute)).toBeCloseTo(1.5937, 4);
    expect(rebirthGain(20 * minute)).toBeCloseTo(5.7275, 4);
    expect(rebirthGain(30 * minute)).toBeCloseTo(16.4494, 4);
  });
  it('is zero at zero and positive after one tick', () => {
    expect(rebirthGain(0)).toBe(0);
    expect(rebirthGain(1)).toBeCloseTo(1.1 ** (1 / 600) - 1, 15);
  });
  it('is continuous within a minute, not stepped', () => {
    expect(rebirthGain(9.5 * minute)).toBeGreaterThan(rebirthGain(9 * minute));
    expect(rebirthGain(9.5 * minute)).toBeLessThan(rebirthGain(10 * minute));
  });
});

describe('rebirth: what resets (spec 2.1)', () => {
  const dead = deadLife();
  const next = rebirth(dead);
  it('empties the pack, food included, the queue, one-time completions and food cooldowns', () => {
    expect(next.inventory).toEqual({});
    expect(next.queue).toEqual([]);
    expect(next.completedOneTime).toEqual([]);
    expect(next.foodCooldowns).toEqual({});
  });
  it('zeroes the run clock, restores the decay multiplier, clears events, and is alive', () => {
    expect(next.runTicks).toBe(0);
    expect(next.decayMultiplier).toBe(1);
    expect(next.events).toEqual([]);
    expect(next.dead).toBe(false);
  });
  it('starts the life on a system pause, which Begin replaces with none', () => {
    expect(next.paused).toBe('system');
  });
  it('puts every run ledger back to level 0 with no exp, for every skill the dead state had', () => {
    expect(Object.keys(next.skills)).toEqual(Object.keys(dead.skills));
    for (const id of Object.keys(dead.skills)) expect(next.skills[id]!.run).toEqual({ level: 0, exp: 0 });
  });
});

describe('rebirth: what persists (spec 2.2)', () => {
  const dead = deadLife();
  const next = rebirth(dead);
  it('keeps every core ledger, level and exp, and snapshots the same keys', () => {
    expect(Object.keys(next.skills)).toEqual(Object.keys(dead.skills));
    expect(Object.keys(next.lifeStartCore)).toEqual(Object.keys(dead.skills));
    for (const id of Object.keys(dead.skills)) expect(next.skills[id]!.core).toEqual(dead.skills[id]!.core);
  });
  it('keeps lifetime completion counts', () => {
    expect(next.completionCounts).toEqual({ forage: 7, cabin: 1 });
  });
  it('counts the life up, accrues the bonus, and fills health to the new maximum', () => {
    const gain = rebirthGain(dead.runTicks);
    expect(next.life).toBe(3);
    expect(next.rebirthBonus).toBeCloseTo(1 + gain, 12);
    expect(next.maxHealth).toBe(balance.health.base + next.rebirthBonus);
    expect(next.health).toBe(next.maxHealth);
  });
  it('snapshots the core levels this life begins with', () => {
    expect(next.lifeStartCore.forage).toBe(3);
    expect(next.lifeStartCore.mine).toBe(1);
    expect(next.lifeStartCore.build).toBe(0);
  });
});

describe('rebirth: guard and accrual', () => {
  it('does nothing to a state that is not dead', () => {
    const alive = newState(roster);
    expect(rebirth(alive)).toBe(alive);
  });
  it('accrues across three deaths: the bonus is the running sum of the gains, and max is base + bonus', () => {
    let s = newState(roster);
    const gains: number[] = [];
    for (const t of [7 * minute, 9 * minute, 11 * minute]) {
      gains.push(rebirthGain(t));
      s = rebirth({ ...s, runTicks: t, dead: true, health: 0 });
    }
    expect(s.life).toBe(4);
    expect(s.maxHealth).toBe(balance.health.base + s.rebirthBonus);
    expect(s.rebirthBonus).toBeCloseTo(gains[0]! + gains[1]! + gains[2]!, 12);
  });
});

/**
 * Review focus 1. Every GameState field is decided: it resets, it persists, or
 * rebirth derives it. A field added later fails here until someone decides.
 */
describe('rebirth: every field is classified', () => {
  const RESETS = ['runTicks', 'paused', 'dead', 'inventory', 'foodCooldowns', 'queue', 'completedOneTime', 'decayMultiplier', 'events'];
  const PERSISTS = ['completionCounts'];
  const DERIVED = ['health', 'maxHealth', 'skills', 'life', 'rebirthBonus', 'lifeStartCore'];
  it('the three lists cover newState(roster) exactly, with no overlap', () => {
    const all = [...RESETS, ...PERSISTS, ...DERIVED];
    expect(new Set(all).size).toBe(all.length);
    expect([...all].sort()).toEqual(Object.keys(newState(roster)).sort());
  });
  it('every reset field equals newState(roster) after rebirth, except paused, which is system', () => {
    const next = rebirth(deadLife()) as unknown as Record<string, unknown>;
    const fresh = { ...newState(roster), paused: 'system' } as unknown as Record<string, unknown>;
    for (const k of RESETS) expect(next[k], k).toEqual(fresh[k]);
  });
  it('every persist field is exercised (differs from newState in deadLife) and survives unchanged', () => {
    const dead = deadLife() as unknown as Record<string, unknown>;
    const fresh = newState(roster) as unknown as Record<string, unknown>;
    const next = rebirth(deadLife()) as unknown as Record<string, unknown>;
    for (const k of PERSISTS) {
      expect(dead[k], k).not.toEqual(fresh[k]);
      expect(next[k], k).toEqual(dead[k]);
    }
  });
});

describe('deathSummary', () => {
  it('reports the life, its clock, the gain, max health from and to, and only the skills whose core moved', () => {
    const dead = deadLife();
    const s = deathSummary(dead);
    expect(s.life).toBe(2);
    expect(s.runTicks).toBe(10 * minute);
    expect(s.gain).toBeCloseTo(rebirthGain(10 * minute), 12);
    expect(s.maxHealthFrom).toBe(balance.health.base + dead.rebirthBonus);
    expect(s.maxHealthTo).toBe(rebirth(dead).maxHealth);
    expect(s.coreGains.map((g) => [g.skill, g.from, g.to])).toEqual([['forage', 1, 3]]);
  });
  it('carries the core ledger progress toward the next level, as a fraction', () => {
    const g = deathSummary(deadLife()).coreGains[0]!;
    const need = balance.skills.coreMastery.baseExp * balance.skills.expCurveExponent ** 3;
    expect(g.progress).toBeCloseTo(2.5 / need, 12);
  });
  it('a death on the first tick: a tiny positive gain and no skill lines', () => {
    const s = deathSummary({ ...newState(roster), runTicks: 1, dead: true, health: 0 });
    expect(s.gain).toBeGreaterThan(0);
    expect(s.coreGains).toEqual([]);
  });
});
