/**
 * The decay clock and automatic eating, MECHANICS section 4. Decay is a
 * function of ticks elapsed this run; eating is once per tick, per food type,
 * never into overheal, with a cooldown per food. Pure.
 */
import { balance } from '../balance';
import type { Content, ItemDefinition, ItemId } from '../data/types';
import { ticksPerSecond, ticksToMinutes, ticksToSeconds } from './time';
import { count, take } from './inventory';
import type { GameState } from './types';

export function damagePerTick(runTicks: number, decayMultiplier: number): number {
  const { baseDamagePerTick, decayGrowthRate } = balance.health;
  return baseDamagePerTick * Math.pow(decayGrowthRate, ticksToMinutes(runTicks)) * decayMultiplier;
}

export function applyDecay(state: GameState): GameState {
  const health = state.health - damagePerTick(state.runTicks, state.decayMultiplier);
  if (health <= 0) {
    return { ...state, health: 0, dead: true, paused: 'system', events: [...state.events, { type: 'died', runTicks: state.runTicks }] };
  }
  return { ...state, health };
}

/** Foods smallest heal first (#45): the order they are eaten in and shown in, which never changes. Ties keep declaration order. */
export function foodsByHeal(content: Content): readonly ItemDefinition[] {
  return Object.values(content.items)
    .filter((item) => item.healPerUnit !== undefined)
    .sort((a, b) => a.healPerUnit! - b.healPerUnit!);
}

export function eat(state: GameState, content: Content): GameState {
  let { health, inventory } = state;
  const foodCooldowns: Record<string, number> = { ...state.foodCooldowns };
  for (const item of foodsByHeal(content)) {
    if (item.healPerUnit === undefined) continue;
    // Count down first, then check: a bite at tick t sets the full cooldown, and
    // the next bite lands at exactly t + foodCooldownTicks.
    const left = Math.max(0, (foodCooldowns[item.id] ?? 0) - 1);
    foodCooldowns[item.id] = left;
    if (left > 0) continue;
    if (count(inventory, item.id) === 0) continue;
    if (health + item.healPerUnit > state.maxHealth) continue;
    health += item.healPerUnit;
    inventory = take(inventory, item.id, 1);
    foodCooldowns[item.id] = balance.health.foodCooldownTicks;
  }
  return { ...state, health, inventory, foodCooldowns };
}

/** HP lost to decay per second of run clock, this second. Spec 2026-09-23 section 4.1. */
export function decayPerSecond(state: GameState): number {
  return damagePerTick(state.runTicks, state.decayMultiplier) * ticksPerSecond();
}

/**
 * A food is feeding the player this second if a unit is on hand, or its
 * cooldown is running (it bit within the last cooldown). The second half is
 * what keeps hand-to-mouth eating, where each unit is eaten on the tick it
 * lands, from reading as an empty larder (plan Revision 3).
 */
export function feeding(state: GameState, itemId: ItemId): boolean {
  return count(state.inventory, itemId) > 0 || (state.foodCooldowns[itemId] ?? 0) > 0;
}

/**
 * The larder's heal ceiling in hp/s: every food that is feeding, one bite per
 * cooldown. A ceiling, not a rate: at full health no bite lands.
 */
export function foodCeilingPerSecond(state: GameState, content: Content): number {
  let total = 0;
  for (const item of Object.values(content.items)) {
    if (item.healPerUnit === undefined || !feeding(state, item.id)) continue;
    total += item.healPerUnit / ticksToSeconds(balance.health.foodCooldownTicks);
  }
  return total;
}

/** The top row's health rate this second, signed (spec 2026-09-24-proving-ground section 1). 0 when the top has none. */
export function rowHealthPerSecond(state: GameState, content: Content): number {
  const top = state.queue[0];
  return (top === undefined ? undefined : content.actions[top.actionId]?.healthRate) ?? 0;
}

/**
 * Applied per tick after decay, only on a tick the top works (step calls it
 * after resolve said ready). A drain can kill; a heal stops at max, like eating.
 */
export function applyRowHealth(state: GameState, content: Content): GameState {
  const perTick = rowHealthPerSecond(state, content) / ticksPerSecond();
  if (perTick === 0) return state;
  const health = state.health + perTick;
  if (health <= 0) return { ...state, health: 0, dead: true, paused: 'system', events: [...state.events, { type: 'died', runTicks: state.runTicks }] };
  return { ...state, health: Math.min(state.maxHealth, health) };
}
