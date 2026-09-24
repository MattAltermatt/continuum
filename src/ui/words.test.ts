import { describe, expect, it } from 'vitest';
import { balance } from '../balance';
import { windwardRun as book } from '../data/windward-run';
import { newState, startBlock, type StartBlock } from '../engine/queue';
import { testBook } from '../test-utils/book';
import { words } from './words';

const N = balance.automation.unlockRepeatable;
const short = (s: Omit<Extract<StartBlock, { kind: 'short' }>, 'kind'>): StartBlock => ({ kind: 'short', ...s });

describe('words', () => {
  it('off: what is needed, then the maker named by its row', () => {
    expect(words(book, short({ item: 'scrap', amount: 3, maker: 'salvage', gap: 'off' })))
      .toBe('needs 3 scrap \u00B7 Salvage drifting scrap automation is off');
  });
  it('unearned: with the maker\'s n/N when the counts are given, without when they are not', () => {
    const block = short({ item: 'scrap', amount: 3, maker: 'salvage', gap: 'unearned' });
    expect(words(book, block, { counts: { salvage: 120 } })).toBe(`needs 3 scrap \u00B7 Salvage drifting scrap automation is not yet earned (120/${N}) \u00B7 earn it by hand`);
    expect(words(book, block, { counts: {} })).toBe(`needs 3 scrap \u00B7 Salvage drifting scrap automation is not yet earned (0/${N}) \u00B7 earn it by hand`);
    expect(words(book, block)).toBe('needs 3 scrap \u00B7 Salvage drifting scrap automation is not yet earned \u00B7 earn it by hand');
  });
  it('none: nothing here makes it, and nothing else', () => {
    expect(words(book, short({ item: 'scrap', amount: 3, maker: null, gap: 'none' }))).toBe('nothing here makes scrap');
  });
  it('blocked with a cause: the maker cannot run, then the cause\'s own item and maker and its own gap', () => {
    const block = short({ item: 'varros-table', amount: 1, maker: 'salons', gap: 'blocked', cause: { item: 'chips', maker: 'dealers', gap: 'off' } });
    expect(words(book, block)).toBe('needs Varro\'s table \u00B7 Search the salons can\'t run: needs chips \u00B7 Talk to the dealers automation is off');
  });
  it('a deep cause says it is further down the line: the maker itself lacks something else', () => {
    const block = short({ item: 'varros-table', amount: 1, maker: 'salons', gap: 'blocked', cause: { item: 'chips', maker: 'dealers', gap: 'off', deep: true } });
    expect(words(book, block)).toBe('needs Varro\'s table \u00B7 Search the salons can\'t run: further down, needs chips \u00B7 Talk to the dealers automation is off');
    const none = short({ item: 'varros-table', amount: 1, maker: 'salons', gap: 'blocked', cause: { item: 'chips', maker: null, gap: 'none', deep: true } });
    expect(words(book, none)).toBe('needs Varro\'s table \u00B7 Search the salons can\'t run: further down, nothing here makes chips');
  });
  it('a cause that is unearned carries its own fraction; a cause nothing makes names only the item', () => {
    const unearned = short({ item: 'star-chart', amount: 1, maker: 'halls', gap: 'blocked', cause: { item: 'inner-door', maker: 'wardens', gap: 'unearned' } });
    const n = balance.automation.unlockOneTime;
    expect(words(book, unearned, { counts: { wardens: 3 } }))
      .toBe(`needs the star chart \u00B7 Search the halls can't run: needs the inner door \u00B7 Fight the wardens automation is not yet earned (3/${n}) \u00B7 earn it by hand`);
    const none = short({ item: 'canape', amount: 2, maker: 'kitchens', gap: 'blocked', cause: { item: 'chips', maker: null, gap: 'none' } });
    expect(words(book, none)).toBe('needs 2 canap\u00E9s \u00B7 Talk to the kitchens can\'t run: nothing here makes chips');
  });
  it('blocked without a cause (a cycle): the maker cannot run, and no more', () => {
    expect(words(book, short({ item: 'scrap', amount: 2, maker: 'salvage', gap: 'blocked' }))).toBe('needs 2 scrap \u00B7 Salvage drifting scrap can\'t run');
  });
  it('an amount of 1 takes the name of one unit where the book gives one', () => {
    expect(words(book, short({ item: 'chips', amount: 1, maker: 'dealers', gap: 'off' }))).toBe('needs 1 chip \u00B7 Talk to the dealers automation is off');
    expect(words(book, short({ item: 'chips', amount: 15, maker: 'dealers', gap: 'off' }))).toBe('needs 15 chips \u00B7 Talk to the dealers automation is off');
    expect(words(book, short({ item: 'scrap', amount: 1, maker: 'salvage', gap: 'off' }))).toBe('needs 1 scrap \u00B7 Salvage drifting scrap automation is off');
  });
  it('a key is named without its amount', () => {
    const text = words(book, short({ item: 'star-chart', amount: 1, maker: 'halls', gap: 'off' }));
    expect(text).toBe('needs the star chart \u00B7 Search the halls automation is off');
    expect(text).not.toMatch(/\d/);
  });
  it('full and enough', () => {
    expect(words(book, { kind: 'full', item: 'scrap' })).toBe('scrap is full');
    expect(words(book, { kind: 'enough', item: 'scrap' })).toBe('scrap: enough for what is queued');
  });
  it('the waiting look is the reason alone, after "waits: "', () => {
    const block = short({ item: 'scrap', amount: 8, maker: 'salvage', gap: 'unearned' });
    expect(words(book, block, { counts: { salvage: 120 }, waiting: true })).toBe(`waits: Salvage drifting scrap automation is not yet earned (120/${N}) \u00B7 earn it by hand`);
    expect(words(book, short({ item: 'scrap', amount: 8, maker: 'salvage', gap: 'off' }), { waiting: true })).toBe('waits: Salvage drifting scrap automation is off');
    expect(words(book, short({ item: 'scrap', amount: 8, maker: null, gap: 'none' }), { waiting: true })).toBe('waits: nothing here makes scrap');
  });
  it('writes what the engine reports: at the Fortune with nothing built, Varro names the first thing a hand can do', () => {
    const s = { ...newState(book.roster), chapter: 2 };
    const block = startBlock(s, book, 'varro');
    expect(block).toEqual({ kind: 'short', item: 'varros-table', amount: 1, maker: 'salons', gap: 'blocked', cause: { item: 'chips', maker: 'dealers', gap: 'unearned', deep: true } });
    expect(words(book, block!, { counts: s.completionCounts }))
      .toBe(`needs Varro's table \u00B7 Search the salons can't run: further down, needs chips \u00B7 Talk to the dealers automation is not yet earned (0/${N}) \u00B7 earn it by hand`);
  });
  it('writes what the engine reports: a fresh life\'s hull is short of scrap and its maker has no chip', () => {
    const s = newState(testBook.roster);
    const block = startBlock(s, testBook, 'hull');
    expect(block).toEqual({ kind: 'short', item: 'scrap', amount: 8, maker: 'salvage', gap: 'unearned' });
    expect(words(testBook, block!, { counts: s.completionCounts })).toBe(`needs 8 scrap \u00B7 Salvage scrap automation is not yet earned (0/${N}) \u00B7 earn it by hand`);
  });
});
