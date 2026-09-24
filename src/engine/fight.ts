/**
 * A fight stops before it kills (#74, spec 2026-09-24-queue-plays-safely
 * section 3). The user's rule: if the player is about to die from fighting,
 * 1) an automated harvest that can run buys time, once, with the fight kept
 * behind it; 2) with none, but anything else that can run, the fight stops and
 * says why; 3) Shift forces a fight to the end. With nothing else that can run,
 * the fight goes on. Pure.
 */
import type { ActionDefinition, ActionId, Content } from '../data/types';
import { modeOf, rankOf } from './automation';
import { gearMultiplier } from './effects';
import { applyDecay, eat } from './health';
import { frontBlock, startBlock, type StartBlock } from './queue';
import { pageOf, pageWaits, shortfall, workOf } from './rows';
import { tickExp } from './skills';
import { ticksPerSecond } from './time';
import type { GameState } from './types';

export function hurts(action: ActionDefinition | undefined): boolean {
  return (action?.hurts ?? 0) > 0;
}

function rowsHere(state: GameState, content: Content): readonly ActionDefinition[] {
  return pageOf(state, content).order.map((id) => content.actions[id]!);
}

function makesFood(content: Content, a: ActionDefinition): boolean {
  return a.producedItem !== undefined && content.items[a.producedItem]?.kind === 'food';
}

/** Ticks `a` needs to reach its exp cost from its kept progress at the rate work() applies. At least 1. */
function ticksToFinish(state: GameState, content: Content, a: ActionDefinition): number {
  const skill = state.skills[a.verb];
  if (skill === undefined) return 1;
  const rate = tickExp(skill, gearMultiplier(state, content, a.verb));
  return Math.max(1, Math.ceil((a.expCost - workOf(state, a.id).progress) / rate));
}

/**
 * The stretch "about to die" looks ahead (section 3.1): the ticks the port's
 * first food row needs for one unit, plus one, but never past the fight's own
 * finish, so a fight that would win first does not back off. At least 1, which
 * is what makes the invariant hold: the tick's own drain is always counted.
 */
export function fightWindow(state: GameState, content: Content, fight: ActionDefinition): number {
  const food = rowsHere(state, content).find((a) => makesFood(content, a));
  // The + 1 is the tick's order, not a margin: a unit finished in one tick's work is eaten in the next tick's eat.
  const fetch = food === undefined ? 1 : ticksToFinish(state, content, food) + 1;
  return Math.max(1, Math.min(fetch, ticksToFinish(state, content, fight)));
}

/**
 * A hurting row would end the life within its window (section 3.1), played
 * out tick by tick with the tick's own order: decay, the fight's hurt, then
 * eating what is in the pack (panel round two: a formula that ignored the pack
 * backed off from fights the food would have carried). The first simulated
 * tick is exactly the next real one, so a fight that does not back off
 * survives its next tick.
 */
export function wouldKill(state: GameState, content: Content, fight: ActionDefinition): boolean {
  if (!hurts(fight)) return false;
  const hurtPerTick = fight.hurts! / ticksPerSecond();
  let s = state;
  for (let i = fightWindow(state, content, fight); i > 0; i--) {
    s = applyDecay({ ...s, runTicks: s.runTicks + 1 });
    if (s.dead || s.health - hurtPerTick <= 0) return true;
    s = eat({ ...s, health: s.health - hurtPerTick }, content);
  }
  return false;
}

/**
 * The port's fights that would kill now. JIT food is never refilled through a
 * supply chain that runs through one (resolve's jitMeal).
 */
export function killers(state: GameState, content: Content): ReadonlySet<ActionId> {
  return new Set(rowsHere(state, content).filter((a) => wouldKill(state, content, a)).map((a) => a.id));
}

/** The port's hurting rows: a supply chain through one of them does not buy time (panel round two: it froze). */
function hurting(state: GameState, content: Content): ReadonlySet<ActionId> {
  return new Set(rowsHere(state, content).filter(hurts).map((a) => a.id));
}

/** Can start now without any hurting row on the way. */
function calm(state: GameState, content: Content, a: ActionDefinition, avoid: ReadonlySet<ActionId>): boolean {
  return !hurts(a) && startBlock(state, content, a.id, avoid) === null;
}

