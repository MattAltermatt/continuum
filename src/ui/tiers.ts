/** Content widths at which the body's arrangement snaps (spec 2026-09-25 section 3). CSS's @container queries repeat them; tiers.test.ts keeps the two in step. */
export const TIER_P_MIN = 640;   // measured on the live build 2026-09-25: the one-line entry's longest name fits its 3fr column from 630; ten to spare
export const TIER_O_MIN = 1200;   // 360 + 360 + 460 and the gaps (1196): the list row fits its 460px column at 1280

export type Tier = 'I' | 'P' | 'O';

export function tierFor(width: number): Tier {
  if (width < TIER_P_MIN) return 'I';
  if (width < TIER_O_MIN) return 'P';
  return 'O';
}
