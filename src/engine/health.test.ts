import { describe, expect, it } from 'vitest';
import { balance } from '../balance';
import type { Content } from '../data/types';
import { newState } from './queue';
import { applyDecay, damagePerTick, eat } from './health';
import type { GameState } from './types';

const content: Content = {
  actions: {},
  items: {
    berries: { id: 'berries', name: 'berries', kind: 'food', cap: 20, healPerUnit: 4 },
    stone: { id: 'stone', name: 'stone', kind: 'material', cap: 5 },
  },
};
const { baseDamagePerTick, decayGrowthRate, foodCooldownTicks } = balance.health;

describe('damagePerTick', () => {
  it('is the base at minute zero and grows per minute (MECHANICS table)', () => {
    expect(damagePerTick(0, 1)).toBe(baseDamagePerTick);
    expect(damagePerTick(balance.time.ticksPerMinute * 5, 1)).toBeCloseTo(baseDamagePerTick * decayGrowthRate ** 5, 9);
  });
  it('scales by the run multiplier', () => {
    expect(damagePerTick(0, 0.5)).toBeCloseTo(baseDamagePerTick * 0.5, 9);
  });
  it('characterization: at the placeholder constants an unfed run lasts between 5 and 10 minutes', () => {
    let hp = balance.health.base;
    let t = 0;
    while (hp > 0) { hp -= damagePerTick(t, 1); t += 1; }
    const minutes = t / balance.time.ticksPerMinute;
    expect(minutes).toBeGreaterThan(5);
    expect(minutes).toBeLessThan(10);
  });
});

describe('damagePerTick, pinned to MECHANICS as literals', () => {
  it('is continuous, not stepped per minute: mid-minute values sit between the whole minutes', () => {
    expect(damagePerTick(balance.time.ticksPerMinute * 2.5, 1)).toBeCloseTo(0.017469, 6);
    expect(damagePerTick(balance.time.ticksPerMinute * 5, 1)).toBeCloseTo(0.0305, 4);
    expect(damagePerTick(balance.time.ticksPerMinute * 10, 1)).toBeCloseTo(0.0931, 4);
  });
});

describe('applyDecay', () => {
  it('reads the run\'s decay multiplier: the cabin\'s slower clock reaches the damage roll', () => {
    expect(applyDecay({ ...newState(), decayMultiplier: 0.5 }).health).toBeCloseTo(99.995, 9);
  });
  it('subtracts this tick\'s damage', () => {
    const s = applyDecay({ ...newState(), runTicks: 0 });
    expect(s.health).toBeCloseTo(balance.health.base - baseDamagePerTick, 9);
  });
  it('floors at zero, marks death, pauses the system, and emits died', () => {
    const s = applyDecay({ ...newState(), health: 0.001, runTicks: 7 });
    expect(s.health).toBe(0);
    expect(s.dead).toBe(true);
    expect(s.paused).toBe('system');
    expect(s.events).toContainEqual({ type: 'died', runTicks: 7 });
  });
});

describe('eat', () => {
  it('eats one unit when below max, heals, and starts the cooldown', () => {
    const s = eat({ ...newState(), health: 50, inventory: { berries: 3, stone: 2 } }, content);
    expect(s.health).toBe(54);
    expect(s.inventory.berries).toBe(2);
    expect(s.inventory.stone).toBe(2);
    expect(s.foodCooldowns.berries).toBe(foodCooldownTicks);
  });
  it('eats right up to max health: only going above it is refused', () => {
    const s = eat({ ...newState(), health: 96, inventory: { berries: 2 } }, content);
    expect(s.health).toBe(100);
    expect(s.inventory.berries).toBe(1);
  });
  it('never eats into overheal', () => {
    const s = eat({ ...newState(), health: 98, inventory: { berries: 3 } }, content);
    expect(s.health).toBe(98);
    expect(s.inventory.berries).toBe(3);
  });
  it('respects the cooldown and counts it down, keeping cooldowns it does not touch', () => {
    const start = { ...newState(), health: 50, inventory: { berries: 3 }, foodCooldowns: { berries: 2, other: 9 } };
    const s = eat(start, content);
    expect(s.inventory.berries).toBe(3);
    expect(s.foodCooldowns.berries).toBe(1);
    expect(s.foodCooldowns.other).toBe(9);
  });
  it('does nothing with an empty larder', () => {
    expect(eat({ ...newState(), health: 50 }, content).health).toBe(50);
  });
  it('spaces bites exactly foodCooldownTicks apart', () => {
    let s: GameState = { ...newState(), health: 10, inventory: { berries: 5 } };
    const bites: number[] = [];
    for (let t = 0; t <= foodCooldownTicks * 2; t++) {
      const before = s.inventory.berries ?? 0;
      s = eat(s, content);
      if ((s.inventory.berries ?? 0) < before) bites.push(t);
    }
    expect(bites).toEqual([0, foodCooldownTicks, foodCooldownTicks * 2]);
  });
});
