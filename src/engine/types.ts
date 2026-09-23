/**
 * Engine state. Nothing here decides anything; every rule lives in the module
 * that owns it. Content arrives as `Content` from the data layer.
 */
import type { ActionId, ItemId, SkillId } from '../data/types';

/** One mastery ledger. `exp` is progress toward the NEXT level. */
export interface Ledger { readonly level: number; readonly exp: number }

/** MECHANICS section 3: two ledgers advancing from the same effort. */
export interface SkillState { readonly core: Ledger; readonly run: Ledger }

/** One per action: the queue never holds two entries for the same action. */
export interface QueueEntry {
  readonly actionId: ActionId;
  readonly progress: number;
  readonly costsConsumed: number;
  /** Waiting on an input it cannot pay. It stays in the queue (spec 8.5, 9). */
  readonly stalled: boolean;
}

export type PauseReason = 'none' | 'player' | 'system';

/** What happened this tick, for the UI to narrate. The engine writes no prose. */
export type GameEvent =
  | { readonly type: 'stalled'; readonly actionId: ActionId; readonly item: ItemId }
  | { readonly type: 'resumed'; readonly actionId: ActionId }
  /** A producer whose stack has no room for another completion left the queue. */
  | { readonly type: 'full'; readonly actionId: ActionId; readonly item: ItemId }
  | { readonly type: 'completed'; readonly actionId: ActionId; readonly oneTime: boolean }
  | { readonly type: 'coreLevel'; readonly skill: SkillId; readonly level: number }
  | { readonly type: 'died'; readonly runTicks: number };

export interface GameState {
  readonly runTicks: number;
  readonly health: number;
  readonly maxHealth: number;
  readonly paused: PauseReason;
  readonly dead: boolean;
  readonly skills: Readonly<Record<SkillId, SkillState>>;
  readonly inventory: Readonly<Record<ItemId, number>>;
  /** Ticks until each food may be eaten again. Absent means ready. */
  readonly foodCooldowns: Readonly<Record<ItemId, number>>;
  readonly queue: readonly QueueEntry[];
  readonly completedOneTime: readonly ActionId[];
  /** Lifetime completions by templateKey. Drives automation later. */
  readonly completionCounts: Readonly<Record<string, number>>;
  readonly decayMultiplier: number;
  /** This tick's events. Replaced every tick; never accumulates. */
  readonly events: readonly GameEvent[];
}
