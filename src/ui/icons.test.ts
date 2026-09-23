import { describe, expect, it } from 'vitest';
import { ICON_NAMES } from '../data/icons';
import { GearIcon, ICONS } from './icons';

describe('icons', () => {
  it('has a defined component for every name in the vocabulary, and the gear', () => {
    for (const name of ICON_NAMES) expect(ICONS[name]).toBeDefined();
    expect(GearIcon).toBeDefined();
  });
});
