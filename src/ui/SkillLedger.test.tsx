// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { balance } from '../balance';
import type { ActionDefinition, Content } from '../data/types';
import { newState } from '../engine/queue';
import { expToNextLevel, multiplier, tickExp } from '../engine/skills';
import { ticksPerSecond } from '../engine/time';
import type { GameState } from '../engine/types';
import { countdown, duration, fraction } from './format';
import { SkillLedger, timeSpent } from './SkillLedger';

/** Two ports' worth of Fish rows and two gear rows for it. Test data; not validated as a book. */
const book: Content = {
  roster: [{ id: 'fish', name: 'Fish', icon: 'fishing-rod' }, { id: 'tinker', name: 'Tinker', icon: 'wrench' }],
  items: {
    'cloud-fish': { id: 'cloud-fish', name: 'cloud-fish', kind: 'food', healPerUnit: 4 },
    'sky-eel': { id: 'sky-eel', name: 'sky-eel', kind: 'food', healPerUnit: 10 },
  },
  actions: {
    fish: { id: 'fish', verb: 'fish', noun: 'the cloud shallows', expCost: 4, producedItem: 'cloud-fish', producedAmount: 1, itemCosts: [], isOneTime: false },
    eels: { id: 'eels', verb: 'fish', noun: 'the eel runs', expCost: 8, producedItem: 'sky-eel', producedAmount: 1, itemCosts: [], isOneTime: false },
    net: { id: 'net', verb: 'tinker', noun: 'a trawl net', expCost: 40, itemCosts: [], isOneTime: true, gear: { skill: 'fish', multiplier: 1.25 } },
    line: { id: 'line', verb: 'tinker', noun: 'a long line', expCost: 40, itemCosts: [], isOneTime: true, gear: { skill: 'fish', multiplier: 1.2 } },
    shoal: { id: 'shoal', verb: 'fish', noun: 'the great shoal', expCost: 30, itemCosts: [], isOneTime: true },
  },
  chapters: [
    { head: { numeral: 'I', chapter: 'One', story: 'A start.' }, order: ['fish', 'net', 'line', 'shoal'], event: 'shoal' },
    { head: { numeral: 'II', chapter: 'Two', story: 'An end.' }, order: ['eels'], event: 'eels' },
  ],
  finish: 'eels',
};
const fishDef = book.roster[0]!;
const fish = { core: { level: 12, exp: 14.6 }, run: { level: 5, exp: 37.6 } };
const { coreMastery, runMastery } = balance.skills;
/** A per-level fraction as a percent, rounded the way a person writes it. */
const pct = (perLevel: number) => String(Number((perLevel * 100).toFixed(6)));

function game(over: Partial<GameState> = {}): GameState {
  const base = newState(book.roster);
  return { ...base, skills: { ...base.skills, fish }, ...over };
}

function renderLedger(state: GameState, running = false, row: ActionDefinition | null = null) {
  render(<SkillLedger id="l" skill={fishDef} content={book} state={state} running={running} row={row} hover={false} />);
  return screen.getByRole('dialog', { name: 'Fish ledger' });
}
/** The factor column: each section's factor and the arithmetic under it, in order. */
function factors(dialog: HTMLElement) {
  return Array.from(dialog.querySelectorAll('.ledger__r')).map((r) => ({
    fac: r.querySelector('.ledger__fac')?.textContent,
    sub: r.querySelector('.ledger__sub')?.textContent ?? null,
  }));
}

