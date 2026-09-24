/**
 * Questions about a row in the state it is in, shared by the queue, its
 * automation and the screen (spec 2026-09-23-the-windward-run sections 2-4).
 * Nothing here changes anything. Pure.
 */
import type { ActionDefinition, ActionId, Chapter, Content, ItemId, Page } from '../data/types';
import { consumedOf, nextCostItem, nextUnitDue, totalUnits, unitThreshold } from './costs';
import { capOf } from './effects';
import { count, has, room } from './inventory';
import type { GameState, Work } from './types';

export const NO_WORK: Work = { progress: 0, costsConsumed: 0 };

export function chapterOf(state: GameState, content: Content): Chapter {
  const chapter = content.chapters[state.chapter];
  if (chapter === undefined) throw new Error(`no chapter ${state.chapter}`);
  return chapter;
}

/**
 * The page this life is on (spec 2026-09-24-pages section 4): the first page
 * of the chapter whose closing row is not done. Derived, never stored, so a
 * save from before pages lands on the right page. After the finish every
 * closer is done, and the answer is the chapter's last page.
 */
export function pageOf(state: GameState, content: Content): Page {
  const pages = chapterOf(state, content).pages;
  const page = pages.find((p) => !state.completedOneTime.includes(p.closes)) ?? pages[pages.length - 1];
  if (page === undefined) throw new Error(`chapter ${state.chapter} has no pages`);
  return page;
}

/** The chapter's event: its last page's closing row, which casts off (or, in the last chapter, finishes the book). */
export function eventOf(chapter: Chapter): ActionId {
  const last = chapter.pages[chapter.pages.length - 1];
  if (last === undefined) throw new Error('a chapter with no pages');
  return last.closes;
}

/**
 * A closing row's undone prerequisites (spec 2026-09-24-pages section 4.2):
 * the other one-time rows of its page not yet done, in page order. Empty for
 * any row that is not the current page's closer, and once they are all done.
 */
export function pageWaits(state: GameState, content: Content, id: ActionId): readonly ActionId[] {
  const page = pageOf(state, content);
  if (page.closes !== id) return [];
  return page.order.filter((r) => r !== id && content.actions[r]?.isOneTime === true && !state.completedOneTime.includes(r));
}

/** Whether the page this life is on has the row (only its rows are on screen and in play). */
export function here(state: GameState, content: Content, id: ActionId): boolean {
  return pageOf(state, content).order.includes(id);
}

/** The row's kept progress this life (section 2.2). */
export function workOf(state: GameState, id: ActionId): Work {
  return state.work[id] ?? NO_WORK;
}

export function isDone(state: GameState, action: ActionDefinition): boolean {
  return action.isOneTime && state.completedOneTime.includes(action.id);
}

/** Units of `item` the row has yet to spend, given what its kept progress spent. 0 if it does not cost the item. */
export function stillOwed(action: ActionDefinition, work: Work, item: ItemId): number {
  const cost = action.itemCosts.find((c) => c.item === item);
  return cost === undefined ? 0 : cost.amount - consumedOf(action, work.costsConsumed, item);
}

export interface Shortfall { readonly item: ItemId; readonly amount: number }

/**
 * What stops the row working its next tick: an unmet need first (section
 * 6.2), then the unit it owes when the pack has none. `amount` is what the
 * pack still lacks of the item for the whole row. null: it can work.
 */
export function shortfall(state: GameState, action: ActionDefinition): Shortfall | null {
  for (const need of action.needs ?? []) {
    const have = count(state.inventory, need.item);
    if (have < need.amount) return { item: need.item, amount: need.amount - have };
  }
  const w = workOf(state, action.id);
  if (!nextUnitDue(action, w.progress, w.costsConsumed)) return null;
  const item = nextCostItem(action, w.costsConsumed)!;
  return has(state.inventory, item, 1) ? null : { item, amount: stillOwed(action, w, item) };
}

