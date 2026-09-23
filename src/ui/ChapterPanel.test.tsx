// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { saltRoad } from '../data/salt-road';
import { newState } from '../engine/queue';
import { ChapterPanel } from './ChapterPanel';

const noop = () => {};

describe('ChapterPanel', () => {
  it('renders the head and the rows in order', () => {
    const { container } = render(<ChapterPanel content={saltRoad} book={saltRoad.name} chapter={saltRoad.chapters[0]!} state={newState(saltRoad.roster)} runningActionId={null} onNow={noop} onQueue={noop} />);
    expect(screen.getByText(saltRoad.chapters[0]!.head.story)).toBeInTheDocument();
    const rows = Array.from(container.querySelectorAll('[data-action]')).map((el) => el.getAttribute('data-action'));
    expect(rows).toEqual([...saltRoad.chapters[0]!.order]);
  });
  it('keeps a completed one-time row in place, marked built, with inert controls', () => {
    const s = { ...newState(saltRoad.roster), completedOneTime: ['cabin'] };
    const { container } = render(<ChapterPanel content={saltRoad} book={saltRoad.name} chapter={saltRoad.chapters[0]!} state={s} runningActionId={null} onNow={noop} onQueue={noop} />);
    const rows = Array.from(container.querySelectorAll('[data-action]')).map((el) => el.getAttribute('data-action'));
    expect(rows).toEqual([...saltRoad.chapters[0]!.order]);
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
