import { describe, expect, it } from 'vitest';
import { BOOKS } from './books';
import { saltRoad } from './salt-road';
import { validateBook } from './validate';

describe('every shipped book', () => {
  it('is valid, and ids are distinct', () => {
    expect(BOOKS).toContain(saltRoad);
    for (const b of BOOKS) expect(validateBook(b)).toEqual([]);
    expect(new Set(BOOKS.map((b) => b.id)).size).toBe(BOOKS.length);
  });
});
