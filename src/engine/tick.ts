/**
 * One tick. Time passes only while work happens (spec section 9, decision #41).
 * Paused or dead: nothing. Otherwise settle the queue, which takes no time;
 * then, if nothing can run, stop there with the clock untouched. Otherwise:
 * advance the clock, decay, eat, work the queue.
 */
import type { Content } from '../data/types';
import { applyDecay, eat } from './health';
import { firstRunnable, settle, stepQueue } from './queue';
import type { GameState, PauseReason } from './types';

/** Death is a system pause that nothing but rebirth lifts: a dead state ignores this. */
export function setPaused(state: GameState, paused: PauseReason): GameState {
  return state.dead ? state : { ...state, paused };
}

export function step(state: GameState, content: Content): GameState {
  if (state.paused !== 'none' || state.dead) return state;
  const settled = settle(state, content);
  const index = firstRunnable(settled, content);
  if (index === -1) return settled;
  const settledEvents = settled === state ? [] : settled.events;
  let next: GameState = { ...settled, runTicks: settled.runTicks + 1, events: [] };
  next = applyDecay(next);
  if (next.dead) return { ...next, events: [...settledEvents, ...next.events] };
  next = eat(next, content);
  const worked = stepQueue(next, content, index);
  return { ...worked, events: [...settledEvents, ...worked.events] };
}
