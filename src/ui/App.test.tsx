// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { balance } from '../balance';
import { windwardRun } from '../data/windward-run';
import { built } from '../engine/fixture';
import { newState } from '../engine/queue';
import { ticksPerSecond, ticksToSeconds } from '../engine/time';
import { realClick } from '../test-utils/realClick';
import { App } from './App';

const w = balance.content.windward;
/** Ticks to one fish at multiplier 1. Ten 0.1s are 0.999..., so +1. */
const ticksPerFish = Math.floor(w.fish.expCost / balance.skills.baseTickExp) + 1;
/** The food line with one cloud-fish feeding: one bite per cooldown. */
const fishCeiling = (w.cloudFish.healPerUnit / ticksToSeconds(balance.health.foodCooldownTicks)).toFixed(2);

describe('App', () => {
  it('renders every chunk', () => {
    render(<App />);
    for (const name of ['health', 'skills', 'chapter', 'queue', 'rates', 'food', 'pack', 'log']) {
      expect(screen.getByLabelText(name)).toBeInTheDocument();
    }
  });
  it('every region is a box whose heading starts with its name; the chapter\'s is the book\'s; health has none (spec 2026-09-24-screen-pass 2.4)', () => {
    render(<App />);
    for (const name of ['skills', 'queue', 'rates', 'food', 'pack', 'log']) {
      const region = screen.getByLabelText(name);
      expect(region, name).toHaveClass('region');
      expect(region.querySelector('.region__head'), name).toHaveTextContent(new RegExp(`^${name}`));
    }
    expect(screen.getByLabelText('chapter').querySelector('.region__head')).toHaveTextContent(/^The Windward Run/);
    expect(screen.getByLabelText('health')).toHaveClass('region');
    expect(screen.getByLabelText('health').querySelector('.region__head')).toBeNull();
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
      handle.dispatch({ type: 'queue', actionId: 'fish' });
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
  it('a producer that fills hands over with no stopped frame: the hull runs on the frame the last scrap lands', () => {
    const { container } = render(<App />);
    const handle = window.continuum!;
    act(() => { handle.dispatch({ type: 'queue', actionId: 'salvage' }); handle.dispatch({ type: 'queue', actionId: 'hull' }); });
    const cap = balance.inventory.stackCap;
    for (let i = 0; i < 10_000 && (handle.state().inventory.scrap ?? 0) < cap; i++) act(() => handle.step(1));
    // Settled in the same commit: Salvage has already left the top, and the dev handle reads what the screen shows.
    expect(handle.state().inventory.scrap).toBe(cap);
    expect(handle.state().queue.map((e) => e.actionId)).toEqual(['hull']);
    expect(container.querySelector('.row.working')).toHaveTextContent('the hull');
    expect(container.querySelector('.entry.working')).toHaveTextContent('the hull');
  }, 30_000);   // steps the real App tick by tick: fast on a laptop, generous for a slow runner
  it('an empty queue refilled by a priority row hands over with no stopped frame: no idle note, the row runs', () => {
    const { container } = render(<App />);
    const handle = window.continuum!;
    const fresh = newState(windwardRun.roster);
    const state = { ...fresh, paused: 'none' as const, completionCounts: { salvage: balance.automation.unlockRepeatable }, automation: { salvage: 'mid' as const }, queue: [{ id: 0, actionId: 'fish', mode: 'once' as const, by: 'player' as const }], nextEntryId: 1 };
    act(() => handle.dispatch({ type: 'load', model: { state, log: [], nextSeq: 0 } }));
    for (let i = 0; i < 10_000 && (handle.state().completionCounts.fish ?? 0) === 0; i++) act(() => handle.step(1));
    expect(handle.state().queue.map((e) => `${e.actionId}:${e.by}`)).toEqual(['salvage:auto']);
    expect(screen.getByRole('timer', { name: 'run clock' })).not.toHaveTextContent('idle');
    expect(container.querySelector('.row.working')).toHaveTextContent('drifting scrap');
  }, 30_000);   // steps the real App tick by tick: fast on a laptop, generous for a slow runner
  it('paused, a top that would leave on resume is not lit as where work resumes', () => {
    const { container } = render(<App />);
    act(() => { screen.getByRole('button', { name: 'pause' }).click(); });
    act(() => window.continuum!.dispatch({ type: 'queue', actionId: 'hull' }));
    expect(window.continuum!.state().queue.map((e) => e.actionId)).toEqual(['hull']);
    expect(container.querySelector('.entry--on')).toBeNull();
    act(() => window.continuum!.dispatch({ type: 'queue', actionId: 'fish', front: true }));
    expect(container.querySelector('.entry--on')).toHaveTextContent('the cloud shallows');
  });
  it('the bottom bar holds the gear, the run clock and pause; nothing is left of the corner', () => {
    const { container } = render(<App />);
    const bar = screen.getByLabelText('bottom bar');
    expect(bar).toBe(container.querySelector('main > .inert-wrap > footer'));
    expect([...bar.querySelectorAll('button, [role="timer"]')].map((el) => el.getAttribute('aria-label'))).toEqual(['settings', 'run clock', 'pause']);
    expect(container.querySelector('.corner')).toBeNull();
    expect(container.querySelector('.top')?.children).toHaveLength(1);
  });
  it('death: the card is up over the chapter, every chunk behind it is inert, and Begin starts life 2', () => {
    const { container } = render(<App />);
    const handle = window.continuum!;
    act(() => { handle.dispatch({ type: 'queue', actionId: 'fish' }); handle.step(ticksPerFish); handle.dispatch({ type: 'setHealth', health: 0.001 }); handle.step(1); });
    expect(handle.state().dead).toBe(true);
    expect(handle.state().runTicks).toBe(ticksPerFish + 1);
    expect(handle.state().inventory['cloud-fish']).toBe(1);   // the dead life holds a fish; the next one does not
    const card = screen.getByRole('dialog', { name: 'Life 1 ends' });
    expect(card.parentElement).toHaveClass('columns__chapter');
    expect(card.closest('[inert]')).toBeNull();
    for (const name of ['health', 'skills', 'chapter', 'queue', 'rates', 'food', 'pack', 'log']) {
      expect(screen.getByLabelText(name).closest('[inert]'), name).not.toBeNull();
    }
    // Every chunk renders the view, the life about to begin, not the dead one (spec 2.4).
    expect(screen.getByRole('timer', { name: 'run clock' })).toHaveTextContent('00:00');
    expect(container.querySelector('.health__value')).toHaveTextContent('100.0 / 100.0');
    expect(screen.getByLabelText('queue')).toHaveTextContent('queue \u00B7 0');
    expect(screen.getByLabelText('food').querySelector('[data-item="cloud-fish"] .bar__value')).toHaveTextContent(/^none$/);
    expect(container.querySelector('.rates__food--short')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'add to queue: Fish the cloud shallows' })).not.toHaveAttribute('aria-disabled');
    expect(screen.queryByRole('button', { name: /^(pause|resume)$/ })).toBeNull();   // no corner control behind the card
    act(() => { screen.getByRole('button', { name: 'Begin life 2' }).click(); });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(handle.state().life).toBe(2);
    expect(handle.state().paused).toBe('none');
    expect(container.querySelector('[inert]')).toBeNull();
  });
  it('the book finished: the finish card is up in the death card\'s place, and Read again starts the next life at port I', async () => {
    render(<App />);
    const handle = window.continuum!;
    const done = { ...newState(windwardRun.roster), dead: true, finished: true, paused: 'system' as const, chapter: 2, runTicks: 600, life: 7 };
    act(() => { handle.dispatch({ type: 'load', model: { state: done, log: [], nextSeq: 0 } }); });
    const card = screen.getByRole('dialog', { name: `${windwardRun.name}, finished` });
    expect(card.parentElement).toHaveClass('columns__chapter');
    expect(screen.queryByRole('dialog', { name: /ends$/ })).toBeNull();
    expect(card).toHaveTextContent(windwardRun.actions[windwardRun.finish]!.beat!);
    expect(card).toHaveTextContent('finished 1\u00D7');
    await act(() => realClick(screen.getByRole('button', { name: 'Read again' })));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(handle.state()).toMatchObject({ life: 8, finishes: 1, chapter: 0, dead: false, finished: false, paused: 'none' });
  });
  it('a hurting row that runs puts its hurt on the rates chunk, by its skill', () => {
    render(<App />);
    const handle = window.continuum!;
    const hurts = balance.content.windward.pirates.hurts;
    expect(screen.getByLabelText('rates')).not.toHaveTextContent(/fight/);
    // The pirates are on Port Cinder's second page, so the first is built (spec 2026-09-24-pages); then the fight runs.
    act(() => { handle.dispatch({ type: 'load', model: { state: built(handle.state(), 'hull', 'net', 'satchel', 'sails'), log: [], nextSeq: 0 } }); });
    act(() => { handle.dispatch({ type: 'queue', actionId: 'pirates', front: true }); handle.step(1); });
    expect(screen.getByLabelText('rates')).toHaveTextContent(`fight\u2212${hurts.toFixed(2)} hp/s`);
    act(() => { screen.getByRole('button', { name: 'pause' }).click(); });
    expect(screen.getByLabelText('rates')).not.toHaveTextContent(/fight/);
  });
  it('on Port Cinder\'s second page the chapter shows that page: its name in the running head, only its rows listed', () => {
    render(<App />);
    const handle = window.continuum!;
    act(() => { handle.dispatch({ type: 'load', model: { state: built(handle.state(), 'hull', 'net', 'satchel', 'sails'), log: [], nextSeq: 0 } }); });
    const chapter = screen.getByLabelText('chapter');
    expect(chapter.querySelector('.head__line')).toHaveTextContent(/· Pirates!$/);
    const rows = [...chapter.querySelectorAll('button')].map((b) => b.getAttribute('aria-label') ?? '').filter((n) => n.startsWith('add to queue: '));
    expect(rows).toEqual(['add to queue: Fish the cloud shallows', 'add to queue: Fight the harbor pirates']);
  });
  it('an earned chip pressed sets the row\'s automation', async () => {
    render(<App />);
    const handle = window.continuum!;
    const earned = { ...newState(windwardRun.roster), paused: 'none' as const, completionCounts: { fish: balance.automation.unlockRepeatable } };
    act(() => { handle.dispatch({ type: 'load', model: { state: earned, log: [], nextSeq: 0 } }); });
    await act(() => realClick(screen.getByRole('button', { name: /^automation: off, press for JIT/ })));
    expect(handle.state().automation.fish).toBe('jit');
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
  it('the food line is wired to covers: short with an empty larder, covered once a fish lands, and live while working', () => {
    const { container } = render(<App />);
    const handle = window.continuum!;
    expect(container.querySelector('.rates__food--short')).toHaveTextContent('+0.00 hp/s');
    act(() => { handle.dispatch({ type: 'queue', actionId: 'fish' }); handle.step(ticksPerFish); });
    expect(handle.state().inventory['cloud-fish']).toBe(1);
    expect(container.querySelector('.rates__food--covers')).toHaveTextContent(`+${fishCeiling} hp/s`);
    expect(container.querySelector('.rates')).not.toHaveClass('rates--stopped');
    expect(screen.getByLabelText('rates')).toHaveTextContent('\u22120.10 hp/s \u25B2');   // decay is wired, not only its color
  });
  it('the debug overlay opens on the backquote and its speed group follows the game\'s speed (spec 2026-09-24-screen-pass 5)', () => {
    render(<App />);
    expect(screen.queryByRole('dialog', { name: 'debug' })).toBeNull();
    act(() => { fireEvent.keyDown(document, { code: 'Backquote' }); });
    act(() => window.continuum!.speed(10));
    const group = screen.getByRole('group', { name: 'speed' });
    const pressed = () => Array.from(group.querySelectorAll('[aria-pressed="true"]')).map((b) => b.textContent);
    expect(pressed()).toEqual(['\u00D710']);
    // The overlay's own press reaches the hook: App wires onSpeed to setSpeed.
    act(() => { screen.getByRole('button', { name: '\u00D7100' }).click(); });
    expect(pressed()).toEqual(['\u00D7100']);
  });
});
