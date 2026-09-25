// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { BottomBar } from './BottomBar';

const noop = () => {};

describe('BottomBar', () => {
  it('holds the gear, the run clock and pause, in that order, in a labelled footer', () => {
    render(<BottomBar clockSeconds={65} live={true} card={false} onPause={noop} onResume={noop} onErase={noop} docked />);
    const bar = screen.getByLabelText('bottom bar');
    expect(bar.tagName).toBe('FOOTER');
    const order = [...bar.querySelectorAll('button, [role="timer"]')].map((el) => el.getAttribute('aria-label'));
    expect(order).toEqual(['settings', 'run clock', 'pause']);
    expect(screen.getByRole('timer', { name: 'run clock' })).toHaveTextContent('01:05');
  });
  it('paused: resume in pause\'s place, and a press resumes', () => {
    const onResume = vi.fn(), onPause = vi.fn();
    render(<BottomBar clockSeconds={0} live={false} card={false} onPause={onPause} onResume={onResume} onErase={noop} />);
    expect(screen.queryByRole('button', { name: 'pause' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'resume' }));
    expect(onResume).toHaveBeenCalledTimes(1);
    expect(onPause).not.toHaveBeenCalled();
  });
  it('behind a card the control\'s box stays as a placeholder and no pause or resume shows', () => {
    const { container } = render(<BottomBar clockSeconds={0} live={false} card={true} onPause={noop} onResume={noop} onErase={noop} />);
    expect(screen.queryByRole('button', { name: /^(pause|resume)$/ })).toBeNull();
    expect(container.querySelector('.btn--placeholder')).toBeInTheDocument();
  });
  it('three sheet buttons; the open one is expanded; actions carries its count and the nudge', () => {
    const onSheet = vi.fn();
    render(<BottomBar clockSeconds={0} live card={false} onPause={noop} onResume={noop} onErase={noop} sheet="actions" onSheet={onSheet} actionsCount={4} nudge docked={false} />);
    expect(screen.getByRole('button', { name: /actions/ })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: /actions/ })).toHaveTextContent('4');
    expect(screen.getByRole('button', { name: /actions/ })).toHaveClass('qbtn--waits');
    fireEvent.click(screen.getByRole('button', { name: 'skills' }));
    expect(onSheet).toHaveBeenCalledWith('skills');
    fireEvent.click(screen.getByRole('button', { name: /actions/ }));
    expect(onSheet).toHaveBeenCalledWith(null);
  });
  it('docked: no sheet buttons, but their box stays, so pause keeps its own track', () => {
    const { container } = render(<BottomBar clockSeconds={0} live card={false} onPause={noop} onResume={noop} onErase={noop} sheet={null} onSheet={noop} actionsCount={4} nudge={false} docked />);
    expect(screen.queryByRole('button', { name: 'skills' })).toBeNull();
    const btns = container.querySelector('.btns')!;
    expect(btns).toBeInTheDocument();
    expect(btns.children).toHaveLength(0);
    expect(btns.nextElementSibling).toHaveAttribute('aria-label', 'pause');
  });
  it('behind a card the three are placeholders, as pause is', () => {
    render(<BottomBar clockSeconds={0} live={false} card onPause={noop} onResume={noop} onErase={noop} sheet={null} onSheet={noop} actionsCount={4} nudge={false} docked={false} />);
    expect(screen.queryByRole('button', { name: 'skills' })).toBeNull();
    expect(document.querySelectorAll('.qbtn--placeholder')).toHaveLength(3);
  });
});
