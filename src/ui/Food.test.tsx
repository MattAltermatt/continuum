// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { balance } from '../balance';
import type { Book } from '../data/types';
import { newState } from '../engine/queue';
import type { GameState } from '../engine/types';
import { testBook as book } from '../test-utils/book';
import { Food } from './Food';

const fresh = (): GameState => newState(book.roster);
const cap = balance.inventory.stackCap;
const shown = (container: HTMLElement) => [...container.querySelectorAll('[data-item]')].map((e) => e.getAttribute('data-item'));

describe('Food', () => {
  it('each food: name, what one bite heals, a cooldown bar, and count/cap under it', () => {
    const cd = balance.health.foodCooldownTicks / 2;
    const { container } = render(<Food state={{ ...fresh(), inventory: { fish: 3 }, foodCooldowns: { fish: cd } }} content={book} />);
    expect(screen.getByLabelText('food')).toBeInTheDocument();
    expect(screen.getByText('+4 hp')).toBeInTheDocument();
    expect(screen.getByText(`3/${cap}`)).toBeInTheDocument();
    expect(container.querySelector('[data-item="fish"] .food__cooldown .bar__fill')).toHaveStyle({ width: '50%' });
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
  it('the cap is the shared cap, raised by a capacity row', () => {
    render(<Food state={{ ...fresh(), inventory: { fish: 3 }, completedOneTime: ['satchel'] }} content={book} />);
    expect(screen.getByText(`3/${cap + 5}`)).toBeInTheDocument();
  });
  it('eaten as it lands is still feeding: zero on hand with a running cooldown is not loud', () => {
    const { container } = render(<Food state={{ ...fresh(), foodCooldowns: { fish: 10 } }} content={book} />);
    expect(container.querySelector('[data-item="fish"]')).not.toHaveClass('food__item--empty');
    expect(screen.queryByText('nothing to eat')).toBeNull();
  });
  it('zero food and no bite in the last cooldown is the one loud moment: a hurt border and "nothing to eat"', () => {
    const { container } = render(<Food state={fresh()} content={book} />);
    expect(container.querySelector('[data-item="fish"]')).toHaveClass('food__item--empty');
    expect(screen.getByText('nothing to eat')).toBeInTheDocument();
  });
  it('a full stack is warn', () => {
    const { container } = render(<Food state={{ ...fresh(), inventory: { fish: cap } }} content={book} />);
    expect(container.querySelector('[data-item="fish"]')).toHaveClass('food__item--full');
  });
});
