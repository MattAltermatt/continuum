/**
 * The action queue, MECHANICS section 2, with the changes the spec declares in
 * section 9: one entry per action; a waiting entry stays in the queue; the
 * engine works the first entry that can run this tick; a producer never
 * produces into a full stack and leaves the queue instead. Nothing is re-paid.
 * The engine reports what happened as typed events and writes no prose.
 * No automation here.
 */
import { balance } from '../balance';
import type { ActionDefinition, ActionId, Content, ItemId, SkillDefinition, SkillId } from '../data/types';
import type { GameEvent, GameState, QueueEntry, SkillState } from './types';
import { award, newSkill, tickExp } from './skills';
import { add, has, room, take } from './inventory';
import { nextCostItem, nextUnitDue, unitThreshold } from './costs';

/** A fresh run around the given ledgers. newState builds them from a roster; rebirth carries them over. */
export function blankRun(skills: Readonly<Record<SkillId, SkillState>>, lifeStartCore: Readonly<Record<SkillId, number>>): GameState {
  return {
    runTicks: 0,
    health: balance.health.base,
    maxHealth: balance.health.base,
    paused: 'system',
    dead: false,
    skills,
    inventory: {},
    foodCooldowns: {},
    queue: [],
    completedOneTime: [],
    completionCounts: {},
    decayMultiplier: 1,
    events: [],
    life: 1,
    rebirthBonus: 0,
    lifeStartCore,
  };
}

/** The first life of a book: one fresh skill per roster entry (spec 2026-09-23 section 2). */
export function newState(roster: readonly SkillDefinition[]): GameState {
  return blankRun(
    Object.fromEntries(roster.map((s) => [s.id, newSkill()])),
    Object.fromEntries(roster.map((s) => [s.id, 0])),
  );
}

export function enqueue(state: GameState, content: Content, actionId: ActionId, opts: { front?: boolean } = {}): GameState {
  const action = content.actions[actionId];
  // A dead run takes no orders; rebirth is what comes next.
  if (!action || state.dead) return state;
  const existing = state.queue.findIndex((e) => e.actionId === actionId);
  if (existing !== -1) {
    if (!opts.front || existing === 0) return state;
    const entry = state.queue[existing]!;
    return { ...state, queue: [entry, ...state.queue.filter((_, i) => i !== existing)] };
  }
  if (action.isOneTime && state.completedOneTime.includes(actionId)) return state;
  const entry: QueueEntry = { actionId, progress: 0, costsConsumed: 0, stalled: false };
  return { ...state, queue: opts.front ? [entry, ...state.queue] : [...state.queue, entry] };
}

export function removeAction(state: GameState, actionId: ActionId): GameState {
  if (state.dead || !state.queue.some((e) => e.actionId === actionId)) return state;
  return { ...state, queue: state.queue.filter((e) => e.actionId !== actionId) };
}

/**
 * The item of the unit this entry owes right now, when the pack has none of it;
 * null otherwise. Progress never runs past an unpaid unit (stepQueue), so an
 * entry at rest owes at most one unit and checking the next one is enough.
 */
export function missingInput(state: GameState, content: Content, entry: QueueEntry): ItemId | null {
  const action = content.actions[entry.actionId];
  if (!action || !nextUnitDue(action, entry.progress, entry.costsConsumed)) return null;
  const item = nextCostItem(action, entry.costsConsumed);
  return item !== null && !has(state.inventory, item, 1) ? item : null;
}

/** The producer's item when its stack has no room for one more completion; null otherwise. */
export function fullItem(state: GameState, content: Content, entry: QueueEntry): ItemId | null {
  const action = content.actions[entry.actionId];
  if (!action?.producedItem) return null;
  return room(state.inventory, content, action.producedItem) < (action.producedAmount ?? 1) ? action.producedItem : null;
}

/** The entry that can do work this tick, flagged or not. -1 if none. */
export function firstRunnable(state: GameState, content: Content): number {
  return state.queue.findIndex((e) =>
    content.actions[e.actionId] !== undefined && missingInput(state, content, e) === null && fullItem(state, content, e) === null);
}

/**
 * The bookkeeping that takes no time (spec section 9, decision #41): drop full
 * producers, flag entries that cannot pay, unflag entries that can again. The
 * same object back when nothing changed, so an idle tick renders nothing.
 */
export function settle(state: GameState, content: Content): GameState {
  const events: GameEvent[] = [];
  const queue: QueueEntry[] = [];
  for (const e of state.queue) {
    const full = fullItem(state, content, e);
    if (full !== null) {
      events.push({ type: 'full', actionId: e.actionId, item: full });
      continue;
    }
    const missing = missingInput(state, content, e);
    if (missing !== null && !e.stalled) {
      events.push({ type: 'stalled', actionId: e.actionId, item: missing });
      queue.push({ ...e, stalled: true });
    } else if (missing === null && e.stalled) {
      events.push({ type: 'resumed', actionId: e.actionId });
      queue.push({ ...e, stalled: false });
    } else {
      queue.push(e);
    }
  }
  return events.length === 0 ? state : { ...state, queue, events };
}

