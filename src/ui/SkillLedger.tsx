import { Fragment, useLayoutEffect, useRef, useState } from 'react';
import { balance } from '../balance';
import type { ActionDefinition, Content, SkillDefinition, SkillId } from '../data/types';
import { gearFor, gearMultiplier } from '../engine/effects';
import { NO_STATS } from '../engine/queue';
import { expToNextLevel, multiplier, tickExp } from '../engine/skills';
import { ticksPerSecond, ticksToSeconds } from '../engine/time';
import type { GameState, Ledger, SkillState } from '../engine/types';
import { countdown, duration, fraction } from './format';
import { ICONS } from './icons';
import { itemName } from './words';
import './skill-ledger.css';

const { coreMastery, runMastery } = balance.skills;

/** A per-level fraction shown as a percent. A unit conversion, not tuning. */
const PERCENT = 100;
/** Significant digits a percent keeps, so 0.07 x 100 reads 7 and not 7.000000000000001. Display precision. */
const PERCENT_DIGITS = 12;
/** A time spent under a minute reads in seconds, under an hour in minutes and seconds. Unit conversions. */
const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;
/** Thousands separators on lifetime counts, fixed so the reading does not follow the viewer's locale. */
const COUNT_LOCALE = 'en-US';

/** `+5` from 0.05: a per-level fraction as the ledger writes it. */
function percent(perLevel: number): string {
  return String(Number((perLevel * PERCENT).toPrecision(PERCENT_DIGITS)));
}

/** The multiplier as the cell and the ledger's total both print it. One function, so the two strings cannot disagree. */
export function multiplierText(skill: SkillState, gear: number): string {
  return `×${multiplier(skill, gear).toFixed(2)}`;
}

/** Every XP the skill has earned: the core ledger receives every tick's XP, so it is every core level's cost below the level plus what is in hand. */
export function lifetimeXp(core: Ledger): number {
  let sum = core.exp;
  for (let level = 0; level < core.level; level++) sum += expToNextLevel(coreMastery.baseExp, level);
  return sum;
}

/** Completions of every row the skill is the verb of, across all lives. */
export function timesDone(state: GameState, content: Content, skill: SkillId): number {
  return Object.values(content.actions)
    .filter((a) => a.verb === skill)
    .reduce((sum, a) => sum + (state.completionCounts[a.id] ?? 0), 0);
}

/** Time spent, floored so it never reads more than it is: "42s", "34m 10s", "2h 5m". */
export function timeSpent(seconds: number): string {
  const whole = Math.floor(seconds);
  if (whole < SECONDS_PER_MINUTE) return `${whole}s`;
  if (whole < SECONDS_PER_HOUR) return `${Math.floor(whole / SECONDS_PER_MINUTE)}m ${whole % SECONDS_PER_MINUTE}s`;
  return `${Math.floor(whole / SECONDS_PER_HOUR)}h ${Math.floor((whole % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE)}m`;
}

function count(n: number): string {
  return Math.floor(n).toLocaleString(COUNT_LOCALE);
}

function times(n: number): string {
  return n.toFixed(2);
}

function LedgerLine({ name, note, perLevel, ledger, baseExp, running, perSecond, run, first, extra }: {
  name: string; note: string; perLevel: number; ledger: Ledger; baseExp: number; running: boolean; perSecond: number;
  run: boolean; first: boolean; extra?: readonly [string, string];
}) {
  const cost = expToNextLevel(baseExp, ledger.level);
  const pct = Math.min(PERCENT, (ledger.exp / cost) * PERCENT);
  const factor = 1 + ledger.level * perLevel;
  return (
    <>
      <div className={`ledger__l${first ? ' ledger__l--first' : ''}`}>
        <h5 className="ledger__h">
          <span><i className={`ledger__sw ledger__sw--${run ? 'run' : 'core'}`} aria-hidden="true" />{`${name} · ${note} · +${percent(perLevel)}% / level`}</span>
          <b>{`level ${ledger.level}`}</b>
        </h5>
        <div className="bar" aria-hidden="true"><div className={`bar__fill${run ? ' bar__fill--run' : ''}`} style={{ width: `${pct}%` }} /></div>
        <div className="ledger__kv">
          <span className="ledger__d">{`to level ${ledger.level + 1}`}</span>
          <span>{`${fraction(ledger.exp, cost)} xp${running ? ` · ${countdown((cost - ledger.exp) / perSecond)}` : ''}`}</span>
          {extra && <><span className="ledger__d">{extra[0]}</span><span>{extra[1]}</span></>}
        </div>
      </div>
      <div className={`ledger__r${first ? ' ledger__r--first' : ''}`}>
        <div className="ledger__fac">{`×${times(factor)}`}</div>
        <div className="ledger__sub">{`1 + ${ledger.level} × ${percent(perLevel)}%`}</div>
      </div>
    </>
  );
}

