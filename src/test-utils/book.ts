/**
 * The component tests' book (plan Task 7): the engine's two-port fixture
 * (src/engine/fixture.ts) as a Book, plus what the screen shows that the
 * engine tests do not need: a raid that hurts, a gear row, and a second
 * chapter-II row so the pack has something to show there. Test data only; the
 * numbers are literals because src/test-utils/ is outside the tuning hook and
 * nothing in the app imports this file.
 */
import type { Book } from '../data/types';
import { fixture } from '../engine/fixture';

export const testBook: Book = {
  ...fixture,
  id: 'test-book',
  name: 'The Test Book',
  version: 1,
  length: { hours: 30 },
  actions: {
    ...fixture.actions,
    raid: { ...fixture.actions.raid!, hurts: 1, beat: 'The raiders scatter. We cast off.' },
    net: {
      id: 'net', verb: 'rig', noun: 'a net', expCost: 2, itemCosts: [{ item: 'scrap', amount: 2 }], isOneTime: true,
      gear: { skill: 'fish', multiplier: 1.25 },
    },
    salvage2: { id: 'salvage2', verb: 'salvage', noun: 'the wreck', expCost: 1, producedItem: 'scrap', producedAmount: 1, itemCosts: [], isOneTime: false },
    vault: { ...fixture.actions.vault!, beat: 'The vault opens on nothing but a note. The lights go out.' },
  },
  chapters: [
    { ...fixture.chapters[0]!, order: ['fish', 'salvage', 'hull', 'satchel', 'net', 'gate', 'raid'] },
    { ...fixture.chapters[1]!, order: ['eels', 'salvage2', 'vault'] },
  ],
};
