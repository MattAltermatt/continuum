// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BottomBar } from './BottomBar';

const noop = () => {};

describe('BottomBar', () => {
  it('holds the gear, the run clock and pause, in that order, in a labelled footer', () => {
    render(<BottomBar clockSeconds={65} note={null} live={true} card={false} onPause={noop} onResume={noop} onErase={noop} />);
    const bar = screen.getByLabelText('bottom bar');
    expect(bar.tagName).toBe('FOOTER');
    const order = [...bar.querySelectorAll('button, [role="timer"]')].map((el) => el.getAttribute('aria-label'));
    expect(order).toEqual(['settings', 'run clock', 'pause']);
    expect(screen.getByRole('timer', { name: 'run clock' })).toHaveTextContent('01:05');
    expect(screen.getByRole('timer', { name: 'run clock' })).not.toHaveClass('bottom__clock--dim');
  });
  it('a note dims the clock and follows the time; resume shows while paused', () => {
    const onResume = vi.fn();
    render(<BottomBar clockSeconds={0} note="paused" live={false} card={false} onPause={noop} onResume={onResume} onErase={noop} />);
    const timer = screen.getByRole('timer', { name: 'run clock' });
    expect(timer).toHaveTextContent('00:00 paused');
    expect(timer).toHaveClass('bottom__clock--dim');
    screen.getByRole('button', { name: 'resume' }).click();
    expect(onResume).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'pause' })).toBeNull();
  });
  it('behind a card the control\'s box stays as a placeholder and no pause or resume shows', () => {
    const { container } = render(<BottomBar clockSeconds={0} note={null} live={false} card={true} onPause={noop} onResume={noop} onErase={noop} />);
    expect(screen.queryByRole('button', { name: /^(pause|resume)$/ })).toBeNull();
    expect(container.querySelector('.btn--placeholder')).toBeInTheDocument();
  });
});
