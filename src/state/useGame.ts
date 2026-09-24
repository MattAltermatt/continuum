/**
 * The only clock in the game. `src/state/` supplies the host capabilities the
 * engine deliberately takes as parameters: here, the interval, real time, and
 * storage. The reducer is a thin switch over pure engine functions, plus the
 * log: engine events with the tick they happened on. Words are the UI's job
 * (src/ui/narrate.ts). The save and the catch-up loop are spec
 * 2026-09-23-the-windward-run section 10.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from 'react';
import { balance } from '../balance';
import type { ActionId, Book, Content } from '../data/types';
import { setAutomation } from '../engine/automation';
import { enqueue, newState, removeEntry } from '../engine/queue';
import { deathSummary, rebirth, type DeathSummary } from '../engine/rebirth';
import { resolve } from '../engine/resolve';
import { setPaused, step } from '../engine/tick';
import type { AutoMode, GameEvent, GameState } from '../engine/types';
import { ASIDE_KEY, asideText, AUTOSAVE_MS, loadSave, SAVE_KEY, saveText } from './save';

/** The part of `Storage` the save uses; a test passes a fake, a private window may throw on any call. */
export type SaveStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export type GameAction =
  /** now (front) or +; `once` is Shift+click, a single completion (spec 2026-09-23-the-windward-run section 2.1). */
  | { type: 'queue'; actionId: ActionId; front?: boolean; once?: boolean }
  | { type: 'remove'; entryId: number }
  | { type: 'automate'; actionId: ActionId; mode: AutoMode }
  | { type: 'pause' }
  | { type: 'resume' }
  /** `n` ticks at once: the loop catches up on what a throttled or hidden tab missed (section 10). */
  | { type: 'tick'; n?: number }
  /** A fresh run and a fresh log: erase save. */
  | { type: 'reset' }
  /** Dev handle only: replaces the model with one read back from the save. */
  | { type: 'load'; model: Model }
  /** Lifts the death card and starts the next life (spec 2026-09-23 section 2.4). */
  | { type: 'begin' }
  /** Dev handle only: a fast path to death for verification. Play reaches it too, through the hall, but only after minutes. */
  | { type: 'setHealth'; health: number };

export type LogEvent =
  | GameEvent
  | { readonly type: 'lifeBegins'; readonly life: number }
  /** A save the game could not load was set aside instead (section 10). */
  | { readonly type: 'saveAside'; readonly why: 'format' | 'book' | 'corrupt' };

/** `seq` counts up from 0 and never changes for a line: the log's stable React key. */
export interface LogLine { readonly seq: number; readonly at: number; readonly event: LogEvent }

/** `nextSeq` only ever counts up, so a line's key survives any later trimming of the log. */
export interface Model { readonly state: GameState; readonly log: readonly LogLine[]; readonly nextSeq: number }

/**
 * Lines the log keeps. The hall and Mine take turns on every stone, about two
 * lines each, so an uncapped log grows by hundreds a run. Presentation, not
 * tuning (the chunk shows a handful and scrolls the rest); kept out of
 * balance.ts on the same reasoning as MS_PER_SECOND in src/engine/time.ts.
 */
export const LOG_LINES = 100;

/**
 * Newest first, capped. A repeat completion, a pop and automation's own orders
 * are not news, and nor is a shortfall whose row still has an order waiting in
 * the queue (it picks up there by itself; #42), or one followed by another for
 * the same row in the same batch (two entries popping at once say it once);
 * everything else the engine reports once.
 */
/** This life's log already says the fight backed off (#74): the lines back to the life's first. Newest first. */
function backedOff(model: Model, id: ActionId): boolean {
  for (const l of model.log) {
    if (l.event.type === 'lifeBegins') return false;
    if (l.event.type === 'popped' && l.event.reason === 'hurt' && l.event.actionId === id) return true;
  }
  return false;
}

