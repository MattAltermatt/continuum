import { describe, expect, it } from 'vitest';
import type { Book } from '../data/types';
import { windwardRun } from '../data/windward-run';
import { cycleOf } from '../engine/automation';
import { pagedBook } from '../engine/fixture';
import { newState } from '../engine/queue';
import { pageOf } from '../engine/rows';
import { setPaused } from '../engine/tick';
import type { GameState, QueueEntry } from '../engine/types';
import { loadSave, SAVE_FORMAT, saveText } from './save';
import type { Model } from './useGame';

const book: Book = { ...pagedBook, id: 'paged-book', name: 'The Paged Book', version: 1, length: { hours: 30 } };

/** A life with page 1's closer done, so it is on page 2 (the raid). */
function onPageTwo(over: Partial<GameState> = {}): Model {
  const s: GameState = { ...setPaused(newState(book.roster), 'none'), completedOneTime: ['gate'], ...over };
  return { state: s, log: [], nextSeq: 0 };
}

function loaded(m: Model, b: Book = book): Model {
  const r = loadSave(saveText(m, b), b);
  if (r.kind !== 'loaded') throw new Error(`expected a load, got ${JSON.stringify(r)}`);
  return r.model;
}

const withLog = (event: Record<string, unknown>) => {
  const m = onPageTwo();
  return JSON.stringify({ format: SAVE_FORMAT, bookId: book.id, bookVersion: book.version, model: { ...m, log: [{ seq: 0, at: 0, event }], nextSeq: 1 } });
};

describe('the save knows pages (#78)', () => {
  it('a save with page 1 closed loads on page 2', () => {
    const before = onPageTwo({ completedOneTime: [] });
    expect(pageOf(loaded(before).state, book).closes).toBe('gate');
    expect(pageOf(loaded(onPageTwo()).state, book).closes).toBe('raid');
  });
  it('an order for a row page 2 does not list goes, and the supply that served it with it', () => {
    const queue: QueueEntry[] = [
      { id: 0, actionId: 'chop', mode: 'repeat', by: 'player' },
      { id: 1, actionId: 'fish', mode: 'once', by: 'auto', for: 0 },
      { id: 2, actionId: 'salvage', mode: 'repeat', by: 'player' },
    ];
    const m = loaded(onPageTwo({ queue, nextEntryId: 3 }));
    expect(m.state.queue.map((e) => e.id)).toEqual([2]);
    // On page 1 the same queue loads whole.
    expect(loaded(onPageTwo({ queue, nextEntryId: 3, completedOneTime: [] })).state.queue.map((e) => e.id)).toEqual([0, 1, 2]);
  });
  it('a saved JIT on the gate, whose pass only page 2 needs, reads off; a mode still offered stays', () => {
    expect(cycleOf(book, book.actions.gate!)).not.toContain('jit');
    const m = loaded(onPageTwo({ automation: { gate: 'jit', fish: 'top' } }));
    expect(m.state.automation.gate ?? 'off').toBe('off');
    expect(m.state.automation.fish).toBe('top');
  });
  it('a malformed page turn or page pop reads corrupt; well-formed ones load', () => {
    const corrupt = { kind: 'aside', why: 'corrupt' };
    expect(loadSave(withLog({ type: 'pageTurn', chapter: 0, page: 'x' }), book)).toEqual(corrupt);
    expect(loadSave(withLog({ type: 'pageTurn', chapter: -1, page: 1 }), book)).toEqual(corrupt);
    expect(loadSave(withLog({ type: 'pageTurn', chapter: 0, page: 0.5 }), book)).toEqual(corrupt);
    expect(loadSave(withLog({ type: 'pageTurn', page: 1 }), book)).toEqual(corrupt);
    expect(loadSave(withLog({ type: 'popped', actionId: 'chop', reason: 'page' }), book)).toEqual(corrupt);
    expect(loadSave(withLog({ type: 'popped', actionId: 'chop', reason: 'page', waits: [3] }), book)).toEqual(corrupt);
    const turn = loadSave(withLog({ type: 'pageTurn', chapter: 0, page: 1 }), book);
    expect(turn.kind === 'loaded' && turn.model.log.map((l) => l.event)).toEqual([{ type: 'pageTurn', chapter: 0, page: 1 }]);
    const pop = loadSave(withLog({ type: 'popped', actionId: 'chop', reason: 'page', waits: ['gate'] }), book);
    expect(pop.kind === 'loaded' && pop.model.log.length).toBe(1);
  });
  it('a page turn past the pages this book has, or a pop waiting on a row it lacks, is dropped, as a castOff is', () => {
    const past = loadSave(withLog({ type: 'pageTurn', chapter: 0, page: 2 }), book);
    expect(past.kind === 'loaded' && past.model.log).toEqual([]);
    const noPort = loadSave(withLog({ type: 'pageTurn', chapter: book.chapters.length, page: 0 }), book);
    expect(noPort.kind === 'loaded' && noPort.model.log).toEqual([]);
    const gone = loadSave(withLog({ type: 'popped', actionId: 'chop', reason: 'page', waits: ['gone'] }), book);
    expect(gone.kind === 'loaded' && gone.model.log).toEqual([]);
  });
  it('the Windward Run: at the Hollow Isle with the wardens done, the save loads on the inner halls', () => {
    const s: GameState = { ...setPaused(newState(windwardRun.roster), 'none'), chapter: 1, completedOneTime: ['wardens'] };
    const m = loaded({ state: s, log: [], nextSeq: 0 }, windwardRun);
    expect(pageOf(m.state, windwardRun).name).toBe('The inner halls');
  });
});
