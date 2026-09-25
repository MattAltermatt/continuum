import { ticksPerSecond } from '../engine/time';
import { clock } from './format';
import { PAUSE, PLAY } from './glyphs';
import { Settings } from './Settings';
import type { SheetName } from './Sheet';

/** A stable no-op, so the default `onSheet` prop does not recreate on every render. */
const NO_SHEET = () => {};

/**
 * The bottom bar (spec 2026-09-24-screen-pass section 2.2, spec
 * 2026-09-25-the-watched-screen 4.6): the gear, the run clock, the three
 * sheet buttons and pause or resume, sticky to the window's bottom. Behind
 * the card all four controls' boxes stay, unseen, so the bar does not
 * reflow on death or Begin. The clock's cell is pinned, so it never moves
 * the controls either side of it. Its note moved to the top strip's health
 * gauge label (spec 2026-09-25-the-watched-screen 4.1). On the desktop tier
 * (`docked`) the three sheet buttons are absent, their box empty: the sheets
 * are docked columns there, not something to open.
 */
export function BottomBar({ clockSeconds, live, card, onPause, onResume, onErase, sheet = null, onSheet = NO_SHEET, actionsCount = 0, nudge = false, docked = false }: {
  clockSeconds: number; live: boolean; card: boolean;
  onPause: () => void; onResume: () => void; onErase: () => void;
  sheet?: SheetName | null; onSheet?: (s: SheetName | null) => void; actionsCount?: number; nudge?: boolean; docked?: boolean;
}) {
  return (
    <footer className="bottom" aria-label="bottom bar">
      <Settings onErase={onErase} />
      <span role="timer" className="bottom__clock" aria-label="run clock">{clock(clockSeconds)}</span>
      {/* The box stays when docked: the bar's grid has four tracks, and pause is the fourth. */}
      <span className="btns">
        {!docked && (['skills', 'actions', 'pack'] as const).map((s) => card
            ? <span key={s} className="qbtn qbtn--placeholder" aria-hidden="true" />
            : (
              <button key={s} type="button" className={`qbtn qbtn--${s}${sheet === s ? ' qbtn--open' : ''}${s === 'actions' && nudge ? ' qbtn--waits' : ''}`} aria-expanded={sheet === s} onClick={() => onSheet(sheet === s ? null : s)}>
                {s}{s === 'actions' && <small> {'\u00b7'} {actionsCount}</small>}
              </button>
            ))}
      </span>
      {card ? <span className="btn btn--placeholder" aria-hidden="true" /> : live
        ? <button type="button" className="btn" aria-label="pause" onClick={onPause}>{PAUSE}</button>
        : <button type="button" className="btn btn--play" aria-label="resume" onClick={onResume}>{PLAY}</button>}
      <span className="visually-hidden">{ticksPerSecond()} ticks per second</span>
    </footer>
  );
}
