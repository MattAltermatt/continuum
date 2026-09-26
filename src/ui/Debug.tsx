import { useCallback, useEffect, useLayoutEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { balance } from '../balance';
import type { Content } from '../data/types';
import { ticksPerSecond } from '../engine/time';
import type { GameState } from '../engine/types';
import { DEV_SPEEDS, whole, type GameAction } from '../state/useGame';
import { tenths } from './format';

/** Where a dragged panel is remembered: a dev convenience, like the save wrapped in try/catch. */
const POS_KEY = 'continuum.debug';

interface Pos { readonly left: number; readonly top: number }

/** The time buttons: the tick path with n ticks, so each does exactly what waiting would. */
const TIME_STEPS: readonly { readonly label: string; readonly ticks: () => number }[] = [
  { label: '+10s', ticks: () => 10 * ticksPerSecond() },
  { label: '+1m', ticks: () => 1 * balance.time.ticksPerMinute },
  { label: '+10m', ticks: () => 10 * balance.time.ticksPerMinute },
];

/** Health takes fractions: any finite value at or above zero. */
const finite = (n: number) => Number.isFinite(n) && n >= 0;

const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), Math.max(lo, hi));

function readPos(): Pos | null {
  try {
    const raw = localStorage.getItem(POS_KEY);
    if (raw === null) return null;
    const p = JSON.parse(raw) as Partial<Pos> | null;
    return p && typeof p.left === 'number' && typeof p.top === 'number' ? { left: p.left, top: p.top } : null;
  } catch { return null; }
}

function writePos(p: Pos): void {
  try { localStorage.setItem(POS_KEY, JSON.stringify(p)); } catch { /* blocked storage: the position is not remembered */ }
}

/**
 * A number input that applies once, on blur (spec 2026-09-24-screen-pass 5.2): Enter blurs it. A value
 * that does not parse (for a level or a count, also a fraction) is dropped and the input shows the state's value again. The text
 * follows the state's value from outside only while the input is not focused, so a tick cannot clobber a
 * value being typed.
 */
function NumberField({ label, value, fractions = false, onApply, inputRef }: {
  label: string; value: number; fractions?: boolean; onApply: (n: number) => void; inputRef?: RefObject<HTMLInputElement | null>;
}) {
  const valid = fractions ? finite : whole;
  const own = useRef<HTMLInputElement>(null);
  const ref = inputRef ?? own;
  // Shown as the screen shows it: health to a tenth (a live game's health is a long float), a level or count whole.
  const shown = fractions ? tenths(value) : String(value);
  const [text, setText] = useState(shown);
  // Only a typed value applies. A field focused and left alone applies nothing on blur, whatever the state did meanwhile
  // (health decays under a focused field, a level can rise): comparing the text with the value would write the
  // focus-time value back, and the tenth health is shown to would round it down.
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (document.activeElement !== ref.current) { setText(shown); setDirty(false); }
  }, [shown, ref]);
  const apply = () => {
    if (!dirty) { setText(shown); return; }   // nothing typed: the field catches up with the value that moved under it
    setDirty(false);
    const n = Number(text);
    if (text.trim() !== '' && valid(n)) onApply(n);
    else setText(shown);
  };
  return (
    <input
      ref={ref} type="number" min={0} step={fractions ? 'any' : 1} className="debug__input" aria-label={label} name={label}
      value={text} onChange={(e) => { setText(e.target.value); setDirty(true); }} onBlur={apply}
      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
    />
  );
}

/**
 * The debug overlay (spec 2026-09-24-screen-pass section 5, #83): dev builds only, mounted by App under
 * import.meta.env.DEV and imported by nothing else, with no side-effect import, so production drops it.
 * The backquote toggles it and Escape closes it; it floats on document.body through a portal, drags by its
 * title bar, and reads the committed state (behind the death overlay, the dead life: every write is refused).
 */
