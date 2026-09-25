// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { HealthBar } from './HealthBar';

describe('HealthBar', () => {
  it('shows the value centered under the bar as "71 / 100"', () => {
    render(<HealthBar health={71.2} max={100} life={1} />);
    expect(document.querySelector('.health__value')!.textContent).toBe('71 / 100');
  });
  it('sizes the fill to the fraction of max and hides the bar from assistive tech', () => {
    const { container } = render(<HealthBar health={25} max={100} life={1} />);
    expect((container.querySelector('.bar__fill') as HTMLElement).style.width).toBe('25%');
    expect(container.querySelector('.bar')).toHaveAttribute('aria-hidden', 'true');
  });
  it('a living player never reads 0', () => {
    render(<HealthBar health={0.5} max={100} life={1} />);
    expect(document.querySelector('.health__value')!.textContent).toBe('1 / 100');
  });
  it('after rebirth a full bar at a fractional maximum reads full, in tenths', () => {
    const { container } = render(<HealthBar health={101.5937} max={101.5937} life={1} />);
    expect(container.querySelector('.health__value')).toHaveTextContent('101.5 / 101.5');
  });
  it('a fill glides across a tick and remounts across a death (spec 2026-09-24-screen-pass 4)', () => {
    const { container, rerender } = render(<HealthBar health={80} max={100} life={1} />);
    const before = container.querySelector('.bar__fill');
    rerender(<HealthBar health={60} max={100} life={1} />);
    expect(container.querySelector('.bar__fill')).toBe(before);
    rerender(<HealthBar health={100} max={100} life={2} />);
    expect(container.querySelector('.bar__fill')).not.toBe(before);
  });
});
