// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { balance } from '../balance';
import { testBook } from '../test-utils/book';
import type { Book } from '../data/types';
import { withOrder } from '../engine/fixture';
import { useGame } from './useGame';

const noScrap: Book = { ...testBook, chapters: [withOrder(testBook.chapters[0]!, ['fish', 'hull', 'satchel', 'net', 'gate', 'raid']), testBook.chapters[1]!] };

describe('useGame: the page rule in the log (spec 2026-09-24-pages section 4.2)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('a closer whose page cannot be built leaves with a line naming what it waits on', () => {
    // The raid closes its page; the hull it pulls first lacks scrap, and nothing on this page makes scrap.
    const { result } = renderHook(() => useGame(noScrap));
    act(() => result.current.dispatch({ type: 'queue', actionId: 'raid', front: true }));
    act(() => vi.advanceTimersByTime(balance.time.tickIntervalMs));
    const page = result.current.log.filter((l) => l.event.type === 'popped');
    expect(page.map((l) => l.event)).toEqual([{ type: 'popped', actionId: 'raid', reason: 'page', waits: ['hull', 'satchel', 'net', 'gate'] }]);
    expect(result.current.state.queue).toEqual([]);
  });
});
