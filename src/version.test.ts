import { describe, expect, it } from 'vitest';
import { version } from '../package.json';
import { balance } from './balance';
import { windwardRun } from './data/windward-run';
import { attentive, measure } from './engine/play';

describe('the game version', { timeout: 30_000 }, () => {
  it('is a real semver in package.json, and a report stamps it', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(version).not.toBe('0.0.0');
    // A short bound: the stamp is the point, not the outcome.
    expect(measure(windwardRun, [attentive], version, { ...balance.play, maxBookDays: 1 / 24 }).gameVersion).toBe(version);
  });
});
