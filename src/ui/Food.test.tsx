// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { balance } from '../balance';
import type { Book } from '../data/types';
import { newState } from '../engine/queue';
import { ticksToSeconds } from '../engine/time';
import type { GameState } from '../engine/types';
import { testBook as book } from '../test-utils/book';
import { Food } from './Food';

const fresh = (): GameState => newState(book.roster);
const cap = balance.inventory.stackCap;
const shown = (container: HTMLElement) => [...container.querySelectorAll('[data-item]')].map((e) => e.getAttribute('data-item'));

describe('Food', () => {
  it('each food: name, what one bite heals, an ember cooldown bar, and the countdown under it', () => {
    // The ticks that make 3.2 s at the tick rate, never a literal.
    const cd = Math.round(3.2 / ticksToSeconds(1));
    const { container } = render(<Food state={{ ...fresh(), inventory: { fish: 3 }, foodCooldowns: { fish: cd } }} content={book} />);
    expect(screen.getByLabelText('food')).toBeInTheDocument();
    expect(screen.getByText('+4 hp')).toBeInTheDocument();
    expect(container.querySelector('[data-item="fish"] .bar__value')).toHaveTextContent(/^3\.2s$/);
    const fill = container.querySelector('[data-item="fish"] .food__cooldown .bar__fill');
    expect(fill).toHaveClass('bar__fill--run');
    expect(fill).toHaveStyle({ width: `${(cd / balance.health.foodCooldownTicks) * 100}%` });
  });
  it('ready when the cooldown is spent and some is on hand', () => {
    const { container } = render(<Food state={{ ...fresh(), inventory: { fish: 1 }, foodCooldowns: { fish: 0 } }} content={book} />);
    expect(container.querySelector('[data-item="fish"] .bar__value')).toHaveTextContent(/^ready$/);
    expect(container.querySelector('[data-item="fish"]')).not.toHaveClass('food__item--none');
  });
  it('the stack is the pack\'s to show: no n/cap under the food bar', () => {
    const { container } = render(<Food state={{ ...fresh(), inventory: { fish: 3 } }} content={book} />);
    expect(container.querySelector('[data-item="fish"]')).not.toHaveTextContent(`3/${cap}`);
  });
  it('smallest heal first, whatever order the book declares them in', () => {
    const { fish, eel, ...rest } = book.items;
    const eelFirst: Book = { ...book, items: { eel: eel!, fish: fish!, ...rest } };
    const { container } = render(<Food state={{ ...fresh(), chapter: 1, inventory: { fish: 2 } }} content={eelFirst} />);
    expect(shown(container)).toEqual(['fish', 'eel']);
  });
  it('a food shows while there is some on hand or a row in this port makes it', () => {
    const port1 = render(<Food state={fresh()} content={book} />);
    expect(shown(port1.container)).toEqual(['fish']);
    port1.unmount();
    const carried = render(<Food state={{ ...fresh(), inventory: { eel: 2 } }} content={book} />);
    expect(shown(carried.container)).toEqual(['fish', 'eel']);
    carried.unmount();
    // Port II has no fish row: an empty fish stack leaves, the eel runs make eel.
    const port2 = render(<Food state={{ ...fresh(), chapter: 1 }} content={book} />);
    expect(shown(port2.container)).toEqual(['eel']);
  });
  it('eaten as it lands is still feeding: zero on hand with a running cooldown is not loud', () => {
    const { container } = render(<Food state={{ ...fresh(), foodCooldowns: { fish: 10 } }} content={book} />);
    expect(container.querySelector('[data-item="fish"]')).not.toHaveClass('food__item--none');
    expect(container.querySelector('[data-item="fish"] .bar__value')).not.toHaveTextContent('none');
    expect(screen.queryByText('nothing to eat')).toBeNull();
  });
  it('zero food and no bite in the last cooldown: the row reads none, dimmed, and the heading says "nothing to eat"', () => {
    const { container } = render(<Food state={fresh()} content={book} />);
    expect(container.querySelector('[data-item="fish"]')).toHaveClass('food__item--none');
    expect(container.querySelector('[data-item="fish"] .bar__value')).toHaveTextContent(/^none$/);
    expect(screen.getByText('nothing to eat')).toBeInTheDocument();
  });
  it('the cooldown fill glides as it refills and remounts across a death (spec 2026-09-24-screen-pass 4)', () => {
    const cd = balance.health.foodCooldownTicks;
    const at = (left: number, life: number): GameState => ({ ...fresh(), life, inventory: { fish: 3 }, foodCooldowns: { fish: left } });
    const { container, rerender } = render(<Food state={at(cd, 1)} content={book} />);
    const fill = () => container.querySelector('[data-item="fish"] .food__cooldown .bar__fill');
    const before = fill();
    rerender(<Food state={at(cd - 1, 1)} content={book} />);
    expect(fill()).toBe(before);
    rerender(<Food state={at(0, 2)} content={book} />);
    expect(fill()).not.toBe(before);
  });
});
