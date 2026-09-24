/**
 * Engine test data: a two-port book small enough to reason about by hand.
 * Imported by engine tests, and by src/test-utils/book.ts for the component
 * tests; nothing in the app reads it.
 */
import type { Content } from '../data/types';

export const fixture: Content = {
  roster: [
    { id: 'fish', name: 'Fish', icon: 'fishing-rod' },
    { id: 'salvage', name: 'Salvage', icon: 'recycle' },
    { id: 'rig', name: 'Rig', icon: 'sailboat' },
    { id: 'fight', name: 'Fight', icon: 'sword' },
  ],
  items: {
    fish: { id: 'fish', name: 'fish', kind: 'food', healPerUnit: 4 },
    eel: { id: 'eel', name: 'eel', kind: 'food', healPerUnit: 10 },
    scrap: { id: 'scrap', name: 'scrap', kind: 'material' },
    pass: { id: 'pass', name: 'a pass', kind: 'key' },
  },
  actions: {
    fish: { id: 'fish', verb: 'fish', noun: 'the shallows', expCost: 1, producedItem: 'fish', producedAmount: 1, itemCosts: [], isOneTime: false },
    salvage: { id: 'salvage', verb: 'salvage', noun: 'scrap', expCost: 1, producedItem: 'scrap', producedAmount: 1, itemCosts: [], isOneTime: false },
    hull: { id: 'hull', verb: 'rig', noun: 'the hull', expCost: 8, itemCosts: [{ item: 'scrap', amount: 8 }], isOneTime: true, healthDecayMultiplier: 0.5 },
    satchel: { id: 'satchel', verb: 'rig', noun: 'a satchel', expCost: 2, itemCosts: [{ item: 'scrap', amount: 2 }], isOneTime: true, capacityBonus: 5 },
    gate: { id: 'gate', verb: 'fight', noun: 'the gate', expCost: 1, producedItem: 'pass', producedAmount: 1, itemCosts: [], isOneTime: true },
    raid: { id: 'raid', verb: 'fight', noun: 'the raid', expCost: 30, itemCosts: [], needs: [{ item: 'pass', amount: 1 }], isOneTime: true },
    eels: { id: 'eels', verb: 'fish', noun: 'the eel runs', expCost: 1, producedItem: 'eel', producedAmount: 1, itemCosts: [], isOneTime: false },
    vault: { id: 'vault', verb: 'rig', noun: 'the vault', expCost: 1, itemCosts: [], isOneTime: true },
  },
  chapters: [
    { head: { numeral: 'I', chapter: 'One', story: 'A start.' }, order: ['fish', 'salvage', 'hull', 'satchel', 'gate', 'raid'], event: 'raid' },
    { head: { numeral: 'II', chapter: 'Two', story: 'An end.' }, order: ['eels', 'vault'], event: 'vault' },
  ],
  finish: 'vault',
};
