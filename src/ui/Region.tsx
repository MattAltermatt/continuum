import type { ReactNode } from 'react';

/**
 * One region of the screen (spec 2026-09-24-screen-pass section 2.4): one
 * box, one heading style, the heading inside at the top edge. `name` is the
 * aria-label every test reads and the default heading text; `title` replaces
 * the text ("queue · 2"); `note` sits at the heading's right; `head` replaces
 * the whole heading node (the chapter's running head), and `head={null}`
 * renders none (the health bar: the bar and its value, nothing else).
 * `className` carries the caller's own class forward, since the CSS and the
 * fold queries select it (`.queue`, `.rates`, `.skills`).
 */
export function Region({ name, title, className, note, head, live, children }: {
  name: string; title?: string; className?: string; note?: ReactNode; head?: ReactNode | null; live?: boolean; children: ReactNode;
}) {
  const heading = head === undefined
    ? <header className="region__head"><span>{title ?? name}</span>{note}</header>
    : head;
  return (
    <section className={`region region--${name}${className ? ` ${className}` : ''}`} aria-label={name} aria-live={live ? 'polite' : undefined}>
      {heading}
      {children}
    </section>
  );
}
