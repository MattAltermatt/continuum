// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
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
    render(<App book={windwardRun} />);
    for (const name of ['health', 'skill', 'food', 'doing', 'log', 'rates']) {
      expect(screen.getByLabelText(name)).toBeInTheDocument();
    }
    // The operated regions keep their own headings inside their sheets (spec 2026-09-25 section 2).
    for (const [button, region] of [['skills', 'roster'], ['actions', 'chapter'], ['pack', 'pack']] as const) {
      fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${button}`) }));
      expect(within(screen.getByRole('dialog', { name: `${button} sheet` })).getByLabelText(region)).toBeInTheDocument();
    }
  });
  it('every region is a box whose heading starts with its name; the chapter\'s is the book\'s; health has none (spec 2026-09-24-screen-pass 2.4)', () => {
    render(<App book={windwardRun} />);
    for (const name of ['skill', 'roster', 'doing', 'food', 'pack', 'log']) {
      const region = screen.getByLabelText(name);
      expect(region, name).toHaveClass('region');
      expect(region.querySelector('.region__head'), name).toHaveTextContent(new RegExp(`^${name}`));
    }
    expect(screen.getByLabelText('chapter').querySelector('.region__head')).toHaveTextContent(/^The Windward Run/);
    expect(screen.getByLabelText('health')).toHaveClass('region');
    expect(screen.getByLabelText('health').querySelector('.region__head')).toBeNull();
  });
  it('starts live, idle, with a pause control and the run clock at zero', () => {
    const { container } = render(<App book={windwardRun} />);
    expect(screen.getByRole('button', { name: 'pause' })).toBeInTheDocument();
    expect(screen.getByRole('timer', { name: 'run clock' })).toHaveTextContent('00:00');
    expect(container.querySelector('.health .gauge__label')).toHaveTextContent('idle');
  });
  it('reports the tick rate as visually hidden text (the tuning hook, not this test, keeps it off a literal)', () => {
    render(<App book={windwardRun} />);
    expect(screen.getByText(`${ticksPerSecond()} ticks per second`)).toHaveClass('visually-hidden');
  });
  it('the dev handle commits synchronously: a read right after step sees the new state', () => {
    render(<App book={windwardRun} />);
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
    const { container } = render(<App book={windwardRun} />);
    fireEvent.click(screen.getByRole('button', { name: /^actions/ }));
    act(() => { within(screen.getByRole('dialog', { name: 'actions sheet' })).getAllByRole('button', { name: /^add to queue/ })[0]!.click(); });
    expect(container.querySelector('.working')).toBeInTheDocument();
    act(() => { screen.getByRole('button', { name: 'pause' }).click(); });
    expect(container.querySelector('.working')).toBeNull();
    expect(container.querySelector('.health .gauge__label')).toHaveTextContent('paused');
  });
  it('a producer that fills hands over with no stopped frame: the hull runs on the frame the last scrap lands', () => {
    const { container } = render(<App book={windwardRun} />);
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
    const { container } = render(<App book={windwardRun} />);
    const handle = window.continuum!;
    const fresh = newState(windwardRun.roster);
    const state = { ...fresh, paused: 'none' as const, completionCounts: { salvage: balance.automation.unlockRepeatable }, automation: { salvage: 'mid' as const }, queue: [{ id: 0, actionId: 'fish', mode: 'once' as const, by: 'player' as const }], nextEntryId: 1 };
    act(() => handle.dispatch({ type: 'load', model: { state, log: [], nextSeq: 0 } }));
    for (let i = 0; i < 10_000 && (handle.state().completionCounts.fish ?? 0) === 0; i++) act(() => handle.step(1));
    expect(handle.state().queue.map((e) => `${e.actionId}:${e.by}`)).toEqual(['salvage:auto']);
    expect(container.querySelector('.health .gauge__label')).not.toHaveTextContent('idle');
    expect(container.querySelector('.row.working')).toHaveTextContent('drifting scrap');
  }, 30_000);   // steps the real App tick by tick: fast on a laptop, generous for a slow runner
  it('paused, a top that would leave on resume is not lit as where work resumes', () => {
    const { container } = render(<App book={windwardRun} />);
    act(() => { screen.getByRole('button', { name: 'pause' }).click(); });
    act(() => window.continuum!.dispatch({ type: 'queue', actionId: 'hull' }));
    expect(window.continuum!.state().queue.map((e) => e.actionId)).toEqual(['hull']);
    expect(container.querySelector('.entry--on')).toBeNull();
    act(() => window.continuum!.dispatch({ type: 'queue', actionId: 'fish', front: true }));
    expect(container.querySelector('.entry--on')).toHaveTextContent('the cloud shallows');
  });
  it('the bottom bar holds the gear, the run clock and pause; nothing is left of the corner', () => {
    const { container } = render(<App book={windwardRun} />);
    const bar = screen.getByLabelText('bottom bar');
    expect(bar).toBe(container.querySelector('main > .inert-wrap > footer'));
    expect([...bar.querySelectorAll('button[aria-label], [role="timer"]')].map((el) => el.getAttribute('aria-label'))).toEqual(['settings', 'run clock', 'pause']);
    expect(container.querySelector('.corner')).toBeNull();
    const top = container.querySelector('.top')!;
    expect(top.children).toHaveLength(3);
    expect(top.children[0]).toHaveClass('head__line');
    expect(top.children[1]).toHaveClass('health');
    expect(top.children[2]).toHaveClass('rates');
  });
  it('death: the card is up over the chapter, every chunk behind it is inert, and Begin starts life 2', () => {
    const { container } = render(<App book={windwardRun} />);
    const handle = window.continuum!;
    act(() => { handle.dispatch({ type: 'queue', actionId: 'fish' }); handle.step(ticksPerFish); handle.dispatch({ type: 'setHealth', health: 0.001 }); handle.step(1); });
    expect(handle.state().dead).toBe(true);
    expect(handle.state().runTicks).toBe(ticksPerFish + 1);
    expect(handle.state().inventory['cloud-fish']).toBe(1);   // the dead life holds a fish; the next one does not
    const card = screen.getByRole('dialog', { name: 'Life 1 ends' });
    expect(card.parentElement).toHaveClass('veil');
    expect(card.closest('[inert]')).toBeNull();
    for (const name of ['health', 'skill', 'roster', 'chapter', 'doing', 'rates', 'food', 'pack', 'log']) {
      expect(screen.getByLabelText(name).closest('[inert]'), name).not.toBeNull();
    }
    // Every chunk renders the view, the life about to begin, not the dead one (spec 2.4).
    expect(screen.getByRole('timer', { name: 'run clock' })).toHaveTextContent('00:00');
    expect(container.querySelector('.health .gauge__value')).toHaveTextContent('100.0 / 100.0');
    expect(screen.getByLabelText('doing')).toHaveTextContent('doing \u00B7 0');
    expect(screen.getByLabelText('food').querySelectorAll('.food__slot--blank')).toHaveLength(3);   // the next life's pack is empty
    const foodCell = [...screen.getByLabelText('rates').querySelectorAll('.rates__cell')][1]!;
    expect(foodCell).toHaveTextContent('food');
    expect(foodCell.querySelector('b')).toHaveClass('ink-3');   // no larder yet: the food cell is dim, not colour-judged
    expect(screen.queryByRole('button', { name: /^(pause|resume)$/ })).toBeNull();   // no corner control behind the card
    act(() => { screen.getByRole('button', { name: 'Begin life 2' }).click(); });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(handle.state().life).toBe(2);
    expect(handle.state().paused).toBe('none');
    expect(container.querySelector('[inert]')).toBeNull();
  });
  it('the card sits in a veil over the body, above the bottom bar, its button full width', () => {
    render(<App book={windwardRun} />);
    act(() => { window.continuum!.dispatch({ type: 'die' }); });
    const dialog = screen.getByRole('dialog', { name: /Life 1 ends/ });
    expect(dialog.closest('.veil')).not.toBeNull();
    expect(dialog.closest('.body')).not.toBeNull();
    expect(dialog.closest('.veil')).toBe(document.querySelector('.body')!.lastElementChild);
    expect(dialog.closest('[inert]')).toBeNull();
    expect(screen.getByLabelText('doing').closest('[inert]')).not.toBeNull();
    expect(screen.getByLabelText('actions sheet').closest('[inert]')).not.toBeNull();
    expect(screen.getByRole('button', { name: /Begin life 2/ })).toHaveClass('card__begin');
  });
  it('the book finished: the finish card is up in the death card\'s place, and Read again starts the next life at port I', async () => {
    render(<App book={windwardRun} />);
    const handle = window.continuum!;
    const done = { ...newState(windwardRun.roster), dead: true, finished: true, paused: 'system' as const, chapter: 2, runTicks: 600, life: 7 };
    act(() => { handle.dispatch({ type: 'load', model: { state: done, log: [], nextSeq: 0 } }); });
    const card = screen.getByRole('dialog', { name: `${windwardRun.name}, finished` });
    expect(card.parentElement).toHaveClass('veil');
    expect(screen.queryByRole('dialog', { name: /ends$/ })).toBeNull();
    expect(card).toHaveTextContent(windwardRun.actions[windwardRun.finish]!.beat!);
    expect(card).toHaveTextContent('finished 1\u00D7');
    await act(() => realClick(screen.getByRole('button', { name: 'Read again' })));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(handle.state()).toMatchObject({ life: 8, finishes: 1, chapter: 0, dead: false, finished: false, paused: 'none' });
  });
  it('a hurting row that runs puts its hurt on the rates chunk, by its skill', () => {
    render(<App book={windwardRun} />);
    const handle = window.continuum!;
    const hurts = balance.content.windward.pirates.hurts;
    expect(screen.getByLabelText('rates')).not.toHaveTextContent(/fight/);
    // The pirates are on Port Cinder's second page, so the first is built (spec 2026-09-24-pages); then the fight runs.
    act(() => { handle.dispatch({ type: 'load', model: { state: built(handle.state(), 'hull', 'net', 'satchel', 'sails'), log: [], nextSeq: 0 } }); });
    act(() => { handle.dispatch({ type: 'queue', actionId: 'pirates', front: true }); handle.step(1); });
    const rowCell = [...screen.getByLabelText('rates').querySelectorAll('.rates__cell')][2]!;
    expect(rowCell).toHaveTextContent(new RegExp(`fight.*\u2212${hurts.toFixed(2)}`));
    act(() => { screen.getByRole('button', { name: 'pause' }).click(); });
    expect(screen.getByLabelText('rates')).not.toHaveTextContent(/fight/);
  });
  it('on Port Cinder\'s second page the chapter shows that page: its name in the running head, only its rows listed', () => {
    render(<App book={windwardRun} />);
    const handle = window.continuum!;
    act(() => { handle.dispatch({ type: 'load', model: { state: built(handle.state(), 'hull', 'net', 'satchel', 'sails'), log: [], nextSeq: 0 } }); });
    const chapter = screen.getByLabelText('chapter');
    expect(chapter.querySelector('.head__line')).toHaveTextContent(/\u00b7 Pirates!$/);
    const rows = [...chapter.querySelectorAll('button')].map((b) => b.getAttribute('aria-label') ?? '').filter((n) => n.startsWith('add to queue: '));
    expect(rows).toEqual(['add to queue: Fish the cloud shallows', 'add to queue: Fight the harbor pirates']);
  });
  it('an earned chip pressed sets the row\'s automation', async () => {
    render(<App book={windwardRun} />);
    const handle = window.continuum!;
    const earned = { ...newState(windwardRun.roster), paused: 'none' as const, completionCounts: { fish: balance.automation.unlockRepeatable } };
    act(() => { handle.dispatch({ type: 'load', model: { state: earned, log: [], nextSeq: 0 } }); });
    fireEvent.click(screen.getByRole('button', { name: /^actions/ }));
    await act(() => realClick(within(screen.getByRole('dialog', { name: 'actions sheet' })).getByRole('button', { name: /^automation: off, press for JIT/ })));
    expect(handle.state().automation.fish).toBe('jit');
  });
  it('the watched column stacks the skill, food, the queue, then the log; the pack and the chapter are sheets (spec 2026-09-25 section 2)', () => {
    const { container } = render(<App book={windwardRun} />);
    const labels = [...container.querySelectorAll('.watch > [aria-label]')].map((e) => e.getAttribute('aria-label'));
    expect(labels).toEqual(['skill', 'food', 'doing', 'log']);
    expect(screen.getByLabelText('pack').closest('.sheet--pack')).not.toBeNull();
    expect(screen.getByLabelText('chapter').closest('.sheet--actions')).not.toBeNull();
  });
  it('the skill region shows the running skill, keeps the last one while idle, and is the same box, empty, on a fresh run', () => {
    render(<App book={windwardRun} />);
    expect(screen.getByLabelText('skill')).toHaveTextContent('nothing yet');
    const before = screen.getByLabelText('skill').querySelectorAll('.gauge').length;
    expect(before).toBe(2);
    act(() => { window.continuum!.dispatch({ type: 'queue', actionId: 'fish' }); window.continuum!.step(2); });
    expect(screen.getByLabelText('skill')).toHaveTextContent(/Fish/);
    expect(screen.getByLabelText('skill')).not.toHaveTextContent(/last used|nothing yet/);
    expect(screen.getByLabelText('skill').querySelectorAll('.gauge')).toHaveLength(before);
    act(() => { window.continuum!.dispatch({ type: 'remove', entryId: 0 }); });
    expect(screen.getByLabelText('skill')).toHaveTextContent(/last used/);
    expect(screen.getByLabelText('skill')).toHaveTextContent(/Fish/);
    expect(screen.getByLabelText('skill').querySelector('.skill--idle')).not.toBeNull();
  });
  it('one sheet at a time, from the bottom bar; the actions head counts the queue live; jsdom is tier I', () => {
    const { container } = render(<App book={windwardRun} />);
    expect(container.querySelector('.body')).toHaveClass('body--I');
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /^actions/ }));
    const sheet = screen.getByRole('dialog', { name: 'actions sheet' });
    expect(within(sheet).getByText(/doing \u00b7 0/)).toBeInTheDocument();
    fireEvent.click(within(sheet).getByRole('button', { name: 'add to queue: Fish the cloud shallows' }));
    expect(within(sheet).getByText(/doing \u00b7 1/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^actions/ })).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'pack' }));
    expect(screen.queryByRole('dialog', { name: 'actions sheet' })).toBeNull();
    expect(screen.getByRole('dialog', { name: 'pack sheet' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'pack' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('the tab title says idle while the queue is empty and live, and Continuum otherwise', () => {
    render(<App book={windwardRun} />);
    expect(document.title).toBe('Continuum \u00b7 idle');
    act(() => { window.continuum!.dispatch({ type: 'queue', actionId: 'fish' }); });
    expect(document.title).toBe('Continuum');
    act(() => { screen.getByRole('button', { name: 'pause' }).click(); });
    act(() => { window.continuum!.dispatch({ type: 'remove', entryId: 0 }); });
    expect(document.title).toBe('Continuum');   // paused is not idle: nothing to come back for
  });
  it('a card closes an open sheet', () => {
    render(<App book={windwardRun} />);
    fireEvent.click(screen.getByRole('button', { name: 'pack' }));
    expect(screen.getByRole('dialog', { name: 'pack sheet' })).toBeInTheDocument();
    act(() => { window.continuum!.dispatch({ type: 'die' }); });
    expect(screen.queryByRole('dialog', { name: 'pack sheet' })).toBeNull();
  });
  it('the screen cell pops its ledger out on a click; the skills sheet opens from the bar, its band the roster', async () => {
    render(<App book={windwardRun} />);
    act(() => { window.continuum!.dispatch({ type: 'queue', actionId: 'fish' }); window.continuum!.step(1); });
    await act(() => realClick(within(screen.getByLabelText('skill')).getByRole('button')));
    expect(within(screen.getByLabelText('skill')).getByRole('dialog', { name: 'Fish ledger' })).not.toHaveClass('ledger--inline');
    expect(screen.queryByRole('dialog', { name: 'skills sheet' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'skills' }));
    const sheet = screen.getByRole('dialog', { name: 'skills sheet' });
    expect(within(sheet).getByLabelText('roster')).toBeInTheDocument();
    expect(within(sheet).getByText(/fish is running/)).toBeInTheDocument();
  });
  it('the food line is wired to net: short with an empty larder, covered once a fish lands', () => {
    render(<App book={windwardRun} />);
    const handle = window.continuum!;
    const rateCells = () => [...screen.getByLabelText('rates').querySelectorAll('.rates__cell')];
    expect(rateCells()[3]!.querySelector('b')).toHaveClass('hurt-text');   // decay alone, no food yet: net is negative
    act(() => { handle.dispatch({ type: 'queue', actionId: 'fish' }); handle.step(ticksPerFish); });
    expect(handle.state().inventory['cloud-fish']).toBe(1);
    expect(rateCells()[1]!.querySelector('b')).toHaveTextContent(`+${fishCeiling}`);   // the food cell, without its unit
    expect(rateCells()[3]!.querySelector('b')).toHaveClass('heal-text');   // fed: net turns positive
    expect(rateCells()[0]!.querySelector('b')).toHaveTextContent('\u22120.10');   // decay is wired, not only its color
  });
  it('the debug overlay opens on the backquote and its speed group follows the game\'s speed (spec 2026-09-24-screen-pass 5)', () => {
    render(<App book={windwardRun} />);
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
  it('shows no tab card where there is no lock manager (the hook test covers that it plays)', () => {
    render(<App book={windwardRun} />);
    expect(screen.queryByLabelText('open in another tab')).toBeNull();
    expect(screen.queryByLabelText('continued in another tab')).toBeNull();
  });
});
