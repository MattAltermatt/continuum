import { describe, it, expect } from 'vitest';
import { balance } from '../balance';
import { msToTicks, ticksPerSecond, ticksToMinutes, ticksToMs, ticksToSeconds } from './time';

describe('tick conversions', () => {
  it('converts ticks to milliseconds through balance, not a literal', () => {
    expect(ticksToMs(1)).toBe(balance.time.tickIntervalMs);
    expect(ticksToMs(0)).toBe(0);
    expect(ticksToMs(balance.time.ticksPerMinute)).toBe(60_000);
  });

  it('rounds partial ticks DOWN, because a partial tick has not happened', () => {
    const interval = balance.time.tickIntervalMs;
    expect(msToTicks(interval - 1)).toBe(0);
    expect(msToTicks(interval)).toBe(1);
    expect(msToTicks(interval * 2 - 1)).toBe(1);
  });

  it('round-trips a whole number of ticks', () => {
    for (const ticks of [0, 1, 7, 600, 9_000]) {
      expect(msToTicks(ticksToMs(ticks))).toBe(ticks);
    }
  });

  it('reports seconds and minutes against the canonical rates', () => {
    expect(ticksToSeconds(balance.time.ticksPerMinute)).toBe(60);
    expect(ticksToMinutes(balance.time.ticksPerMinute)).toBe(1);
  });

  it('does NOT round minutes, because the decay curve is continuous', () => {
    // A half minute must read as 0.5, not 0. Rounding here would make decay
    // step once a minute instead of accelerating smoothly.
    expect(ticksToMinutes(balance.time.ticksPerMinute / 2)).toBe(0.5);
  });
});

describe('ticksPerSecond', () => {
  it('is the inverse of the tick interval, not a second literal', () => {
    // 100 ms per tick -> 10 per second. Asserted as an absolute so the pair
    // cannot drift together: if tickIntervalMs changes, this fails and someone
    // has to mean it.
    expect(ticksPerSecond()).toBe(10);
    expect(ticksPerSecond() * balance.time.tickIntervalMs).toBe(1000);
  });
});
