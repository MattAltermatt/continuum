/**
 * Book one, as much of it as v0.2 needs: one chapter, three rows that feed
 * each other, and the hall, a big sink no first life finishes (spec 2026-09-22
 * section 2). Every tuning number comes from balance.content.scrub; a yield of
 * one per completion and a cap of one on a structure are counts, not tuning.
 * The text is placeholder content; the chapter brainstorm replaces it.
 *
 * The roster is the skills that have rows (spec 2026-09-23 section 2): three
 * today. Display order, which is also the order a player who presses + down
 * the page queues them in: the cabin ahead of the hall, so the hall does not
 * take the cabin's stone.
 */
import { balance } from '../balance';
import type { Book } from './types';

const n = balance.content.scrub;

export const saltRoad: Book = {
  id: 'salt-road',
  name: 'The Salt Road',
  roster: [
    { id: 'forage', name: 'Forage', icon: 'sprout' },
    { id: 'mine', name: 'Mine', icon: 'pickaxe' },
    { id: 'build', name: 'Build', icon: 'house' },
  ],
  chapters: [
    { head: { numeral: 'I', chapter: 'The Scrub', story: 'Dry country. The pass is watched.' }, order: ['forage', 'mine', 'cabin', 'hall'] },
  ],
  items: {
    berries: { id: 'berries', name: 'berries', kind: 'food', cap: n.berries.cap, healPerUnit: n.berries.healPerUnit },
    stone: { id: 'stone', name: 'stone', kind: 'material', cap: n.stone.cap },
    cabin: { id: 'cabin', name: 'cabin', kind: 'structure', cap: 1 },
    hall: { id: 'hall', name: 'hall', kind: 'structure', cap: 1 },
  },
  actions: {
    forage: { id: 'forage', verb: 'forage', noun: 'berries', expCost: n.forage.expCost, producedItem: 'berries', producedAmount: 1, itemCosts: [], isOneTime: false },
    mine: { id: 'mine', verb: 'mine', noun: 'stone', expCost: n.mine.expCost, producedItem: 'stone', producedAmount: 1, itemCosts: [], isOneTime: false },
    cabin: {
      id: 'cabin', verb: 'build', noun: 'a cabin', expCost: n.cabin.expCost, producedItem: 'cabin', producedAmount: 1,
      itemCosts: [{ item: 'stone', amount: n.cabin.stone }], isOneTime: true, healthDecayMultiplier: n.cabin.decayMultiplier,
      beat: 'The cabin stands. The wind is somebody else\'s problem now.',
    },
    hall: {
      id: 'hall', verb: 'build', noun: 'a stone hall', expCost: n.hall.expCost, producedItem: 'hall', producedAmount: 1,
      itemCosts: [{ item: 'stone', amount: n.hall.stone }], isOneTime: true,
      beat: 'The hall stands. Nobody who started it lived to see it.',
    },
  },
};
