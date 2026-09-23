// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { scrub } from '../data/scrub';
import { newState } from '../engine/queue';
import { Pack } from './Pack';

describe('Pack', () => {
  it('lists materials and food, not structures, with count/cap centered under a bar; a material at zero is dimmed', () => {
    const s = { ...newState(), inventory: { berries: 3, cabin: 1 } };
    const { container } = render(<Pack state={s} content={scrub} />);
    expect(screen.getByText('3/20')).toBeInTheDocument();
    expect(screen.getByText('0/5')).toBeInTheDocument();
    expect(container.querySelector('[data-item="cabin"]')).toBeNull();
    expect(container.querySelector('[data-item="stone"]')).toHaveClass('pack__item--zero');
    expect(screen.queryByText('nothing to eat')).toBeNull();
  });
  it('food at zero is the one loud moment: a hurt border and "nothing to eat" (spec 8.6)', () => {
    const { container } = render(<Pack state={newState()} content={scrub} />);
    expect(container.querySelector('[data-item="berries"]')).toHaveClass('pack__item--empty');
    expect(container.querySelector('[data-item="berries"]')).not.toHaveClass('pack__item--zero');
    expect(screen.getByText('nothing to eat')).toBeInTheDocument();
  });
  it('a full stack is warn', () => {
    const { container } = render(<Pack state={{ ...newState(), inventory: { stone: 5 } }} content={scrub} />);
    expect(container.querySelector('[data-item="stone"]')).toHaveClass('pack__item--full');
  });
  it('food shows what one bite heals', () => {
    render(<Pack state={newState()} content={scrub} />);
    expect(screen.getByText('+4 hp')).toBeInTheDocument();
  });
});
