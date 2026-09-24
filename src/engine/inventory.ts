/**
 * The pack. Counts are plain numbers keyed by item id; the caller passes the cap
 * (effects.ts capOf: one shared stack cap, #45). The queue never produces into a full
 * stack, so `add`'s clamp is a guard, not a rule anyone relies on. Pure.
 */
import type { ItemId } from '../data/types';

export type Inventory = Readonly<Record<ItemId, number>>;

export function count(inv: Inventory, id: ItemId): number {
  return inv[id] ?? 0;
}

/** Space left under the cap the caller passes (effects.ts capOf). */
export function room(inv: Inventory, id: ItemId, cap: number): number {
  return cap - count(inv, id);
}

/** Add, never past the cap. Reports how many actually landed. */
export function add(inv: Inventory, id: ItemId, n: number, cap: number): { inventory: Inventory; added: number } {
  const added = Math.max(0, Math.min(n, room(inv, id, cap)));
  return { inventory: { ...inv, [id]: count(inv, id) + added }, added };
}

export function has(inv: Inventory, id: ItemId, n: number): boolean {
  return count(inv, id) >= n;
}

export function take(inv: Inventory, id: ItemId, n: number): Inventory {
  const have = count(inv, id);
  if (have < n) throw new Error(`take: ${id} has ${have}, need ${n}`);
  return { ...inv, [id]: have - n };
}
