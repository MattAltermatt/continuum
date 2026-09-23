// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { balance } from '../balance';
import { scrub } from '../data/scrub';
import { newState } from '../engine/queue';
import { Food } from './Food';

describe('Food', () => {
  it('each food: name, what one bite heals, a cooldown bar, and count/cap under it', () => {
    const cd = balance.health.foodCooldownTicks / 2;
    const { container } = render(<Food state={{ ...newState(), inventory: { berries: 6 }, foodCooldowns: { berries: cd } }} content={scrub} />);
    expect(screen.getByLabelText('food')).toBeInTheDocument();
    expect(screen.getByText('+4 hp')).toBeInTheDocument();
    expect(screen.getByText('6/20')).toBeInTheDocument();
    expect(container.querySelector('[data-item="berries"] .food__cooldown .bar__fill')).toHaveStyle({ width: '50%' });
  });
  it('a ready food has an empty cooldown bar', () => {
    const { container } = render(<Food state={{ ...newState(), inventory: { berries: 6 } }} content={scrub} />);
    expect(container.querySelector('[data-item="berries"] .food__cooldown .bar__fill')).toHaveStyle({ width: '0%' });
  });
  it('eaten as it lands is still feeding: zero on hand with a running cooldown is not loud', () => {
    const { container } = render(<Food state={{ ...newState(), foodCooldowns: { berries: 10 } }} content={scrub} />);
    expect(container.querySelector('[data-item="berries"]')).not.toHaveClass('food__item--empty');
    expect(screen.queryByText('nothing to eat')).toBeNull();
  });
  it('zero food and no bite in the last cooldown is the one loud moment: a hurt border and "nothing to eat"', () => {
    const { container } = render(<Food state={newState()} content={scrub} />);
    expect(container.querySelector('[data-item="berries"]')).toHaveClass('food__item--empty');
    expect(screen.getByText('nothing to eat')).toBeInTheDocument();
  });
  it('a full stack is warn', () => {
    const { container } = render(<Food state={{ ...newState(), inventory: { berries: 20 } }} content={scrub} />);
    expect(container.querySelector('[data-item="berries"]')).toHaveClass('food__item--full');
  });
});
