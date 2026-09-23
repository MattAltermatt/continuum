// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { scrub, SCRUB_HEAD, SCRUB_ORDER } from '../data/scrub';
import { newState } from '../engine/queue';
import { ChapterPanel } from './ChapterPanel';

const noop = () => {};

describe('ChapterPanel', () => {
  it('renders the head and the rows in order', () => {
    const { container } = render(<ChapterPanel content={scrub} order={SCRUB_ORDER} head={SCRUB_HEAD} state={newState()} runningActionId={null} onNow={noop} onQueue={noop} />);
    expect(screen.getByText(SCRUB_HEAD.story)).toBeInTheDocument();
    const rows = Array.from(container.querySelectorAll('[data-action]')).map((el) => el.getAttribute('data-action'));
    expect(rows).toEqual([...SCRUB_ORDER]);
  });
  it('keeps a completed one-time row in place, marked built, with inert controls', () => {
    const s = { ...newState(), completedOneTime: ['cabin'] };
    const { container } = render(<ChapterPanel content={scrub} order={SCRUB_ORDER} head={SCRUB_HEAD} state={s} runningActionId={null} onNow={noop} onQueue={noop} />);
    const rows = Array.from(container.querySelectorAll('[data-action]')).map((el) => el.getAttribute('data-action'));
    expect(rows).toEqual([...SCRUB_ORDER]);
    const cabin = container.querySelector('[data-action="cabin"]')!;
    expect(cabin).toHaveClass('row--built');
    expect(cabin).toHaveTextContent('built');
    expect(screen.getByRole('button', { name: 'add to queue: Build a cabin' })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('button', { name: 'do it now: Build a cabin' })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('button', { name: 'do it now: Forage berries' })).not.toHaveAttribute('aria-disabled');
    expect(cabin).not.toHaveTextContent('xp');   // no time or xp for work that is done
    expect(cabin.querySelector('.row__tx')!.textContent).not.toMatch(/\d+(\.\d)?s|\d+:\d\d/);
  });
});
