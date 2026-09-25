/**
 * The component tests' book (plan Task 7): the engine's two-port fixture
 * (src/engine/fixture.ts) as a Book, plus what the screen shows that the
 * engine tests do not need: a raid that hurts, a gear row, and a second
 * chapter-II row so the pack has something to show there. Test data only; the
 * numbers are literals because src/test-utils/ is outside the tuning hook and
 * nothing in the app imports this file.
 */
import type { Book } from '../data/types';
import { fixture, withOrder } from '../engine/fixture';

export const testBook: Book = {
  ...fixture,
  id: 'test-book',
  name: 'The Test Book',
  version: 1,
  length: { hours: 30 },
  actions: {
    ...fixture.actions,
    raid: { ...fixture.actions.raid!, healthRate: -1, beat: 'The raiders scatter. We cast off.' },
    net: {
      id: 'net', verb: 'rig', noun: 'a net', expCost: 2, itemCosts: [{ item: 'scrap', amount: 2 }], isOneTime: true,
      gear: { skill: 'fish', multiplier: 1.25 },
    },
    salvage2: { id: 'salvage2', verb: 'salvage', noun: 'the wreck', expCost: 1, producedItem: 'scrap', producedAmount: 1, itemCosts: [], isOneTime: false },
    vault: { ...fixture.actions.vault!, beat: 'The vault opens on nothing but a note. The lights go out.' },
  },
  chapters: [
    withOrder(fixture.chapters[0]!, ['fish', 'salvage', 'hull', 'satchel', 'net', 'gate', 'raid']),
    withOrder(fixture.chapters[1]!, ['eels', 'salvage2', 'vault']),
  ],
};

/**
 * The same book with its first port in two pages (spec 2026-09-24-pages): the
 * gate closes "Fitting out" and turns the page, the raid closes "The raid" and
 * casts off. For the screen's page tests: the running head, the "after:" line
 * and the three tags.
 */
export const pagedTestBook: Book = {
  ...testBook,
  chapters: [
    { ...testBook.chapters[0]!, pages: [
      { name: 'Fitting out', order: ['fish', 'salvage', 'hull', 'satchel', 'net', 'gate'], closes: 'gate' },
      { name: 'The raid', order: ['fish', 'raid'], closes: 'raid' },
    ] },
    testBook.chapters[1]!,
  ],
};
