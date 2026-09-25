import { describe, expect, it } from 'vitest';
import { bookHurts } from './derived';
import { windwardRun } from './windward-run';

describe('bookHurts', () => {
  it('is true when any row drains and false when none does, a heal included', () => {
    expect(bookHurts(windwardRun)).toBe(true);
    expect(bookHurts({ actions: { a: { ...windwardRun.actions.fish!, healthRate: 1 } } })).toBe(false);
    expect(bookHurts({ actions: { a: windwardRun.actions.fish! } })).toBe(false);
  });
});
