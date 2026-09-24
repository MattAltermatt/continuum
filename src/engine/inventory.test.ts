import { describe, expect, it } from 'vitest';
import { add, count, has, room, take } from './inventory';

const CAP = 5;

describe('inventory', () => {
  it('counts a missing item as zero', () => {
    expect(count({}, 'stone')).toBe(0);
  });
  it('room is the cap minus the count', () => {
    expect(room({ stone: 3 }, 'stone', CAP)).toBe(2);
    expect(room({ stone: 5 }, 'stone', CAP)).toBe(0);
    expect(room({}, 'nothing', Number.POSITIVE_INFINITY)).toBe(Number.POSITIVE_INFINITY);
  });
  it('add never exceeds the cap and reports what landed (a guard: the queue never produces into a full stack)', () => {
    const r = add({ stone: 4 }, 'stone', 3, CAP);
    expect(r.inventory.stone).toBe(5);
    expect(r.added).toBe(1);
    const full = add({ stone: 5 }, 'stone', 1, CAP);
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
    add(inv, 'stone', 1, CAP);
    take(inv, 'stone', 1);
    expect(inv.stone).toBe(1);
  });
});
