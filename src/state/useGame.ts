/**
 * The only clock in the game. `src/state/` supplies the host capabilities the
 * engine deliberately takes as parameters: here, the interval. The reducer is a
 * thin switch over pure engine functions, plus the log: engine events with the
 * tick they happened on. Words are the UI's job (src/ui/narrate.ts).
 */
import { useEffect, useMemo, useReducer } from 'react';
import { balance } from '../balance';
import type { ActionId, Content } from '../data/types';
import { enqueue, newState, removeAction } from '../engine/queue';
import { deathSummary, rebirth, type DeathSummary } from '../engine/rebirth';
import { setPaused, step } from '../engine/tick';
import type { GameEvent, GameState } from '../engine/types';

export type GameAction =
  | { type: 'queue'; actionId: ActionId; front?: boolean }
  | { type: 'remove'; actionId: ActionId }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'tick' }
  /** Lifts the death card and starts the next life (spec 2026-09-23 section 2.4). */
  | { type: 'begin' }
  /** Dev handle only: a fast path to death for verification. Play reaches it too, through the hall, but only after minutes. */
  | { type: 'setHealth'; health: number };

export type LogEvent = GameEvent | { readonly type: 'lifeBegins'; readonly life: number };

/** `seq` counts up from 0 and never changes for a line: the log's stable React key. */
export interface LogLine { readonly seq: number; readonly at: number; readonly event: LogEvent }

/** `nextSeq` only ever counts up, so a line's key survives any later trimming of the log. */
interface Model { readonly state: GameState; readonly log: readonly LogLine[]; readonly nextSeq: number }

/**
 * Lines the log keeps. The hall and Mine take turns on every stone, about two
 * lines each, so an uncapped log grows by hundreds a run. Presentation, not
 * tuning (the chunk shows a handful and scrolls the rest); kept out of
 * balance.ts on the same reasoning as MS_PER_SECOND in src/engine/time.ts.
 */
export const LOG_LINES = 100;

/** Newest first, capped. A repeat completion is not news; everything else the engine reports once. */
function withLog(model: Model, state: GameState): Model {
  const worth = state.events.filter((e) => !(e.type === 'completed' && !e.oneTime));
  if (worth.length === 0) return { ...model, state };
  const lines = worth.map((event, k) => ({ seq: model.nextSeq + k, at: state.runTicks, event })).reverse();
  return { state, log: [...lines, ...model.log].slice(0, LOG_LINES), nextSeq: model.nextSeq + worth.length };
}

function reduce(content: Content) {
  return (model: Model, action: GameAction): Model => {
    const s = model.state;
    switch (action.type) {
      case 'queue': return { ...model, state: enqueue(s, content, action.actionId, { front: action.front ?? false }) };
      case 'remove': return { ...model, state: removeAction(s, action.actionId) };
      case 'pause': return { ...model, state: setPaused(s, 'player') };
      case 'resume': return { ...model, state: setPaused(s, 'none') };
      case 'setHealth': return s.dead ? model : { ...model, state: { ...s, health: Math.min(s.maxHealth, action.health) } };
      case 'begin': {
        if (!s.dead) return model;
        const next = setPaused(rebirth(s), 'none');
        const line: LogLine = { seq: model.nextSeq, at: 0, event: { type: 'lifeBegins', life: next.life } };
        return { state: next, log: [line, ...model.log].slice(0, LOG_LINES), nextSeq: model.nextSeq + 1 };
      }
      case 'tick': {
        const next = step(s, content);
        return next === s ? model : withLog(model, next);
      }
    }
  };
}

/**
 * The game opens live. Under decision #41 an empty queue costs no time anyway, so
 * a start-paused state would only make the first click look broken.
 */
function initial(): Model {
  return { state: setPaused(newState(), 'none'), log: [{ seq: 0, at: 0, event: { type: 'lifeBegins', life: 1 } }], nextSeq: 1 };
}

export function useGame(content: Content): {
  state: GameState; view: GameState; log: readonly LogLine[]; dispatch: (a: GameAction) => void; card: DeathSummary | null;
} {
  const [model, dispatch] = useReducer(reduce(content), undefined, initial);
  useEffect(() => {
    const id = setInterval(() => dispatch({ type: 'tick' }), balance.time.tickIntervalMs);
    return () => clearInterval(id);
  }, []);
  // Dead until Begin: the screen behind the card shows the life that is about to begin.
  const view = useMemo(() => (model.state.dead ? rebirth(model.state) : model.state), [model.state]);
  const card = useMemo(() => (model.state.dead ? deathSummary(model.state) : null), [model.state]);
  return { state: model.state, view, log: model.log, dispatch, card };
}
