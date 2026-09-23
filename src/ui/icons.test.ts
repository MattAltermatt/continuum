import { describe, expect, it } from 'vitest';
import { SKILL_IDS } from '../data/types';
import { GearIcon, SKILL_ICONS } from './icons';

describe('icons', () => {
  it('has a defined component for every skill and the gear', () => {
    for (const id of SKILL_IDS) expect(SKILL_ICONS[id]).toBeDefined();
    expect(GearIcon).toBeDefined();
  });
});
