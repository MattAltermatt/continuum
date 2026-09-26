import { useEffect, useLayoutEffect, useRef } from 'react';
import { skillOf } from '../data/roster';
import type { Content } from '../data/types';
import { consumedOf } from '../engine/costs';
import { gearMultiplier } from '../engine/effects';
import { count } from '../engine/inventory';
import { lookAheadTarget, reachOf, shortfall, workOf } from '../engine/rows';
import { tickExp } from '../engine/skills';
import { ticksPerSecond, ticksToSeconds } from '../engine/time';
import type { GameEvent, GameState, QueueEntry } from '../engine/types';
import { duration, fraction } from './format';
import { Gauge } from './Gauge';
import { ICONS } from './icons';
import { narrate } from './narrate';
import { Region } from './Region';
import { itemName } from './words';


/**
 * The current completion's remaining time at the current, gear-aware rate
 * (spec 8.1: a countdown, shown while the rate holds): to its end, or to the
 * first unit the pack cannot pay, where it stops.
 */
function remainingSeconds(state: GameState, content: Content, e: QueueEntry): number {
  const a = content.actions[e.actionId];
  if (!a) return 0;
  return Math.max(0, reachOf(state, a) - workOf(state, a.id).progress) / (tickExp(state.skills[a.verb]!, gearMultiplier(state, content, a.verb)) * ticksPerSecond());
}

/**
 * Every entry's remaining time, at current rates, summed (spec
 * 2026-09-25-the-watched-screen 4.4): "at current rates", so a repeat is
 * counted once, not for what it might fetch again.
 */
export function queuedSeconds(state: GameState, content: Content): number {
  let ticks = 0;
  // A row's kept progress belongs to its first order: two orders for one row share it, and the second starts from zero.
  const seen = new Set<string>();
  for (const e of state.queue) {
    const a = content.actions[e.actionId]!;
    const rate = tickExp(state.skills[a.verb]!, gearMultiplier(state, content, a.verb));
    const kept = seen.has(a.id) ? 0 : workOf(state, a.id).progress;
    seen.add(a.id);
    // Whole ticks, as work() spends them: the total agrees with the engine's own count, never a fraction of a tick ahead.
    ticks += Math.max(1, Math.ceil((a.expCost - kept) / rate));
  }
  return ticksToSeconds(ticks);
}

/** The fade's depth, as styles.css draws it: the mask never reaches the running entry, which is the one thing the box must show. */
const FADE_PX = 28;

/**
 * The list's floor fades while there is more below it than the box shows,
 * unless the fade would fall on the running entry itself (a short phone
 * shows that entry alone): then the heading's count says there is more.
 */
function fadeIfMore(el: HTMLDivElement): void {
  const more = el.scrollTop + el.clientHeight < el.scrollHeight - 1;
  const first = el.firstElementChild;
  const room = first === null || first.getBoundingClientRect().bottom + FADE_PX <= el.getBoundingClientRect().bottom;
  el.classList.toggle('queue__list--more', more && room);
}

/**
 * The reason an empty box shows (spec 4.4): the last pop that has words of
 * its own (a fight that would kill, a page not yet turned) or the last short
 * in the state's own events, which an idle tick keeps. A pop for full,
 * enough or done says nothing: those empty the queue by design, and their
 * narration is a stopgap line the log does not print either.
 */
function whyEmpty(events: readonly GameEvent[]): GameEvent | null {
  for (let i = events.length - 1; i >= 0; i--) {
    const ev = events[i]!;
    if (ev.type === 'short' || (ev.type === 'popped' && (ev.reason === 'hurt' || ev.reason === 'page'))) return ev;
  }
  return null;
}

/**
 * The queue of orders, shown on the screen as "doing" (spec
 * 2026-09-25-the-watched-screen 4.4; spec 2026-09-23-the-windward-run
 * sections 2 and 12; mockup 2026-09-23-queue-orders frame c). The running
 * entry (`working`) keeps its ember frame, its tags and costs on one line,
 * and a gauge; every other entry is one line, no bar. `working` is the entry
 * App says is being worked; `live` gates the sheen and the countdown, so a
 * paused game shows where work will resume without pretending it is
 * happening. There is no waiting entry: a top that cannot run never settles
 * (plan Revision 1), so an empty queue only ever reads idle, with the reason
 * under it while the pop or the short is still the state's last event.
 */
