import { describe, expect, it } from 'vitest';
import { balance } from '../balance';
import { BOOKS } from '../data/books';
import { bookHurts } from '../data/derived';
import { provingGround } from '../data/proving-ground';
import { validateBook } from '../data/validate';
import { attentive, handsOn, play, prioritized } from './play';

describe('the proving ground', { timeout: 30_000 }, () => {
  it('is valid, hurts, and is not a shipped book', () => {
    expect(validateBook(provingGround)).toEqual([]);
    expect(bookHurts(provingGround)).toBe(true);
    expect(BOOKS.map((b) => b.id)).not.toContain(provingGround.id);
  });
  it('every measuring player finishes it, touching the game and taking some hurt', () => {
    // A day's bound: the book claims an hour, and a defect comes back as never-finishes in seconds, not 60 days.
    // All three finish in one life: the wasp never completes (it kills on its first working tick), so it never
    // earns a chip and no policy automates it; the boar and the stand are won from full health.
    for (const policy of [attentive, handsOn, prioritized]) {
      const run = play(provingGround, policy, { ...balance.play, maxBookDays: 1 });
      expect(run.outcome, policy.name).toBe('finished');
      expect(run.lives, policy.name).toBe(1);
      // A reading, not tuning: the boar's 61 ticks and the stand's 60, at the book's own literals. It moves with them.
      expect(Math.round(run.hurtShare * run.totalTicks), policy.name).toBe(121);
      expect(run.touchesPerLife, policy.name).toEqual([11]);
    }
  });
  it('sets both overrides: the book counts and one row over them', () => {
    expect(provingGround.automation).toEqual({ unlockRepeatable: 3, unlockOneTime: 2 });
    expect(provingGround.actions.kindling!.unlockAt).toBe(1);
  });
});
