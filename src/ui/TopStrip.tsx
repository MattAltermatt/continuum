import type { ReactNode } from 'react';
import type { ChapterHead } from '../data/types';
import { clock, hpClass, hpRate, rate } from './format';
import { HeadLine } from './RunningHead';
import { HealthBar } from './HealthBar';

/** The health gauge's one word (spec 2026-09-25-the-watched-screen 4.1), most urgent state first. */
export type TopLabel =
  | { kind: 'left'; seconds: number }
  | { kind: 'steady' }
  | { kind: 'idle' } | { kind: 'paused' } | { kind: 'elsewhere' }
  | { kind: 'dead'; life: number } | { kind: 'finished'; life: number };

/** Display precision, not tuning: the countdown turns to hours where mm:ss would need three digits of minutes. */
const SECONDS_PER_HOUR = 3600;
const HOURS_FROM_SECONDS = 100 * 60;

/** Which one word the health gauge carries (spec 2026-09-25 4.1), most urgent first. */
export function topLabel(a: { elsewhere: 'none' | 'held' | 'lost'; card: 'none' | 'dead' | 'finished'; paused: boolean; queued: number; fighting: boolean; health: number; net: number; life: number }): TopLabel {
  if (a.elsewhere !== 'none') return { kind: 'elsewhere' };
  // Behind the death overlay the strip is the life that ended, and says so (#90).
  if (a.card !== 'none') return { kind: a.card, life: a.life };
  if (a.paused) return { kind: 'paused' };
  if (a.queued === 0) return { kind: 'idle' };
  if (a.net < 0 && !a.fighting) return { kind: 'left', seconds: a.health / -a.net };
  return { kind: 'steady' };
}

function labelNode(l: TopLabel): { node: ReactNode; tone?: 'warn' | 'dim' | 'hurt' } {
  switch (l.kind) {
    // Past 99:59 the clock's minutes would overflow the column: hours, rounded down, are enough of a warning.
    case 'left': return { node: `\u2248 ${l.seconds >= HOURS_FROM_SECONDS ? `${Math.floor(l.seconds / SECONDS_PER_HOUR)}h+` : clock(l.seconds)} left`, tone: 'hurt' };
    case 'idle': case 'paused': case 'elsewhere': return { node: l.kind, tone: 'dim' };
    // One word each: the label column is 13ch, and the overlay's title already names the life.
    case 'dead': return { node: 'dead', tone: 'hurt' };
    case 'finished': return { node: 'finished', tone: 'dim' };
    // A blank line, not none: the label row keeps its height, so the bar under it never moves when the word comes and goes.
    case 'steady': return { node: '\u00a0' };
  }
}

/**
 * The top strip (spec 2026-09-25-the-watched-screen 4.1): the running head,
 * the health gauge with its one-word label, and the four-cell rates line,
 * sticky, replacing today's separate health and rates regions. The rates
 * line's third cell is the running row's health rate by its skill's name
 * (the rates chunk's existing rule), a dash when nothing runs; only `net`
 * carries the unit.
 */
export function TopStrip({ book, head, page, health, max, life, label, decay, ceiling, row, rowBy }: {
  book: string; head: ChapterHead; page: string; health: number; max: number; life: number; label: TopLabel;
  decay: number; ceiling: number; row: number; rowBy: string | null;
}) {
  const l = labelNode(label);
  const net = ceiling + row - decay;
  const cell = (name: string, n: number, unit = false) => (
    <span className="rates__cell"><span className="ink-2">{name}</span> <b className={n === 0 ? 'ink-3' : hpClass(n)}>{unit ? hpRate(n) : rate(n)}</b></span>
  );
  return (
    <div className="top">
      <HeadLine book={book} head={head} page={page} />
      <HealthBar health={health} max={max} life={life} label={l.node} tone={l.tone} />
      <div className="rates" aria-label="rates">
        {cell('decay', -decay)}{cell('food', ceiling)}{cell(rowBy ?? '\u2014', row)}{cell('net', net, true)}
      </div>
    </div>
  );
}
