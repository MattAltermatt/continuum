// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { balance } from '../balance';
import { saltRoad } from '../data/salt-road';
import { enqueue, newState } from '../engine/queue';
import { ticksPerSecond } from '../engine/time';
import type { GameState } from '../engine/types';
import { ActionRow, owedShortfalls } from './ActionRow';
import { duration } from './format';
import { STOP } from './glyphs';

const cabin = saltRoad.actions.cabin!;
const forage = saltRoad.actions.forage!;
const noop = () => {};
const row = (state: GameState, action = cabin, running = false) =>
  render(<ActionRow action={action} content={saltRoad} state={state} running={running} onNow={noop} onQueue={noop} />);

describe('owedShortfalls', () => {
  it('owes the whole recipe when not queued, and is short by what the pack lacks', () => {
    expect(owedShortfalls(cabin, saltRoad, { ...newState(saltRoad.roster), inventory: { stone: 2 } })).toEqual([{ item: 'stone', owed: 6, have: 2, atCap: false }]);
  });
  it('owes only what a queued entry has not consumed yet', () => {
    const queued = enqueue(newState(saltRoad.roster), saltRoad, 'cabin');
    const s = { ...queued, inventory: { stone: 1 }, queue: [{ ...queued.queue[0]!, costsConsumed: 5 }] };
    expect(owedShortfalls(cabin, saltRoad, s)).toEqual([]);
    expect(owedShortfalls(cabin, saltRoad, { ...s, inventory: {} })).toEqual([{ item: 'stone', owed: 1, have: 0, atCap: false }]);
  });
  it('a stack at its cap is still short when the recipe needs more, and says it is at the cap', () => {
    const cap = saltRoad.items.stone!.cap;
    expect(owedShortfalls(cabin, saltRoad, { ...newState(saltRoad.roster), inventory: { stone: cap } })).toEqual([{ item: 'stone', owed: 6, have: cap, atCap: true }]);
  });
});

