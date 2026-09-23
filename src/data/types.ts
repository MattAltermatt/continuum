/**
 * The shape of content. This file is in the data layer so that content files
 * and the engine can both import it: the dependency runs engine -> data ->
 * balance, never the other way (src/purity.test.ts).
 */
export type SkillId =
  | 'forage' | 'chop' | 'mine' | 'fish' | 'shoot'
  | 'craft' | 'build' | 'cook'
  | 'fight' | 'travel' | 'talk' | 'search';

export const SKILL_IDS: readonly SkillId[] = [
  'forage', 'chop', 'mine', 'fish', 'shoot',
  'craft', 'build', 'cook',
  'fight', 'travel', 'talk', 'search',
];

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
  /** Stable identity for meta-progression; falls back to `id`. */
  readonly templateKey?: string;
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
  readonly actions: Readonly<Record<ActionId, ActionDefinition>>;
  readonly items: Readonly<Record<ItemId, ItemDefinition>>;
}

/** The running head (spec section 8.6). */
export interface ChapterHead {
  readonly book: string;
  readonly numeral: string;
  readonly chapter: string;
  readonly story: string;
}
