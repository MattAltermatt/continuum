/**
 * A declared length in hours. The data layer needs it (the validator's
 * ceiling) and may not import the engine, so the unit lives here and the
 * engine imports it. A unit conversion, not tuning (see MS_PER_SECOND in
 * src/engine/time.ts).
 */
import type { BookLength } from './types';

export const HOURS_PER_DAY = 24;

export function lengthInHours(length: BookLength): number {
  return length.hours !== undefined ? length.hours : length.days * HOURS_PER_DAY;
}
