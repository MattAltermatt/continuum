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
import { ICON_NAMES } from './icons';
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
  return problems;
}
