/**
 * The Salt Road, retired from the shelf (spec 2026-09-23-the-windward-run
 * section 1) and kept as test data for the state tests and the components
 * plan Task 7 did not rebuild; the rebuilt ones use testBook (./book.ts). The numbers that
 * were balance.content.scrub are literals: src/test-utils/ is outside the
 * tuning hook and the purity scan, and nothing in the app imports this file.
 */
import type { Book } from '../data/types';

export const saltRoadFixture: Book = {
  id: 'salt-road',
  name: 'The Salt Road',
  version: 1,
  finish: 'hall',
  length: { days: 5 },
  roster: [
    { id: 'forage', name: 'Forage', icon: 'sprout' },
    { id: 'mine', name: 'Mine', icon: 'pickaxe' },
    { id: 'build', name: 'Build', icon: 'house' },
  ],
  chapters: [
    { head: { numeral: 'I', chapter: 'The Scrub', story: 'Dry country. The pass is watched.' }, order: ['forage', 'mine', 'cabin', 'hall'], event: 'hall' },
  ],
  items: {
    berries: { id: 'berries', name: 'berries', kind: 'food', healPerUnit: 4 },
    stone: { id: 'stone', name: 'stone', kind: 'material' },
    cabin: { id: 'cabin', name: 'cabin', kind: 'key' },
    hall: { id: 'hall', name: 'hall', kind: 'key' },
  },
  actions: {
    forage: { id: 'forage', verb: 'forage', noun: 'berries', expCost: 4.2, producedItem: 'berries', producedAmount: 1, itemCosts: [], isOneTime: false },
    mine: { id: 'mine', verb: 'mine', noun: 'stone', expCost: 6, producedItem: 'stone', producedAmount: 1, itemCosts: [], isOneTime: false },
    cabin: {
      id: 'cabin', verb: 'build', noun: 'a cabin', expCost: 60, producedItem: 'cabin', producedAmount: 1,
      itemCosts: [{ item: 'stone', amount: 6 }], isOneTime: true, healthDecayMultiplier: 0.8,
      beat: 'The cabin stands. The wind is somebody else\'s problem now.',
    },
    hall: {
      id: 'hall', verb: 'build', noun: 'a stone hall', expCost: 5000, producedItem: 'hall', producedAmount: 1,
      itemCosts: [{ item: 'stone', amount: 500 }], isOneTime: true,
      beat: 'The hall stands. Nobody who started it lived to see it.',
    },
  },
};
