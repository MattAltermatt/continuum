import { describe, expect, it } from 'vitest';
import { balance } from '../balance';
import type { Content } from '../data/types';
import { newState } from './queue';
import { applyDecay, applyRowHealth, damagePerTick, decayPerSecond, eat, feeding, foodCeilingPerSecond, foodsByHeal, rowHealthPerSecond } from './health';
import { ticksPerSecond, ticksToSeconds } from './time';
import type { GameState } from './types';

const content: Content = {
  roster: [
    { id: 'forage', name: 'Forage', icon: 'sprout' },
    { id: 'mine', name: 'Mine', icon: 'pickaxe' },
    { id: 'build', name: 'Build', icon: 'house' },
  ],
  actions: {},
  items: {
    berries: { id: 'berries', name: 'berries', kind: 'food', healPerUnit: 4 },
    stone: { id: 'stone', name: 'stone', kind: 'material' },
  },
  chapters: [],
  finish: 'none',
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
    expect(applyDecay({ ...newState(content.roster), decayMultiplier: 0.5 }).health).toBeCloseTo(99.995, 9);
  });
  it('subtracts this tick\'s damage', () => {
    const s = applyDecay({ ...newState(content.roster), runTicks: 0 });
    expect(s.health).toBeCloseTo(balance.health.base - baseDamagePerTick, 9);
  });
  it('floors at zero, marks death, pauses the system, and emits died', () => {
    const s = applyDecay({ ...newState(content.roster), health: 0.001, runTicks: 7 });
    expect(s.health).toBe(0);
    expect(s.dead).toBe(true);
    expect(s.paused).toBe('system');
    expect(s.events).toContainEqual({ type: 'died', runTicks: 7 });
  });
});

describe('eat', () => {
  it('eats one unit when below max, heals, and starts the cooldown', () => {
    const s = eat({ ...newState(content.roster), health: 50, inventory: { berries: 3, stone: 2 } }, content);
    expect(s.health).toBe(54);
    expect(s.inventory.berries).toBe(2);
    expect(s.inventory.stone).toBe(2);
    expect(s.foodCooldowns.berries).toBe(foodCooldownTicks);
  });
  it('eats right up to max health: only going above it is refused', () => {
    const s = eat({ ...newState(content.roster), health: 96, inventory: { berries: 2 } }, content);
    expect(s.health).toBe(100);
    expect(s.inventory.berries).toBe(1);
  });
  it('never eats into overheal', () => {
    const s = eat({ ...newState(content.roster), health: 98, inventory: { berries: 3 } }, content);
    expect(s.health).toBe(98);
    expect(s.inventory.berries).toBe(3);
  });
  it('respects the cooldown and counts it down, keeping cooldowns it does not touch', () => {
    const start = { ...newState(content.roster), health: 50, inventory: { berries: 3 }, foodCooldowns: { berries: 2, other: 9 } };
    const s = eat(start, content);
    expect(s.inventory.berries).toBe(3);
    expect(s.foodCooldowns.berries).toBe(1);
    expect(s.foodCooldowns.other).toBe(9);
  });
  it('does nothing with an empty larder', () => {
    expect(eat({ ...newState(content.roster), health: 50 }, content).health).toBe(50);
  });
  it('spaces bites exactly foodCooldownTicks apart', () => {
    let s: GameState = { ...newState(content.roster), health: 10, inventory: { berries: 5 } };
    const bites: number[] = [];
    for (let t = 0; t <= foodCooldownTicks * 2; t++) {
      const before = s.inventory.berries ?? 0;
      s = eat(s, content);
      if ((s.inventory.berries ?? 0) < before) bites.push(t);
    }
    expect(bites).toEqual([0, foodCooldownTicks, foodCooldownTicks * 2]);
  });
});

describe('smallest heal first (#45)', () => {
  const two: Content = {
    ...content,
    items: {
      eel: { id: 'eel', name: 'eel', kind: 'food', healPerUnit: 10 },
      fish: { id: 'fish', name: 'fish', kind: 'food', healPerUnit: 4 },
    },
  };
  it('foodsByHeal orders by heal, whatever the declaration order', () => {
    expect(foodsByHeal(two).map((f) => f.id)).toEqual(['fish', 'eel']);
  });
  it('one tick of eat at max - 12 bites the fish only: 4, then 8 of room is under the eel\'s 10', () => {
    const s = eat({ ...newState(content.roster), health: 100 - 12, inventory: { eel: 1, fish: 1 } }, two);
    expect(s.inventory).toEqual({ eel: 1, fish: 0 });
    expect(s.health).toBe(92);
  });
});

