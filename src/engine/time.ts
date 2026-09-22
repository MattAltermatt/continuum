/**
 * Conversions between the simulation's clock and real time.
 *
 * MECHANICS.md section 1 fixes the relationship: the simulation advances on a
 * fixed interval and nothing interpolates, so "how long is this" is always a
 * whole number of ticks. These are the conversions that follow from
 * `balance.time`, and nothing here decides anything -- a change to the tick rate
 * changes only `balance.ts`.
 *
 * This is also the first inhabitant of the purity wall (`decision #4`): it
 * imports `balance` and nothing else, it names no host capability, and it
 * compiles under `tsconfig.engine.json` with no DOM library present.
 */
import { balance } from '../balance';

/** Real milliseconds that a whole number of ticks occupies. */
export function ticksToMs(ticks: number): number {
  return ticks * balance.time.tickIntervalMs;
}

/**
 * Whole ticks in a span of real milliseconds, rounded down.
 *
 * Rounds down rather than to nearest because a partial tick has not happened:
 * the simulation only ever observes tick boundaries, so reporting a tick that
 * has not been dispatched would let a caller read progress the engine has not
 * made.
 */
export function msToTicks(ms: number): number {
  return Math.floor(ms / balance.time.tickIntervalMs);
}

/**
 * Milliseconds in a second.
 *
 * Named rather than written inline because `decision #3` forbids magic numbers
 * in engine code. It is deliberately NOT in `balance.ts`: that file holds values
 * someone may tune, and this is a unit conversion nobody may tune. Putting it
 * there would invite exactly the question the sacrosanct rule exists to make
 * expensive.
 */
const MS_PER_SECOND = 1000;

/** Real seconds that a whole number of ticks occupies. */
export function ticksToSeconds(ticks: number): number {
  return ticksToMs(ticks) / MS_PER_SECOND;
}

/**
 * Ticks dispatched per real second.
 *
 * The UI reports this and it is the one conversion a reader checks by eye
 * against the tick interval, so it lives here with the rest rather than being
 * recomputed at the call site.
 */
export function ticksPerSecond(): number {
  return MS_PER_SECOND / balance.time.tickIntervalMs;
}

/**
 * Elapsed run time expressed in minutes, as a fraction.
 *
 * The decay curve is defined against minutes elapsed rather than ticks, and it
 * is continuous -- so this deliberately does not round. Rounding here would make
 * decay step once a minute instead of accelerating smoothly, which is the whole
 * shape of the mechanic.
 */
export function ticksToMinutes(ticks: number): number {
  return ticks / balance.time.ticksPerMinute;
}
