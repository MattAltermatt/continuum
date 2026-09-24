/**
 * The queue as a list of orders (spec 2026-09-23-the-windward-run section 2,
 * #47): entries with their own identity, repeating or single; only the top
 * runs; a row's progress lives on the row. This file adds, removes and works
 * entries; what happens before any time passes is resolve.ts. The engine
 * reports what happened as typed events and writes no prose.
 */
import { balance } from '../balance';
import type { ActionDefinition, ActionId, Content, ItemId, SkillDefinition, SkillId } from '../data/types';
import { isUnlocked, makersOf, modeOf, rankOf, unlockAt, withoutOrphans } from './automation';
import { nextCostItem, nextUnitDue, unitThreshold } from './costs';
import { capOf, gearMultiplier } from './effects';
import { add, count, has, take, type Inventory } from './inventory';
import { chapterOf, eventOf, here, isDone, isFull, lookAheadTarget, NO_WORK, pageWaits, shortfall, workOf } from './rows';
import { award, newSkill, tickExp } from './skills';
import type { AutoMode, GameEvent, GameState, QueueEntry, SkillState, SkillStats, SupplyCause, SupplyGap, Work } from './types';

export const NO_STATS: SkillStats = { ticks: 0, bestRun: 0 };

/** A fresh life around the given ledgers. newState builds them from a roster; rebirth carries them over. */
export function blankRun(skills: Readonly<Record<SkillId, SkillState>>, lifeStartCore: Readonly<Record<SkillId, number>>): GameState {
  return {
    runTicks: 0,
    health: balance.health.base,
    maxHealth: balance.health.base,
    paused: 'system',
    dead: false,
    finished: false,
    skills,
    skillStats: Object.fromEntries(Object.keys(skills).map((id) => [id, NO_STATS])),
    inventory: {},
    acquired: [],
    foodCooldowns: {},
    queue: [],
    nextEntryId: 0,
    work: {},
    provisioned: [],
    idleFed: false,
    chapter: 0,
    completedOneTime: [],
    completionCounts: {},
    automation: {},
    decayMultiplier: 1,
    life: 1,
    finishes: 0,
    rebirthBonus: 0,
    lifeStartCore,
    events: [],
  };
}

/** The first life of a book: one fresh skill per roster entry (spec 2026-09-23 section 2). */
export function newState(roster: readonly SkillDefinition[]): GameState {
  return blankRun(
    Object.fromEntries(roster.map((s) => [s.id, newSkill()])),
    Object.fromEntries(roster.map((s) => [s.id, 0])),
  );
}

/** Why a row cannot start now (section 2.5). `enough` is the play button's alone: a producer whose look-ahead from the top is already met. */
export type StartBlock =
  | { readonly kind: 'elsewhere' }
  | { readonly kind: 'done' }
  /** A closing row whose page still has one-time rows undone (spec 2026-09-24-pages section 4.2), in page order. */
  | { readonly kind: 'page'; readonly waits: readonly ActionId[] }
  | { readonly kind: 'full'; readonly item: ItemId }
  | { readonly kind: 'enough'; readonly item: ItemId }
  /** The play button's and the row's alone (fight.ts hurtBlock): a fight that would stop (#74). */
  | { readonly kind: 'hurt' }
  | { readonly kind: 'short'; readonly item: ItemId; readonly amount: number; readonly maker: ActionId | null; readonly gap: SupplyGap; readonly cause?: SupplyCause };

export type Supply =
  | { readonly kind: 'ok'; readonly maker: ActionId; readonly mode: AutoMode }
  | { readonly kind: 'gap'; readonly maker: ActionId | null; readonly gap: SupplyGap; readonly cause?: SupplyCause };

/**
 * Who supplies `item` here (section 2.4): the best-ranked automated maker
 * whose own chain closes, walking the makers in rank order (JIT first). `seen`
 * holds the rows already on the chain, so a cycle reads as blocked. When none
 * can, why not: nothing here makes it, its maker is off or not yet earned, or
 * an automated maker is blocked, which names that maker and, as `cause`, the
 * deepest reason down its chain: what the player can change.
 */
