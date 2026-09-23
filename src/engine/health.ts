/**
 * The decay clock and automatic eating, MECHANICS section 4. Decay is a
 * function of ticks elapsed this run; eating is once per tick, per food type,
 * never into overheal, with a cooldown per food. Pure.
 */
import { balance } from '../balance';
import type { Content } from '../data/types';
import { ticksToMinutes } from './time';
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

export function eat(state: GameState, content: Content): GameState {
  let { health, inventory } = state;
  const foodCooldowns: Record<string, number> = { ...state.foodCooldowns };
  for (const item of Object.values(content.items)) {
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
