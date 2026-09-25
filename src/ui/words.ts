/**
 * The words for why a row cannot start (spec 2026-09-23-the-windward-run
 * sections 2.4, 2.5 and 3.3; plan Task 7). Every refusal on the play button,
 * every instruction under +, every waiting look on an automation chip and
 * every `short` log line is written here, so the row and the log never
 * disagree. A maker is named by its row, `{Skill} {noun}` (a port can hold
 * four Talk rows), and a key's amount is never printed: a key is held or not.
 */
import { skillOf } from '../data/roster';
import type { ActionId, Content, ItemId } from '../data/types';
import { unlockAt } from '../engine/automation';
import type { StartBlock } from '../engine/queue';
import type { SupplyCause, SupplyGap } from '../engine/types';

/** Lifetime completions by row, for the "not yet earned (n/N)" fraction. */
export type Counts = Readonly<Record<ActionId, number>>;

export interface WordsOptions {
  /** The state's completion counts. Given, an unearned maker reads with its n/N; left out (a log line, a record), without. */
  readonly counts?: Counts;
  /** The chip's waiting look: the reason alone, after "waits: ". */
  readonly waiting?: boolean;
}

/** A row as the screen names it: "Salvage drifting scrap". */
export function rowName(content: Content, id: ActionId): string {
  const a = content.actions[id];
  return a ? `${skillOf(content, a.verb).name} ${a.noun}` : id;
}

/** An item's name; beside an amount of 1, the name of one unit where the book gives one ("1 chip"). */
export function itemName(content: Content, item: ItemId, amount?: number): string {
  const it = content.items[item];
  if (it === undefined) return item;
  return amount === 1 && it.one !== undefined ? it.one : it.name;
}

/**
 * The rows a closer waits on, by their nouns and in page order: "the hull, a
 * trawl net, a canvas satchel". The row's "after:" line and the log's `page`
 * line both read this, so they never disagree.
 */
export function pageList(content: Content, ids: readonly ActionId[]): string {
  return ids.map((id) => content.actions[id]?.noun ?? id).join(', ');
}

/** "needs 3 scrap", or "needs the star chart" for a key, or for any item named without an amount. */
export function needPhrase(content: Content, item: ItemId, amount?: number): string {
  const key = content.items[item]?.kind === 'key';
  return key || amount === undefined ? `needs ${itemName(content, item)}` : `needs ${amount} ${itemName(content, item, amount)}`;
}

/** Why no automation supplies `item`: what the player can change. */
function reason(content: Content, item: ItemId, maker: ActionId | null, gap: SupplyGap, cause: SupplyCause | undefined, counts: Counts | undefined): string {
  if (maker === null || gap === 'none') return `nothing here makes ${itemName(content, item)}`;
  const row = rowName(content, maker);
  switch (gap) {
    case 'off': return `${row} automation is off`;
    case 'unearned': {
      const a = content.actions[maker];
      const fraction = counts !== undefined && a !== undefined ? ` (${counts[maker] ?? 0}/${unlockAt(content, a)})` : '';
      // Say what would change it, not only that it has not happened: a chip nobody earns by hand never moves (plan round five).
      return `${row} automation is not yet earned${fraction} \u00B7 earn it by hand`;
    }
    case 'blocked': {
      if (cause === undefined) return `${row} can't run`;
      // The cause's own item, never an amount (a cause carries none), then its own reason.
      const deeper = reason(content, cause.item, cause.maker, cause.gap, undefined, counts);
      // A deep cause is further down the line: the maker itself lacks something else (the salons need a lift key, not chips).
      const lead = cause.deep === true ? `${row} can't run: further down, ` : `${row} can't run: `;
      return cause.maker === null || cause.gap === 'none' ? `${lead}${deeper}` : `${lead}${needPhrase(content, cause.item)} \u00B7 ${deeper}`;
    }
  }
}

/** The one function. */
export function words(content: Content, block: StartBlock, opts: WordsOptions = {}): string {
  switch (block.kind) {
    case 'short': {
      const why = reason(content, block.item, block.maker, block.gap, block.cause, opts.counts);
      if (opts.waiting === true) return `waits: ${why}`;
      if (block.maker === null || block.gap === 'none') return why;
      return `${needPhrase(content, block.item, block.amount)} \u00B7 ${why}`;
    }
    case 'full': return `${itemName(content, block.item)} is full`;
    case 'enough': return `${itemName(content, block.item)}: enough for what is queued`;
    case 'done': return 'already done';
    case 'elsewhere': return 'not in this port';
    // A closer at rest while its page is unfinished (spec 2026-09-24-pages section 4.2): never a refusal, since a press pulls them.
    case 'page': return `after: ${pageList(content, block.waits)}`;
    case 'hurt': return 'too hurt to fight: one more push would end this life \u00B7 Shift+play fights to the end';
  }
}