export function supplyVia(state: GameState, content: Content, item: ItemId, seen: ReadonlySet<ActionId>): Supply {
  const makers = makersOf(state, content, item);
  const on = makers.filter((a) => modeOf(state, a) !== 'off').sort((a, b) => rankOf(modeOf(state, a)) - rankOf(modeOf(state, b)));
  let blocked: Supply | null = null;
  for (const m of on) {
    if (seen.has(m.id)) { blocked ??= { kind: 'gap', maker: m.id, gap: 'blocked' }; continue; }
    const block = blockOf(state, content, m.id, new Set([...seen, m.id]));
    if (block === null) return { kind: 'ok', maker: m.id, mode: modeOf(state, m) };
    if (blocked === null) {
      const cause = causeOf(block, seen, m.id);
      blocked = cause === undefined ? { kind: 'gap', maker: m.id, gap: 'blocked' } : { kind: 'gap', maker: m.id, gap: 'blocked', cause };
    }
  }
  if (blocked !== null) return blocked;
  const first = makers[0];
  if (first === undefined) return { kind: 'gap', maker: null, gap: 'none' };
  const gap = isUnlocked(state, first) ? 'off' : 'unearned';
  // A maker the player would run by hand that cannot start by hand either: name what stops it, as for an automated one.
  // `seen` stops the walk at a row already on the chain, so a cycle of makers ends instead of recursing.
  if (!seen.has(first.id)) {
    const block = blockOf(state, content, first.id, new Set([...seen, first.id]));
    if (block !== null && block.kind === 'short') {
      const cause = causeOf(block, seen, first.id);
      return cause === undefined ? { kind: 'gap', maker: first.id, gap: 'blocked' } : { kind: 'gap', maker: first.id, gap: 'blocked', cause };
    }
  }
  return { kind: 'gap', maker: first.id, gap };
}

/**
 * The deepest reason down a blocked maker's chain. A deeper cause travels up
 * as it is, marked deep; none when the block is not a shortfall, or when the
 * reason would name a row already on the chain (a cycle), which says nothing
 * the player can act on.
 */
function causeOf(block: StartBlock | null, seen: ReadonlySet<ActionId>, maker: ActionId): SupplyCause | undefined {
  if (block === null || block.kind !== 'short') return undefined;
  const cause = block.cause === undefined
    ? (block.gap === 'blocked' ? undefined : { item: block.item, maker: block.maker, gap: block.gap })
    : { ...block.cause, deep: true as const };
  if (cause === undefined || (cause.maker !== null && (cause.maker === maker || seen.has(cause.maker)))) return undefined;
  return cause;
}

function blockOf(state: GameState, content: Content, id: ActionId, seen: ReadonlySet<ActionId>): StartBlock | null {
  const action = content.actions[id];
  if (action === undefined || !here(state, content, id)) return { kind: 'elsewhere' };
  if (isDone(state, action)) return { kind: 'done' };
  const waits = pageWaits(state, content, id);
  if (waits.length > 0) return { kind: 'page', waits };
  if (isFull(state, content, action)) return { kind: 'full', item: action.producedItem! };
  const short = shortfall(state, action);
  if (short === null) return null;
  const supply = supplyVia(state, content, short.item, seen);
  if (supply.kind === 'ok') return null;
  const base = { kind: 'short' as const, item: short.item, amount: short.amount, maker: supply.maker, gap: supply.gap };
  return supply.cause === undefined ? base : { ...base, cause: supply.cause };
}

/**
 * Why the row cannot start now, counting automation that would supply it along
 * the whole chain. null: it can start. `avoid`: rows a supply may not run
 * through (fight.ts: a chain through a fight buys no time).
 */
export function startBlock(state: GameState, content: Content, id: ActionId, avoid: ReadonlySet<ActionId> = new Set()): StartBlock | null {
  return blockOf(state, content, id, new Set([id, ...avoid]));
}

/**
 * The play button's refusal (section 2.5): startBlock, and for a repeating producer, a
 * look-ahead from the top that the pack already meets: it would pop at once
 * and do nothing, so now says so instead of accepting it silently.
 */
export function frontBlock(state: GameState, content: Content, id: ActionId, once = false): StartBlock | null {
  const block = startBlock(state, content, id);
  // A closer that waits on its page is honoured, not refused: resolve pulls what it waits on (spec 2026-09-24-pages section 4.2).
  if (block?.kind === 'page') return null;
  // So is a row short of what a row on the page makes, whatever that row's chip: resolve pulls the maker (section 4.3).
  if (block?.kind === 'short' && makersOf(state, content, block.item).some((m) => m.id !== id)) return null;
  const action = content.actions[id];
  if (block !== null || once || action === undefined || action.isOneTime || action.producedItem === undefined) return block;
  const probe: GameState = { ...state, queue: [{ id: -1, actionId: id, mode: 'repeat', by: 'player' }, ...state.queue] };
  return count(state.inventory, action.producedItem) >= lookAheadTarget(probe, content, 0) ? { kind: 'enough', item: action.producedItem } : null;
}

