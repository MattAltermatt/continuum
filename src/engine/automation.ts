/**
 * Automation, earned per row (spec 2026-09-23-the-windward-run section 3):
 * its modes, its unlock, and which row supplies an item. The queue acts on
 * these (resolve.ts); this file only answers. Pure.
 */
import { balance } from '../balance';
import type { ActionDefinition, ActionId, Content, ItemId } from '../data/types';
import { isDone, pageOf } from './rows';
import type { AutoMode, GameState, QueueEntry } from './types';

/** The priorities, highest first (section 3.1: the user's words for 1 to 5). */
export const PRIORITIES = ['top', 'high', 'mid', 'low', 'last'] as const;

export function isPriority(mode: AutoMode): boolean {
  return (PRIORITIES as readonly AutoMode[]).includes(mode);
}

/** Lower goes first: JIT before every priority (section 3.3); off never. */
export function rankOf(mode: AutoMode): number {
  if (mode === 'jit') return -1;
  const i = (PRIORITIES as readonly AutoMode[]).indexOf(mode);
  return i === -1 ? Number.POSITIVE_INFINITY : i;
}

/** Lifetime completions that earn a row its chip: the row's own, else its book's by kind, else balance's by kind (spec 2026-09-24-proving-ground section 2.1). */
export function unlockAt(content: Content, action: ActionDefinition): number {
  if (action.unlockAt !== undefined) return action.unlockAt;
  return action.isOneTime
    ? content.automation?.unlockOneTime ?? balance.automation.unlockOneTime
    : content.automation?.unlockRepeatable ?? balance.automation.unlockRepeatable;
}

export function isUnlocked(state: GameState, content: Content, action: ActionDefinition): boolean {
  return (state.completionCounts[action.id] ?? 0) >= unlockAt(content, action);
}

/** A row's mode as it acts: off until earned, whatever a save holds. */
export function modeOf(state: GameState, content: Content, action: ActionDefinition): AutoMode {
  return isUnlocked(state, content, action) ? state.automation[action.id] ?? 'off' : 'off';
}

/**
 * JIT means something only for a row that makes a food, or an item a row on a
 * page it shares costs or needs (section 3.1; spec 2026-09-24-pages section 4):
 * JIT answers demand, and demand from a later page never reaches it, so the
 * wardens, whose inner door the next page needs, get no JIT chip.
 */
export function canJit(content: Content, action: ActionDefinition): boolean {
  const item = action.producedItem;
  if (item === undefined) return false;
  if (content.items[item]?.kind === 'food') return true;
  const pages = content.chapters.flatMap((ch) => ch.pages).filter((p) => p.order.includes(action.id));
  return pages.some((p) => p.order.some((id) => {
    const b = content.actions[id];
    return b !== undefined && (b.itemCosts.some((c) => c.item === item) || (b.needs ?? []).some((n) => n.item === item));
  }));
}

/** The chip's cycle (section 3.1). */
export function cycleOf(content: Content, action: ActionDefinition): readonly AutoMode[] {
  return canJit(content, action) ? ['off', 'jit', ...PRIORITIES] : ['off', ...PRIORITIES];
}

export function nextMode(content: Content, action: ActionDefinition, mode: AutoMode): AutoMode {
  const cycle = cycleOf(content, action);
  return cycle[(cycle.indexOf(mode) + 1) % cycle.length]!;
}

/** Sets a row's mode. The same state back for an unknown row, a dead run, a row not yet earned, or a mode outside its cycle. */
export function setAutomation(state: GameState, content: Content, id: ActionId, mode: AutoMode): GameState {
  const action = content.actions[id];
  if (action === undefined || state.dead || !isUnlocked(state, content, action) || !cycleOf(content, action).includes(mode)) return state;
  const was = state.automation[id] ?? 'off';
  if (was === mode) return state;
  const next = { ...state, automation: { ...state.automation, [id]: mode } };
  if (was !== 'jit' && mode !== 'off') return next;
  // A food row's automation fills (the orders with a count) leave when the row leaves JIT, whose fills they are,
  // and when it goes off from a priority, whose food-at-zero fills they are since #81: off, automation stops
  // harvesting. They leave with their supply. Leaving JIT also owes the departure's provision again should the
  // row come back to JIT before it.
  const queue = withoutOrphans(next.queue.filter((e) => e.actionId !== id || e.by !== 'auto' || e.left === undefined));
  return { ...next, queue, provisioned: was === 'jit' ? next.provisioned.filter((p) => p !== id) : next.provisioned };
}

/**
 * The queue without supply orders whose order has left, followed down the
 * chain (code panel rounds three and four): a supply never outlives what it
 * served, whether the order left by an x, a pause-time edit, or a fill taken
 * back to the top. The same array when nothing is orphaned.
 */
export function withoutOrphans(queue: readonly QueueEntry[]): readonly QueueEntry[] {
  let q = queue;
  for (;;) {
    const kept = q.filter((e) => e.for === undefined || q.some((x) => x.id === e.for));
    if (kept.length === q.length) return q;
    q = kept;
  }
}

/** The rows here that make `item` and are not done this life (section 2.4). Who of them can supply it is queue.ts's supplyVia. */
export function makersOf(state: GameState, content: Content, item: ItemId): readonly ActionDefinition[] {
  return pageOf(state, content).order
    .map((id) => content.actions[id]!)
    .filter((a) => a.producedItem === item && !isDone(state, a));
}
