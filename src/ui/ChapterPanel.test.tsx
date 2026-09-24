// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { balance } from '../balance';
import { newState } from '../engine/queue';
import type { GameState } from '../engine/types';
import { testBook as book } from '../test-utils/book';
import { realClick } from '../test-utils/realClick';
import { ChapterPanel } from './ChapterPanel';

const noop = () => {};
const panel = (state: GameState, onAutomate = noop, chapter = 0) =>
  render(<ChapterPanel content={book} book={book.name} chapter={book.chapters[chapter]!} state={state} runningActionId={null} onNow={noop} onQueue={noop} onAutomate={onAutomate} />);
const rows = (container: HTMLElement) => [...container.querySelectorAll('[data-action]')].map((el) => el.getAttribute('data-action'));

describe('ChapterPanel', () => {
  it('renders the port\'s head and its rows in order, and only that port\'s', () => {
    const { container, unmount } = panel(newState(book.roster));
    expect(screen.getByText(book.chapters[0]!.head.story)).toBeInTheDocument();
    expect(rows(container)).toEqual([...book.chapters[0]!.order]);
    unmount();
    const two = panel({ ...newState(book.roster), chapter: 1 }, noop, 1);
    expect(rows(two.container)).toEqual(['eels', 'salvage2', 'vault']);
  });
  it('keeps a completed one-time row in place, marked built, with inert controls', () => {
    const s = { ...newState(book.roster), completedOneTime: ['hull'] };
    const { container } = panel(s);
    expect(rows(container)).toEqual([...book.chapters[0]!.order]);
    const hull = container.querySelector('[data-action="hull"]')!;
    expect(hull).toHaveClass('row--built');
    expect(hull).toHaveTextContent('built');
    expect(screen.getByRole('button', { name: 'add to queue: Rig the hull' })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('button', { name: 'do it now: Rig the hull' })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('button', { name: 'do it now: Fish the shallows' })).not.toHaveAttribute('aria-disabled');
    expect(hull).not.toHaveTextContent('xp');   // no time or xp for work that is done
  });
  it('hands a chip press up with the row and the next mode', async () => {
    const onAutomate = vi.fn();
    panel({ ...newState(book.roster), completionCounts: { fish: balance.automation.unlockRepeatable } }, onAutomate);
    await act(() => realClick(screen.getByRole('button', { name: /^automation: off/ })));
    expect(onAutomate).toHaveBeenCalledWith('fish', 'jit');
  });
});