function withLog(model: Model, state: GameState): Model {
  // A fight backing off is news once per row per life (#74 section 3.4): with automation it may back off again and again.
  // Within one batch too (code panel round two: two + presses logged the line twice at one tick).
  const said = new Set<ActionId>();
  const hurt = (e: GameEvent) => {
    if (e.type !== 'popped' || e.reason !== 'hurt' || said.has(e.actionId) || backedOff(model, e.actionId)) return false;
    said.add(e.actionId);
    return true;
  };
  // A closer leaving because its page's chain failed is news: it names what it waits on (spec 2026-09-24-pages section 4.2).
  const news = (e: GameEvent) => hurt(e) || (e.type === 'popped' && e.reason === 'page') || (!(e.type === 'completed' && !e.oneTime) && e.type !== 'popped' && e.type !== 'automated'
    && !(e.type === 'short' && state.queue.some((q) => q.actionId === e.actionId)));
  const later = (k: number, id: ActionId) => state.events.slice(k + 1).some((f) => f.type === 'short' && f.actionId === id);
  const worth = state.events.filter((e, k) => news(e) && !(e.type === 'short' && later(k, e.actionId)));
  if (worth.length === 0) return { ...model, state };
  const lines = worth.map((event, k) => ({ seq: model.nextSeq + k, at: state.runTicks, event })).reverse();
  return { state, log: [...lines, ...model.log].slice(0, LOG_LINES), nextSeq: model.nextSeq + worth.length };
}

/**
 * The committed state, settled: while live, whatever the next tick's zero-time
 * resolve would do (pops, supply, food, the idle fill) is done now and its
 * events logged, so the screen, the dev handle and the next order all read the
 * state the next tick will work (code panel round two). Paused or dead, as it
 * is: nothing refills while paused.
 */
function settled(model: Model, content: Content): Model {
  const s = model.state;
  if (s.paused !== 'none' || s.dead) return model;
  const r = resolve(s, content);
  return r.state === s ? model : withLog(model, { ...r.state, events: r.events });
}

function reduce(content: Content) {
  const act = (model: Model, action: GameAction): Model => {
    const s = model.state;
    switch (action.type) {
      case 'queue': return { ...model, state: enqueue(s, content, action.actionId, { front: action.front ?? false, once: action.once ?? false }) };
      case 'remove': return { ...model, state: removeEntry(s, action.entryId) };
      case 'automate': return { ...model, state: setAutomation(s, content, action.actionId, action.mode) };
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
        // Up to n steps, stopping at an idle step (nothing changes, so no more will) or a death.
        let m = model;
        for (let i = 0; i < (action.n ?? 1); i++) {
          const stepped = step(m.state, content);
          if (stepped === m.state) break;
          m = withLog(m, stepped);   // each step resolves first, so only the last needs settling (below)
          if (stepped.dead) break;
        }
        return m;
      }
      case 'reset': return fresh(content);
      case 'load': return action.model;
      // An unknown action (the dev handle takes any object) leaves the game as it is, rather than blanking the page (#67).
      default: return model;
    }
  };
  return (model: Model, action: GameAction): Model => {
    const m = act(model, action);
    return m === model ? model : settled(m, content);
  };
}

/**
 * The game opens live. Under decision #41 an empty queue costs no time anyway, so
 * a start-paused state would only make the first click look broken.
 */
function fresh(content: Content): Model {
  return { state: setPaused(newState(content.roster), 'none'), log: [{ seq: 0, at: 0, event: { type: 'lifeBegins', life: 1 } }], nextSeq: 1 };
}

/** The browser's storage, or null where reaching it throws (a private window, blocked site data). */
function defaultStorage(): SaveStorage | null {
  try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; }
}

interface Opened { readonly model: Model; readonly aside: string | null }

/** Opens the saved run, or a fresh one; a save that cannot be loaded comes back as `aside`, to be set aside once mounted. */
function open(book: Book, storage: SaveStorage | null): Opened {
  let raw: string | null = null;
  try { raw = storage?.getItem(SAVE_KEY) ?? null; } catch { return { model: fresh(book), aside: null }; }
  const loaded = loadSave(raw, book);
  if (loaded.kind === 'loaded') return { model: loaded.model, aside: null };
  if (loaded.kind === 'none' || raw === null) return { model: fresh(book), aside: null };
  const start = fresh(book);
  const line: LogLine = { seq: start.nextSeq, at: 0, event: { type: 'saveAside', why: loaded.why } };
  return { model: { ...start, log: [line, ...start.log], nextSeq: start.nextSeq + 1 }, aside: raw };
}

