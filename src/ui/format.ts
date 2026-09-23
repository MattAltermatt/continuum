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
