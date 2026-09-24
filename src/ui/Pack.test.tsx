// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { balance } from '../balance';
import { newState } from '../engine/queue';
import type { GameState } from '../engine/types';
import { testBook as book } from '../test-utils/book';
import { Pack } from './Pack';

const fresh = (): GameState => newState(book.roster);
const cap = balance.inventory.stackCap;
const shown = (container: HTMLElement) => [...container.querySelectorAll('[data-item]')].map((e) => e.getAttribute('data-item'));

describe('Pack', () => {
  it('lists what is not food, in the order this life acquired it; a key holds one', () => {
    const s = { ...fresh(), acquired: ['pass', 'fish', 'scrap'], inventory: { pass: 1, fish: 3, scrap: 2 } };
    const { container } = render(<Pack state={s} content={book} />);
    expect(shown(container)).toEqual(['pass', 'scrap']);
    expect(container.querySelector('[data-item="pass"]')).toHaveTextContent('1/1');
    expect(container.querySelector('[data-item="scrap"]')).toHaveTextContent(`2/${cap}`);
  });
  it('an item enters only once acquired, however makeable it is', () => {
    const { container } = render(<Pack state={fresh()} content={book} />);
    expect(shown(container)).toEqual([]);
  });
  it('at zero it stays, dimmed, while a row here can make it, and leaves once nothing here can', () => {
    // Port I: salvage makes scrap and the gate makes the pass.
    const port1 = render(<Pack state={{ ...fresh(), acquired: ['scrap', 'pass'] }} content={book} />);
    expect(shown(port1.container)).toEqual(['scrap', 'pass']);
    expect(port1.container.querySelector('[data-item="scrap"]')).toHaveClass('pack__item--zero');
    expect(port1.container.querySelector('[data-item="pass"]')).toHaveClass('pack__item--zero');
    port1.unmount();
    // Past casting off: the pass was dumped and nothing in port II makes it; the wreck there makes scrap.
    const port2 = render(<Pack state={{ ...fresh(), chapter: 1, acquired: ['pass', 'scrap'] }} content={book} />);
    expect(shown(port2.container)).toEqual(['scrap']);
  });
  it('a key whose one-time is done this life no longer counts as makeable here', () => {
    const { container } = render(<Pack state={{ ...fresh(), acquired: ['pass'], completedOneTime: ['gate'] }} content={book} />);
    expect(shown(container)).toEqual([]);
  });
  it('a full stack warns; a held key does not, since holding it is the point', () => {
    const { container } = render(<Pack state={{ ...fresh(), acquired: ['scrap', 'pass'], inventory: { scrap: cap, pass: 1 } }} content={book} />);
    expect(container.querySelector('[data-item="scrap"]')).toHaveClass('pack__item--full');
    expect(container.querySelector('[data-item="pass"]')).not.toHaveClass('pack__item--full');
    expect(screen.getByText('1/1')).toBeInTheDocument();
  });
});