export interface EnqueueOptions {
  /** Now: the top. Otherwise, +: the bottom. */
  readonly front?: boolean;
  /** Shift+click: exactly one completion (section 2.1). A one-time row is always single. */
  readonly once?: boolean;
  readonly by?: 'player' | 'auto';
  /** Automation's food and provision fills: completions before the entry leaves. */
  readonly left?: number;
  /** Automation's supply orders: the order it supplies. */
  readonly for?: number;
}

/**
 * Adds an order (sections 2.1, 2.5). The same state back on a dead run, for a
 * row this port does not have, or a one-time already done. A player's play button
 * is refused too while frontBlock says the row cannot start; + appends even then.
 * Automation always queues what it decides.
 */
export function enqueue(state: GameState, content: Content, id: ActionId, opts: EnqueueOptions = {}): GameState {
  const action = content.actions[id];
  if (action === undefined || state.dead || !here(state, content, id) || isDone(state, action)) return state;
  const by = opts.by ?? 'player';
  if (opts.front === true && by === 'player' && frontBlock(state, content, id, opts.once === true) !== null) return state;
  const mode = action.isOneTime || opts.once === true ? 'once' : 'repeat';
  // Shift on a hurting row forces it (#74 section 3.3): fought to the end, never backed off. Automation never forces.
  // A hurting repeatable too (code panel): the refusal names Shift+play, so Shift+play must keep that promise.
  const forced = by === 'player' && opts.once === true && (action.hurts ?? 0) > 0;
  const base: QueueEntry = forced ? { id: state.nextEntryId, actionId: id, mode, by, forced: true } : { id: state.nextEntryId, actionId: id, mode, by };
  const filled: QueueEntry = by === 'auto' && mode === 'repeat' && opts.left !== undefined ? { ...base, left: opts.left } : base;
  const entry: QueueEntry = by === 'auto' && opts.for !== undefined ? { ...filled, for: opts.for } : filled;
  return {
    ...state,
    nextEntryId: state.nextEntryId + 1,
    queue: opts.front === true ? [entry, ...state.queue] : [...state.queue, entry],
  };
}

/**
 * Removes one order, and the automation supply fetching for it (code panel
 * round four: at once, paused or not). Its row keeps its progress (section
 * 2.2), so nothing is lost.
 */
export function removeEntry(state: GameState, entryId: number): GameState {
  if (state.dead || !state.queue.some((e) => e.id === entryId)) return state;
  return { ...state, queue: withoutOrphans(state.queue.filter((e) => e.id !== entryId)) };
}

/**
 * Pay every unit whose threshold the work's progress has reached. On a unit it
 * cannot pay, progress is clamped to that unit's threshold and `short` names
 * the item: work never runs ahead of its materials. MECHANICS section 2.
 */
function payDue(inventory: Inventory, action: ActionDefinition, w: Work): { inventory: Inventory; work: Work; short?: ItemId } {
  let inv = inventory;
  let consumed = w.costsConsumed;
  while (nextUnitDue(action, w.progress, consumed)) {
    const item = nextCostItem(action, consumed)!;
    if (!has(inv, item, 1)) {
      return { inventory: inv, work: { progress: Math.min(w.progress, unitThreshold(action, consumed)), costsConsumed: consumed }, short: item };
    }
    inv = take(inv, item, 1);
    consumed += 1;
  }
  return { inventory: inv, work: { progress: w.progress, costsConsumed: consumed } };
}

/** MECHANICS section 2's completion, on the top entry. Task 4 adds casting off at the end. */
function complete(state: GameState, content: Content, action: ActionDefinition, events: GameEvent[]): GameState {
  let s = state;
  const item = action.producedItem;
  if (item !== undefined) {
    s = {
      ...s,
      inventory: add(s.inventory, item, action.producedAmount ?? 1, capOf(s, content, item)).inventory,
      acquired: s.acquired.includes(item) ? s.acquired : [...s.acquired, item],
    };
  }
  if (action.healthDecayMultiplier !== undefined) s = { ...s, decayMultiplier: s.decayMultiplier * action.healthDecayMultiplier };
  const done = (s.completionCounts[action.id] ?? 0) + 1;
  s = { ...s, completionCounts: { ...s.completionCounts, [action.id]: done }, work: { ...s.work, [action.id]: NO_WORK } };
  events.push({ type: 'completed', actionId: action.id, oneTime: action.isOneTime });
  if (done === unlockAt(action)) events.push({ type: 'unlocked', actionId: action.id });
  if (action.isOneTime) s = { ...s, completedOneTime: [...s.completedOneTime, action.id] };
  const top = s.queue[0];
  if (action.isOneTime || top?.mode === 'once' || (top?.left !== undefined && top.left <= 1)) s = { ...s, queue: s.queue.slice(1) };
  else if (top?.left !== undefined) s = { ...s, queue: [{ ...top, left: top.left - 1 }, ...s.queue.slice(1)] };
  const chapter = chapterOf(s, content);
  if (action.id === eventOf(chapter)) return castOff(s, content, events);
  const turned = chapter.pages.findIndex((p) => p.closes === action.id);
  return turned < 0 ? s : turnPage(s, chapter.pages[turned + 1]!.order, turned + 1, events);
}

