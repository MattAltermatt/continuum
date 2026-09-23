import { useEffect, useState } from 'react';
import { skillOf } from '../data/roster';
import type { ActionId, Content } from '../data/types';
import { consumedOf } from '../engine/costs';
import { fullItem, missingInput } from '../engine/queue';
import { tickExp } from '../engine/skills';
import { ticksPerSecond } from '../engine/time';
import type { GameState, QueueEntry } from '../engine/types';
import { duration, fraction } from './format';
import { WARN } from './glyphs';
import { ICONS } from './icons';

/** The current completion's remaining time at the current rate (spec 8.1: a countdown, shown while the rate holds). */
function remainingSeconds(state: GameState, content: Content, e: QueueEntry): number {
  const a = content.actions[e.actionId];
  if (!a) return 0;
  return Math.max(0, a.expCost - e.progress) / (tickExp(state.skills[a.verb]!) * ticksPerSecond());
}

/**
 * How long a first press on a costly entry's remove stays armed. Presentation
 * timing, not a gameplay value; kept out of balance.ts on the same reasoning as
 * MS_PER_SECOND in src/engine/time.ts.
 */
const ARM_MS = 3000;

/**
 * The queue is a view (spec 8.5): the only control is remove. `working` is the
 * entry App says is being worked; `live` gates the sheen, so a paused game
 * shows where work will resume without pretending it is happening.
 *
 * Entries leave on their own (full, completion), so the list moves under the
 * cursor and a press aimed at one entry's remove can land on the next. An
 * entry that has consumed inputs therefore takes two presses: the first arms
 * it (the mark turns to "?" in the same box), the second removes it. A slide
 * can then only ever arm, never destroy. An entry with nothing consumed loses
 * only time, and removes on one press.
 */
export function Queue({ state, content, working, live, dead = false, onRemove }: {
  state: GameState; content: Content; working: number; live: boolean; dead?: boolean; onRemove: (id: ActionId) => void;
}) {
  const [armed, setArmed] = useState<ActionId | null>(null);
  useEffect(() => {
    if (armed === null) return;
    const id = setTimeout(() => setArmed(null), ARM_MS);
    return () => clearTimeout(id);
  }, [armed]);
  // An armed remove does not survive death: the "?" would invite a press that now does nothing.
  const armedLive = dead ? null : armed;
  const press = (e: QueueEntry) => {
    if (dead) return;   // a dead run takes no orders; the button says so with aria-disabled
    if (e.costsConsumed === 0 || armed === e.actionId) { setArmed(null); onRemove(e.actionId); } else setArmed(e.actionId);
  };
  // No total: a repeatable runs until its stack is full and a sink draws on its producer, so a
  // sum of one completion each was off by 2x to 60x in play (spec 8.1: not accurate, not shown).
  // "waiting" only when it is true: live, entries queued, and none of them can run.
  // `working` is the engine's firstRunnable, the same answer the corner clock reads.
  const sum = live && state.queue.length > 0 && working === -1 ? 'waiting' : '';
  return (
    <section className="queue" aria-label="queue">
      <header className="chunk__head"><span>queue · {state.queue.length}</span><span>{sum}</span></header>
      {state.queue.map((e, i) => {
        const a = content.actions[e.actionId]!;
        const skill = skillOf(content, a.verb);
        const Icon = ICONS[skill.icon];
        const isWorking = i === working;
        const missing = missingInput(state, content, e);
        const full = fullItem(state, content, e);
        const pct = Math.min(100, (e.progress / a.expCost) * 100);
        const name = `${skill.name} ${a.noun}`;
        return (
          <div key={e.actionId} className={`item entry${isWorking ? ' entry--on' : ''}${isWorking && live ? ' working' : ''}${missing || full ? ' entry--waiting' : ''}`}>
            <Icon aria-hidden="true" />
            <span><b>{skill.name}</b> {a.noun}{isWorking && live && <span className="visually-hidden">running</span>}</span>
            <button type="button" className="entry__x" aria-disabled={dead ? 'true' : undefined} aria-label={armedLive === e.actionId ? `press again to remove ${name}` : `remove ${name}`} onClick={() => press(e)}>{armedLive === e.actionId ? '?' : '×'}</button>
            <div className="entry__bar">
              <div className="bar" aria-hidden="true"><div className={`bar__fill${missing || full ? ' bar__fill--wait' : ' bar__fill--run'}`} style={{ width: `${pct}%` }} /></div>
              <div className="bar__value">{fraction(e.progress, a.expCost)}</div>
            </div>
            <div className="entry__sub">
              <span>{a.itemCosts.map((c) => {
                const spent = consumedOf(a, e.costsConsumed, c.item);
                // Short right now (spec 8.5): the unit this entry owes and cannot pay.
                const short = missing === c.item;
                return <span key={c.item}>{short ? <span className="warn">{WARN} </span> : null}{c.item} {spent}/{c.amount} </span>;
              })}</span>
              {/* This completion's countdown, only while its rate holds (spec 8.1): live and runnable. */}
              <span className="ink-2">{live && !missing && !full ? duration(remainingSeconds(state, content, e)) : '\u00a0'}</span>
            </div>
            {/* Always present, so an entry's height never changes as it waits and goes on: the x below must not move. */}
            <div className="entry__sub ink-2">{missing ? `waiting on ${missing}` : full ? `${content.items[full]?.name ?? full} is full` : '\u00a0'}</div>
          </div>
        );
      })}
    </section>
  );
}
