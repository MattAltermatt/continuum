import { useSyncExternalStore } from 'react';
import { TIER_O_MIN, TIER_P_MIN, tierFor, type Tier } from './tiers';

/** The screen's side padding, twice: the content width is the window's less this (body never scrolls). Mirrors .screen's padding in styles.css. */
const SCREEN_PADDING = 20;

function subscribe(cb: () => void): () => void {
  if (typeof matchMedia === 'undefined') return () => {};
  const qs = [TIER_P_MIN, TIER_O_MIN].map((w) => matchMedia(`(min-width: ${w + SCREEN_PADDING}px)`));
  qs.forEach((q) => q.addEventListener('change', cb));
  return () => qs.forEach((q) => q.removeEventListener('change', cb));
}
function read(): Tier {
  if (typeof matchMedia === 'undefined') return 'I';
  return tierFor(window.innerWidth - SCREEN_PADDING);
}

/**
 * The tier the body should render (spec 2026-09-25-the-watched-screen
 * section 3): two matchMedia queries at the tier widths plus the screen's
 * side padding, so this and the CSS container queries snap at the same
 * content width by construction, with no first-paint flash. 'I' wherever
 * matchMedia is undefined (jsdom).
 */
export function useTier(): Tier {
  return useSyncExternalStore(subscribe, read, () => 'I');
}
