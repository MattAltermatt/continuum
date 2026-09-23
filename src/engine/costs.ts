/**
 * Incremental cost consumption, MECHANICS section 2: costs are paid one unit
 * at a time as progress accrues, never as a lump sum on completion. Declaration
 * order is spend order.
 */
import type { ActionDefinition, ItemId } from '../data/types';

export function totalUnits(action: ActionDefinition): number {
  return action.itemCosts.reduce((sum, c) => sum + c.amount, 0);
}

/**
 * How many units must have been consumed at this progress: every unit whose
 * threshold has been reached. One is spent to begin. The queue asks
 * `nextUnitDue` instead; this is the MECHANICS table's function, kept so the
 * worked example stays a test. Defined through
 * `unitThreshold`, the same expression the queue clamps to, so the table and
 * the queue can never disagree at a clamped progress.
 */
export function requiredCostsConsumed(action: ActionDefinition, progress: number): number {
  const total = totalUnits(action);
  let n = 0;
  while (n < total && progress >= unitThreshold(action, n)) n += 1;
  return n;
}

/**
 * The progress at which unit `n` (0-based) falls due: unit 0 at zero, to begin.
 * The queue clamps a stalled entry's progress to exactly this value, and
 * `nextUnitDue` compares against the same expression, so a clamped entry reads
 * as owing that unit with no floating-point drift between the two.
 */
export function unitThreshold(action: ActionDefinition, n: number): number {
  return n * (action.expCost / totalUnits(action));
}

/** Whether the unit after `costsConsumed` is owed at this progress. */
export function nextUnitDue(action: ActionDefinition, progress: number, costsConsumed: number): boolean {
  return costsConsumed < totalUnits(action) && progress >= unitThreshold(action, costsConsumed);
}

/** Units of `item` already consumed, walking itemCosts in declared order (spend order). */
export function consumedOf(action: ActionDefinition, costsConsumed: number, item: ItemId): number {
  let preceding = 0;
  for (const c of action.itemCosts) {
    if (c.item === item) return Math.min(c.amount, Math.max(0, costsConsumed - preceding));
    preceding += c.amount;
  }
  return 0;
}

/** The item the next unit comes from, walking itemCosts in declared order. */
export function nextCostItem(action: ActionDefinition, costsConsumed: number): ItemId | null {
  let seen = 0;
  for (const c of action.itemCosts) {
    if (costsConsumed < seen + c.amount) return c.item;
    seen += c.amount;
  }
  return null;
}
