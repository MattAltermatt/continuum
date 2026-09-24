/**
 * One tick. Time passes only while work happens (decision #41). Paused or
 * dead: nothing. Otherwise resolve, which takes no time; if the top cannot
 * work, stop there with the clock untouched. Otherwise advance the clock,
 * decay, eat, work the top.
 */
import type { Content } from '../data/types';
import { applyDecay, applyHurts, eat } from './health';
import { work } from './queue';
import { resolve } from './resolve';
import type { GameState, PauseReason } from './types';

/** Death is a system pause that nothing but rebirth lifts: a dead state ignores this. */
export function setPaused(state: GameState, paused: PauseReason): GameState {
  return state.dead ? state : { ...state, paused };
}

export function step(state: GameState, content: Content): GameState {
  if (state.paused !== 'none' || state.dead) return state;
  const r = resolve(state, content);
  if (!r.ready) return r.state === state ? state : { ...r.state, events: r.events };
  let next: GameState = { ...r.state, runTicks: r.state.runTicks + 1, events: [] };
  next = applyDecay(next);
  if (next.dead) return { ...next, events: [...r.events, ...next.events] };
  next = applyHurts(next, content);
  if (next.dead) return { ...next, events: [...r.events, ...next.events] };
  next = eat(next, content);
  const worked = work(next, content);
  return { ...worked.state, events: [...r.events, ...worked.events] };
}
