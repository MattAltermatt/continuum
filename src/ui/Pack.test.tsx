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
  it('lists everything carried, food included, in the order this life acquired it; a key holds one', () => {
    const s = { ...fresh(), acquired: ['pass', 'fish', 'scrap'], inventory: { pass: 1, fish: 3, scrap: 2 } };
    const { container } = render(<Pack state={s} content={book} />);
    expect(shown(container)).toEqual(['pass', 'fish', 'scrap']);
    expect(container.querySelector('[data-item="fish"]')).toHaveTextContent(`3/${cap}`);
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
  it('a food row marks what one bite heals beside its name', () => {
    const { container } = render(<Pack state={{ ...fresh(), acquired: ['fish'], inventory: { fish: 2 } }} content={book} />);
    expect(container.querySelector('[data-item="fish"] .pack__hp')).toHaveTextContent(/^\+4 hp$/);
    expect(container.querySelector('[data-item="scrap"] .pack__hp')).toBeNull();
  });
  it('a food enters at the bottom the first time this life acquires it', () => {
    const before = render(<Pack state={{ ...fresh(), acquired: ['scrap'], inventory: { scrap: 1 } }} content={book} />);
    expect(shown(before.container)).toEqual(['scrap']);
    before.unmount();
    const after = render(<Pack state={{ ...fresh(), acquired: ['scrap', 'fish'], inventory: { scrap: 1, fish: 1 } }} content={book} />);
    expect(shown(after.container)).toEqual(['scrap', 'fish']);
  });
  it('a food at zero stays, dimmed, while a row here makes it, and leaves once nothing here can', () => {
    const port1 = render(<Pack state={{ ...fresh(), acquired: ['fish'] }} content={book} />);
    expect(shown(port1.container)).toEqual(['fish']);
    expect(port1.container.querySelector('[data-item="fish"]')).toHaveClass('pack__item--zero');
    port1.unmount();
    // Port II has no fish row.
    const port2 = render(<Pack state={{ ...fresh(), chapter: 1, acquired: ['fish'] }} content={book} />);
    expect(shown(port2.container)).toEqual([]);
  });
  it('a food\'s cap is the shared cap, raised by a capacity row', () => {
    const { container } = render(<Pack state={{ ...fresh(), acquired: ['fish'], inventory: { fish: 3 }, completedOneTime: ['satchel'] }} content={book} />);
    expect(container.querySelector('[data-item="fish"]')).toHaveTextContent(`3/${cap + 5}`);
  });
  it('a stack\'s fill glides as it fills and remounts across a cast-off (spec 2026-09-24-screen-pass 4)', () => {
    const at = (n: number, chapter: number) => ({ ...fresh(), chapter, acquired: ['scrap'], inventory: { scrap: n } });
    const { container, rerender } = render(<Pack state={at(1, 0)} content={book} />);
    const fill = () => container.querySelector('[data-item="scrap"] .bar__fill');
    const before = fill();
    rerender(<Pack state={at(2, 0)} content={book} />);
    expect(fill()).toBe(before);
    rerender(<Pack state={at(2, 1)} content={book} />);
    expect(fill()).not.toBe(before);
  });
  it('a full stack of food warns like any item', () => {
    const { container } = render(<Pack state={{ ...fresh(), acquired: ['fish'], inventory: { fish: cap } }} content={book} />);
    expect(container.querySelector('[data-item="fish"]')).toHaveClass('pack__item--full');
    expect(container.querySelector('[data-item="fish"] .bar__fill')).toHaveClass('bar__fill--warn');
  });
});
