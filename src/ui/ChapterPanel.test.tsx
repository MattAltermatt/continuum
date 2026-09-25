// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { balance } from '../balance';
import { newState } from '../engine/queue';
import type { GameState } from '../engine/types';
import { windwardRun } from '../data/windward-run';
import { pagedTestBook, testBook as book } from '../test-utils/book';
import { realClick } from '../test-utils/realClick';
import { ChapterPanel } from './ChapterPanel';

const noop = () => {};
const N = balance.automation.unlockRepeatable;
const panel = (state: GameState, runningActionId: string | null = null, onAutomate = noop, chapter = 0) =>
  render(<ChapterPanel content={book} book={book.name} chapter={book.chapters[chapter]!} page={book.chapters[chapter]!.pages[0]!} state={state} runningActionId={runningActionId} onNow={noop} onQueue={noop} onAutomate={onAutomate} />);
const rows = (container: HTMLElement) => [...container.querySelectorAll('[data-action]')].map((el) => el.getAttribute('data-action'));

describe('ChapterPanel', () => {
  it('renders the port\'s head and its rows in order, and only that port\'s', () => {
    const { container, unmount } = panel(newState(book.roster));
    expect(screen.getByText(book.chapters[0]!.head.story)).toBeInTheDocument();
    expect(rows(container)).toEqual([...book.chapters[0]!.pages[0]!.order]);
    unmount();
    const two = panel({ ...newState(book.roster), chapter: 1 }, null, noop, 1);
    expect(rows(two.container)).toEqual(['eels', 'salvage2', 'vault']);
  });
  it('keeps a completed one-time row in place, marked built, with inert controls', () => {
    const s = { ...newState(book.roster), completedOneTime: ['hull'] };
    const { container } = panel(s);
    expect(rows(container)).toEqual([...book.chapters[0]!.pages[0]!.order]);
    const hull = container.querySelector('[data-action="hull"]')!;
    expect(hull).toHaveClass('row--built');
    expect(hull).toHaveTextContent('built');
    expect(screen.getByRole('button', { name: 'add to queue: Rig the hull' })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('button', { name: 'do it now: Rig the hull' })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('button', { name: 'do it now: Fish the shallows' })).not.toHaveAttribute('aria-disabled');
    expect(hull).toHaveTextContent('+8.0 xp');   // built keeps its list; no time for work that is done
  });
  it('the running head names the page the life is on, and the rows are that page\'s (spec 2026-09-24-pages)', () => {
    const ch = pagedTestBook.chapters[0]!;
    const at = (page: number) => render(<ChapterPanel content={pagedTestBook} book={pagedTestBook.name} chapter={ch} page={ch.pages[page]!} state={newState(book.roster)} runningActionId={null} onNow={noop} onQueue={noop} onAutomate={noop} />);
    const one = at(0);
    expect(one.container.querySelector('.head__line')).toHaveTextContent('I \u00B7 One \u00B7 Fitting out');
    one.unmount();
    const two = at(1);
    expect(two.container.querySelector('.head__line')).toHaveTextContent('I \u00B7 One \u00B7 The raid');
    expect(rows(two.container)).toEqual(['fish', 'raid']);
  });
  it('on The Windward Run, a new life reads I \u00B7 Port Cinder \u00B7 Fitting out; an unnamed page shows no third part', () => {
    const ch = windwardRun.chapters[0]!;
    const one = render(<ChapterPanel content={windwardRun} book={windwardRun.name} chapter={ch} page={ch.pages[0]!} state={newState(windwardRun.roster)} runningActionId={null} onNow={noop} onQueue={noop} onAutomate={noop} />);
    expect(one.container.querySelector('.head__line')).toHaveTextContent('I \u00B7 Port Cinder \u00B7 Fitting out');
    one.unmount();
    const two = panel(newState(book.roster));
    expect(two.container.querySelector('.head__line')).toHaveTextContent(/I \u00B7 One$/);
  });
  it('hands a chip press up with the row and the next mode', async () => {
    const onAutomate = vi.fn();
    panel({ ...newState(book.roster), completionCounts: { fish: balance.automation.unlockRepeatable } }, null, onAutomate);
    await act(() => realClick(screen.getByRole('button', { name: /^automation: off/ })));
    expect(onAutomate).toHaveBeenCalledWith('fish', 'jit');
  });
  it('a receded row that cannot start says it waits: the chip dashed, the words in its name (spec 2026-09-25 section 7)', () => {
    const s = { ...newState(book.roster), automation: { hull: 'high' as const }, completionCounts: { hull: balance.automation.unlockOneTime, salvage: 120 } };
    panel(s);
    const chip = document.querySelector('.row--auto .auto--btn')!;
    expect(chip).toHaveClass('auto--waits');
    expect(chip).toHaveAccessibleName(/^automation: high, press for off; waits: Salvage/);
    panel({ ...s, inventory: { scrap: 16 } });
    expect(document.querySelectorAll('.row--auto .auto--waits')).toHaveLength(1);   // the first render's, still mounted; the fed one is not dashed
  });
  it('chipped rows recede to a line under automated \u00B7 n; a chipped row that runs stays there, lit', () => {
    const s = { ...newState(book.roster), automation: { fish: 'jit' as const }, completionCounts: { fish: N } };
    const { rerender } = panel(s);
    expect(screen.getByText(/automated \u00B7 1/)).toBeInTheDocument();
    const receded = document.querySelector('.row--auto')!;
    expect(receded).toHaveTextContent(new RegExp(`Fish.*\u00D7${N}`));
    expect(receded.querySelector('.auto--lit')).not.toBeNull();
    rerender(<ChapterPanel content={book} book={book.name} chapter={book.chapters[0]!} page={book.chapters[0]!.pages[0]!} state={s} runningActionId="fish" onNow={vi.fn()} onQueue={vi.fn()} onAutomate={vi.fn()} />);
    expect(document.querySelector('.row--auto')).toHaveClass('working');
    expect(document.querySelectorAll('.row:not(.row--auto)[data-action="fish"]')).toHaveLength(0);
  });
  it('the chip on a receded line turns the row off', () => {
    const onAutomate = vi.fn();
    panel({ ...newState(book.roster), automation: { fish: 'jit' as const }, completionCounts: { fish: N } }, null, onAutomate);
    fireEvent.click(document.querySelector('.row--auto .auto')!);
    expect(onAutomate).toHaveBeenCalledWith('fish', 'off');
  });
});
