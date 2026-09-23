// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { ticksPerSecond } from '../engine/time';
import { App } from './App';

describe('App', () => {
  it('renders every chunk', () => {
    render(<App />);
    for (const name of ['health', 'skills', 'chapter', 'queue', 'pack', 'log']) {
      expect(screen.getByLabelText(name)).toBeInTheDocument();
    }
  });
  it('starts live, idle, with a pause control and the run clock at zero', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: 'pause' })).toBeInTheDocument();
    expect(screen.getByRole('timer', { name: 'run clock' })).toHaveTextContent('00:00');
    expect(screen.getByRole('timer', { name: 'run clock' })).toHaveTextContent('idle');
  });
  it('reports the tick rate as visually hidden text (the tuning hook, not this test, keeps it off a literal)', () => {
    render(<App />);
    expect(screen.getByText(`${ticksPerSecond()} ticks per second`)).toHaveClass('visually-hidden');
  });
  it('the dev handle commits synchronously: a read right after step sees the new state', () => {
    render(<App />);
    const handle = window.continuum!;
    // Outside act on purpose: Chrome drives the handle with no test harness to flush React.
    // Without flushSync this reads 0. (The layout effect keeps the ref current within the
    // commit; React also flushes passive effects after a sync commit, so this test does not pin it.)
    const env = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };
    const before = env.IS_REACT_ACT_ENVIRONMENT;
    env.IS_REACT_ACT_ENVIRONMENT = false;
    try {
      handle.dispatch({ type: 'queue', actionId: 'forage' });
      handle.step(3);
      expect(handle.state().runTicks).toBe(3);
    } finally {
      env.IS_REACT_ACT_ENVIRONMENT = before;
    }
  });
  it('queued work shows the sheen while live, and none of it while paused', () => {
    const { container } = render(<App />);
    act(() => { screen.getAllByRole('button', { name: /^add to queue/ })[0]!.click(); });
    expect(container.querySelector('.working')).toBeInTheDocument();
    act(() => { screen.getByRole('button', { name: 'pause' }).click(); });
    expect(container.querySelector('.working')).toBeNull();
    expect(screen.getByRole('timer', { name: 'run clock' })).toHaveTextContent('paused');
  });
  it('death: an alert under the health bar, no pause or resume, and the rows take no more orders', () => {
    const { container } = render(<App />);
    const handle = window.continuum!;
    act(() => { handle.dispatch({ type: 'queue', actionId: 'forage' }); handle.dispatch({ type: 'setHealth', health: 0.001 }); handle.step(1); });
    expect(handle.state().dead).toBe(true);
    expect(screen.getByRole('alert')).toHaveTextContent(/^Dead at 00:00/);
    expect(container.querySelector('.top__health .dead')).toBeInTheDocument();   // overlays the health chunk, out of the flow
    expect(screen.queryByRole('button', { name: 'pause' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'resume' })).toBeNull();
    const queue = handle.state().queue;
    act(() => { screen.getAllByRole('button', { name: /^add to queue/ })[1]!.click(); });
    expect(handle.state().queue).toEqual(queue);
    for (const b of screen.getAllByRole('button', { name: /^(do it now|add to queue|remove)/ })) expect(b).toHaveAttribute('aria-disabled', 'true');
  });
});
