import { describe, expect, it } from 'vitest';
import type { ActionDefinition } from '../data/types';
import { consumedOf, nextCostItem, nextUnitDue, requiredCostsConsumed, totalUnits, unitThreshold } from './costs';

const cart: ActionDefinition = {
  id: 'cart', verb: 'craft', noun: 'a cart', expCost: 1000,
  itemCosts: [{ item: 'wood', amount: 10 }], isOneTime: true,
};

describe('incremental cost consumption (MECHANICS worked example)', () => {
  it('one unit is spent just to begin', () => {
    expect(requiredCostsConsumed(cart, 0)).toBe(1);
  });
  it('follows the table: 100 -> 2, 500 -> 6, 1000 -> 10', () => {
    expect(requiredCostsConsumed(cart, 100)).toBe(2);
    expect(requiredCostsConsumed(cart, 500)).toBe(6);
    expect(requiredCostsConsumed(cart, 1000)).toBe(10);
  });
  it('agrees with nextUnitDue at every clamped progress', () => {
    const odd: ActionDefinition = { ...cart, expCost: 0.3, itemCosts: [{ item: 'wood', amount: 7 }] };
    for (let n = 0; n < 7; n++) {
      expect(requiredCostsConsumed(odd, unitThreshold(odd, n))).toBe(n + 1);
      expect(nextUnitDue(odd, unitThreshold(odd, n), n)).toBe(true);
    }
  });
  it('never exceeds the total, and is zero for a free action', () => {
    expect(requiredCostsConsumed(cart, 5000)).toBe(10);
    expect(totalUnits(cart)).toBe(10);
    expect(requiredCostsConsumed({ ...cart, itemCosts: [] }, 400)).toBe(0);
  });
  it('unit n (0-based) falls due at n x expCost/total; nextUnitDue compares with that same expression', () => {
    expect(unitThreshold(cart, 0)).toBe(0);
    expect(unitThreshold(cart, 3)).toBe(300);
    expect(nextUnitDue(cart, 0, 0)).toBe(true);        // one unit to begin
    expect(nextUnitDue(cart, 99, 1)).toBe(false);
    expect(nextUnitDue(cart, 100, 1)).toBe(true);
    expect(nextUnitDue(cart, unitThreshold(cart, 7), 7)).toBe(true);   // exact at a clamped progress, no float drift
    expect(nextUnitDue(cart, 5000, 10)).toBe(false);   // all paid
  });
  it('consumedOf attributes consumed units to each cost in declared order', () => {
    const two: ActionDefinition = { ...cart, itemCosts: [{ item: 'wood', amount: 2 }, { item: 'stone', amount: 3 }] };
    expect(consumedOf(two, 0, 'wood')).toBe(0);
    expect(consumedOf(two, 1, 'wood')).toBe(1);
    expect(consumedOf(two, 3, 'wood')).toBe(2);
    expect(consumedOf(two, 3, 'stone')).toBe(1);
    expect(consumedOf(two, 5, 'stone')).toBe(3);
    expect(consumedOf(two, 5, 'iron')).toBe(0);
  });
  it('walks itemCosts in declared order', () => {
    const two: ActionDefinition = { ...cart, itemCosts: [{ item: 'wood', amount: 2 }, { item: 'stone', amount: 1 }] };
    expect(nextCostItem(two, 0)).toBe('wood');
    expect(nextCostItem(two, 1)).toBe('wood');
    expect(nextCostItem(two, 2)).toBe('stone');
    expect(nextCostItem(two, 3)).toBeNull();
  });
});