describe('rates, true this second (spec 2026-09-23 section 4.1)', () => {
  const perBite = 4 / ticksToSeconds(foodCooldownTicks);
  it('decayPerSecond is this tick\'s damage times ticks per second, multiplier included', () => {
    const s = { ...newState(content.roster), runTicks: balance.time.ticksPerMinute * 10, decayMultiplier: 0.8 };
    expect(decayPerSecond(s)).toBeCloseTo(damagePerTick(s.runTicks, 0.8) * ticksPerSecond(), 12);
  });
  it('foodCeilingPerSecond counts each food that is feeding: heal per bite over the cooldown in seconds', () => {
    expect(foodCeilingPerSecond({ ...newState(content.roster), inventory: { berries: 1 } }, content)).toBeCloseTo(perBite, 12);
  });
  it('an empty larder with no bite in the last cooldown has no ceiling', () => {
    expect(foodCeilingPerSecond(newState(content.roster), content)).toBe(0);
    expect(foodCeilingPerSecond({ ...newState(content.roster), foodCooldowns: { berries: 0 } }, content)).toBe(0);
  });
  it('a food on cooldown counts, with units (a ceiling, not a bite) and without them (eaten as it lands: still feeding)', () => {
    expect(foodCeilingPerSecond({ ...newState(content.roster), inventory: { berries: 3 }, foodCooldowns: { berries: 20 } }, content)).toBeCloseTo(perBite, 12);
    expect(foodCeilingPerSecond({ ...newState(content.roster), foodCooldowns: { berries: 20 } }, content)).toBeCloseTo(perBite, 12);
  });
  it('feeding: a unit on hand, or a running cooldown; neither is not feeding', () => {
    expect(feeding({ ...newState(content.roster), inventory: { berries: 1 } }, 'berries')).toBe(true);
    expect(feeding({ ...newState(content.roster), foodCooldowns: { berries: 1 } }, 'berries')).toBe(true);
    expect(feeding(newState(content.roster), 'berries')).toBe(false);
  });
  it('decay passes a berry-a-bite ceiling late in a run: the rates line reads it red by then', () => {
    // Decay reaches perBite (0.8 hp/s) a little before minute 10 at the placeholder curve.
    const late = { ...newState(content.roster), runTicks: balance.time.ticksPerMinute * 12, inventory: { berries: 5 } };
    expect(decayPerSecond(late)).toBeGreaterThan(perBite);
    expect(decayPerSecond(newState(content.roster))).toBeLessThan(perBite);
  });
});

describe('applyRowHealth', () => {
  const rows = (healthRate: number): Content => ({
    ...content,
    actions: { camp: { id: 'camp', verb: 'build', noun: 'camp', expCost: 1, itemCosts: [], isOneTime: false, healthRate } },
  });
  const onTop = (c: Content, hp: number): GameState => ({ ...newState(c.roster), health: hp, queue: [{ id: 0, actionId: 'camp', mode: 'repeat', by: 'player' }] });
  it('a positive rate heals by its per-tick share', () => {
    const s = applyRowHealth(onTop(rows(2), 50), rows(2));
    expect(s.health).toBeCloseTo(50 + 2 / ticksPerSecond(), 9);
    expect(s.dead).toBe(false);
  });
  it('a heal stops at max and never overheals', () => {
    const c = rows(2);
    expect(applyRowHealth({ ...onTop(c, 100), maxHealth: 100 }, c).health).toBe(100);
    expect(applyRowHealth({ ...onTop(c, 99.95), maxHealth: 100 }, c).health).toBe(100);
  });
  it('a negative rate drains and can kill, with the death event', () => {
    const c = rows(-30);
    const s = applyRowHealth(onTop(c, 1), c);
    expect(s.health).toBe(0);
    expect(s.dead).toBe(true);
    expect(s.events).toContainEqual({ type: 'died', runTicks: 0 });
  });
  it('no rate on top: the same state object', () => {
    const c = rows(2);
    const s = { ...onTop(c, 50), queue: [] };
    expect(applyRowHealth(s, c)).toBe(s);
    expect(rowHealthPerSecond(s, c)).toBe(0);
  });
  it('rowHealthPerSecond is signed', () => {
    expect(rowHealthPerSecond(onTop(rows(-0.5), 50), rows(-0.5))).toBe(-0.5);
    expect(rowHealthPerSecond(onTop(rows(2), 50), rows(2))).toBe(2);
  });
});
