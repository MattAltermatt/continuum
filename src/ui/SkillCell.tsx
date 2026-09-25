import { useEffect, useId, useRef, useState } from 'react';
import type { FocusEvent, KeyboardEvent } from 'react';
import { balance } from '../balance';
import type { ActionDefinition, Content, SkillDefinition } from '../data/types';
import { gearMultiplier } from '../engine/effects';
import { expToNextLevel, tickExp } from '../engine/skills';
import { ticksPerSecond } from '../engine/time';
import type { GameState, Ledger } from '../engine/types';
import { countdown, fraction } from './format';
import { ICONS } from './icons';
import { multiplierText, SkillLedger } from './SkillLedger';

function Line({ ledger, baseExp, running, perSecond, runFill, resetKey }: {
  ledger: Ledger; baseExp: number; running: boolean; perSecond: number; runFill: boolean;
  /** Changes exactly when the ledger resets, so the fill remounts and jumps rather than sliding back (spec 2026-09-24-screen-pass 4). */
  resetKey: string | number;
}) {
  const cost = expToNextLevel(baseExp, ledger.level);
  const pct = Math.min(100, (ledger.exp / cost) * 100);
  return (
    <>
      <div className="skill__lv">Lv {ledger.level}</div>
      <div>
        <div className="bar" aria-hidden="true"><div key={resetKey} className={`bar__fill${runFill ? ' bar__fill--run' : ''}`} style={{ width: `${pct}%` }} /></div>
        <div className="bar__value">
          {fraction(ledger.exp, cost)}
          {running && <b>↑ {countdown((cost - ledger.exp) / perSecond)}</b>}
        </div>
      </div>
    </>
  );
}

/**
 * How the ledger is open: by hover alone, which mouse leave closes; or held,
 * by a click, focus from the keyboard, or Enter, which only blur, Escape or a
 * second click close (spec 2026-09-23-the-windward-run section 8).
 */
type Open = 'hover' | 'held' | null;

/**
 * One skill in the band: its multiplier and two ledgers, and the pop-out that
 * explains the multiplier. The multiplier and the level-up countdown include
 * the skill's gear, so the cell, the ledger's total and the engine agree.
 */
export function SkillCell({ skill, content, state, running, row }: {
  skill: SkillDefinition; content: Content; state: GameState; running: boolean;
  /** The row the skill is working, when it is running. */
  row: ActionDefinition | null;
}) {
  const Icon = ICONS[skill.icon];
  const s = state.skills[skill.id]!;
  const gear = gearMultiplier(state, content, skill.id);
  const perSecond = tickExp(s, gear) * ticksPerSecond();

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

  return (
    <div
      ref={slot} className="skill-slot" onBlur={onBlur}
      onMouseEnter={() => setOpen((o) => o ?? 'hover')}
      onMouseLeave={() => setOpen((o) => (o === 'hover' ? null : o))}
    >
      <div
        ref={cell} className={`item skill${running ? ' skill--on working' : ''}`} data-skill={skill.id}
        role="button" tabIndex={0} aria-haspopup="dialog" aria-expanded={open !== null} aria-controls={open !== null ? ledgerId : undefined}
        onMouseDown={() => { pressing.current = true; }} onFocus={onFocus} onClick={onClick} onKeyDown={onKeyDown}
      >
        <div className="skill__icon"><Icon aria-hidden="true" /></div>
        <div className="skill__name">
          <b>{skill.name}</b>
          <span className="skill__mult">{multiplierText(s, gear)}</span>
          {running && <span className="visually-hidden">running</span>}
        </div>
        <Line ledger={s.core} baseExp={balance.skills.coreMastery.baseExp} running={running} perSecond={perSecond} runFill={false} resetKey={s.core.level} />
        <Line ledger={s.run} baseExp={balance.skills.runMastery.baseExp} running={running} perSecond={perSecond} runFill={true} resetKey={`${state.life}:${s.run.level}`} />
      </div>
      {open !== null && (
        <SkillLedger id={ledgerId} skill={skill} content={content} state={state} running={running} row={row} hover={open === 'hover'} />
      )}
    </div>
  );
}
