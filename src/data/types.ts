/**
 * The shape of content. This file is in the data layer so that content files
 * and the engine can both import it: the dependency runs engine -> data ->
 * balance, never the other way (src/purity.test.ts).
 */
import type { IconName } from './icons';

/** A skill id is book data: whatever the book's roster declares (spec 2026-09-23 section 2). */
export type SkillId = string;

/** One skill a book declares. The roster is the skills that have rows (spec 2026-09-23 section 2). */
export interface SkillDefinition {
  readonly id: SkillId;
  readonly name: string;
  readonly icon: IconName;
}

export type ItemId = string;
export type ActionId = string;

/** What an item is, for where it is shown and how many can be held (spec 2026-09-23-the-windward-run section 7). */
export type ItemKind = 'material' | 'food' | 'key';

export interface ItemCost { readonly item: ItemId; readonly amount: number }

/** A skill's tick multiplier for the rest of the life (section 6.3). */
export interface Gear { readonly skill: SkillId; readonly multiplier: number }

export interface ActionDefinition {
  readonly id: ActionId;
  /** The verb is the skill (spec 2026-09-22 section 6). */
  readonly verb: SkillId;
  /** The chapter's flavor, shown after the verb. */
  readonly noun: string;
  /** Total XP of effort to complete once; progress is in the same unit. */
  readonly expCost: number;
  readonly producedItem?: ItemId;
  readonly producedAmount?: number;
  /** Consumed incrementally, in declared order; an item appears at most once. MECHANICS section 2. */
  readonly itemCosts: readonly ItemCost[];
  /** Checked, never spent (section 6.2). */
  readonly needs?: readonly ItemCost[];
  readonly isOneTime: boolean;
  /** Health lost per second while this row runs (section 6.1). */
  readonly hurts?: number;
  /** Effects on completion, for the rest of the life. One-time rows only (section 6.3). */
  readonly healthDecayMultiplier?: number;
  readonly capacityBonus?: number;
  readonly gear?: Gear;
  /** One authored sentence the log prints when a one-time completes (spec 2026-09-22 section 9). */
  readonly beat?: string;
}

export interface ItemDefinition {
  readonly id: ItemId;
  readonly name: string;
  /** The name of one unit, where it differs from `name` ("chip" for "chips"): printed beside an amount of 1. */
  readonly one?: string;
  readonly kind: ItemKind;
  /** Food only: HP restored per unit eaten. */
  readonly healPerUnit?: number;
}

/**
 * A page of a chapter (spec 2026-09-24-pages section 4): its rows in display
 * order, and the closing row that turns it. Only the current page's rows are
 * in play.
 */
export interface Page {
  /** Shown after the chapter's name. */
  readonly name: string;
  readonly order: readonly ActionId[];
  /** A one-time row in `order`, its last one-time row. It waits for the page's other one-times; completing it turns the page. */
  readonly closes: ActionId;
}

/** A port of call (section 4): its head and its pages. Its last page's closing row casts off; in the last chapter it is the book's finish. */
export interface Chapter {
  readonly head: ChapterHead;
  readonly pages: readonly Page[];
}

export interface Content {
  /** In display order: the band shows the whole roster from life 1, in this order. */
  readonly roster: readonly SkillDefinition[];
  readonly actions: Readonly<Record<ActionId, ActionDefinition>>;
  readonly items: Readonly<Record<ItemId, ItemDefinition>>;
  /** Ports of call, in order (section 4). */
  readonly chapters: readonly Chapter[];
  /** The last chapter's event: its completion finishes the book. */
  readonly finish: ActionId;
}

/** A book: content plus what the shelf and the play need. The format a generator emits. */
export interface Book extends Content {
  readonly id: string;
  readonly name: string;
  readonly version: number;
  readonly length: BookLength;
}

/** The running head (spec section 8.6). The book's name comes from the book. */
export interface ChapterHead {
  readonly numeral: string;
  readonly chapter: string;
  readonly story: string;
}

/** The author's claim, in game time (spec 2026-09-23-headless-play section 3). Never a measurement. */
export type BookLength = { readonly hours: number; readonly days?: never } | { readonly days: number; readonly hours?: never };
