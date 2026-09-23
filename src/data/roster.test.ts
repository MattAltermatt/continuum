import { describe, expect, it } from 'vitest';
import { ICON_NAMES } from './icons';
import { skillOf } from './roster';
import type { Content } from './types';

const content: Pick<Content, 'roster'> = {
  roster: [{ id: 'forage', name: 'Forage', icon: 'sprout' }, { id: 'mine', name: 'Mine', icon: 'pickaxe' }],
};

describe('the icon vocabulary', () => {
  it('is a closed list of plain names with no duplicates', () => {
    expect(ICON_NAMES.length).toBeGreaterThan(0);
    expect(new Set(ICON_NAMES).size).toBe(ICON_NAMES.length);
    for (const n of ICON_NAMES) expect(n).toMatch(/^[a-z][a-z-]*$/);
  });
});

describe('skillOf', () => {
  it('finds a roster entry by id', () => {
    expect(skillOf(content, 'mine')).toEqual({ id: 'mine', name: 'Mine', icon: 'pickaxe' });
  });
  it('throws on an id the roster does not have: a validated book never asks', () => {
    expect(() => skillOf(content, 'chop')).toThrow(/chop/);
  });
});
