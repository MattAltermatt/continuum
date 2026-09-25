// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { TIER_O_MIN, TIER_P_MIN } from './tiers';
import { useTier } from './useTier';

/**
 * A matchMedia that answers `(min-width: Npx)` from a width this test moves and, like the browser's, tells a query's
 * listeners only when that query's answer flips. A hook subscribed at the wrong widths would then never hear a change.
 */
function fakeMatchMedia(width: () => number) {
  // A list, not a set: the hook subscribes one callback to each query, and both registrations must come and go.
  const listeners: { query: string; min: number; last: boolean; cb: () => void }[] = [];
  const mm = (query: string) => {
    const min = Number(/^\(min-width: (\d+)px\)$/.exec(query)![1]);
    return {
      get matches() { return width() >= min; },
      addEventListener: (_: string, cb: () => void) => { listeners.push({ query, min, last: width() >= min, cb }); },
      removeEventListener: (_: string, cb: () => void) => { const i = listeners.findIndex((l) => l.cb === cb); if (i >= 0) listeners.splice(i, 1); },
    } as unknown as MediaQueryList;
  };
  const fire = () => { for (const l of [...listeners]) { const now = width() >= l.min; if (now !== l.last) { l.last = now; l.cb(); } } };
  return { mm, fire, count: () => listeners.length, queries: () => listeners.map((l) => l.query) };
}

describe('useTier', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('is I where there is no matchMedia (jsdom)', () => {
    expect(renderHook(() => useTier()).result.current).toBe('I');
  });
  it('reads the tier from the window width less the screen padding, snapping at the CSS numbers, and follows a change', () => {
    let width = TIER_P_MIN + 20 - 1;   // 20 is the screen's side padding, twice
    const fake = fakeMatchMedia(() => width);
    vi.stubGlobal('matchMedia', fake.mm);
    vi.stubGlobal('innerWidth', width);
    const { result, unmount } = renderHook(() => useTier());
    expect(result.current).toBe('I');
    // The two queries are the tier widths plus the padding: any other width would never fire across a tier.
    expect(fake.queries()).toEqual([`(min-width: ${TIER_P_MIN + 20}px)`, `(min-width: ${TIER_O_MIN + 20}px)`]);
    for (const [w, tier] of [[TIER_P_MIN + 20, 'P'], [TIER_O_MIN + 20 - 1, 'P'], [TIER_O_MIN + 20, 'O'], [390, 'I']] as const) {
      width = w;
      vi.stubGlobal('innerWidth', w);
      act(() => fake.fire());
      expect(result.current, String(w)).toBe(tier);
    }
    expect(fake.count()).toBe(2);   // one listener per tier width
    unmount();
    expect(fake.count()).toBe(0);   // and both gone with the hook
  });
});
