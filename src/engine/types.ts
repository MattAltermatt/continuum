/**
 * Engine state. Nothing here decides anything; every rule lives in the module
 * that owns it. Content arrives as `Content` from the data layer.
 */
import type { ActionId, ItemId, SkillId } from '../data/types';

/** One mastery ledger. `exp` is progress toward the NEXT level. */
export interface Ledger { readonly level: number; readonly exp: number }

/** MECHANICS section 3: two ledgers advancing from the same effort. */
export interface SkillState { readonly core: Ledger; readonly run: Ledger }

/** Lifetime counters the pop-out shows that the ledgers cannot derive (spec 2026-09-23-the-windward-run section 8). */
export interface SkillStats { readonly ticks: number; readonly bestRun: number }

/** A row's automation (section 3.1): off, just in time, or a passive priority. */
export type AutoMode = 'off' | 'jit' | 'top' | 'high' | 'mid' | 'low' | 'last';

/** An order in the queue (section 2.1). Its own id, so a row can be queued more than once. */
export interface QueueEntry {
  readonly id: number;
  readonly actionId: ActionId;
  readonly mode: 'repeat' | 'once';
  readonly by: 'player' | 'auto';
  /** Shift on a hurting one-time (#74): fought to the end, never backed off. */
  readonly forced?: true;
  /**
   * Automation's food and provision fills only: completions left before the
   * entry leaves (MECHANICS section 6's targetCount), so a fill that eating
   * outpaces still ends and lets the row behind it run.
   */
  readonly left?: number;
  /**
   * Automation's supply orders only: the id of the order this one was queued
   * to supply. It fetches for that order alone, and leaves when that order
   * leaves (code panel round three): a supply never outlives what it served.
   */
  readonly for?: number;
}

/** A row's work in progress this life (section 2.2). It lives on the row, so a popped entry loses nothing. */
export interface Work { readonly progress: number; readonly costsConsumed: number }

export type PauseReason = 'none' | 'player' | 'system';

/**
 * Why a short row got no supply (section 2.4): nothing here makes the item;
 * its maker is off or not yet earned; or its maker is automated but could not
 * run either.
 */
export type SupplyGap = 'none' | 'off' | 'unearned' | 'blocked';

/** Where a blocked chain stops: the item the deepest maker lacks, that maker (or null when nothing makes it) and why (the words name all three). */
/** The deepest reason down a blocked chain. `deep`: more than one maker down, so the blocked maker does not itself lack `item`. */
export interface SupplyCause { readonly item: ItemId; readonly maker: ActionId | null; readonly gap: SupplyGap; readonly deep?: true }

/** What happened this tick, for the UI to narrate. The engine writes no prose. */
export type GameEvent =
  /** The top entry left without working: its row is not here, is done, is full, or has fetched what is needed. */
  | { readonly type: 'popped'; readonly actionId: ActionId; readonly reason: 'elsewhere' | 'done' | 'full' | 'enough' | 'hurt' }
  /** A closing row left: a prerequisite it pulled could not be done this pass (spec 2026-09-24-pages section 4.2). `waits` is what it waits on. */
  | { readonly type: 'popped'; readonly actionId: ActionId; readonly reason: 'page'; readonly waits: readonly ActionId[] }
  /** The top entry left because it lacks an item and nothing supplies it; `cause` is the deepest reason when its maker is blocked. */
  | { readonly type: 'short'; readonly actionId: ActionId; readonly item: ItemId; readonly amount: number; readonly maker: ActionId | null; readonly gap: SupplyGap; readonly cause?: SupplyCause }
  /** Automation queued a row: to supply the top, food at zero, provisions before casting off, or an empty queue. */
  | { readonly type: 'automated'; readonly actionId: ActionId; readonly why: 'supply' | 'food' | 'provision' | 'idle' | 'delay' }
  /** `lastAt`: a one-time row's tick in the last life that finished it, absent when none has (spec 2026-09-25-log-delta section 3). */
  | { readonly type: 'completed'; readonly actionId: ActionId; readonly oneTime: boolean; readonly lastAt?: number }
  | { readonly type: 'coreLevel'; readonly skill: SkillId; readonly level: number }
  /** A row earned its automation chip (section 3.4). */
  | { readonly type: 'unlocked'; readonly actionId: ActionId }
  /** The chapter's big event completed; `chapter` is the index now entered (section 4). */
  | { readonly type: 'castOff'; readonly chapter: number }
  /** A page's closing row completed; `page` is the index now turned to, in `chapter` (spec 2026-09-24-pages). */
  | { readonly type: 'pageTurn'; readonly chapter: number; readonly page: number }
  | { readonly type: 'died'; readonly runTicks: number }
  /** The book's finish completed; the life is over (section 9). */
  | { readonly type: 'finished'; readonly runTicks: number };

