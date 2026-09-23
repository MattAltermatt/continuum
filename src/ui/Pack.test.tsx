// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { saltRoad } from '../data/salt-road';
import { newState } from '../engine/queue';
import { Pack } from './Pack';

describe('Pack', () => {
  it('lists materials only: no food, no structures, count/cap centered under a bar; zero is dimmed', () => {
    const s = { ...newState(saltRoad.roster), inventory: { berries: 3, cabin: 1 } };
    const { container } = render(<Pack state={s} content={saltRoad} />);
    expect(container.querySelector('[data-item="berries"]')).toBeNull();
    expect(container.querySelector('[data-item="cabin"]')).toBeNull();
    expect(screen.getByText('0/5')).toBeInTheDocument();
    expect(container.querySelector('[data-item="stone"]')).toHaveClass('pack__item--zero');
  });
  it('a full stack is warn', () => {
    const { container } = render(<Pack state={{ ...newState(saltRoad.roster), inventory: { stone: 5 } }} content={saltRoad} />);
    expect(container.querySelector('[data-item="stone"]')).toHaveClass('pack__item--full');
  });
});