/**
 * Pay every unit whose threshold the entry's progress has reached. On a unit it
 * cannot pay, progress is clamped to that unit's threshold and `short` names
 * the item: work never runs ahead of its materials.
 */
function payDue(state: GameState, action: ActionDefinition, entry: QueueEntry): { state: GameState; entry: QueueEntry; short?: ItemId } {
  let inventory = state.inventory;
  let consumed = entry.costsConsumed;
  while (nextUnitDue(action, entry.progress, consumed)) {
    const item = nextCostItem(action, consumed)!;
    if (!has(inventory, item, 1)) {
      const progress = Math.min(entry.progress, unitThreshold(action, consumed));
      return { state: { ...state, inventory }, entry: { ...entry, progress, costsConsumed: consumed }, short: item };
    }
    inventory = take(inventory, item, 1);
    consumed += 1;
  }
  return { state: { ...state, inventory }, entry: { ...entry, costsConsumed: consumed } };
}

function setEntry(state: GameState, index: number, entry: QueueEntry): GameState {
  return { ...state, queue: state.queue.map((e, i) => (i === index ? entry : e)) };
}

function stall(state: GameState, index: number, entry: QueueEntry, item: ItemId, events: GameEvent[]): GameState {
  events.push({ type: 'stalled', actionId: entry.actionId, item });
  return { ...setEntry(state, index, { ...entry, stalled: true }), events };
}

function complete(state: GameState, content: Content, action: ActionDefinition, index: number, events: GameEvent[]): GameState {
  let next = state;
  if (action.producedItem) {
    next = { ...next, inventory: add(next.inventory, content, action.producedItem, action.producedAmount ?? 1).inventory };
  }
  if (action.healthDecayMultiplier !== undefined) {
    next = { ...next, decayMultiplier: next.decayMultiplier * action.healthDecayMultiplier };
  }
  next = { ...next, completionCounts: { ...next.completionCounts, [action.id]: (next.completionCounts[action.id] ?? 0) + 1 } };
  events.push({ type: 'completed', actionId: action.id, oneTime: action.isOneTime });
  const without = next.queue.filter((_, i) => i !== index);
  if (action.isOneTime) {
    return { ...next, queue: without, completedOneTime: [...next.completedOneTime, action.id] };
  }
  const fresh: QueueEntry = { actionId: action.id, progress: 0, costsConsumed: 0, stalled: false };
  const full = fullItem(next, content, fresh);
  if (full !== null) {
    events.push({ type: 'full', actionId: action.id, item: full });
    return { ...next, queue: without };
  }
  return setEntry(next, index, fresh);
}

/**
 * One tick of work on the entry at `index`, without automation. The caller
 * (step) has settled the queue, chosen `index` with firstRunnable before the
 * clock moved, and advanced the clock.
 */
export function stepQueue(state: GameState, content: Content, index: number): GameState {
  const events: GameEvent[] = [];
  let next: GameState = { ...state, events: [] };
  const action = content.actions[next.queue[index]!.actionId]!;

  // The unit owed at the current progress; the first is spent just to begin.
  // firstRunnable said it can be paid before the clock moved. Eating in between
  // could take it only if food were a cost, which no v0.1 content is; then this
  // tick would advance the clock without working, and the food-as-cost work
  // must re-check runnability after eating. The guard keeps it from paying past.
  const before = payDue(next, action, next.queue[index]!);
  if (before.short !== undefined) return stall(before.state, index, before.entry, before.short, events);
  next = before.state;

  // Pay every threshold the tick's progress would cross; an unpayable one clamps
  // progress to it. So completion below can only happen with every unit paid.
  const skill = next.skills[action.verb];
  // A validated book has a roster entry for every verb (src/data/validate.ts); an unvalidated fixture that lacks one is a bug, not a state.
  if (skill === undefined) throw new Error(`no skill state for verb "${action.verb}"`);
  const after = payDue(next, action, { ...before.entry, progress: before.entry.progress + tickExp(skill) });

  // XP is the progress actually made (spec section 9: progress advances by the
  // tick's XP). A clamped tick earns only what it applied, so a skill's XP never
  // runs ahead of the work it did.
  const awarded = award(skill, after.entry.progress - before.entry.progress);
  next = { ...after.state, skills: { ...after.state.skills, [action.verb]: awarded.skill } };
  for (let l = 0; l < awarded.coreLevelsGained; l++) {
    events.push({ type: 'coreLevel', skill: action.verb, level: awarded.skill.core.level - awarded.coreLevelsGained + l + 1 });
  }
  if (after.short !== undefined) return stall(next, index, after.entry, after.short, events);
  next = setEntry(next, index, after.entry);

  if (after.entry.progress >= action.expCost) next = complete(next, content, action, index, events);
  return { ...next, events };
}