/** One ended life, as it ended: what the death overlay charts (#90, spec 2026-09-25-death-overlay section 3). */
export interface LifeRecord {
  readonly life: number;
  /** Max health after this life's gain. */
  readonly maxHealth: number;
  /** Core level of every roster skill as the life ended. */
  readonly core: Readonly<Record<SkillId, number>>;
}

export interface GameState {
  readonly runTicks: number;
  readonly health: number;
  readonly maxHealth: number;
  readonly paused: PauseReason;
  /** The life is over and its card is up: a death, or the book's finish (then `finished` too). */
  readonly dead: boolean;
  readonly finished: boolean;
  readonly skills: Readonly<Record<SkillId, SkillState>>;
  readonly skillStats: Readonly<Record<SkillId, SkillStats>>;
  readonly inventory: Readonly<Record<ItemId, number>>;
  /** Items in the order this life first acquired them: the pack's order (section 7). */
  readonly acquired: readonly ItemId[];
  /** Ticks until each food may be eaten again. Absent means ready. */
  readonly foodCooldowns: Readonly<Record<ItemId, number>>;
  readonly queue: readonly QueueEntry[];
  /** The next entry's id. Counts up within a life; a new life starts at 0 with an empty queue. */
  readonly nextEntryId: number;
  /** Each row's kept progress this life (section 2.2). */
  readonly work: Readonly<Record<ActionId, Work>>;
  /** Food rows already provisioned for this port's departure (section 3.2): once each, cleared at casting off and death. */
  readonly provisioned: readonly ActionId[];
  /**
   * The empty-queue pass's last order was a JIT food fill (#77), so the next
   * empty queue is another row's turn. This life's; a save without it reads false.
   */
  readonly idleFed: boolean;
  /** Index into content.chapters: the port this life is in (section 4). */
  readonly chapter: number;
  readonly completedOneTime: readonly ActionId[];
  /** The run tick at which each one-time row completed this life (spec 2026-09-25-log-delta section 3). Resets with the life. */
  readonly finishedAt: Readonly<Record<ActionId, number>>;
  /** Each one-time row's tick in the last life that finished it; rebirth merges the life's finishedAt in. Kept across lives. */
  readonly lastFinish: Readonly<Record<ActionId, number>>;
  /** Lifetime completions by action id. Drives automation (section 3.4). */
  readonly completionCounts: Readonly<Record<string, number>>;
  /** Each row's mode, once set. Kept across lives (MECHANICS section 5). */
  readonly automation: Readonly<Record<ActionId, AutoMode>>;
  readonly decayMultiplier: number;
  /** Which life this is, from 1. Persists and counts up at rebirth. */
  readonly life: number;
  /** Times the book has been finished. */
  readonly finishes: number;
  /** Sum of every life's max-health gain. maxHealth is always base + this. */
  readonly rebirthBonus: number;
  /** Core levels as this life began, so the card can show what moved. */
  readonly lifeStartCore: Readonly<Record<SkillId, number>>;
  /** The verb of the last row that did work this run, so an idle screen can keep showing it (spec 2026-09-25-the-watched-screen 4.2); null on a fresh run. Kept across death. */
  readonly lastVerb: SkillId | null;
  /** Every ended life, oldest first; appended by rebirth, kept across lives (#90). */
  readonly lives: readonly LifeRecord[];
  /** This tick's events. Replaced every tick; never accumulates. */
  readonly events: readonly GameEvent[];
}