export function Debug({ content, state, stopped, speed, onSpeed, dispatch }: {
  content: Content; state: GameState; stopped: boolean; speed: number; onSpeed: (n: number) => void; dispatch: (a: GameAction) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<Pos | null>(null);
  const [skillsOpen, setSkillsOpen] = useState(false);
  const [itemsOpen, setItemsOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const health = useRef<HTMLInputElement>(null);
  const endDrag = useRef<(() => void) | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const r = root.current;
      if (e.code === 'Backquote') {
        // Never under a typed value; a focused button does not swallow it.
        const t = e.target as HTMLElement | null;
        const typing = t !== null && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA');
        if (typing && r !== null && r.contains(t)) return;
        setOpen((o) => !o);
        return;
      }
      // Only from the body or inside the overlay, so the ledger and the gear keep their own Escape.
      if (e.key === 'Escape') {
        const a = document.activeElement;
        if (a === null || a === document.body || (r !== null && r.contains(a))) setOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // A drag in progress ends with the overlay.
  useEffect(() => () => endDrag.current?.(), []);
  useEffect(() => { if (!open) endDrag.current?.(); }, [open]);

  // On open: the saved position, or bottom-left above the bottom bar, clamped to the window.
  useLayoutEffect(() => {
    const el = root.current;
    if (!open || el === null) return;
    const bottom = document.querySelector<HTMLElement>('.bottom')?.offsetHeight ?? 0;
    const want = readPos() ?? { left: 0, top: window.innerHeight - bottom - el.offsetHeight };
    setPos({
      left: clamp(want.left, 0, window.innerWidth - el.offsetWidth),
      top: clamp(want.top, 0, window.innerHeight - el.offsetHeight),
    });
  }, [open]);
  // And again after every render (a list opening grows the panel) and on a window resize: a panel clamped only on
  // open grew off the bottom of the window when the skills list opened, and fixed positioning cannot be scrolled to.
  // The same position comes back when nothing moved, so this settles in one pass.
  const reclamp = useCallback(() => {
    const el = root.current;
    if (el === null) return;
    setPos((p) => {
      if (p === null) return p;
      const next = { left: clamp(p.left, 0, window.innerWidth - el.offsetWidth), top: clamp(p.top, 0, window.innerHeight - el.offsetHeight) };
      return next.left === p.left && next.top === p.top ? p : next;
    });
  }, []);
  useLayoutEffect(() => { if (open) reclamp(); });
  useEffect(() => {
    if (!open) return;
    window.addEventListener('resize', reclamp);
    return () => window.removeEventListener('resize', reclamp);
  }, [open, reclamp]);

  const startDrag = (e: ReactMouseEvent) => {
    const el = root.current;
    if (pos === null || el === null || (e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    const dx = e.clientX - pos.left;
    const dy = e.clientY - pos.top;
    let last = pos;
    const move = (m: MouseEvent) => {
      last = {
        left: clamp(m.clientX - dx, 0, window.innerWidth - el.offsetWidth),
        top: clamp(m.clientY - dy, 0, window.innerHeight - el.offsetHeight),
      };
      setPos(last);
    };
    const up = () => { stop(); writePos(last); };
    const stop = () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      endDrag.current = null;
    };
    endDrag.current?.();
    endDrag.current = stop;
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  };

  if (!open) return null;
  const items = Object.values(content.items);

  return createPortal(
    <div ref={root} className="debug" role="dialog" aria-label="debug" style={pos ? { left: pos.left, top: pos.top } : undefined}>
      <div className="debug__title" onMouseDown={startDrag}>
        <span>{state.dead ? 'debug · dead' : 'debug'}</span>
        <button type="button" className="debug__close" aria-label="close debug" onClick={() => setOpen(false)}>×</button>
      </div>

      <div className="debug__row">
        <span className="debug__label">time</span>
        <div className="debug__controls">
          {TIME_STEPS.map((t) => (
            <button
              key={t.label} type="button" className="debug__btn" aria-disabled={stopped ? 'true' : undefined}
              onClick={() => { if (!stopped) dispatch({ type: 'tick', n: t.ticks() }); }}
            >{t.label}</button>
          ))}
        </div>
        {stopped && <p className="debug__note">time passes only while work happens</p>}
      </div>

      <div className="debug__row">
        <span className="debug__label">speed</span>
        <div className="debug__speed" role="group" aria-label="speed">
          {DEV_SPEEDS.map((n) => (
            <button key={n} type="button" aria-pressed={speed === n} onClick={() => onSpeed(n)}>{`×${n}`}</button>
          ))}
        </div>
      </div>

      <div className="debug__row">
        <span className="debug__label">health</span>
        <div className="debug__controls">
          <NumberField label="health" value={state.health} fractions inputRef={health} onApply={(n) => dispatch({ type: 'setHealth', health: n })} />
          {/* Blur is the one apply path: pressing set blurs the input, which applies it. */}
          <button type="button" className="debug__btn" onClick={() => health.current?.blur()}>set</button>
          <button type="button" className="debug__btn debug__btn--end" onClick={() => dispatch({ type: 'die' })}>die now</button>
        </div>
      </div>

      <div className="debug__row">
        <span className="debug__label">chips</span>
        <div className="debug__controls">
          <button type="button" className="debug__btn" onClick={() => dispatch({ type: 'earnChips' })}>earn every chip on this page</button>
        </div>
      </div>

      <div className="debug__row">
        <button type="button" className="debug__toggle" aria-expanded={skillsOpen} onClick={() => setSkillsOpen(!skillsOpen)}>
          {`skills (${content.roster.length})`}
        </button>
        {skillsOpen && content.roster.map((s) => (
          <div key={s.id} className="debug__line">
            <span>{s.name}</span>
            <NumberField label={`${s.name} core`} value={state.skills[s.id]?.core.level ?? 0} onApply={(n) => dispatch({ type: 'setSkill', skill: s.id, ledger: 'core', level: n })} />
            <NumberField label={`${s.name} run`} value={state.skills[s.id]?.run.level ?? 0} onApply={(n) => dispatch({ type: 'setSkill', skill: s.id, ledger: 'run', level: n })} />
          </div>
        ))}
      </div>

      <div className="debug__row">
        <button type="button" className="debug__toggle" aria-expanded={itemsOpen} onClick={() => setItemsOpen(!itemsOpen)}>
          {`items (${items.length})`}
        </button>
        {itemsOpen && items.map((it) => (
          <div key={it.id} className="debug__line">
            <span>{it.name}</span>
            <NumberField label={`${it.name} have`} value={state.inventory[it.id] ?? 0} onApply={(n) => dispatch({ type: 'setItem', item: it.id, count: n })} />
          </div>
        ))}
      </div>
    </div>,
    document.body,
  );
}
