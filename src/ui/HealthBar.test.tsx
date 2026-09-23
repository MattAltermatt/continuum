// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { HealthBar } from './HealthBar';

describe('HealthBar', () => {
  it('shows the value centered under the bar as "71 / 100"', () => {
    render(<HealthBar health={71.2} max={100} />);
    expect(document.querySelector('.health__value')!.textContent).toBe('71 / 100');
  });
  it('sizes the fill to the fraction of max and hides the bar from assistive tech', () => {
    const { container } = render(<HealthBar health={25} max={100} />);
    expect((container.querySelector('.bar__fill') as HTMLElement).style.width).toBe('25%');
    expect(container.querySelector('.bar')).toHaveAttribute('aria-hidden', 'true');
  });
  it('a living player never reads 0', () => {
    render(<HealthBar health={0.5} max={100} />);
    expect(document.querySelector('.health__value')!.textContent).toBe('1 / 100');
  });
});
