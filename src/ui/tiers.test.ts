import { describe, expect, it } from 'vitest';
import css from '../styles.css?raw';
import { TIER_O_MIN, TIER_P_MIN, tierFor } from './tiers';

describe('tiers', () => {
  it('names the tier by width', () => {
    expect(tierFor(0)).toBe('I'); expect(tierFor(TIER_P_MIN - 1)).toBe('I');
    expect(tierFor(TIER_P_MIN)).toBe('P'); expect(tierFor(TIER_O_MIN - 1)).toBe('P');
    expect(tierFor(TIER_O_MIN)).toBe('O');
  });
  it('the stylesheet snaps at the same two widths (Task 0 wrote the shells), and reserves no scrollbar gutter', () => {
    expect(css).not.toContain('scrollbar-gutter');
    expect(css).toContain(`@container (min-width: ${TIER_P_MIN}px)`);
    expect(css).toContain(`@container (min-width: ${TIER_O_MIN}px)`);
  });
});
