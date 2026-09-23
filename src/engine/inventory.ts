/**
 * The pack. Counts are plain numbers keyed by item id; caps come from content
 * (spec section 9: per-item stack caps). The queue never produces into a full
 * stack, so `add`'s clamp is a guard, not a rule anyone relies on. Pure.
 */
import type { Content, ItemId } from '../data/types';

export type Inventory = Readonly<Record<ItemId, number>>;

export function count(inv: Inventory, id: ItemId): number {
  return inv[id] ?? 0;
}

/** Space left under the cap. An item with no definition has no cap. */
export function room(inv: Inventory, content: Content, id: ItemId): number {
  const cap = content.items[id]?.cap ?? Number.POSITIVE_INFINITY;
  return cap - count(inv, id);
}

/** Add, never past the cap. Reports how many actually landed. */
export function add(inv: Inventory, content: Content, id: ItemId, n: number): { inventory: Inventory; added: number } {
  const added = Math.max(0, Math.min(n, room(inv, content, id)));
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
