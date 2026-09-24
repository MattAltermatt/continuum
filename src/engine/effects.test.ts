import { describe, expect, it } from 'vitest';
import { balance } from '../balance';
import type { Content } from '../data/types';
import { capOf, gearFor, gearMultiplier } from './effects';
import { newState } from './queue';
import type { GameState } from './types';

const content: Content = {
  roster: [
    { id: 'fish', name: 'Fish', icon: 'fishing-rod' },
    { id: 'rig', name: 'Rig', icon: 'wrench' },
  ],
  items: {
    fish: { id: 'fish', name: 'fish', kind: 'food', healPerUnit: 4 },
    scrap: { id: 'scrap', name: 'scrap', kind: 'material' },
    pass: { id: 'pass', name: 'a pass', kind: 'key' },
  },
  actions: {
    fish: { id: 'fish', verb: 'fish', noun: 'fish', expCost: 1, producedItem: 'fish', producedAmount: 1, itemCosts: [], isOneTime: false },
    satchel: { id: 'satchel', verb: 'rig', noun: 'a satchel', expCost: 1, itemCosts: [], isOneTime: true, capacityBonus: 5 },
    net: { id: 'net', verb: 'rig', noun: 'a net', expCost: 1, itemCosts: [], isOneTime: true, gear: { skill: 'fish', multiplier: 1.25 } },
    line: { id: 'line', verb: 'rig', noun: 'a line', expCost: 1, itemCosts: [], isOneTime: true, gear: { skill: 'fish', multiplier: 1.2 } },
    hammer: { id: 'hammer', verb: 'rig', noun: 'a hammer', expCost: 1, itemCosts: [], isOneTime: true, gear: { skill: 'rig', multiplier: 2 } },
  },
  chapters: [{ head: { numeral: 'I', chapter: 'One', story: 'A start.' }, pages: [{ name: '', order: ['fish', 'satchel', 'net', 'line', 'hammer'], closes: 'hammer' }] }],
  finish: 'hammer',
};

const done = (...ids: string[]): GameState => ({ ...newState(content.roster), completedOneTime: ids });

describe('effects', () => {
  it('capOf is the shared stack cap for a material and a food with nothing done', () => {
    expect(capOf(done(), content, 'scrap')).toBe(balance.inventory.stackCap);
    expect(capOf(done(), content, 'fish')).toBe(balance.inventory.stackCap);
  });
  it('a capacity row raises it for the life', () => {
    expect(capOf(done('satchel'), content, 'scrap')).toBe(balance.inventory.stackCap + 5);
    expect(capOf(done('satchel'), content, 'fish')).toBe(balance.inventory.stackCap + 5);
  });
  it('a key holds one whatever is done; an unknown item has no limit', () => {
    expect(capOf(done(), content, 'pass')).toBe(1);
    expect(capOf(done('satchel'), content, 'pass')).toBe(1);
    expect(capOf(done(), content, 'nothing')).toBe(Number.POSITIVE_INFINITY);
  });
  it('gearMultiplier is 1 with nothing done and the product with both', () => {
    expect(gearMultiplier(done(), content, 'fish')).toBe(1);
    expect(gearMultiplier(done('net', 'line'), content, 'fish')).toBeCloseTo(1.25 * 1.2, 12);
  });
  it('gearFor lists the pieces in completion order', () => {
    expect(gearFor(done('line', 'net'), content, 'fish')).toEqual([{ actionId: 'line', multiplier: 1.2 }, { actionId: 'net', multiplier: 1.25 }]);
  });
  it('a gear row for another skill does not count', () => {
    expect(gearMultiplier(done('hammer'), content, 'fish')).toBe(1);
    expect(gearFor(done('hammer', 'net'), content, 'fish')).toEqual([{ actionId: 'net', multiplier: 1.25 }]);
  });
});
