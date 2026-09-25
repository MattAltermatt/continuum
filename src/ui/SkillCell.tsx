import { useEffect, useId, useRef, useState } from 'react';
import type { FocusEvent, KeyboardEvent } from 'react';
import { balance } from '../balance';
import type { ActionDefinition, Content, SkillDefinition } from '../data/types';
import { gearMultiplier } from '../engine/effects';
import { expToNextLevel, tickExp } from '../engine/skills';
import { ticksPerSecond } from '../engine/time';
import type { GameState, Ledger } from '../engine/types';
import { countdown, fraction } from './format';
import { Gauge } from './Gauge';
import { ICONS } from './icons';
import { multiplierText, nextMultiplierText, SkillLedger } from './SkillLedger';

/**
 * How the ledger is open: by hover alone, which mouse leave closes; or held,
 * by a click, focus from the keyboard, or Enter, which only blur, Escape or a
 * second click close (spec 2026-09-23-the-windward-run section 8).
 */
type Open = 'hover' | 'held' | null;

/**
 * Where the ledger goes (spec 2026-09-25-the-watched-screen 4.2): `popout` is
 * the pop-out, hover or held (the screen's one cell on every tier, and the
 * desktop's roster column); `inline` renders it in flow under the cell when
 * held, no hover (the skills sheet, where a pop-out would be wider than the
 * screen).
 */
export type LedgerMode = 'popout' | 'inline';

const pctOf = (l: Ledger, cost: number) => (l.exp / cost) * 100;

/**
 * One skill: its multiplier, the multiplier the next core level gives, and two
 * gauges, core and run (spec 2026-09-25 4.2 and 5). The multiplier and the
 * level-up countdown include the skill's gear, so the cell, the ledger's
 * total and the engine agree. `idle` keeps the last skill dimmed with no
 * timers; `empty` is the same box with nothing in it, so a fresh run's cell
 * is the cell's height from the first paint.
 */
export function SkillCell({ skill, content, state, running, row, idle = false, empty = false, ledger = 'popout' }: {
  skill: SkillDefinition; content: Content; state: GameState; running: boolean;
  /** The row the skill is working, when it is running. */
  row: ActionDefinition | null;
  idle?: boolean; empty?: boolean; ledger?: LedgerMode;
}) {
  const Icon = ICONS[skill.icon];
  const s = state.skills[skill.id]!;
  const gear = gearMultiplier(state, content, skill.id);
  const perSecond = tickExp(s, gear) * ticksPerSecond();
  const coreCost = expToNextLevel(balance.skills.coreMastery.baseExp, s.core.level);
  const runCost = expToNextLevel(balance.skills.runMastery.baseExp, s.run.level);
  const timers = running && !idle;

  const [open, setOpen] = useState<Open>(null);
  const slot = useRef<HTMLDivElement>(null);
  const cell = useRef<HTMLDivElement>(null);
  // A press focuses the cell before its click lands: the click decides, so that focus must not open it first.
  const pressing = useRef(false);
  const ledgerId = useId();

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // Focus inside the closing pop-out goes back to the cell rather than to the page.
      if (slot.current?.querySelector('[role="dialog"]')?.contains(document.activeElement)) cell.current?.focus();
      setOpen(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const onFocus = () => {
    const byPointer = pressing.current;
    pressing.current = false;
    if (!byPointer) setOpen('held');
  };
  const onClick = () => {
    pressing.current = false;
    setOpen((o) => (o === 'held' ? null : 'held'));
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    setOpen('held');
  };
  // Focus moving between the cell and its own pop-out keeps it open; anywhere else closes it.
  const onBlur = (e: FocusEvent<HTMLDivElement>) => {
    pressing.current = false;
    if (!slot.current?.contains(e.relatedTarget as Node | null)) setOpen(null);
  };
  // Hover opens the pop-out only: an inline ledger is held or nothing.
  const hover = ledger === 'popout'
    ? { onMouseEnter: () => setOpen((o) => o ?? 'hover'), onMouseLeave: () => setOpen((o) => (o === 'hover' ? null : o)) }
    : {};

  if (empty) {
    // Every text line holds a no-break space, so the box is the filled cell's height to the pixel and the first press moves nothing.
    const blank = '\u00a0';
    return (
      <div className="skill-slot">
        <div className="item skill skill--empty" data-skill="">
          <div className="skill__icon" aria-hidden="true" />
          <div className="skill__title"><span>{blank}</span></div>
          <Gauge fill="core" pct={0} resetKey={0} label={blank} value={blank} />
          <Gauge fill="run" pct={0} resetKey={0} label={blank} value={blank} />
        </div>
      </div>
    );
  }

  return (
    <div ref={slot} className="skill-slot" onBlur={onBlur} {...hover}>
      <div
        ref={cell} className={`item skill${running ? ' skill--on working' : ''}${idle ? ' skill--idle' : ''}`} data-skill={skill.id}
        role="button" tabIndex={0} aria-haspopup="dialog" aria-expanded={open !== null} aria-controls={open !== null ? ledgerId : undefined}
        onMouseDown={() => { pressing.current = true; }} onFocus={onFocus} onClick={onClick} onKeyDown={onKeyDown}
      >
        <div className="skill__icon"><Icon aria-hidden="true" /></div>
        <div className="skill__title">
          <span className="skill__name"><b>{skill.name}</b> <span className="skill__mult">{multiplierText(s, gear)}</span>{running && <span className="visually-hidden">running</span>}</span>
          <span className="skill__to">{nextMultiplierText(s, gear)}</span>
        </div>
        <Gauge fill="core" pct={pctOf(s.core, coreCost)} resetKey={s.core.level}
          label={<>core Lv {s.core.level}{timers && <b> {'\u2191'} {countdown((coreCost - s.core.exp) / perSecond)}</b>}</>}
          value={fraction(s.core.exp, coreCost)} />
        <Gauge fill="run" pct={pctOf(s.run, runCost)} resetKey={`${state.life}:${s.run.level}`}
          label={<>run Lv {s.run.level}{timers && <b> {'\u2191'} {countdown((runCost - s.run.exp) / perSecond)}</b>}</>}
          value={fraction(s.run.exp, runCost)} />
      </div>
      {open !== null && (
        <SkillLedger id={ledgerId} skill={skill} content={content} state={state} running={running} row={row} hover={open === 'hover'} inline={ledger === 'inline'} />
      )}
    </div>
  );
}
