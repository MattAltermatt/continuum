// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Gauge } from './Gauge';

describe('Gauge', () => {
  it('draws the bar on the left and the label over the value on the right, clamping the fill', () => {
    const { container } = render(<Gauge pct={140} fill="run" resetKey={1} label="18s" value="0.5/60.0" />);
    const fill = container.querySelector('.bar__fill') as HTMLElement;
    expect(fill).toHaveClass('bar__fill--run');
    expect(fill.style.width).toBe('100%');
    expect(container.querySelector('.gauge__label')).toHaveTextContent('18s');
    expect(container.querySelector('.gauge__value')).toHaveTextContent('0.5/60.0');
  });
  it('a tone colours the label; a tall gauge is the health bar', () => {
    const { container } = render(<Gauge pct={10} fill="hp" resetKey={1} label="idle" value="31 / 100" tone="warn" tall />);
    expect(container.querySelector('.gauge')).toHaveClass('gauge--tall');
    expect(container.querySelector('.gauge__label')).toHaveClass('gauge__label--warn');
    expect(screen.getByText('31 / 100')).toBeInTheDocument();
  });
  it('a changed resetKey remounts the fill (a reset jumps, spec 2026-09-24-screen-pass 4); an unchanged one keeps it', () => {
    const { container, rerender } = render(<Gauge pct={80} fill="core" resetKey={0} label="" value="" />);
    const before = container.querySelector('.bar__fill');
    rerender(<Gauge pct={60} fill="core" resetKey={0} label="" value="" />);
    expect(container.querySelector('.bar__fill')).toBe(before);
    rerender(<Gauge pct={0} fill="core" resetKey={1} label="" value="" />);
    expect(container.querySelector('.bar__fill')).not.toBe(before);
  });
});
