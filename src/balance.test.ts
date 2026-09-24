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

  it('holds the headless play thresholds', () => {
    expect(balance.play).toEqual({ maxBookDays: 60, minBookHours: 24, maxLifeMinutes: 60, minLifeMinutes: 10, lengthTolerance: 0.25, hoursShownUpTo: 48 });
  });

  it('holds the canonical automation thresholds', () => {
    expect(balance.automation.unlockRepeatable).toBe(200);
    expect(balance.automation.unlockOneTime).toBe(5);
  });

  it('locks The Windward Run content numbers, as tuned by the headless play (plan Task 5 reading)', () => {
    expect(balance.content.windward).toEqual({
      fish: { expCost: 4 },
      cloudFish: { healPerUnit: 4 },
      salvage: { expCost: 5 },
      hull: { expCost: 60, scrap: 16, decayMultiplier: 0.8 },
      net: { expCost: 40, scrap: 12, fishMultiplier: 1.25 },
      satchel: { expCost: 50, scrap: 20, capacity: 5 },
      pirates: { expCost: 1450, hurts: 0.3 },
      eels: { expCost: 8 },
      skyEel: { healPerUnit: 10 },
      ruin: { expCost: 7 },
      wardens: { expCost: 200, hurts: 0.5 },
      halls: { expCost: 150 },
      fittings: { expCost: 80, brass: 20, decayMultiplier: 0.8 },
      chest: { expCost: 70, brass: 24, capacity: 5 },
      cutlass: { expCost: 60, brass: 16, fightMultiplier: 1.25 },
      compass: { expCost: 900, hurts: 0.6 },
      dealers: { expCost: 6 },
      kitchens: { expCost: 8, chips: 1 },
      canape: { healPerUnit: 16 },
      door: { expCost: 120, chips: 15 },
      dock: { expCost: 100, chips: 15, decayMultiplier: 0.8 },
      trunk: { expCost: 90, chips: 20, capacity: 5 },
      enforcers: { expCost: 500, hurts: 1 },
      salons: { expCost: 300 },
      varro: { expCost: 400 },
    });
  });

  it('holds the measuring bot\'s check-in', () => {
    expect(balance.policy).toEqual({ checkEverySeconds: 30 });
  });

  it('holds the shared stack cap and the loop catch-up', () => {
    expect(balance.inventory).toEqual({ stackCap: 5 });
    expect(balance.loop).toEqual({ maxCatchUpMinutes: 5 });
  });
});
