import { describe, expect, it } from 'vitest';
import { validateBook } from '../data/validate';
import { testBook } from './book';
import { saltRoadFixture } from './salt-road';

describe('test fixtures', () => {
  it('The Salt Road fixture is a valid book in the new format', () => {
    expect(validateBook(saltRoadFixture)).toEqual([]);
  });
  it('testBook is a valid book, and carries what the screen needs: a hurt, a gear row, a second chapter-II row', () => {
    expect(validateBook(testBook)).toEqual([]);
    expect(testBook.actions.raid!.healthRate).toBe(-1);
    expect(Object.values(testBook.actions).some((a) => a.gear !== undefined)).toBe(true);
    expect(testBook.chapters[1]!.pages[0]!.order).toContain('salvage2');
  });
});
