/**
 * Engine test data: a two-port book small enough to reason about by hand.
 * Imported by engine tests, and by src/test-utils/book.ts for the component
 * tests; nothing in the app reads it.
 */
import type { ActionId, Chapter, Content, Page } from '../data/types';
import { eventOf } from './rows';

/** A page for test data (spec 2026-09-24-pages). */
export function onePage(order: readonly ActionId[], closes: ActionId, name = ''): Page {
  return { name, order, closes };
}

/** The chapter as one page of `order`, closing where it closed before unless told otherwise. */
export function withOrder(chapter: Chapter, order: readonly ActionId[], closes: ActionId = eventOf(chapter)): Chapter {
  return { ...chapter, pages: [onePage(order, closes)] };
}

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
    { head: { numeral: 'I', chapter: 'One', story: 'A start.' }, pages: [onePage(['fish', 'salvage', 'hull', 'satchel', 'gate', 'raid'], 'raid')] },
    { head: { numeral: 'II', chapter: 'Two', story: 'An end.' }, pages: [onePage(['eels', 'vault'], 'vault')] },
  ],
  finish: 'vault',
};

/** The state with these one-time rows done this life, as if built: a test that is not about a page's prerequisites starts past them. */
export function built<S extends { readonly completedOneTime: readonly ActionId[] }>(state: S, ...ids: readonly ActionId[]): S {
  return { ...state, completedOneTime: [...state.completedOneTime, ...ids.filter((id) => !state.completedOneTime.includes(id))] };
}

/**
 * A two-page chapter (spec 2026-09-24-pages): page 1 builds a hull from
 * planks, which a saw makes from wood, and closes on a gate that makes a pass;
 * page 2 needs the pass. Fish and salvage are carried to page 2, the saw and
 * the chop are dropped. The hull's chain is three deep: gate, hull, saw, chop.
 */
export const pagedBook: Content = {
  roster: fixture.roster,
  items: {
    ...fixture.items,
    wood: { id: 'wood', name: 'wood', kind: 'material' },
    plank: { id: 'plank', name: 'planks', one: 'plank', kind: 'material' },
  },
  actions: {
    ...fixture.actions,
    chop: { id: 'chop', verb: 'salvage', noun: 'driftwood', expCost: 1, producedItem: 'wood', producedAmount: 1, itemCosts: [], isOneTime: false },
    saw: { id: 'saw', verb: 'rig', noun: 'planks', expCost: 1, producedItem: 'plank', producedAmount: 1, itemCosts: [{ item: 'wood', amount: 1 }], isOneTime: false },
    hull: { ...fixture.actions.hull!, itemCosts: [{ item: 'plank', amount: 2 }] },
    gate: { ...fixture.actions.gate!, itemCosts: [] },
  },
  chapters: [
    { head: { numeral: 'I', chapter: 'One', story: 'A start.' }, pages: [
      onePage(['fish', 'salvage', 'chop', 'saw', 'hull', 'satchel', 'gate'], 'gate', 'Fitting out'),
      onePage(['fish', 'salvage', 'raid'], 'raid', 'The raid'),
    ] },
    fixture.chapters[1]!,
  ],
  finish: 'vault',
};