/** Dev builds' speed control (section 10): ticks per tick. Tooling, never in a production build. */
export const DEV_SPEEDS = [1, 10, 100] as const;

export interface GameHandle {
  state: GameState; view: GameState; log: readonly LogLine[]; dispatch: (a: GameAction) => void; card: DeathSummary | null;
  speed: number; setSpeed: (n: number) => void;
  /** Writes the save now. */
  save: () => void;
  /** Reads the save back into the game (the dev handle's load). */
  load: () => void;
  /** Removes the save and starts a fresh run. */
  erase: () => void;
}

export function useGame(book: Book, opts: { storage?: SaveStorage | null } = {}): GameHandle {
  const content: Content = book;
  const storage = 'storage' in opts ? opts.storage ?? null : defaultStorage();
  // Read once, at mount. (React may run this twice in development; the aside write below is idempotent.)
  const [opened] = useState<Opened>(() => open(book, storage));
  const [model, dispatch] = useReducer(reduce(content), opened.model);
  // The autosave and the loop read the latest model and speed from refs, kept current after each commit.
  const latest = useRef(model);
  useLayoutEffect(() => { latest.current = model; }, [model]);
  const [speed, setSpeedRaw] = useState(1);
  // Only the offered speeds: the dev handle takes any number, and a speed the control has no button for shows none pressed.
  const setSpeed = useCallback((n: number) => { if ((DEV_SPEEDS as readonly number[]).includes(n)) setSpeedRaw(n); }, []);
  const speedRef = useRef(speed);
  useLayoutEffect(() => { speedRef.current = speed; }, [speed]);

  const save = useCallback(() => {
    try { storage?.setItem(SAVE_KEY, saveText(latest.current, book)); } catch { /* storage full or blocked: the next write tries again */ }
  }, [storage, book]);

  // A save that could not be loaded is kept under the aside key before anything overwrites it.
  useEffect(() => {
    const raw = opened.aside;
    if (raw === null) return;
    try { storage?.setItem(ASIDE_KEY, asideText(storage.getItem(ASIDE_KEY), raw)); } catch { /* nothing more to do */ }
  }, [storage, opened]);

  // Autosave: on an interval, and whenever the tab is hidden or closed.
  useEffect(() => {
    const id = setInterval(save, AUTOSAVE_MS);
    const onHide = () => { if (document.visibilityState === 'hidden') save(); };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', save);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onHide); window.removeEventListener('pagehide', save); };
  }, [save]);

  // The loop counts real time, so a throttled background tab keeps pace: each wake runs the ticks it
  // missed. A wake runs at most balance.loop.maxCatchUpMinutes of game time and drops the rest, so a
  // laptop opened after a night moves the game minutes, not hours (section 10).
  useEffect(() => {
    const interval = balance.time.tickIntervalMs;
    const cap = balance.loop.maxCatchUpMinutes * balance.time.ticksPerMinute;
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      const due = Math.floor((now - last) / interval);
      if (due <= 0) return;
      const n = due * speedRef.current;
      if (n > cap) { last = now; dispatch({ type: 'tick', n: cap }); }
      else { last += due * interval; dispatch({ type: 'tick', n }); }
    }, interval);
    return () => clearInterval(id);
  }, []);

  const load = useCallback(() => {
    let raw: string | null = null;
    try { raw = storage?.getItem(SAVE_KEY) ?? null; } catch { return; }
    const loaded = loadSave(raw, book);
    if (loaded.kind === 'loaded') dispatch({ type: 'load', model: loaded.model });
  }, [storage, book]);
  const erase = useCallback(() => {
    try { storage?.removeItem(SAVE_KEY); } catch { /* nothing more to do */ }
    dispatch({ type: 'reset' });
  }, [storage]);
  // Dead until Begin: the screen behind the card shows the life that is about to begin.
  const view = useMemo(() => (model.state.dead ? rebirth(model.state) : model.state), [model.state]);
  const card = useMemo(() => (model.state.dead ? deathSummary(model.state, content) : null), [model.state, content]);
  return { state: model.state, view, log: model.log, dispatch, card, speed, setSpeed, save, load, erase };
}