/**
 * A page's closing row turns the page (spec 2026-09-24-pages section 2): the
 * queue keeps only orders the new page lists, and their supplies. Items and
 * automation stay; the chips act only on rows here anyway.
 */
function turnPage(state: GameState, order: readonly ActionId[], page: number, events: GameEvent[]): GameState {
  events.push({ type: 'pageTurn', chapter: state.chapter, page });
  return { ...state, queue: withoutOrphans(state.queue.filter((e) => order.includes(e.actionId))) };
}

/**
 * Section 4: the port's big event casts off. The next port's rows are the
 * rows; every non-food item is dumped; the queue keeps only orders the new
 * port has. What completed rows did stays for the life (effects.ts). The last
 * port's event is the book's finish (section 9): the life ends there.
 */
function castOff(state: GameState, content: Content, events: GameEvent[]): GameState {
  if (state.chapter >= content.chapters.length - 1) {
    events.push({ type: 'finished', runTicks: state.runTicks });
    return { ...state, dead: true, finished: true, paused: 'system' };
  }
  const chapter = state.chapter + 1;
  const order = content.chapters[chapter]!.pages[0]!.order;
  const inventory = Object.fromEntries(Object.entries(state.inventory).filter(([id]) => content.items[id]?.kind === 'food'));
  events.push({ type: 'castOff', chapter });
  return { ...state, chapter, inventory, provisioned: [], idleFed: false, queue: state.queue.filter((e) => order.includes(e.actionId)) };
}

/**
 * One tick of work on the top entry. The caller (step) has resolved the queue,
 * so the top can work, and has advanced the clock.
 */
export function work(state: GameState, content: Content): { readonly state: GameState; readonly events: readonly GameEvent[] } {
  const events: GameEvent[] = [];
  const top = state.queue[0];
  const action = top === undefined ? undefined : content.actions[top.actionId];
  if (action === undefined) return { state, events };
  const skill = state.skills[action.verb];
  // A validated book has a roster entry for every verb (src/data/validate.ts); a fixture that lacks one is a bug, not a state.
  if (skill === undefined) throw new Error(`no skill state for verb "${action.verb}"`);
  const before = payDue(state.inventory, action, workOf(state, action.id));
  let next: GameState = { ...state, inventory: before.inventory, work: { ...state.work, [action.id]: before.work } };
  if (before.short !== undefined) return { state: next, events };
  const gain = tickExp(skill, gearMultiplier(state, content, action.verb));
  const after = payDue(before.inventory, action, { ...before.work, progress: before.work.progress + gain });
  // XP is the progress actually made (spec 2026-09-22 section 9): a clamped tick earns only what it applied.
  const awarded = award(skill, after.work.progress - before.work.progress);
  const stats = state.skillStats[action.verb] ?? NO_STATS;
  next = {
    ...next,
    inventory: after.inventory,
    work: { ...next.work, [action.id]: after.work },
    skills: { ...next.skills, [action.verb]: awarded.skill },
    skillStats: { ...next.skillStats, [action.verb]: { ticks: stats.ticks + 1, bestRun: Math.max(stats.bestRun, awarded.skill.run.level) } },
  };
  for (let l = 0; l < awarded.coreLevelsGained; l++) {
    events.push({ type: 'coreLevel', skill: action.verb, level: awarded.skill.core.level - awarded.coreLevelsGained + l + 1 });
  }
  // payDue's clamp already holds progress below expCost while a unit is unpaid; the short check is defensive and no test can reach it.
  if (after.short === undefined && after.work.progress >= action.expCost) next = complete(next, content, action, events);
  return { state: next, events };
}
