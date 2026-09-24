import { describe, expect, it } from 'vitest';
import type { StartBlock } from '../engine/queue';
import { testBook as book } from '../test-utils/book';
import { narrate } from './narrate';
import { words } from './words';

describe('narrate', () => {
  it('a short pop reads "{Row} stops: " and then the row\'s own words', () => {
    const block: StartBlock = { kind: 'short', item: 'scrap', amount: 8, maker: 'salvage', gap: 'off' };
    const line = narrate({ type: 'short', actionId: 'hull', item: 'scrap', amount: 8, maker: 'salvage', gap: 'off' }, book);
    expect(line).toEqual({ kind: 'note', text: `Rig the hull stops: ${words(book, block)}` });
    expect(line.text).toBe('Rig the hull stops: needs 8 scrap \u00B7 Salvage scrap automation is off');
  });
  it('every kind of short reads as the row does: unearned, nothing makes it, a blocked chain with its cause', () => {
    expect(narrate({ type: 'short', actionId: 'hull', item: 'scrap', amount: 8, maker: 'salvage', gap: 'unearned' }, book).text)
      .toBe('Rig the hull stops: needs 8 scrap \u00B7 Salvage scrap automation is not yet earned \u00B7 earn it by hand');
    expect(narrate({ type: 'short', actionId: 'hull', item: 'scrap', amount: 8, maker: null, gap: 'none' }, book).text)
      .toBe('Rig the hull stops: nothing here makes scrap');
    const cause = { item: 'scrap', maker: 'salvage', gap: 'unearned' as const };
    const text = narrate({ type: 'short', actionId: 'raid', item: 'pass', amount: 1, maker: 'gate', gap: 'blocked', cause }, book).text;
    expect(text).toBe(`Fight the raid stops: ${words(book, { kind: 'short', item: 'pass', amount: 1, maker: 'gate', gap: 'blocked', cause })}`);
    expect(text).toBe('Fight the raid stops: needs a pass \u00B7 Fight the gate can\'t run: needs scrap \u00B7 Salvage scrap automation is not yet earned \u00B7 earn it by hand');
  });
  it('casting off names the port now entered; the finish and an earned chip are notes', () => {
    expect(narrate({ type: 'castOff', chapter: 1 }, book)).toEqual({ kind: 'note', text: 'Port II \u00B7 Two' });
    expect(narrate({ type: 'finished', runTicks: 600 }, book)).toEqual({ kind: 'note', text: 'The book is finished' });
    expect(narrate({ type: 'unlocked', actionId: 'salvage' }, book)).toEqual({ kind: 'note', text: 'Salvage scrap can now be automated' });
  });
  it('writes a note per remaining kind, and a story line for a one-time with a beat', () => {
    expect(narrate({ type: 'lifeBegins', life: 1 }, book)).toEqual({ kind: 'note', text: 'Life 1 begins' });
    expect(narrate({ type: 'saveAside', why: 'corrupt' }, book)).toEqual({ kind: 'note', text: 'An old save was set aside' });
    expect(narrate({ type: 'completed', actionId: 'raid', oneTime: true }, book)).toEqual({ kind: 'story', text: book.actions.raid!.beat });
    expect(narrate({ type: 'completed', actionId: 'fish', oneTime: false }, book)).toEqual({ kind: 'note', text: 'Fish the shallows is done' });
    expect(narrate({ type: 'coreLevel', skill: 'fish', level: 3 }, book)).toEqual({ kind: 'note', text: 'Fish reaches Lv 3' });
    expect(narrate({ type: 'died', runTicks: 600 }, book)).toEqual({ kind: 'note', text: 'Dead at 01:00' });
    // An event from a later format is a plain note, never a throw or a blank line.
    expect(narrate({ type: 'somethingNew' } as never, book)).toEqual({ kind: 'note', text: 'somethingNew' });
  });
});
