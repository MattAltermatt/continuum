import { MINUS } from './glyphs';

/** Display formatting only. Spec section 8.1: fractions are a/b, no spaces. */
export function fraction(a: number, b: number): string {
  return `${a.toFixed(1)}/${b.toFixed(1)}`;
}

/**
 * Seconds in a minute. A unit conversion nobody may tune, kept out of
 * balance.ts on the same reasoning as MS_PER_SECOND in src/engine/time.ts.
 */
const SECONDS_PER_MINUTE = 60;

/** Under this many seconds a duration keeps a tenth ("4.2s"). Display precision, not tuning. */
const TENTHS_BELOW_SECONDS = 10;

function minutes(whole: number): string {
  return `${Math.floor(whole / SECONDS_PER_MINUTE)}:${String(whole % SECONDS_PER_MINUTE).padStart(2, '0')}`;
}

/** How long something takes at the current rate: "4.2s", "40s", "1:10" (spec 8.1, unpadded). */
export function duration(s: number): string {
  if (s < TENTHS_BELOW_SECONDS) return `${s.toFixed(1)}s`;
  const whole = Math.round(s);
  return whole < SECONDS_PER_MINUTE ? `${whole}s` : minutes(whole);
}

/** Time left on a countdown, whole seconds rounded up: "7s", "1:10". */
export function countdown(s: number): string {
  const whole = Math.ceil(s);
  return whole < SECONDS_PER_MINUTE ? `${whole}s` : minutes(whole);
}

/** The run clock: "mm:ss", padded (spec 8.1). */
export function clock(s: number): string {
  const whole = Math.floor(s);
  const m = Math.floor(whole / SECONDS_PER_MINUTE);
  const r = whole % SECONDS_PER_MINUTE;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

/**
 * Keeps a floor from reading 101.69999... as 101.6. Display precision, not
 * tuning; kept out of balance.ts on the same reasoning as TENTHS_BELOW_SECONDS.
 */
const TENTHS_EPSILON = 1e-9;

/** Floored to `decimals` places: a value never reads higher than it is. */
export function floored(n: number, decimals: number): string {
  const scale = 10 ** decimals;
  return (Math.floor(n * scale + TENTHS_EPSILON) / scale).toFixed(decimals);
}

/** Floored to one decimal. */
export function tenths(n: number): string {
  return floored(n, 1);
}

/**
 * Health and its maximum as the bar shows them. A whole maximum keeps v0.1's
 * reading (current floored, never 0 while alive). A maximum rebirth made
 * fractional shows both in floored tenths, so a full bar reads full.
 */
export function healthPair(health: number, max: number): { now: string; max: string } {
  if (Number.isInteger(max)) return { now: String(health > 0 ? Math.max(1, Math.floor(health)) : 0), max: String(max) };
  return { now: health > 0 ? tenths(Math.max(0.1, health)) : '0', max: tenths(max) };
}

/** A row's health rate, signed, two decimals: -0.30 hp/s, +1.00 hp/s. Display precision, not tuning. */
const RATE_DECIMALS = 2;
export function hpRate(n: number): string {
  return `${n < 0 ? MINUS : '+'}${Math.abs(n).toFixed(RATE_DECIMALS)} hp/s`;
}
/** The class a signed rate prints in: red for a drain, the covered-food green for a heal. */
export function hpClass(n: number): 'hurt-text' | 'heal-text' {
  return n < 0 ? 'hurt-text' : 'heal-text';
}