/**
 * The progress the row can reach on what the pack holds now: its XP cost, or
 * the threshold of the first unit it could not pay, where it stops (and is
 * supplied or leaves). The queue's countdown runs to here.
 */
export function reachOf(state: GameState, action: ActionDefinition): number {
  const left: Record<ItemId, number> = {};
  for (let u = workOf(state, action.id).costsConsumed; u < totalUnits(action); u++) {
    const item = nextCostItem(action, u)!;
    left[item] ??= count(state.inventory, item);
    if (left[item] === 0) return unitThreshold(action, u);
    left[item] -= 1;
  }
  return action.expCost;
}

/** A producer whose stack has no room for one more completion. */
export function isFull(state: GameState, content: Content, action: ActionDefinition): boolean {
  const item = action.producedItem;
  if (item === undefined) return false;
  return room(state.inventory, item, capOf(state, content, item)) < (action.producedAmount ?? 1);
}

/**
 * Completions a row below could still run before its own output is full: one
 * for a one-time row, none for a producer already full, unbounded for a
 * repeating row that makes nothing.
 */
function runsToFull(state: GameState, content: Content, action: ActionDefinition): number {
  if (action.isOneTime) return 1;
  const item = action.producedItem;
  if (item === undefined) return Infinity;
  return Math.floor(room(state.inventory, item, capOf(state, content, item)) / (action.producedAmount ?? 1));
}

/**
 * Section 2.3: the count of its item a repeating producer at `index` stops
 * at. It sums what the entries below still need of the item, down to the next
 * entry that makes it, and stops there or at the cap; with nothing below
 * needing it, the cap. Each row counts once however many entries it has (they
 * share its progress and its stack): a one-time row owes what it has yet to
 * spend; a repeating row owes its cost for every completion it is asked for
 * (a single entry one, an automation fill its count left, a repeating entry
 * all of them) up to the ones that would fill its own output. A need counts
 * once, as the amount to hold.
 *
 * An automation supply order (`for`) fetches for the order it supplies and
 * nothing else, just in time: one completion of a repeating row, what a
 * one-time still owes (code panel rounds two and three: a food fill waiting
 * on a whole stack of its input, or on a one-time queued below it, starved
 * the player). Other orders, the player's included, look below as above.
 */
export function lookAheadTarget(state: GameState, content: Content, index: number): number {
  const entry = state.queue[index];
  const item = entry === undefined ? undefined : content.actions[entry.actionId]?.producedItem;
  if (item === undefined) return 0;
  const cap = capOf(state, content, item);
  if (entry!.for !== undefined) {
    const served = state.queue.find((e) => e.id === entry!.for);
    const b = served === undefined ? undefined : content.actions[served.actionId];
    if (b === undefined || isDone(state, b)) return 0;
    const held = (b.needs ?? []).filter((n) => n.item === item).reduce((sum, n) => sum + n.amount, 0);
    return Math.min(cap, held + stillOwed(b, workOf(state, b.id), item));
  }
  const asked = new Map<ActionId, number>();
  for (const e of state.queue.slice(index + 1)) {
    const b = content.actions[e.actionId];
    if (b === undefined || isDone(state, b)) continue;
    if (b.producedItem === item) break;
    const runs = b.isOneTime || e.mode === 'once' ? 1 : e.left ?? Infinity;
    asked.set(b.id, (asked.get(b.id) ?? 0) + runs);
  }
  let need = 0;
  for (const [id, runs] of asked) {
    const b = content.actions[id]!;
    for (const n of b.needs ?? []) if (n.item === item) need += n.amount;
    const cost = b.itemCosts.find((c) => c.item === item);
    const left = Math.min(runs, runsToFull(state, content, b));
    if (cost !== undefined && left > 0) need += stillOwed(b, workOf(state, id), item) + (left - 1) * cost.amount;
  }
  return need > 0 ? Math.min(cap, need) : cap;
}