/**
 * The skill pop-out (spec 2026-09-23-the-windward-run section 8, mockup
 * 2026-09-23-skills-ledger-gear): a ledger for the multiplier. Left, what
 * feeds it; right, the factor each contributes with its arithmetic; then the
 * total, the same string as the cell's. Below, right now (only while the skill
 * runs) and lifetime. It shows what is, never what could be.
 */
export function SkillLedger({ id, skill, content, state, running, row, hover }: {
  id: string; skill: SkillDefinition; content: Content; state: GameState;
  /** The skill is working this tick; `row` is the row it works, when known. */
  running: boolean; row: ActionDefinition | null;
  /** Opened by hover alone: the pointer passes through it, so moving down the band opens the next cell's. */
  hover: boolean;
}) {
  const s = state.skills[skill.id]!;
  const stats = state.skillStats[skill.id] ?? NO_STATS;
  const pieces = gearFor(state, content, skill.id);
  const gear = gearMultiplier(state, content, skill.id);
  const perSecond = tickExp(s, gear) * ticksPerSecond();
  const Icon = ICONS[skill.icon];

  // Opened at the right edge of the window, it hangs from the cell's right edge instead, so the page never scrolls sideways.
  const ref = useRef<HTMLDivElement>(null);
  const [alignRight, setAlignRight] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && el.getBoundingClientRect().right > document.documentElement.clientWidth) setAlignRight(true);
  }, []);

  const made = row?.producedItem === undefined ? undefined : content.items[row.producedItem];

  return (
    <div
      ref={ref} id={id} role="dialog" aria-label={`${skill.name} ledger`} tabIndex={-1}
      className={`ledger${hover ? ' ledger--hover' : ''}${alignRight ? ' ledger--right' : ''}`}
    >
      <h4 className="ledger__title"><Icon aria-hidden="true" />{skill.name}</h4>
      <div className="ledger__grid">
        <LedgerLine
          name="core" note="permanent" perLevel={coreMastery.multiplierPerLevel} ledger={s.core} baseExp={coreMastery.baseExp}
          running={running} perSecond={perSecond} run={false} first={true}
        />
        <LedgerLine
          name="run" note="this life" perLevel={runMastery.multiplierPerLevel} ledger={s.run} baseExp={runMastery.baseExp}
          running={running} perSecond={perSecond} run={true} first={false}
          extra={['best ever', String(Math.max(stats.bestRun, s.run.level))]}
        />
        <div className="ledger__l ledger__gear">
          <h5 className="ledger__h">
            <span>{'gear · this life'}</span>
            {pieces.length > 0 && <b>{`${pieces.length} ${pieces.length === 1 ? 'piece' : 'pieces'}`}</b>}
          </h5>
          <div className="ledger__kv">
            {pieces.length === 0
              ? <span className="ledger__d">none</span>
              : pieces.map((p) => (
                <Fragment key={p.actionId}>
                  <span>{content.actions[p.actionId]?.noun ?? p.actionId}</span><span>{`×${times(p.multiplier)}`}</span>
                </Fragment>
              ))}
          </div>
        </div>
        <div className="ledger__r">
          <div className="ledger__fac">{`×${times(gear)}`}</div>
          {pieces.length > 0 && <div className="ledger__sub">{pieces.map((p) => times(p.multiplier)).join(' × ')}</div>}
        </div>
        <div className="ledger__total-l">multiplier</div>
        <div className="ledger__total-r">{multiplierText(s, gear)}</div>
      </div>
      <div className="ledger__after">
        {running && (
          <div className="ledger__now">
            <h5 className="ledger__h2">right now</h5>
            <div className="ledger__kv">
              {row && <><span className="ledger__d">action</span><span>{row.noun}</span></>}
              <span className="ledger__d">earning</span><span>{`${perSecond.toFixed(2)} xp/s`}</span>
              {row && made && (
                <><span className="ledger__d">rate</span><span>{`${made.kind === 'key' ? itemName(content, made.id) : `${row.producedAmount ?? 1} ${itemName(content, made.id, row.producedAmount ?? 1)}`} / ${duration(row.expCost / perSecond)}`}</span></>
              )}
            </div>
          </div>
        )}
        <div className="ledger__life">
          <h5 className="ledger__h2">{`lifetime · ${state.life} ${state.life === 1 ? 'life' : 'lives'}`}</h5>
          <div className="ledger__kv">
            <span className="ledger__d">xp</span><span>{count(lifetimeXp(s.core))}</span>
            <span className="ledger__d">time</span><span>{timeSpent(ticksToSeconds(stats.ticks))}</span>
            <span className="ledger__d">done</span><span>{count(timesDone(state, content, skill.id))}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
