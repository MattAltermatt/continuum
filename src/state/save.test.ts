import { describe, expect, it } from 'vitest';
import type { Book } from '../data/types';
import { validateBook } from '../data/validate';
import { enqueue, newState } from '../engine/queue';
import { setPaused, step } from '../engine/tick';
import type { GameState } from '../engine/types';
import { testBook } from '../test-utils/book';
import { saltRoadFixture as book } from '../test-utils/salt-road';
import { ASIDE_KEEP, asideText, loadSave, reconcile, SAVE_FORMAT, saveText } from './save';
import type { Model } from './useGame';

/** A mid-run model: a queue with the player's orders and automation's (a supply and a fill), kept work, automation and counters, and a log. */
function midRun(): Model {
  let s: GameState = setPaused(newState(book.roster), 'none');
  s = enqueue(s, book, 'forage');
  s = enqueue(s, book, 'cabin');
  for (let i = 0; i < 30; i++) s = step(s, book);
  const cabin = s.queue.find((e) => e.actionId === 'cabin')!;
  s = enqueue(s, book, 'mine', { by: 'auto', for: cabin.id });
  s = enqueue(s, book, 'forage', { by: 'auto', left: 3 });
  s = { ...s, automation: { forage: 'jit' }, completionCounts: { ...s.completionCounts, forage: 250 }, work: { ...s.work, cabin: { progress: 10, costsConsumed: 1 } } };
  return { state: s, log: [{ seq: 0, at: 0, event: { type: 'lifeBegins', life: 1 } }], nextSeq: 1 };
}

const file = (over: Record<string, unknown>) => JSON.stringify({ format: SAVE_FORMAT, bookId: book.id, bookVersion: book.version, model: midRun(), ...over });