describe('ActionRow', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('reads verb, noun, inputs, output, time and xp (xp is the expCost)', () => {
    row({ ...newState(saltRoad.roster), inventory: { stone: 6 } });   // a state past the cap, so no warning mark joins the text
    expect(screen.getByText('Build')).toBeInTheDocument();
    expect(screen.getByText('a cabin')).toBeInTheDocument();
    expect(screen.getByText('6 stone')).toBeInTheDocument();
    expect(screen.getByText('cabin')).toBeInTheDocument();
    expect(screen.getByText(duration(cabin.expCost / (balance.skills.baseTickExp * ticksPerSecond())))).toBeInTheDocument();
    expect(screen.getByText(`+${cabin.expCost.toFixed(1)} xp`)).toBeInTheDocument();
  });
  it('the row time is at the current multiplier: Build core 10, run 5 is x1.575, so the cabin takes 38s', () => {
    const skilled = { ...newState(saltRoad.roster), inventory: { stone: 6 } };
    const s = { ...skilled, skills: { ...skilled.skills, build: { core: { level: 10, exp: 0 }, run: { level: 5, exp: 0 } } } };
    row(s);
    expect(screen.getByText('38s')).toBeInTheDocument();
  });
  it('a harvest row collapses its empty input slot', () => {
    row(newState(saltRoad.roster), forage);
    expect(screen.getByText('+1 berries')).toBeInTheDocument();
    expect(screen.queryByText(/have/)).not.toBeInTheDocument();
  });
  it('warns on a short input with "have n", including at the cap', () => {
    const short = row({ ...newState(saltRoad.roster), inventory: { stone: 2 } });
    expect(screen.getByText('have 2')).toBeInTheDocument();
    short.unmount();
    row({ ...newState(saltRoad.roster), inventory: { stone: 5 } });
    expect(screen.getByText('have 5')).toBeInTheDocument();
  });
  it('a partly consumed queued entry shows what it still owes, and the warning agrees with the instruction', () => {
    const queued = enqueue(newState(saltRoad.roster), saltRoad, 'cabin');
    const s = { ...queued, queue: [{ ...queued.queue[0]!, costsConsumed: 5, stalled: true }] };
    render(<ActionRow action={cabin} content={saltRoad} state={s} running={false} onNow={noop} onQueue={noop} />);
    expect(screen.getByText(/1 of 6 stone/)).toBeInTheDocument();
    expect(screen.getByText('have 0')).toBeInTheDocument();
    act(() => { screen.getByRole('button', { name: /^add to queue/ }).click(); });
    expect(screen.getByText(/missing 1 stone/)).toBeInTheDocument();
  });
  it('at the cap the instruction does not send the player to the producer', () => {
    render(<ActionRow action={cabin} content={saltRoad} state={{ ...newState(saltRoad.roster), inventory: { stone: 5 } }} running={false} onNow={noop} onQueue={noop} />);
    act(() => { screen.getByRole('button', { name: /^add to queue/ }).click(); });
    expect(screen.getByText(/missing 1 stone/)).toBeInTheDocument();
    expect(screen.getByText('Mine more as it builds')).toBeInTheDocument();
  });
  it('the instruction is a snapshot: it holds even if the input lands during the hold', () => {
    const { rerender } = render(<ActionRow action={cabin} content={saltRoad} state={{ ...newState(saltRoad.roster), inventory: { stone: 4 } }} running={false} onNow={noop} onQueue={noop} />);
    act(() => { screen.getByRole('button', { name: /^add to queue/ }).click(); });
    rerender(<ActionRow action={cabin} content={saltRoad} state={{ ...newState(saltRoad.roster), inventory: { stone: 5 } }} running={false} onNow={noop} onQueue={noop} />);
    expect(screen.getByText(/missing 2 stone/)).toBeInTheDocument();
  });
  it('on click with a shortfall, the middle chunk says what is owed and who makes it, then fades back', () => {
    const onQueue = vi.fn();
    render(<ActionRow action={cabin} content={saltRoad} state={newState(saltRoad.roster)} running={false} onNow={noop} onQueue={onQueue} />);
    act(() => { screen.getByRole('button', { name: /^add to queue/ }).click(); });
    expect(onQueue).toHaveBeenCalledWith('cabin');
    expect(screen.getByText(/missing 6 stone/)).toBeInTheDocument();
    expect(screen.getByText('Mine some!')).toBeInTheDocument();
    act(() => { vi.runAllTimers(); });
    expect(screen.queryByText(/missing/)).not.toBeInTheDocument();
  });
  it('no instruction when nothing is owed', () => {
    render(<ActionRow action={forage} content={saltRoad} state={newState(saltRoad.roster)} running={false} onNow={noop} onQueue={noop} />);
    act(() => { screen.getByRole('button', { name: /^do it now/ }).click(); });
    expect(screen.queryByText(/missing/)).not.toBeInTheDocument();
  });
  it('the running row shows a stop square that does nothing, on the same button, so focus survives', () => {
    const onNow = vi.fn();
    const { rerender } = render(<ActionRow action={forage} content={saltRoad} state={newState(saltRoad.roster)} running={false} onNow={onNow} onQueue={noop} />);
    const play = screen.getByRole('button', { name: /^do it now/ });
    play.focus();
    rerender(<ActionRow action={forage} content={saltRoad} state={newState(saltRoad.roster)} running={true} onNow={onNow} onQueue={noop} />);
    const mark = screen.getByRole('button', { name: /^running/ });
    expect(mark).toBe(play);
    expect(document.activeElement).toBe(mark);
    expect(mark).toHaveAttribute('aria-disabled', 'true');
    expect(mark).toHaveTextContent(STOP);
    act(() => { mark.click(); });
    expect(onNow).not.toHaveBeenCalled();
  });
  it('the automation chip shows nothing until the first completion, then n/N, with its state as hidden text and no live region', () => {
    const first = row(newState(saltRoad.roster));
    const blank = first.container.querySelector('.auto')!;
    expect(blank.querySelector('[aria-hidden="true"]')).toBeNull();
    expect(screen.getByText('automation, not yet earned')).toHaveClass('visually-hidden');
    expect(blank).not.toHaveAttribute('role');
    first.unmount();
    const { container } = row({ ...newState(saltRoad.roster), completionCounts: { cabin: 3 } });
    const n = balance.automation.unlockOneTime;
    expect(container.querySelector('.auto [aria-hidden="true"]')).toHaveTextContent(`3/${n}`);
    expect(screen.getByText(`automation, 3 of ${n} to earn`)).toHaveClass('visually-hidden');
  });
});
