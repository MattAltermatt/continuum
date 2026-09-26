import { describe, expect, it } from 'vitest';
import { ICON_NAMES } from '../data/icons';
import { GearIcon, HealthIcon, ICONS } from './icons';

describe('icons', () => {
  it('has a defined component for every name in the vocabulary, the gear, and health', () => {
    for (const name of ICON_NAMES) expect(ICONS[name]).toBeDefined();
    expect(GearIcon).toBeDefined();
    expect(HealthIcon).toBeDefined();
  });
});