describe('the save', () => {
  it('round-trips a mid-run model, less the stale tick events', () => {
    const run = midRun();
    // The last tick's events, as a save written the tick a completion landed would hold them.
    const m: Model = { ...run, state: { ...run.state, events: [{ type: 'completed', actionId: 'forage', oneTime: false }] } };
    const loaded = loadSave(saveText(m, book), book);
    expect(loaded).toEqual({ kind: 'loaded', model: { ...m, state: { ...m.state, events: [] } } });
  });
  it('round-trips a death-card model', () => {
    const m = midRun();
    const dead: Model = { ...m, state: { ...m.state, dead: true, paused: 'system', health: 0, events: [{ type: 'died', runTicks: m.state.runTicks }] } };
    const loaded = loadSave(saveText(dead, book), book);
    expect(loaded.kind).toBe('loaded');
    expect(loaded.kind === 'loaded' && loaded.model.state.dead).toBe(true);
  });
  it('loads a save from before #77, which has no idleFed, as food going first; a saved turn is kept', () => {
    const m = midRun();
    const { idleFed: _, ...old } = m.state;
    const loaded = loadSave(JSON.stringify({ format: SAVE_FORMAT, bookId: book.id, bookVersion: book.version, model: { ...m, state: old } }), book);
    expect(loaded.kind === 'loaded' && loaded.model.state.idleFed).toBe(false);
    const kept = loadSave(saveText({ ...m, state: { ...m.state, idleFed: true } }, book), book);
    expect(kept.kind === 'loaded' && kept.model.state.idleFed).toBe(true);
  });
  it('none for no text', () => {
    expect(loadSave(null, book)).toEqual({ kind: 'none' });
  });
  it('sets aside another format, another book, and anything corrupt', () => {
    expect(loadSave(file({ format: 99 }), book)).toEqual({ kind: 'aside', why: 'format' });
    expect(loadSave(file({ bookId: 'another' }), book)).toEqual({ kind: 'aside', why: 'book' });
    expect(loadSave('{', book)).toEqual({ kind: 'aside', why: 'corrupt' });
    expect(loadSave('null', book)).toEqual({ kind: 'aside', why: 'corrupt' });
    const m = midRun();
    const bad = (state: Record<string, unknown>, log: unknown = m.log) => JSON.stringify({ format: SAVE_FORMAT, bookId: book.id, bookVersion: 1, model: { ...m, log, state: { ...m.state, ...state } } });
    expect(loadSave(bad({ queue: 'not a list' }), book)).toEqual({ kind: 'aside', why: 'corrupt' });
    expect(loadSave(bad({ queue: [null] }), book)).toEqual({ kind: 'aside', why: 'corrupt' });
    expect(loadSave(bad({ queue: [{ id: 0, actionId: 'forage', mode: 'repeat', by: 'auto', left: 0 }] }), book)).toEqual({ kind: 'aside', why: 'corrupt' });
    // A forced entry (#74) loads; a forced flag that is not true is corrupt.
    expect(loadSave(bad({ queue: [{ id: 0, actionId: 'forage', mode: 'once', by: 'player', forced: 'yes' }], nextEntryId: 1 }), book)).toEqual({ kind: 'aside', why: 'corrupt' });
    expect(loadSave(bad({ queue: [{ id: 0, actionId: 'forage', mode: 'once', by: 'player', forced: true }], nextEntryId: 1 }), book).kind).toBe('loaded');
    expect(loadSave(bad({ skills: { ...m.state.skills, forage: {} } }), book)).toEqual({ kind: 'aside', why: 'corrupt' });
    expect(loadSave(bad({ work: { cabin: { progress: 'x', costsConsumed: 0 } } }), book)).toEqual({ kind: 'aside', why: 'corrupt' });
    expect(loadSave(bad({}, [{ seq: 1, at: 0 }]), book)).toEqual({ kind: 'aside', why: 'corrupt' });
    // From here, each case breaks one field with a value nothing later would trip on: without its own check the save
    // would load silently, so only that check can set it aside. Checks whose bad value would throw later anyway (a list
    // reconcile filters, a null log line) are backed by the catch and are not isolated here.
    const corrupt = { kind: 'aside', why: 'corrupt' };
    for (const k of ['runTicks', 'health', 'maxHealth', 'nextEntryId', 'chapter', 'decayMultiplier', 'life', 'finishes', 'rebirthBonus']) {
      expect(loadSave(bad({ [k]: 'x' }), book), k).toEqual(corrupt);
    }
    const infinite = bad({ runTicks: 7 }).replace('"runTicks":7', '"runTicks":1e999');
    expect(infinite).toContain('1e999');
    expect(loadSave(infinite, book)).toEqual(corrupt);
    for (const k of ['skills', 'skillStats', 'inventory', 'foodCooldowns', 'work', 'completionCounts', 'automation', 'lifeStartCore']) {
      expect(loadSave(bad({ [k]: [] }), book), k).toEqual(corrupt);
    }
    expect(loadSave(bad({ events: 'x' }), book)).toEqual(corrupt);
    expect(loadSave(bad({ dead: 'yes' }), book)).toEqual(corrupt);
    expect(loadSave(bad({ finished: 'yes' }), book)).toEqual(corrupt);
    expect(loadSave(bad({ paused: 0 }), book)).toEqual(corrupt);
    const ledger = { level: 0, exp: 0 };
    expect(loadSave(bad({ skills: { ...m.state.skills, forage: { core: ledger } } }), book)).toEqual(corrupt);
    expect(loadSave(bad({ skills: { ...m.state.skills, forage: { core: { exp: 0 }, run: ledger } } }), book)).toEqual(corrupt);
    expect(loadSave(bad({ skills: { ...m.state.skills, forage: { core: { level: 0 }, run: ledger } } }), book)).toEqual(corrupt);
    expect(loadSave(bad({ work: { cabin: { progress: 1, costsConsumed: 'x' } } }), book)).toEqual(corrupt);
    expect(loadSave(bad({ skillStats: { ...m.state.skillStats, forage: {} } }), book)).toEqual(corrupt);
    expect(loadSave(bad({ skillStats: { ...m.state.skillStats, forage: { ticks: 0 } } }), book)).toEqual(corrupt);
    expect(loadSave(bad({ skillStats: { ...m.state.skillStats, forage: { bestRun: 0 } } }), book)).toEqual(corrupt);
    expect(loadSave(file({ model: { ...m, nextSeq: 'x' } }), book)).toEqual(corrupt);
    // A queue entry, one field at a time; the control shows the entry otherwise loads.
    const entry = { id: 0, actionId: 'forage', mode: 'repeat', by: 'player' };
    expect(loadSave(bad({ queue: [entry] }), book).kind).toBe('loaded');
    expect(loadSave(bad({ queue: [{ ...entry, mode: 'forever' }] }), book)).toEqual(corrupt);
    expect(loadSave(bad({ queue: [{ ...entry, by: 'ghost' }] }), book)).toEqual(corrupt);
    expect(loadSave(bad({ queue: [{ ...entry, id: 'x' }] }), book)).toEqual(corrupt);
    expect(loadSave(bad({ queue: [{ ...entry, actionId: 7 }] }), book)).toEqual(corrupt);
    expect(loadSave(bad({ queue: [{ ...entry, left: 1.5 }] }), book)).toEqual(corrupt);
    expect(loadSave(bad({ queue: [{ ...entry, left: 'x' }] }), book)).toEqual(corrupt);
    // Automation's orders load: a fill with its count, a supply with the order it serves.
    expect(loadSave(bad({ queue: [{ ...entry, by: 'auto', left: 3 }, { ...entry, id: 1, actionId: 'mine', by: 'auto', for: 0 }] }), book).kind).toBe('loaded');
    expect(loadSave(bad({ queue: [{ ...entry, by: 'auto', for: 'x' }] }), book)).toEqual(corrupt);
    // A log line, likewise.
    const line = { seq: 0, at: 0, event: { type: 'lifeBegins', life: 1 } };
    expect(loadSave(bad({}, [line]), book).kind).toBe('loaded');
    expect(loadSave(bad({}, [{ ...line, seq: 'x' }]), book)).toEqual(corrupt);
    expect(loadSave(bad({}, [{ ...line, at: 'x' }]), book)).toEqual(corrupt);
    expect(loadSave(bad({}, [{ ...line, event: { type: 7 } }]), book)).toEqual(corrupt);
  });
  it('reconciles a save from an older version of the book as it loads', () => {
    const run: Model = { state: { ...setPaused(newState(testBook.roster), 'none'), chapter: 1 }, log: [], nextSeq: 0 };
    const [first] = testBook.chapters;
    const onePort: Book = {
      ...testBook,
      version: 2,
      roster: [...testBook.roster, { id: 'sing', name: 'Sing', icon: 'message-circle' }],
      actions: {
        ...Object.fromEntries(Object.entries(testBook.actions).filter(([id]) => first!.pages[0]!.order.includes(id))),
        shanty: { id: 'shanty', verb: 'sing', noun: 'a shanty', expCost: 1, itemCosts: [], isOneTime: false },
      },
      chapters: [{ ...first!, pages: [{ ...first!.pages[0]!, order: [...first!.pages[0]!.order, 'shanty'] }] }],
      finish: first!.pages[0]!.closes,
    };
    expect(validateBook(onePort)).toEqual([]);
    const loaded = loadSave(saveText(run, testBook), onePort);
    expect(loaded.kind).toBe('loaded');
    expect(loaded.kind === 'loaded' && loaded.model.state.chapter).toBe(0);
    expect(loaded.kind === 'loaded' && loaded.model.state.skills.sing).toEqual({ core: { level: 0, exp: 0 }, run: { level: 0, exp: 0 } });
  });
  it('drops log lines naming a row, an item, a maker, a skill, a cause or a port the book no longer has', () => {
    const m = midRun();
    const log = [
      { seq: 4, at: 0, event: { type: 'completed', actionId: 'gone', oneTime: true } },
      { seq: 3, at: 0, event: { type: 'short', actionId: 'cabin', item: 'stone', amount: 1, maker: 'mine', gap: 'blocked', cause: { item: 'stone', maker: 'gone', gap: 'off' } } },
      { seq: 2, at: 0, event: { type: 'castOff', chapter: 7 } },
      { seq: 6, at: 0, event: { type: 'castOff', chapter: -1 } },
      { seq: 5, at: 0, event: { type: 'castOff', chapter: 0.5 } },
      { seq: 1, at: 0, event: { type: 'short', actionId: 'cabin', item: 'nothing', amount: 1, maker: null, gap: 'none' } },
      { seq: 7, at: 0, event: { type: 'coreLevel', skill: 'gone', level: 3 } },
      { seq: 8, at: 0, event: { type: 'short', actionId: 'cabin', item: 'stone', amount: 1, maker: 'gone', gap: 'off' } },
      { seq: 9, at: 0, event: { type: 'short', actionId: 'cabin', item: 'stone', amount: 1, maker: 'mine', gap: 'blocked', cause: { item: 'nothing', maker: 'mine', gap: 'off' } } },
      { seq: 0, at: 0, event: { type: 'lifeBegins', life: 1 } },
    ];
    const loaded = loadSave(JSON.stringify({ format: SAVE_FORMAT, bookId: book.id, bookVersion: 1, model: { ...m, log } }), book);
    expect(loaded.kind === 'loaded' && loaded.model.log.map((l) => l.seq)).toEqual([0]);
  });
  it('keeps the newest three set-aside saves, and one copy of a save set aside twice', () => {
    let aside: string | null = null;
    for (const raw of ['a', 'b', 'c', 'd']) aside = asideText(aside, raw);
    expect(JSON.parse(aside!)).toEqual(['b', 'c', 'd']);
    expect(ASIDE_KEEP).toBe(3);
    expect(JSON.parse(asideText(aside, 'd'))).toEqual(['b', 'c', 'd']);
    expect(JSON.parse(asideText('not json', 'x'))).toEqual(['x']);
  });
});

