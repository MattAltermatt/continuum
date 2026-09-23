/**
 * A click the way a mouse does it: mousedown, a real gap, mouseup, click, all
 * on the element that was pressed. Synthetic `element.click()` skips the gap,
 * which is exactly where a render loop that rebuilds children makes the browser
 * drop the click (CLAUDE.md gotchas; issue #34). Test-only.
 *
 * Uses a real timer: call it under real timers, and wrap the await in `act`.
 */

/**
 * The gap a real press has, in the middle of the 50-150 ms range CLAUDE.md
 * cites. A test fixture, not a tuning value; it is not in balance.ts for the
 * same reason MS_PER_SECOND is not.
 */
export const REAL_CLICK_GAP_MS = 100;

export async function realClick(el: Element): Promise<void> {
  // No `view`: under vitest the global `window` is not jsdom's Window, and the
  // MouseEvent constructor rejects it. Handlers here never read `view`.
  const opts = { bubbles: true, cancelable: true };
  el.dispatchEvent(new MouseEvent('mousedown', opts));
  await new Promise((r) => setTimeout(r, REAL_CLICK_GAP_MS));
  el.dispatchEvent(new MouseEvent('mouseup', opts));
  el.dispatchEvent(new MouseEvent('click', opts));
}
