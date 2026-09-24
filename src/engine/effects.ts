/**
 * What the life's completed one-time rows do for the rest of it (spec
 * 2026-09-23-the-windward-run section 6.3): a bigger stack and faster skills.
 * Derived from completedOneTime, so each resets at death with it. The decay
 * multiplier is the one effect kept on the state, as before. Pure.
 */
import { balance } from '../balance';
import type { ActionDefinition, ActionId, Content, ItemId, SkillId } from '../data/types';
import type { GameState } from './types';

/** A key is held or not: a count, not tuning. */
const KEY_CAP = 1;

function doneRows(state: GameState, content: Content): ActionDefinition[] {
  return state.completedOneTime.flatMap((id) => {
    const a = content.actions[id];
    return a === undefined ? [] : [a];
  });
}

/** The shared stack cap's raise from this life's rows (section 7). */
export function capacityBonus(state: GameState, content: Content): number {
  return doneRows(state, content).reduce((sum, a) => sum + (a.capacityBonus ?? 0), 0);
}

/** How many of an item the pack holds (#45): one shared number raised by capacity rows; a key, one; an unknown item, no limit. */
export function capOf(state: GameState, content: Content, item: ItemId): number {
  const def = content.items[item];
  if (def === undefined) return Number.POSITIVE_INFINITY;
  return def.kind === 'key' ? KEY_CAP : balance.inventory.stackCap + capacityBonus(state, content);
}

export interface GearPiece { readonly actionId: ActionId; readonly multiplier: number }

/** This life's gear for a skill, in the order it was made (the pop-out lists it). */
export function gearFor(state: GameState, content: Content, skill: SkillId): readonly GearPiece[] {
  return doneRows(state, content)
    .filter((a) => a.gear?.skill === skill)
    .map((a) => ({ actionId: a.id, multiplier: a.gear!.multiplier }));
}

/** The product of a skill's gear: the tool factor in (1 + core x 5%) x (1 + run x 1%) x tool. */
export function gearMultiplier(state: GameState, content: Content, skill: SkillId): number {
  return gearFor(state, content, skill).reduce((m, g) => m * g.multiplier, 1);
}