describe('reconcile', () => {
  it('drops rows and items the book no longer has, adds new roster skills, clamps the chapter', () => {
    const m = midRun();
    const smaller: Book = {
      ...book,
      roster: [...book.roster.filter((r) => r.id !== 'mine'), { id: 'fish', name: 'Fish', icon: 'fishing-rod' }],
      actions: Object.fromEntries(Object.entries(book.actions).filter(([id]) => id !== 'cabin')),
    };
    const state: GameState = { ...m.state, chapter: 9, inventory: { ...m.state.inventory, ghost: 3 }, provisioned: ['cabin', 'forage'] };
    const r = reconcile(state, smaller);
    expect(r.queue.some((e) => e.actionId === 'cabin')).toBe(false);
    expect(r.queue.some((e) => e.actionId === 'forage')).toBe(true);
    expect(r.work.cabin).toBeUndefined();
    expect(r.provisioned).toEqual(['forage']);
    expect(r.inventory.ghost).toBeUndefined();
    expect(Object.keys(r.skills).sort()).toEqual(smaller.roster.map((s) => s.id).sort());
    expect(r.skills.fish).toEqual({ core: { level: 0, exp: 0 }, run: { level: 0, exp: 0 } });
    expect(r.chapter).toBe(smaller.chapters.length - 1);
    expect(r.events).toEqual([]);
  });
  it('a supply whose order the book dropped leaves with it', () => {
    const m = midRun();
    const smaller: Book = { ...book, actions: Object.fromEntries(Object.entries(book.actions).filter(([id]) => id !== 'cabin')) };
    expect(m.state.queue.some((e) => e.for !== undefined)).toBe(true);
    expect(reconcile(m.state, smaller).queue.some((e) => e.for !== undefined)).toBe(false);
  });
  it('a chapter that is not a whole port index from zero becomes port 0', () => {
    // Two ports, so the upper clamp alone would not pull 0.5 down to 0.
    const twoPorts: Book = { ...book, chapters: [book.chapters[0]!, book.chapters[0]!] };
    const m = midRun();
    expect(reconcile({ ...m.state, chapter: 0.5 }, twoPorts).chapter).toBe(0);
    expect(reconcile({ ...m.state, chapter: -1 }, twoPorts).chapter).toBe(0);
    expect(reconcile({ ...m.state, chapter: 1 }, twoPorts).chapter).toBe(1);
  });
});
