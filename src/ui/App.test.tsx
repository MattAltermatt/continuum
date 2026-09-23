// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { ticksPerSecond } from '../engine/time';
import { App } from './App';

describe('App', () => {
  it('renders every chunk', () => {
    render(<App />);
    for (const name of ['health', 'skills', 'chapter', 'queue', 'rates', 'food', 'pack', 'log']) {
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
  it('death: the card is up over the chapter, every chunk behind it is inert, and Begin starts life 2', () => {
    const { container } = render(<App />);
    const handle = window.continuum!;
    act(() => { handle.dispatch({ type: 'queue', actionId: 'forage' }); handle.step(60); handle.dispatch({ type: 'setHealth', health: 0.001 }); handle.step(1); });
    expect(handle.state().dead).toBe(true);
    expect(handle.state().runTicks).toBe(61);   // the dead life's clock reads 00:06
    expect(handle.state().inventory.berries).toBe(1);   // the dead life holds a berry; the next one does not
    const card = screen.getByRole('dialog', { name: 'Life 1 ends' });
    expect(card.parentElement).toHaveClass('columns__chapter');
    expect(card.closest('[inert]')).toBeNull();
    for (const name of ['health', 'skills', 'chapter', 'queue', 'rates', 'food', 'pack', 'log']) {
      expect(screen.getByLabelText(name).closest('[inert]'), name).not.toBeNull();
    }
    // Every chunk renders the view, the life about to begin, not the dead one (spec 2.4).
    expect(screen.getByRole('timer', { name: 'run clock' })).toHaveTextContent('00:00');
    expect(container.querySelector('.health__value')).toHaveTextContent('100.0 / 100.0');
    expect(screen.getByLabelText('queue')).toHaveTextContent('queue · 0');
    expect(screen.getByLabelText('food')).toHaveTextContent('0/20');
    expect(container.querySelector('.rates__food--short')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'add to queue: Forage berries' })).not.toHaveAttribute('aria-disabled');
    expect(screen.queryByRole('button', { name: /^(pause|resume)$/ })).toBeNull();   // no corner control behind the card
    act(() => { screen.getByRole('button', { name: 'Begin life 2' }).click(); });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(handle.state().life).toBe(2);
    expect(handle.state().paused).toBe('none');
    expect(container.querySelector('[inert]')).toBeNull();
  });
  it('the middle column stacks rates, food, pack, then the log (spec 8.6)', () => {
    const { container } = render(<App />);
    const labels = [...container.querySelectorAll('.middle > [aria-label]')].map((e) => e.getAttribute('aria-label'));
    expect(labels).toEqual(['rates', 'food', 'pack', 'log']);
  });
  it('rates dim while the clock is stopped (idle at the start)', () => {
    const { container } = render(<App />);
    expect(container.querySelector('.rates')).toHaveClass('rates--stopped');
  });
  it('the food line is wired to covers: short with an empty larder, covered once a berry lands, and live while working', () => {
    const { container } = render(<App />);
    const handle = window.continuum!;
    expect(container.querySelector('.rates__food--short')).toHaveTextContent('+0.00 hp/s');
    act(() => { handle.dispatch({ type: 'queue', actionId: 'forage' }); handle.step(60); });
    expect(handle.state().inventory.berries).toBe(1);
    expect(container.querySelector('.rates__food--covers')).toHaveTextContent('+0.80 hp/s');
    expect(container.querySelector('.rates')).not.toHaveClass('rates--stopped');
    expect(screen.getByLabelText('rates')).toHaveTextContent('\u22120.10 hp/s \u25B2');   // decay is wired, not only its color
  });
});
