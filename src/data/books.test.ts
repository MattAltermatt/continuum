import { describe, expect, it } from 'vitest';
import { BOOKS } from './books';
import { windwardRun } from './windward-run';
import { validateBook } from './validate';

describe('every shipped book', () => {
  it('is valid, and ids are distinct', () => {
    expect(BOOKS).toContain(windwardRun);
    for (const b of BOOKS) expect(validateBook(b)).toEqual([]);
    expect(new Set(BOOKS.map((b) => b.id)).size).toBe(BOOKS.length);
  });
});
