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
    for (const c of a.itemCosts) {
      if (!has(book.items, c.item)) problems.push(`row "${a.id}" costs "${c.item}", which the book does not define`);
    }
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

  const first = book.chapters[0];
  const opens = first !== undefined && first.order.some((id) => has(book.actions, id) && book.actions[id]!.itemCosts.length === 0);
  if (!opens) problems.push('the first chapter has no row that needs nothing in hand');

  if (!Number.isInteger(book.version) || book.version < 1) problems.push(`version ${book.version} is not a positive integer`);
  const last = book.chapters[book.chapters.length - 1];
  if (!has(book.actions, book.finish)) problems.push(`finish "${book.finish}" is not a row`);
  else if (!book.actions[book.finish]!.isOneTime) problems.push(`finish "${book.finish}" is repeatable; it must be one-time`);
  else if (last === undefined || !last.order.includes(book.finish)) problems.push(`finish "${book.finish}" is not in the last chapter`);
  const both = Object.hasOwn(book.length, 'hours') && Object.hasOwn(book.length, 'days');
  const amount = book.length.hours !== undefined ? book.length.hours : book.length.days;
  if (both) problems.push('length names both hours and days; a claim must read one way');
  else if (!Number.isFinite(amount) || amount <= 0) problems.push(`length ${amount} is not a positive number`);
  else if (lengthInHours(book.length) > balance.play.maxBookDays * HOURS_PER_DAY) problems.push(`length is past ${balance.play.maxBookDays} days: a book that long cannot be loaded`);
  return problems;
}
