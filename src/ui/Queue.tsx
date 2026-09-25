import { skillOf } from '../data/roster';
import type { Content } from '../data/types';
import { consumedOf } from '../engine/costs';
import { gearMultiplier } from '../engine/effects';
import { count } from '../engine/inventory';
import { lookAheadTarget, reachOf, shortfall, workOf } from '../engine/rows';
import { tickExp } from '../engine/skills';
import { ticksPerSecond } from '../engine/time';
import type { GameState, QueueEntry } from '../engine/types';
import { duration, fraction } from './format';
import { MINUS, WARN } from './glyphs';
import { ICONS } from './icons';
import { Region } from './Region';
import { itemName } from './words';

/** A hurt reads to two decimals, as on the row. Display precision, not tuning. */
const HURT_DECIMALS = 2;

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
 * The queue of orders (spec 2026-09-23-the-windward-run sections 2 and 12;
 * mockup 2026-09-23-queue-orders frame c). One boxed entry per order, keyed by
 * its own id: repeat or once, auto when automation added it, and the kept
 * progress of its row, which lives on the row (section 2.2), so removing an
 * entry loses nothing and x removes on one press. Only the top runs.
 * `working` is the entry App says is being worked; `live` gates the sheen, so
 * a paused game shows where work will resume without pretending it is happening.
 */
export function Queue({ state, content, working, live, dead = false, onRemove }: {
  state: GameState; content: Content; working: number; live: boolean; dead?: boolean; onRemove: (entryId: number) => void;
}) {
  const press = (e: QueueEntry) => {
    if (dead) return;   // a dead run takes no orders; the button says so with aria-disabled
    onRemove(e.id);
  };
  // No total: a repeating order's length depends on what it fetches (spec 8.1: not accurate, not shown).
  // "waiting" only when it is true: live, entries queued, and the top cannot run.
  const sum = live && state.queue.length > 0 && working === -1 ? 'waiting' : '';
  return (
    <Region name="queue" className="queue" title={`queue \u00b7 ${state.queue.length}`} note={<span>{sum}</span>}>
      {state.queue.map((e, i) => {
        const a = content.actions[e.actionId]!;
        const skill = skillOf(content, a.verb);
        const Icon = ICONS[skill.icon];
        const isWorking = i === working;
        const w = workOf(state, a.id);
        const owes = shortfall(state, a)?.item ?? null;
        const pct = Math.min(100, (w.progress / a.expCost) * 100);
        const name = `${skill.name} ${a.noun}`;
        // A repeating producer on top stops at what the orders below still need (section 2.3): have/target.
        const item = a.producedItem;
        const target = i === 0 && e.mode === 'repeat' && !a.isOneTime && item !== undefined ? lookAheadTarget(state, content, 0) : null;
        return (
          <div key={e.id} data-entry={e.id} data-mode={e.mode} data-by={e.by} className={`item entry${isWorking ? ' entry--on' : ''}${isWorking && live ? ' working' : ''}`}>
            <Icon aria-hidden="true" />
            <span className="entry__name"><b>{skill.name}</b> {a.noun}{isWorking && live && <span className="visually-hidden">running</span>}</span>
            <button type="button" className="entry__x" aria-disabled={dead ? 'true' : undefined} aria-label={`remove ${name}`} onClick={() => press(e)}>{'\u00d7'}</button>
            <div className="entry__bar">
              {/* Ember while this entry is worked; grey otherwise, since nothing below the top moves. */}
              <div className="bar" aria-hidden="true"><div key={state.completionCounts[a.id] ?? 0} className={`bar__fill${isWorking && live ? ' bar__fill--run' : ' bar__fill--wait'}`} style={{ width: `${pct}%` }} /></div>
              <div className="bar__value">{fraction(w.progress, a.expCost)}</div>
            </div>
            <div className="entry__sub">
              <span><span className="tag">{e.mode}</span>{e.by === 'auto' && <span className="tag tag--auto">auto</span>}{e.forced === true && (content.actions[e.actionId]?.hurts ?? 0) > 0 && <span className="tag tag--forced">to the end</span>}</span>
              {/* The top entry's countdown only, while its rate holds (spec 8.1): live and able to work. */}
              <span className="ink-2">{i === 0 && live && working === 0 ? duration(remainingSeconds(state, content, e)) : '\u00A0'}</span>
            </div>
            {/* Always present, so an entry's height never changes and the x above never moves. */}
            <div className="entry__sub entry__third">
              {a.itemCosts.map((c) => (
                <span key={c.item}>{owes === c.item && <span className="warn">{WARN} </span>}{itemName(content, c.item)} {consumedOf(a, w.costsConsumed, c.item)}/{c.amount}</span>
              ))}
              {a.hurts !== undefined && <span className="hurt-text">{MINUS}{a.hurts.toFixed(HURT_DECIMALS)} hp/s</span>}
              {target !== null && item !== undefined && <span className="entry__target">{count(state.inventory, item)}/{target} {itemName(content, item, target)}</span>}
              {a.itemCosts.length === 0 && a.hurts === undefined && target === null && '\u00A0'}
            </div>
          </div>
        );
      })}
    </Region>
  );
}