/**
 * The player lives through one unit of `a` with the fight set aside: decay and
 * eating only, tick by tick. A harvest that does not survive buys no time
 * (code panel round two: salvage delays ran back to back until age killed the
 * player, where stopping would have kept them alive).
 */
function survives(state: GameState, content: Content, a: ActionDefinition): boolean {
  let s = state;
  for (let i = ticksToFinish(state, content, a) + 1; i > 0; i--) {
    s = applyDecay({ ...s, runTicks: s.runTicks + 1 });
    if (s.dead) return false;
    s = eat(s, content);
  }
  return true;
}

/**
 * Case 1: an automated harvest that can run without hurting, to run once in
 * front of the fight (the user: "harvesting the non-off resources"), one the
 * player lives through. For an automated fight, also any automated row ranked
 * above it (the user: "only if ... there is nothing of higher priority"), the
 * port's event aside. Foods first, then the best rank, then row order. A
 * one-time is otherwise never a delay: it never builds the hull mid-fight
 * uninvited.
 */
export function delayFor(state: GameState, content: Content, tried: ReadonlySet<ActionId>, fight?: ActionDefinition): ActionId | null {
  const avoid = hurting(state, content);
  const above = fight !== undefined && automated(state, fight) ? rankOf(modeOf(state, fight)) : null;
  const event = pageOf(state, content).closes;
  const eligible = (a: ActionDefinition) => a.producedItem !== undefined && !a.isOneTime
    || (above !== null && a.id !== event && rankOf(modeOf(state, a)) < above);
  const ready = rowsHere(state, content).filter((a) =>
    // No shortfall: a delay that pulled in its own supply would run past what survives() counted (review of ed3bf88).
    eligible(a) && modeOf(state, a) !== 'off' && !tried.has(a.id) && shortfall(state, a) === null && calm(state, content, a, avoid) && survives(state, content, a));
  const order = [...ready].sort((a, b) => Number(makesFood(content, b)) - Number(makesFood(content, a)) || rankOf(modeOf(state, a)) - rankOf(modeOf(state, b)));
  return order[0]?.id ?? null;
}

/** Case 2: anything of the port the player could run instead, by hand or not. */
export function anyCalm(state: GameState, content: Content): boolean {
  const avoid = hurting(state, content);
  return rowsHere(state, content).some((a) => calm(state, content, a, avoid));
}

/**
 * Case 2: the fight would stop. Its chip is off, it would kill, no automated
 * harvest can buy time, and something else can run. False for case 1 (a
 * harvest delays it and it stays queued), case 3 (the fight is the only thing
 * left), and an automated fight, which fights on.
 */
export function stops(state: GameState, content: Content, fight: ActionDefinition): boolean {
  return !automated(state, fight) && wouldKill(state, content, fight) && delayFor(state, content, new Set()) === null && anyCalm(state, content);
}

/**
 * A fight whose chip is on. The user (2026-09-24): "once a fight is automated, it should try to keep the player
 * alive, but it should kill the player if there is no other action to run". It still waits behind a harvest that
 * buys time (case 1), but it never stops (case 2): with no harvest to run, it fights on.
 */
export function automated(state: GameState, fight: ActionDefinition): boolean {
  return modeOf(state, fight) !== 'off';
}

/**
 * Why a row cannot go now because of a fight (#74), or null: it is a fight
 * that would stop. No row waits on a fight down its supply chain any more:
 * only an automated row supplies, and an automated fight never stops.
 */
export function hurtBlock(state: GameState, content: Content, id: ActionId): StartBlock | null {
  const action = content.actions[id];
  return action !== undefined && hurts(action) && stops(state, content, action) ? { kind: 'hurt' } : null;
}

/**
 * The play button's refusal: frontBlock, then `hurt` (hurtBlock). Under case 1
 * play is accepted, since automation buys the time (code panel: refusing there
 * pointed the player at Shift and death). Shift passes a fight: it forces it.
 */
export function playBlock(state: GameState, content: Content, id: ActionId, once = false): StartBlock | null {
  const block = frontBlock(state, content, id, once);
  const action = content.actions[id];
  if (block !== null || action === undefined || (once && hurts(action))) return block;
  // A closer that waits on its page is checked for the fight when it would start, not now (spec 2026-09-24-pages section 4.2).
  if (pageWaits(state, content, id).length > 0) return null;
  return hurtBlock(state, content, id);
}
