import { useEffect, useRef, type ReactNode } from 'react';

export type SheetName = 'skills' | 'actions' | 'pack';

/**
 * One operated region (spec 2026-09-25-the-watched-screen 4.7): a sheet over
 * the body on the phone and in the window, a docked column on the desktop.
 * Closed, it is hidden (not inert: jsdom's role queries see through inert).
 * Escape closes it unless another dialog is open, which closes first on its
 * own handler.
 */
export function Sheet({ name, open, docked, inert, onClose, head, children }: {
  name: SheetName; open: boolean; docked: boolean; inert?: boolean; onClose: () => void; head: ReactNode; children: ReactNode;
}) {
  // Focus follows the sheet in, so Tab and Escape start there and not on the bar's button behind the scrim, and goes
  // back to where it was when the sheet closes, so a keyboard player keeps their place.
  const panel = useRef<HTMLElement>(null);
  const before = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (docked) return;
    if (open) {
      before.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      panel.current?.focus();
      return;
    }
    before.current?.focus();
    before.current = null;
  }, [open, docked]);
  useEffect(() => {
    if (!open || docked) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (document.querySelector('[role="dialog"]:not(.sheet)') !== null) return;
      onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, docked, onClose]);

  if (docked) return <section className={`dock dock--${name}`} aria-label={`${name} sheet`} inert={inert}>{head}{children}</section>;

  return (
    <>
      <div className="scrim" hidden={!open} onClick={onClose} />
      <section ref={panel} tabIndex={-1} className={`sheet sheet--${name}${open ? ' sheet--open' : ''}`} role="dialog" aria-label={`${name} sheet`} hidden={!open} inert={inert}>
        <div className="sheet__grip" aria-hidden="true" />
        {head}
        <div className="sheet__list">{children}</div>
      </section>
    </>
  );
}
