// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { balance } from '../balance';
import type { Book } from '../data/types';
import { newState } from '../engine/queue';
import { ticksToSeconds } from '../engine/time';
import type { GameState } from '../engine/types';
import { testBook as book } from '../test-utils/book';
import { Food, FOOD_SLOTS } from './Food';

const fresh = (): GameState => newState(book.roster);
const cap = balance.inventory.stackCap;
const shown = (container: HTMLElement) => [...container.querySelectorAll('[data-item]')].map((e) => e.getAttribute('data-item'));

describe('Food', () => {
  it('each food on hand: name and one bite\'s heal, then a gauge whose bar is the ember cooldown, its label the countdown, its value on hand / stack', () => {
    // The ticks that make 3.2 s at the tick rate, never a literal.
    const cd = Math.round(3.2 / ticksToSeconds(1));
    const { container } = render(<Food state={{ ...fresh(), inventory: { fish: 3 }, foodCooldowns: { fish: cd } }} content={book} />);
    expect(screen.getByLabelText('food')).toBeInTheDocument();
    expect(screen.getByText('+4 hp')).toBeInTheDocument();
    const g = container.querySelector('[data-item="fish"] .gauge')!;
    expect(g.querySelector('.gauge__label')).toHaveTextContent(/^3\.2s$/);
    expect(g.querySelector('.gauge__value')).toHaveTextContent(`3/${cap}`);
    const fill = g.querySelector('.bar__fill');
    expect(fill).toHaveClass('bar__fill--run');
    expect(fill).toHaveStyle({ width: `${(cd / balance.health.foodCooldownTicks) * 100}%` });
  });
  it('ready when the cooldown is spent and some is on hand', () => {
    const { container } = render(<Food state={{ ...fresh(), inventory: { fish: 1 }, foodCooldowns: { fish: 0 } }} content={book} />);
    expect(container.querySelector('[data-item="fish"] .gauge__label')).toHaveTextContent(/^ready$/);
  });
  it('is three slots: nothing on hand is three blank slots and nothing to eat', () => {
    const { container } = render(<Food state={fresh()} content={book} />);
    expect(container.querySelectorAll('.food__slot')).toHaveLength(FOOD_SLOTS);
    expect(container.querySelectorAll('[data-item]')).toHaveLength(0);
    expect(container.querySelectorAll('.food__slot--blank')).toHaveLength(FOOD_SLOTS);
    // A blank slot is a row with blank lines, so it is a filled row's height (spec 2026-09-25 section 5, rigidity).
    expect(container.querySelectorAll('.food__slot--blank .gauge')).toHaveLength(FOOD_SLOTS);
    const lines = container.querySelectorAll('.food__slot--blank .food__name, .food__slot--blank .gauge__label, .food__slot--blank .gauge__value');
    expect(lines).toHaveLength(3 * FOOD_SLOTS);
    for (const el of lines) expect(el.textContent).toBe('\u00a0');
    expect(screen.getByText('nothing to eat')).toBeInTheDocument();
  });
  it('the note counts the foods on hand, and the other slots stay blank', () => {
    const { container } = render(<Food state={{ ...fresh(), inventory: { fish: 2 } }} content={book} />);
    expect(screen.getByText('1 to eat')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-item]')).toHaveLength(1);
    expect(container.querySelectorAll('.food__slot--blank')).toHaveLength(FOOD_SLOTS - 1);
  });
  it('only food on hand shows, maker or no maker: a fish row on the page does not list an empty fish stack; an eel carried in does', () => {
    const port1 = render(<Food state={fresh()} content={book} />);
    expect(shown(port1.container)).toEqual([]);
    port1.unmount();
    const carried = render(<Food state={{ ...fresh(), inventory: { eel: 2 } }} content={book} />);
    expect(shown(carried.container)).toEqual(['eel']);
  });
  it('smallest heal first, whatever order the book declares them in', () => {
    const { fish, eel, ...rest } = book.items;
    const eelFirst: Book = { ...book, items: { eel: eel!, fish: fish!, ...rest } };
    const { container } = render(<Food state={{ ...fresh(), inventory: { fish: 2, eel: 1 } }} content={eelFirst} />);
    expect(shown(container)).toEqual(['fish', 'eel']);
  });
  it('a fourth food on hand is not shown; the first three in eating order are', () => {
    const food = (id: string, heal: number) => ({ id, name: id, kind: 'food' as const, healPerUnit: heal });
    const four: Book = { ...book, items: { ...book.items, a: food('a', 1), b: food('b', 2), c: food('c', 99) } };
    const { container } = render(<Food state={{ ...fresh(), inventory: { a: 1, b: 1, c: 1, fish: 1 } }} content={four} />);
    expect(shown(container)).toEqual(['a', 'b', 'fish']);
    expect(container.querySelectorAll('.food__slot--blank')).toHaveLength(0);
    expect(screen.getByText('4 to eat')).toBeInTheDocument();   // the fourth still feeds the player
  });
  it('eaten as it lands is still feeding: zero on hand with a running cooldown is not loud', () => {
    render(<Food state={{ ...fresh(), foodCooldowns: { fish: 10 } }} content={book} />);
    expect(screen.queryByText('nothing to eat')).toBeNull();
  });
  it('the cooldown fill glides as it refills and remounts across a death (spec 2026-09-24-screen-pass 4)', () => {
    const cd = balance.health.foodCooldownTicks;
    const at = (left: number, life: number): GameState => ({ ...fresh(), life, inventory: { fish: 3 }, foodCooldowns: { fish: left } });
    const { container, rerender } = render(<Food state={at(cd, 1)} content={book} />);
    const fill = () => container.querySelector('[data-item="fish"] .gauge .bar__fill');
    const before = fill();
    rerender(<Food state={at(cd - 1, 1)} content={book} />);
    expect(fill()).toBe(before);
    rerender(<Food state={at(0, 2)} content={book} />);
    expect(fill()).not.toBe(before);
  });
});
