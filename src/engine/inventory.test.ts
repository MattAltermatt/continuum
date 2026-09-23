import { describe, expect, it } from 'vitest';
import type { Content } from '../data/types';
import { add, count, has, room, take } from './inventory';

const content: Content = {
  roster: [
    { id: 'forage', name: 'Forage', icon: 'sprout' },
    { id: 'mine', name: 'Mine', icon: 'pickaxe' },
    { id: 'build', name: 'Build', icon: 'house' },
  ],
  actions: {},
  items: {
    stone: { id: 'stone', name: 'stone', kind: 'material', cap: 5 },
    berries: { id: 'berries', name: 'berries', kind: 'food', cap: 20, healPerUnit: 4 },
  },
};

describe('inventory', () => {
  it('counts a missing item as zero', () => {
    expect(count({}, 'stone')).toBe(0);
  });
  it('room is the cap minus the count, and unbounded for an item with no definition', () => {
    expect(room({ stone: 3 }, content, 'stone')).toBe(2);
    expect(room({ stone: 5 }, content, 'stone')).toBe(0);
    expect(room({}, content, 'nothing')).toBe(Number.POSITIVE_INFINITY);
  });
  it('add never exceeds the cap and reports what landed (a guard: the queue never produces into a full stack)', () => {
    const r = add({ stone: 4 }, content, 'stone', 3);
    expect(r.inventory.stone).toBe(5);
    expect(r.added).toBe(1);
    const full = add({ stone: 5 }, content, 'stone', 1);
    expect(full.inventory.stone).toBe(5);
    expect(full.added).toBe(0);
  });
  it('has and take', () => {
    expect(has({ stone: 2 }, 'stone', 2)).toBe(true);
    expect(has({ stone: 1 }, 'stone', 2)).toBe(false);
    expect(take({ stone: 2 }, 'stone', 1)).toEqual({ stone: 1 });
  });
  it('take throws below zero rather than going negative', () => {
    expect(() => take({ stone: 0 }, 'stone', 1)).toThrow();
  });
  it('never mutates', () => {
    const inv = { stone: 1 };
    add(inv, content, 'stone', 1);
    take(inv, 'stone', 1);
    expect(inv.stone).toBe(1);
  });
});
