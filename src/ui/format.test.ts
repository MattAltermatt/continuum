import { describe, expect, it } from 'vitest';
import { clock, countdown, duration, floored, fraction, healthPair, rate, tenths } from './format';

describe('format', () => {
  it('fraction is a/b with one decimal and no spaces', () => {
    expect(fraction(14.6, 31.384)).toBe('14.6/31.4');
    expect(fraction(0, 25)).toBe('0.0/25.0');
  });
  it('duration: a tenth under ten seconds, whole seconds to a minute, then m:ss unpadded (spec 8.1 "4.2s", "1:10")', () => {
    expect(duration(4.2)).toBe('4.2s');
    expect(duration(6)).toBe('6.0s');
    expect(duration(40.4)).toBe('40s');
    expect(duration(70)).toBe('1:10');
  });
  it('countdown: whole seconds rounded up, then m:ss (the running skill\'s "↑ 7s")', () => {
    expect(countdown(6.4)).toBe('7s');
    expect(countdown(70)).toBe('1:10');
    expect(countdown(0)).toBe('0s');
  });
  it('clock is mm:ss padded', () => {
    expect(clock(372)).toBe('06:12');
    expect(clock(0)).toBe('00:00');
  });
  it('rate is hpRate without its unit, and a bare 0.00 for zero', () => {
    expect(rate(-0.3)).toBe('\u22120.30');
    expect(rate(0.3)).toBe('+0.30');
    expect(rate(0)).toBe('0.00');
  });
});

describe('health in the bar', () => {
  it('a whole maximum keeps v0.1: current floored, never 0 while alive', () => {
    expect(healthPair(71.46, 100)).toEqual({ now: '71', max: '100' });
    expect(healthPair(0.3, 100)).toEqual({ now: '1', max: '100' });
    expect(healthPair(0, 100)).toEqual({ now: '0', max: '100' });
  });
  it('a fractional maximum: both floored to tenths, so a full bar reads full', () => {
    expect(healthPair(101.5937, 101.5937)).toEqual({ now: '101.5', max: '101.5' });
    expect(healthPair(71.46, 101.5937)).toEqual({ now: '71.4', max: '101.5' });
    expect(healthPair(0.04, 101.5)).toEqual({ now: '0.1', max: '101.5' });
  });
  it('tenths floors without float error on a computed sum: 0.7 + 0.1 reads 0.8, not 0.7', () => {
    expect(0.7 + 0.1).toBeLessThan(0.8);   // the float the epsilon exists for
    expect(tenths(0.7 + 0.1)).toBe('0.8');
    expect(tenths(101.7)).toBe('101.7');
    expect(floored(101.996, 2)).toBe('101.99');   // never rounds up, at any precision
    expect(tenths(100)).toBe('100.0');
    expect(tenths(101.5198)).toBe('101.5');
  });
});
