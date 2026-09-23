import { describe, expect, it } from 'vitest';
import { clock, countdown, duration, fraction } from './format';

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
});
