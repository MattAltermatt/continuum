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

/** What a produced thing is, for where it is shown. */
export type ItemKind = 'material' | 'food' | 'structure';

export interface ItemCost { readonly item: ItemId; readonly amount: number }

export interface ActionDefinition {
  readonly id: ActionId;
  /** The verb is the skill (spec section 6). */
  readonly verb: SkillId;
  /** The chapter's flavor, shown after the verb: "berries", "a cabin". */
  readonly noun: string;
  /** Total XP of effort to complete once; progress is in the same unit. */
  readonly expCost: number;
  readonly producedItem?: ItemId;
  readonly producedAmount?: number;
  /** Consumed incrementally, in declared order. MECHANICS section 2. */
  readonly itemCosts: readonly ItemCost[];
  readonly isOneTime: boolean;
  /** Multiplies the run's decay for the rest of the run. MECHANICS section 2. */
  readonly healthDecayMultiplier?: number;
  /** One authored sentence the log prints when a one-time completes (spec 9). */
  readonly beat?: string;
}

export interface ItemDefinition {
  readonly id: ItemId;
  readonly name: string;
  readonly kind: ItemKind;
  /** Per-item stack cap (spec section 9). A producer stops at it; nothing lands past it. */
  readonly cap: number;
  /** Food only: HP restored per unit eaten. */
  readonly healPerUnit?: number;
}

export interface Content {
  /** In display order: the band shows the whole roster from life 1, in this order. */
  readonly roster: readonly SkillDefinition[];
  readonly actions: Readonly<Record<ActionId, ActionDefinition>>;
  readonly items: Readonly<Record<ItemId, ItemDefinition>>;
}

/** The running head (spec section 8.6). The book's name comes from the book. */
export interface ChapterHead {
  readonly numeral: string;
  readonly chapter: string;
  readonly story: string;
}

/** A chapter: its head and its rows in display order, which is also queue order. */
export interface Chapter {
  readonly head: ChapterHead;
  readonly order: readonly ActionId[];
}

/** A book: content plus what the shelf and the chapter panel need. The format a generator emits. */
export interface Book extends Content {
  readonly id: string;
  readonly name: string;
  readonly chapters: readonly Chapter[];
}