describe('SkillLedger', () => {
  it('core: permanent, its per-level percent from balance, level, and XP to the next level', () => {
    const dialog = renderLedger(game());
    const cost = expToNextLevel(coreMastery.baseExp, 12);
    expect(dialog).toHaveTextContent(`core · permanent · +${pct(coreMastery.multiplierPerLevel)}% / level`);
    expect(within(dialog).getByText('level 12')).toBeInTheDocument();
    expect(within(dialog).getByText('to level 13')).toBeInTheDocument();
    expect(within(dialog).getByText(`${fraction(14.6, cost)} xp`)).toBeInTheDocument();
  });
  it('run: this life, its percent from balance, level, XP to the next level, and best ever', () => {
    const dialog = renderLedger(game({ skillStats: { fish: { ticks: 0, bestRun: 11 }, tinker: { ticks: 0, bestRun: 0 } } }));
    const cost = expToNextLevel(runMastery.baseExp, 5);
    expect(dialog).toHaveTextContent(`run · this life · +${pct(runMastery.multiplierPerLevel)}% / level`);
    expect(within(dialog).getByText('level 5')).toBeInTheDocument();
    expect(within(dialog).getByText('to level 6')).toBeInTheDocument();
    expect(within(dialog).getByText(`${fraction(37.6, cost)} xp`)).toBeInTheDocument();
    expect(within(dialog).getByText('best ever').nextElementSibling).toHaveTextContent('11');
  });
  it('the factor column: each factor over its arithmetic, and a total that is their product', () => {
    const dialog = renderLedger(game({ completedOneTime: ['net', 'line'] }));
    const core = 1 + 12 * coreMastery.multiplierPerLevel;
    const run = 1 + 5 * runMastery.multiplierPerLevel;
    expect(factors(dialog)).toEqual([
      { fac: `×${core.toFixed(2)}`, sub: `1 + 12 × ${pct(coreMastery.multiplierPerLevel)}%` },
      { fac: `×${run.toFixed(2)}`, sub: `1 + 5 × ${pct(runMastery.multiplierPerLevel)}%` },
      { fac: '×1.50', sub: '1.25 × 1.20' },
    ]);
    const total = dialog.querySelector('.ledger__total-r')!.textContent;
    expect(total).toBe(`×${(core * run * 1.5).toFixed(2)}`);
    expect(total).toBe(`×${multiplier(fish, 1.5).toFixed(2)}`);
  });
  it('gear: each piece by its row, in the order made, with its factor', () => {
    const dialog = renderLedger(game({ completedOneTime: ['line', 'net'] }));
    const gear = dialog.querySelector('.ledger__gear')!;
    expect(gear).toHaveTextContent('2 pieces');
    expect(Array.from(gear.querySelectorAll('.ledger__kv > span')).map((s) => s.textContent)).toEqual(['a long line', '×1.20', 'a trawl net', '×1.25']);
    expect(factors(dialog)[2]).toEqual({ fac: '×1.50', sub: '1.20 × 1.25' });
  });
  it('gear: one piece is its own factor', () => {
    const dialog = renderLedger(game({ completedOneTime: ['net'] }));
    expect(dialog.querySelector('.ledger__gear')).toHaveTextContent('1 piece');
    expect(factors(dialog)[2]).toEqual({ fac: '×1.25', sub: '1.25' });
  });
  it('gear: none reads none, and its factor is ×1.00', () => {
    const dialog = renderLedger(game());
    const gear = dialog.querySelector('.ledger__gear')!;
    expect(within(gear as HTMLElement).getByText('none')).toBeInTheDocument();
    expect(gear).not.toHaveTextContent('piece');
    expect(factors(dialog)[2]).toEqual({ fac: '×1.00', sub: null });
  });
  it('lifetime: XP from the core ledger, time from the ticks counter, and the completions of every Fish row', () => {
    const core = { level: 40, exp: 187.3 };
    const ticks = 2050 * ticksPerSecond();
    const dialog = renderLedger(game({
      life: 12,
      skills: { fish: { core, run: { level: 0, exp: 0 } }, tinker: { core: { level: 0, exp: 0 }, run: { level: 0, exp: 0 } } },
      skillStats: { fish: { ticks, bestRun: 3 }, tinker: { ticks: 50, bestRun: 0 } },
      completionCounts: { fish: 1033, eels: 60, shoal: 5, net: 4, line: 2 },
    }));
    // The geometric series in closed form, apart from the ledger's own loop: every core level's cost below 40, plus what is in hand.
    const r = balance.skills.expCurveExponent;
    const xp = Math.floor(coreMastery.baseExp * (Math.pow(r, 40) - 1) / (r - 1) + 187.3);
    const life = dialog.querySelector('.ledger__life') as HTMLElement;
    expect(life).toHaveTextContent('lifetime · 12 lives');
    expect(within(life).getByText('xp').nextElementSibling).toHaveTextContent(xp.toLocaleString('en-US'));
    expect(within(life).getByText('time').nextElementSibling).toHaveTextContent('34m 10s');
    expect(within(life).getByText('done').nextElementSibling).toHaveTextContent('1,098');   // 1033 + 60 + 5: every Fish row, one-times too; the Tinker rows are not Fish's
  });
  it('lifetime in a first life says one life, and zeros before any work', () => {
    const base = newState(book.roster);
    const dialog = renderLedger(base);
    const life = dialog.querySelector('.ledger__life') as HTMLElement;
    expect(life).toHaveTextContent('lifetime · 1 life');
    expect(within(life).getByText('xp').nextElementSibling).toHaveTextContent('0');
    expect(within(life).getByText('time').nextElementSibling).toHaveTextContent('0s');
    expect(within(life).getByText('done').nextElementSibling).toHaveTextContent('0');
  });
  it('right now appears only while the skill runs', () => {
    const dialog = renderLedger(game({ completedOneTime: ['net'] }));
    expect(within(dialog).queryByText('right now')).toBeNull();
    expect(within(dialog).queryByText(/xp\/s/)).toBeNull();
  });
  it('right now, on a producer: the row, the XP a second at the gear-aware rate, and one item per completion time', () => {
    const state = game({ completedOneTime: ['net'] });
    const dialog = renderLedger(state, true, book.actions.fish!);
    const perSecond = tickExp(fish, 1.25) * ticksPerSecond();
    const now = dialog.querySelector('.ledger__now') as HTMLElement;
    expect(within(now).getByText('right now')).toBeInTheDocument();
    expect(within(now).getByText('action').nextElementSibling).toHaveTextContent('the cloud shallows');
    expect(within(now).getByText('earning').nextElementSibling).toHaveTextContent(`${perSecond.toFixed(2)} xp/s`);
    expect(within(now).getByText('rate').nextElementSibling).toHaveTextContent(`1 cloud-fish / ${duration(4 / perSecond)}`);
  });
  it('right now: one of an item takes its one-unit name, and a key is named without an amount', () => {
    const named: Content = {
      ...book,
      items: { ...book.items, 'cloud-fish': { ...book.items['cloud-fish']!, name: 'cloud-fishes', one: 'cloud-fish' }, map: { id: 'map', name: 'the sea map', kind: 'key' } },
      actions: { ...book.actions, chart: { id: 'chart', verb: 'fish', noun: 'the charts', expCost: 4, producedItem: 'map', producedAmount: 1, itemCosts: [], isOneTime: true } },
    };
    const at = (row: ActionDefinition) => {
      const { unmount } = render(<SkillLedger id="n" skill={fishDef} content={named} state={game()} running={true} row={row} hover={false} />);
      const now = screen.getByRole('dialog', { name: 'Fish ledger' }).querySelector('.ledger__now') as HTMLElement;
      const text = within(now).getByText('rate').nextElementSibling!.textContent;
      unmount();
      return text;
    };
    expect(at(named.actions.fish!)).toMatch(/^1 cloud-fish \//);
    expect(at(named.actions.chart!)).toMatch(/^the sea map \//);
  });
  it('right now, on a row that makes nothing: no rate line', () => {
    const dialog = renderLedger(game(), true, book.actions.shoal!);
    const now = dialog.querySelector('.ledger__now') as HTMLElement;
    expect(within(now).getByText('action').nextElementSibling).toHaveTextContent('the great shoal');
    expect(within(now).queryByText('rate')).toBeNull();
  });
  it('while running, each ledger line carries its countdown at the gear-aware rate', () => {
    const dialog = renderLedger(game({ completedOneTime: ['net'] }), true, book.actions.fish!);
    const perSecond = tickExp(fish, 1.25) * ticksPerSecond();
    const cost = expToNextLevel(coreMastery.baseExp, 12);
    expect(within(dialog).getByText('to level 13').nextElementSibling!.textContent).toBe(`${fraction(14.6, cost)} xp · ${countdown((cost - 14.6) / perSecond)}`);
    const runCost = expToNextLevel(runMastery.baseExp, 5);
    expect(within(dialog).getByText('to level 6').nextElementSibling!.textContent).toBe(`${fraction(37.6, runCost)} xp · ${countdown((runCost - 37.6) / perSecond)}`);
  });
});

describe('timeSpent', () => {
  it('reads seconds, then minutes and seconds, then hours and minutes, never rounding up', () => {
    expect(timeSpent(42.9)).toBe('42s');
    expect(timeSpent(2050)).toBe('34m 10s');
    expect(timeSpent(2 * 3600 + 5 * 60 + 59)).toBe('2h 5m');
  });
});
