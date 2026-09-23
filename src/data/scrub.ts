/**
 * Chapter 1 of the first book, as much of it as v0.1 needs: three rows that
 * feed each other, and the hall, a big sink no first life finishes (spec
 * section 2). Every tuning number comes from balance.content.scrub; a yield of one per
 * completion and a cap of one on a structure are counts, not tuning. The text is
 * placeholder content; the chapter brainstorm replaces it.
 */
import { balance } from '../balance';
import type { ActionId, ChapterHead, Content } from './types';

const n = balance.content.scrub;

/**
 * Display order, which is also the order a player who presses + down the page
 * queues them in: the cabin ahead of the hall, so the hall does not take the
 * cabin's stone. A completed one-time row stays in place, marked built.
 */
export const SCRUB_ORDER: readonly ActionId[] = ['forage', 'mine', 'cabin', 'hall'];

export const SCRUB_HEAD: ChapterHead = {
  book: 'The Salt Road',
  numeral: 'I',
  chapter: 'The Scrub',
  story: 'Dry country. The pass is watched.',
};

export const scrub: Content = {
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
