import { describe, it, expect } from 'vitest';
import { balance } from './balance';

/**
 * Locks the canonical numbers against MECHANICS.md.
 *
 * These assertions are not testing arithmetic. They exist so that a tuning
 * value can never drift silently: changing one here is a deliberate act that
 * shows up in a diff and needs a reason.
 */
describe('balance', () => {
  it('holds the canonical time constants', () => {
    expect(balance.time).toEqual({ tickIntervalMs: 100, ticksPerMinute: 600 });
  });

  it('derives ticksPerMinute consistently from the tick interval', () => {
    expect(balance.time.tickIntervalMs * balance.time.ticksPerMinute).toBe(60_000);
  });

  it('holds the canonical health and decay constants', () => {
    expect(balance.health.base).toBe(100);
    expect(balance.health.baseDamagePerTick).toBe(0.01);
    expect(balance.health.decayGrowthRate).toBe(1.25);
    expect(balance.health.foodCooldownTicks).toBe(50);
  });
  it('holds the rebirth growth rate the user chose (spec 2026-09-23 section 3)', () => {
    expect(balance.rebirth).toEqual({ growthRate: 1.1 });
  });

  it('keeps core mastery cheaper per level but worth more than run mastery', () => {
    const { coreMastery, runMastery } = balance.skills;
    expect(coreMastery.baseExp).toBeLessThan(runMastery.baseExp);
    expect(coreMastery.multiplierPerLevel).toBeGreaterThan(runMastery.multiplierPerLevel);
  });

  it('holds the canonical mastery constants', () => {
    expect(balance.skills.coreMastery).toEqual({ baseExp: 10, multiplierPerLevel: 0.05 });
    expect(balance.skills.runMastery).toEqual({ baseExp: 25, multiplierPerLevel: 0.01 });
    expect(balance.skills.baseTickExp).toBe(0.1);
    expect(balance.skills.expCurveExponent).toBe(1.1);
  });

  it('holds the canonical automation thresholds', () => {
    expect(balance.automation.unlockRepeatable).toBe(200);
    expect(balance.automation.unlockOneTime).toBe(5);
  });

  it('locks the v0.1 slice content numbers', () => {
    expect(balance.content.scrub).toEqual({
      forage: { expCost: 4.2 },
      mine: { expCost: 6 },
      cabin: { expCost: 60, stone: 6, decayMultiplier: 0.8 },
      hall: { expCost: 5000, stone: 500 },
      berries: { cap: 20, healPerUnit: 4 },
      stone: { cap: 5 },
    });
  });
});
