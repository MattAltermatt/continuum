// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { scrub } from '../data/scrub';
import { newState } from '../engine/queue';
import { Pack } from './Pack';

describe('Pack', () => {
  it('lists materials only: no food, no structures, count/cap centered under a bar; zero is dimmed', () => {
    const s = { ...newState(), inventory: { berries: 3, cabin: 1 } };
    const { container } = render(<Pack state={s} content={scrub} />);
    expect(container.querySelector('[data-item="berries"]')).toBeNull();
    expect(container.querySelector('[data-item="cabin"]')).toBeNull();
    expect(screen.getByText('0/5')).toBeInTheDocument();
    expect(container.querySelector('[data-item="stone"]')).toHaveClass('pack__item--zero');
  });
  it('a full stack is warn', () => {
    const { container } = render(<Pack state={{ ...newState(), inventory: { stone: 5 } }} content={scrub} />);
    expect(container.querySelector('[data-item="stone"]')).toHaveClass('pack__item--full');
  });
});
