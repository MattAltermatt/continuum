import { ticksPerSecond } from '../engine/time';
import { clock } from './format';
import { PAUSE, PLAY } from './glyphs';
import { Settings } from './Settings';

/**
 * The bottom bar (spec 2026-09-24-screen-pass section 2.2): the gear, the
 * run clock with its note, and pause or resume, sticky to the window's
 * bottom. Behind the card the control's box stays, unseen, so the bar does
 * not reflow on death or Begin. The clock's cell is pinned, so "00:00 waiting"
 * never moves the controls either side of it.
 */
export function BottomBar({ clockSeconds, note, live, card, onPause, onResume, onErase }: {
  clockSeconds: number; note: string | null; live: boolean; card: boolean;
  onPause: () => void; onResume: () => void; onErase: () => void;
}) {
  return (
    <footer className="bottom" aria-label="bottom bar">
      <Settings onErase={onErase} />
      <span role="timer" className={`bottom__clock${note ? ' bottom__clock--dim' : ''}`} aria-label="run clock">
        {clock(clockSeconds)}{note && <small> {note}</small>}
      </span>
      {card ? <span className="btn btn--placeholder" aria-hidden="true" /> : live
        ? <button type="button" className="btn" aria-label="pause" onClick={onPause}>{PAUSE}</button>
        : <button type="button" className="btn btn--play" aria-label="resume" onClick={onResume}>{PLAY}</button>}
      <span className="visually-hidden">{ticksPerSecond()} ticks per second</span>
    </footer>
  );
}
