import { useEffect, useRef, useState } from 'react';
import { GearIcon } from './icons';

/**
 * How long a first press on erase save stays armed. Presentation timing, not a
 * gameplay value; kept out of balance.ts on the same reasoning as MS_PER_SECOND
 * in src/engine/time.ts.
 */
const ARM_MS = 3000;

/**
 * The gear and what it opens (spec 2026-09-23-the-windward-run section 10,
 * mockup 2026-09-23-settings): one entry, erase save, which takes two presses.
 * Production-only since the screen pass (spec 2026-09-24-screen-pass 5.2):
 * the dev speed control lives in the debug overlay. Escape and a click
 * outside close it.
 */
export function Settings({ onErase }: { onErase: () => void }) {
  const [open, setOpen] = useState(false);
  const [armed, setArmed] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!armed) return;
    const id = setTimeout(() => setArmed(false), ARM_MS);
    return () => clearTimeout(id);
  }, [armed]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); setArmed(false); } };
    const onDown = (e: MouseEvent) => { if (root.current && !root.current.contains(e.target as Node)) { setOpen(false); setArmed(false); } };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown); };
  }, [open]);

  const erase = () => {
    if (!armed) { setArmed(true); return; }
    setArmed(false);
    setOpen(false);
    onErase();
  };

  return (
    <div className="settings" ref={root}>
      <button type="button" className="btn settings__gear" aria-label="settings" aria-expanded={open} onClick={() => { setOpen(!open); setArmed(false); }}>
        <GearIcon aria-hidden="true" />
      </button>
      {open && (
        <div className="settings__panel" role="dialog" aria-label="settings">
          <h5 className="settings__head"><span>settings</span></h5>
          <button type="button" className={`settings__btn${armed ? ' settings__btn--armed' : ''}`} onClick={erase}>
            {armed ? 'press again to erase' : 'erase save'}
          </button>
        </div>
      )}
    </div>
  );
}
