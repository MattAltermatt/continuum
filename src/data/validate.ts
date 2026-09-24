/**
 * Static checks on a book (spec 2026-09-23 section 11, step 4): the format's
 * integrity, which is what the fixed skill union used to guarantee at compile
 * time, and nothing about play. Whether a book can be finished is the headless
 * play's question (spec section 9). Returns every problem found; an empty list
 * is a valid book. Own-property checks throughout, so a key like "constructor"
 * is not mistaken for a definition. Assumes the value has the Book type's
 * shape; a JSON book needs a shape check ahead of this (filed with the
 * generator).
 */
import { balance } from '../balance';
import { ICON_NAMES } from './icons';
import { HOURS_PER_DAY, lengthInHours } from './length';
import type { ActionId, Book } from './types';

const icons: ReadonlySet<string> = new Set(ICON_NAMES);
const has = (record: object, key: string): boolean => Object.hasOwn(record, key);
const positiveWhole = (n: number): boolean => Number.isInteger(n) && n > 0;

export function validateBook(book: Book): readonly string[] {
  const problems: string[] = [];

  const seen = new Set<string>();
  for (const s of book.roster) {
    if (seen.has(s.id)) problems.push(`skill "${s.id}" is declared twice`);
    seen.add(s.id);
    if (!icons.has(s.icon)) problems.push(`skill "${s.id}" names an icon outside the vocabulary: "${s.icon}"`);
  }

  for (const [key, a] of Object.entries(book.actions)) {
    if (key !== a.id) problems.push(`action key "${key}" holds a row whose id is "${a.id}"`);
  }
  for (const [key, item] of Object.entries(book.items)) {
    if (key !== item.id) problems.push(`item key "${key}" holds an item whose id is "${item.id}"`);
  }

  const actions = Object.values(book.actions);
  for (const s of book.roster) {
    if (!actions.some((a) => a.verb === s.id)) problems.push(`skill "${s.id}" has no row`);
  }
  for (const a of actions) {
    if (!seen.has(a.verb)) problems.push(`row "${a.id}" uses verb "${a.verb}", which is not in the roster`);
    if (a.producedItem !== undefined && !has(book.items, a.producedItem)) problems.push(`row "${a.id}" produces "${a.producedItem}", which the book does not define`);
    if (a.producedAmount !== undefined && !positiveWhole(a.producedAmount)) problems.push(`row "${a.id}" produces ${a.producedAmount} at a time, which is not a positive whole number`);
    else if (a.producedItem !== undefined && a.producedAmount !== undefined) {
      // An authoring limit: a completion fits an empty stack at the base cap (a key holds one), so the row can run
      // before any capacity row is done. Capacity rows raise the cap later; a book must not depend on them for this.
      const fits = book.items[a.producedItem]?.kind === 'key' ? 1 : balance.inventory.stackCap;
      if (a.producedAmount > fits) problems.push(`row "${a.id}" produces ${a.producedAmount} at a time, more than an empty stack of "${a.producedItem}" holds at the base cap (${fits})`);
    }
    if (a.healthDecayMultiplier !== undefined && !(Number.isFinite(a.healthDecayMultiplier) && a.healthDecayMultiplier > 0)) problems.push(`row "${a.id}" multiplies decay by ${a.healthDecayMultiplier}, which is not a positive number`);
    if (!(Number.isFinite(a.expCost) && a.expCost > 0)) problems.push(`row "${a.id}" takes ${a.expCost} XP to complete, which is not a positive number`);
    // An amount that is not a positive whole number is reported as that alone: the key rule speaks only to whole amounts past one.
    const costed = new Set<string>();
    for (const c of a.itemCosts) {
      if (!has(book.items, c.item)) problems.push(`row "${a.id}" costs "${c.item}", which the book does not define`);
      if (costed.has(c.item)) problems.push(`row "${a.id}" costs "${c.item}" twice`);
      costed.add(c.item);
      if (!positiveWhole(c.amount)) problems.push(`row "${a.id}" costs ${c.amount} of "${c.item}", which is not a positive whole number`);
      else if (book.items[c.item]?.kind === 'key' && c.amount !== 1) problems.push(`row "${a.id}" costs ${c.amount} of the key "${c.item}", and a key is held once`);
    }
    for (const n of a.needs ?? []) {
      if (!has(book.items, n.item)) problems.push(`row "${a.id}" needs "${n.item}", which the book does not define`);
      if (!positiveWhole(n.amount)) problems.push(`row "${a.id}" needs ${n.amount} of "${n.item}", which is not a positive whole number`);
      else if (book.items[n.item]?.kind === 'key' && n.amount !== 1) problems.push(`row "${a.id}" needs ${n.amount} of the key "${n.item}", and a key is held once`);
    }
    if (a.hurts !== undefined && !(Number.isFinite(a.hurts) && a.hurts > 0)) problems.push(`row "${a.id}" hurts by ${a.hurts}, which is not a positive number`);
    const effect = a.healthDecayMultiplier !== undefined || a.capacityBonus !== undefined || a.gear !== undefined;
    if (effect && !a.isOneTime) problems.push(`row "${a.id}" has an effect but is repeatable`);
    if (a.capacityBonus !== undefined && !(Number.isInteger(a.capacityBonus) && a.capacityBonus > 0)) problems.push(`row "${a.id}" raises the stack by ${a.capacityBonus}, which is not a positive whole number`);
    if (a.gear !== undefined) {
      if (!(Number.isFinite(a.gear.multiplier) && a.gear.multiplier > 0)) problems.push(`row "${a.id}" gears by ${a.gear.multiplier}, which is not a positive number`);
      if (!seen.has(a.gear.skill)) problems.push(`row "${a.id}" gears "${a.gear.skill}", which is not in the roster`);
    }
  }
  for (const item of Object.values(book.items)) {
    if (item.one !== undefined && item.one.trim() === '') problems.push(`item "${item.id}" has an empty name for one unit`);
    if (item.kind === 'food') {
      if (!(item.healPerUnit !== undefined && Number.isFinite(item.healPerUnit) && item.healPerUnit > 0)) problems.push(`food "${item.id}" heals ${item.healPerUnit}, which is not a positive number`);
    } else if (item.healPerUnit !== undefined) problems.push(`item "${item.id}" is not food but heals`);
  }

  const chapterOf = new Map<ActionId, number>();
  book.chapters.forEach((ch, k) => {
    for (const id of ch.order) {
      if (!has(book.actions, id)) problems.push(`chapter ${k + 1} orders "${id}", which the book does not define`);
      else if (chapterOf.has(id)) problems.push(`row "${id}" is ordered more than once (appears in more than one chapter, or twice in one)`);
      else chapterOf.set(id, k);
    }
  });
  for (const a of actions) if (!chapterOf.has(a.id)) problems.push(`row "${a.id}" is in no chapter`);
  book.chapters.forEach((ch, k) => {
    if (!ch.order.includes(ch.event) || !has(book.actions, ch.event)) problems.push(`chapter ${k + 1}'s event "${ch.event}" is not one of its rows`);
    else if (!book.actions[ch.event]!.isOneTime) problems.push(`chapter ${k + 1}'s event "${ch.event}" is repeatable; it must be one-time`);
    // The measuring player builds a port one one-time at a time and reaches the event last (src/engine/play.ts byHand).
    else if ([...ch.order].reverse().find((id) => has(book.actions, id) && book.actions[id]!.isOneTime) !== ch.event) problems.push(`chapter ${k + 1}'s event "${ch.event}" is not its last one-time row`);
  });

  const first = book.chapters[0];
  const opens = first !== undefined && first.order.some((id) => has(book.actions, id) && book.actions[id]!.itemCosts.length === 0 && (book.actions[id]!.needs ?? []).length === 0);
  if (!opens) problems.push('the first chapter has no row that needs nothing in hand');

  if (!Number.isInteger(book.version) || book.version < 1) problems.push(`version ${book.version} is not a positive integer`);
  const last = book.chapters[book.chapters.length - 1];
  if (!has(book.actions, book.finish)) problems.push(`finish "${book.finish}" is not a row`);
  else if (!book.actions[book.finish]!.isOneTime) problems.push(`finish "${book.finish}" is repeatable; it must be one-time`);
  else if (last === undefined || last.event !== book.finish) problems.push(`finish "${book.finish}" is not the last chapter's event`);
  const both = Object.hasOwn(book.length, 'hours') && Object.hasOwn(book.length, 'days');
  const amount = book.length.hours !== undefined ? book.length.hours : book.length.days;
  if (both) problems.push('length names both hours and days; a claim must read one way');
  else if (!Number.isFinite(amount) || amount <= 0) problems.push(`length ${amount} is not a positive number`);
  else if (lengthInHours(book.length) > balance.play.maxBookDays * HOURS_PER_DAY) problems.push(`length is past ${balance.play.maxBookDays} days: a book that long cannot be loaded`);
  return problems;
}