export function Queue({ state, content, working, live, dead = false, onRemove }: {
  state: GameState; content: Content; working: number; live: boolean; dead?: boolean; onRemove: (entryId: number) => void;
}) {
  // The fade at the floor when there is more below (spec 4.4): measured after every render and on every scroll,
  // since CSS cannot see overflow; set on the node, not in state, so the measurement never schedules a render.
  const list = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => { if (list.current !== null) fadeIfMore(list.current); });
  useEffect(() => {
    const el = list.current;
    if (el === null) return;
    const onScroll = () => fadeIfMore(el);
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, []);
  const press = (e: QueueEntry) => {
    if (dead) return;   // a dead run takes no orders; the button says so with aria-disabled
    onRemove(e.id);
  };
  const counts = state.completionCounts;
  const note = state.queue.length === 0
    ? <span className="ink-3">idle</span>
    : <span>{duration(queuedSeconds(state, content))} queued</span>;
  // The state's events are the tick's own, and an idle tick keeps them (CLAUDE.md), so the reason stays until work moves the
  // clock and no log rule (one back-off line per life) can silence it.
  const reason = state.queue.length === 0 ? whyEmpty(state.events) : null;
  const why = reason !== null ? <small>{narrate(reason, content).text}</small> : null;
  return (
    <Region name="doing" className="queue" title={`doing \u00b7 ${state.queue.length}`} note={note}>
      {state.queue.length === 0 && (dead
        ? <div className="queue__empty">nothing was queued</div>
        : <div className="queue__empty">nothing queued {'\u2014'} pick an action{why}</div>)}
      <div ref={list} className="queue__list">
        {state.queue.map((e, i) => {
          const a = content.actions[e.actionId]!;
          const skill = skillOf(content, a.verb);
          const Icon = ICONS[skill.icon];
          const isWorking = i === working;
          const name = `${skill.name} ${a.noun}`;
          const rate = tickExp(state.skills[a.verb]!, gearMultiplier(state, content, a.verb)) * ticksPerSecond();

          if (!isWorking) {
            // Every other entry: one line, no bar (spec 4.4).
            return (
              <div key={e.id} data-entry={e.id} data-mode={e.mode} data-by={e.by} className="item entry entry--line">
                <Icon aria-hidden="true" />
                <span className="entry__name"><b>{skill.name}</b> {a.noun}</span>
                <span className={`tag${e.by === 'auto' ? ' tag--auto' : ''}`}>{e.by === 'auto' ? 'auto' : e.mode}</span>
                <span className="entry__len ink-3">{duration(a.expCost / rate)}</span>
                <button type="button" className="entry__x" aria-disabled={dead ? 'true' : undefined} aria-label={`remove ${name}`} onClick={() => press(e)}>{'\u00d7'}</button>
              </div>
            );
          }

          const w = workOf(state, a.id);
          const owes = shortfall(state, a)?.item ?? null;
          const pct = (w.progress / a.expCost) * 100;
          // A repeating producer on top stops at what the orders below still need (section 2.3): have/target.
          const item = a.producedItem;
          const target = e.mode === 'repeat' && !a.isOneTime && item !== undefined ? lookAheadTarget(state, content, i) : null;
          return (
            <div key={e.id} data-entry={e.id} data-mode={e.mode} data-by={e.by} className={`item entry entry--on${live ? ' working' : ''}`}>
              <Icon aria-hidden="true" />
              <span className="entry__name"><b>{skill.name}</b> {a.noun}{live && <span className="visually-hidden">running</span>}</span>
              <button type="button" className="entry__x" aria-disabled={dead ? 'true' : undefined} aria-label={`remove ${name}`} onClick={() => press(e)}>{'\u00d7'}</button>
              <div className="entry__tags">
                <span className="tag">{e.mode}</span>
                {e.by === 'auto' && <span className="tag tag--auto">auto</span>}
                {e.forced === true && (a.healthRate ?? 0) < 0 && <span className="tag tag--forced">to the end</span>}
                {a.itemCosts.map((c) => (
                  <span key={c.item} className={owes === c.item ? 'warn' : undefined}>{'\u00b7'} {itemName(content, c.item)} {consumedOf(a, w.costsConsumed, c.item)}/{c.amount}</span>
                ))}
                {target !== null && item !== undefined && <span className="entry__target">{'\u00b7'} {count(state.inventory, item)}/{target} {itemName(content, item, target)}</span>}
              </div>
              <Gauge fill="run" pct={pct} resetKey={counts[a.id] ?? 0} label={live ? <b>{duration(remainingSeconds(state, content, e))}</b> : '\u00a0'} value={fraction(w.progress, a.expCost)} />
            </div>
          );
        })}
      </div>
    </Region>
  );
}
