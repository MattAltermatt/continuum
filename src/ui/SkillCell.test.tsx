// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { balance } from '../balance';
import type { Content } from '../data/types';
import { newState } from '../engine/queue';
import { expToNextLevel, multiplier, tickExp } from '../engine/skills';
import { ticksPerSecond } from '../engine/time';
import type { GameState } from '../engine/types';
import { realClick } from '../test-utils/realClick';
import { countdown, fraction } from './format';
import { SkillCell } from './SkillCell';

/** A port with one harvest and one gear row for it. Test data; not validated as a book. */
const book: Content = {
  roster: [{ id: 'fish', name: 'Fish', icon: 'fishing-rod' }, { id: 'tinker', name: 'Tinker', icon: 'wrench' }],
  items: { 'cloud-fish': { id: 'cloud-fish', name: 'cloud-fish', kind: 'food', healPerUnit: 4 } },
  actions: {
    fish: { id: 'fish', verb: 'fish', noun: 'the cloud shallows', expCost: 4, producedItem: 'cloud-fish', producedAmount: 1, itemCosts: [], isOneTime: false },
    net: { id: 'net', verb: 'tinker', noun: 'a trawl net', expCost: 40, itemCosts: [], isOneTime: true, gear: { skill: 'fish', multiplier: 1.25 } },
  },
  chapters: [{ head: { numeral: 'I', chapter: 'One', story: 'A start.' }, pages: [{ name: '', order: ['fish', 'net'], closes: 'net' }] }],
  finish: 'net',
};
const fishDef = book.roster[0]!;
const fish = { core: { level: 12, exp: 14.6 }, run: { level: 5, exp: 37.6 } };
const net = book.actions.net!.gear!.multiplier;

function game(over: Partial<GameState> = {}): GameState {
  const base = newState(book.roster);
  return { ...base, skills: { ...base.skills, fish }, ...over };
}
/** The trawl net made this life: Fish carries gear. */
const geared = game({ completedOneTime: ['net'] });

const coreCost = expToNextLevel(balance.skills.coreMastery.baseExp, fish.core.level);

function renderCell(state: GameState = geared, running = false) {
  const utils = render(<SkillCell skill={fishDef} content={book} state={state} running={running} row={running ? book.actions.fish! : null} />);
  return { ...utils, cell: screen.getByRole('button') };
}
const ledger = () => screen.queryByRole('dialog', { name: 'Fish ledger' });

describe('SkillCell', () => {
  it('is two gauges: core and run, label over value, with the next multiplier on the title line', () => {
    render(<SkillCell skill={fishDef} content={book} state={newState(book.roster)} running={false} row={null} />);
    const gauges = document.querySelectorAll('.gauge');
    expect(gauges).toHaveLength(2);
    expect(gauges[0]).toHaveTextContent(/core Lv 0/);
    expect(gauges[1]).toHaveTextContent(/run Lv 0/);
    expect(screen.getByText(/\u2192 \u00d71\.\d\d at Lv 1/)).toBeInTheDocument();
  });
  it('the next multiplier is the one the next core level gives, gear included, and not the current one', () => {
    renderCell();
    const next = multiplier({ ...fish, core: { ...fish.core, level: fish.core.level + 1 } }, net).toFixed(2);
    expect(next).not.toBe(multiplier(fish, net).toFixed(2));
    expect(screen.getByText(`\u2192 \u00d7${next} at Lv ${fish.core.level + 1}`)).toBeInTheDocument();
  });
  it('idle: dimmed, no timers even while marked running, and its pop-out still opens on a click', async () => {
    render(<SkillCell skill={fishDef} content={book} state={newState(book.roster)} running row={null} idle />);
    const cell = screen.getByRole('button', { name: /Fish/ });
    expect(cell).toHaveClass('skill--idle');
    expect(screen.queryByText(/\u2191/)).toBeNull();
    await act(() => realClick(cell));
    expect(screen.getByRole('dialog', { name: 'Fish ledger' })).not.toHaveClass('ledger--inline');
  });
  it('ledger inline: held opens the ledger under the cell, in flow, and hover does nothing', async () => {
    render(<SkillCell skill={fishDef} content={book} state={newState(book.roster)} running={false} row={null} ledger="inline" />);
    const cell = screen.getByRole('button', { name: /Fish/ });
    fireEvent.mouseEnter(cell.parentElement!);
    expect(screen.queryByRole('dialog')).toBeNull();
    await act(() => realClick(cell));
    expect(screen.getByRole('dialog')).toHaveClass('ledger--inline');
  });
  it('empty: the same box with two blank gauges and no name, so a fresh run is the cell\'s height', () => {
    render(<SkillCell skill={fishDef} content={book} state={newState(book.roster)} running={false} row={null} empty />);
    expect(document.querySelector('.skill--empty')).not.toBeNull();
    expect(document.querySelectorAll('.gauge')).toHaveLength(2);
    // Every line holds a no-break space, so the box is a filled cell's height (spec 2026-09-25 section 5); '' would collapse it.
    const lines = document.querySelectorAll('.skill--empty .skill__title span, .skill--empty .gauge__label, .skill--empty .gauge__value');
    expect(lines).toHaveLength(5);
    for (const el of lines) expect(el.textContent).toBe('\u00a0');
    expect(screen.queryByText('Fish')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });
  it('shows the name, Lv on each line, and a multiplier that includes the gear', () => {
    renderCell();
    const withGear = `×${multiplier(fish, net).toFixed(2)}`;
    const without = `×${multiplier(fish).toFixed(2)}`;
    expect(withGear).not.toBe(without);
    expect(screen.getByText('Fish')).toBeInTheDocument();
    expect(screen.getByText(withGear)).toBeInTheDocument();
    expect(screen.queryByText(without)).toBeNull();
    expect(screen.getByText(/core Lv 12/)).toBeInTheDocument();
    expect(screen.getByText(/run Lv 5/)).toBeInTheDocument();
  });
  it('without gear the multiplier is the two ledgers alone', () => {
    renderCell(game());
    expect(screen.getByText(`×${multiplier(fish).toFixed(2)}`)).toBeInTheDocument();
  });
  it('shows the XP fraction under each bar and no time when idle', () => {
    renderCell();
    expect(screen.getByText(fraction(14.6, coreCost))).toBeInTheDocument();
    expect(screen.queryByText(/↑/)).not.toBeInTheDocument();
  });
  it('the level-up countdown runs at the gear-aware rate, and only while running', () => {
    renderCell(geared, true);
    const withGear = `↑ ${countdown((coreCost - 14.6) / (tickExp(fish, net) * ticksPerSecond()))}`;
    const without = `↑ ${countdown((coreCost - 14.6) / (tickExp(fish) * ticksPerSecond()))}`;
    expect(withGear).not.toBe(without);
    expect(screen.getByText(withGear)).toBeInTheDocument();
  });
  it('marks the running cell as working, and names it for assistive tech', () => {
    const { container } = renderCell(geared, true);
    expect(container.querySelector('[data-skill="fish"]')).toHaveClass('working');
    expect(screen.getByText('running')).toHaveClass('visually-hidden');
  });

  describe('the pop-out', () => {
    it('is closed at first, and the cell says it opens a dialog', () => {
      const { cell } = renderCell();
      expect(ledger()).toBeNull();
      expect(cell).toHaveAttribute('tabindex', '0');
      expect(cell).toHaveAttribute('aria-haspopup', 'dialog');
      expect(cell).toHaveAttribute('aria-expanded', 'false');
    });
    it('opens on hover and closes on mouse leave', () => {
      const { cell } = renderCell();
      fireEvent.mouseEnter(cell);
      expect(ledger()).toBeInTheDocument();
      expect(cell).toHaveAttribute('aria-expanded', 'true');
      expect(cell).toHaveAttribute('aria-controls', ledger()!.id);
      fireEvent.mouseLeave(cell);
      expect(ledger()).toBeNull();
      expect(cell).toHaveAttribute('aria-expanded', 'false');
    });
    it('a hover-opened ledger lets the pointer through; a held one does not', async () => {
      const { cell } = renderCell();
      fireEvent.mouseEnter(cell);
      expect(ledger()).toHaveClass('ledger--hover');
      await act(() => realClick(cell));
      expect(ledger()).not.toHaveClass('ledger--hover');
    });
    it('opens on a click, stays through mouse leave, and a second click closes it', async () => {
      const { cell } = renderCell();
      await act(() => realClick(cell));
      expect(ledger()).toBeInTheDocument();
      fireEvent.mouseLeave(cell);
      expect(ledger()).toBeInTheDocument();
      await act(() => realClick(cell));
      expect(ledger()).toBeNull();
    });
    it('a click on a hover-opened ledger holds it rather than closing it', async () => {
      const { cell } = renderCell();
      fireEvent.mouseEnter(cell);
      await act(() => realClick(cell));
      expect(ledger()).toBeInTheDocument();
      fireEvent.mouseLeave(cell);
      expect(ledger()).toBeInTheDocument();
    });
    it('a press that focuses the cell opens it once, not open and then closed by its own click', () => {
      // A browser focuses a tabindex element on mousedown, before the click; jsdom does not, so the order is spelled out.
      const { cell } = renderCell();
      fireEvent.mouseEnter(cell);
      fireEvent.mouseDown(cell);
      act(() => cell.focus());
      fireEvent.mouseUp(cell);
      fireEvent.click(cell);
      expect(ledger()).toBeInTheDocument();
      fireEvent.mouseLeave(cell);
      expect(ledger()).toBeInTheDocument();
      fireEvent.mouseDown(cell);
      fireEvent.click(cell);
      expect(ledger()).toBeNull();
    });
    it('opens on focus and closes on blur', () => {
      const { cell } = renderCell();
      act(() => cell.focus());
      expect(ledger()).toBeInTheDocument();
      fireEvent.mouseLeave(cell);
      expect(ledger()).toBeInTheDocument();
      act(() => cell.blur());
      expect(ledger()).toBeNull();
    });
    it('focus moving into its own pop-out keeps it open', async () => {
      const { cell } = renderCell();
      await act(() => realClick(cell));
      act(() => cell.focus());
      act(() => ledger()!.focus());
      expect(ledger()).toBeInTheDocument();
      act(() => ledger()!.blur());
      expect(ledger()).toBeNull();
    });
    it('opens on Enter, stays through mouse leave, and closes on Escape', () => {
      const { cell } = renderCell();
      fireEvent.keyDown(cell, { key: 'Enter' });
      expect(ledger()).toBeInTheDocument();
      fireEvent.mouseLeave(cell);
      expect(ledger()).toBeInTheDocument();
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(ledger()).toBeNull();
    });
    it('Escape closes a hover-opened ledger too', () => {
      const { cell } = renderCell();
      fireEvent.mouseEnter(cell);
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(ledger()).toBeNull();
    });
    it("the ledger's total is the cell's × string exactly, gear included", () => {
      const { cell, container } = renderCell();
      fireEvent.mouseEnter(cell);
      const onCell = container.querySelector('.skill__mult')!.textContent;
      const total = ledger()!.querySelector('.ledger__total-r')!.textContent;
      expect(total).toBe(onCell);
      expect(total).toBe(`×${multiplier(fish, net).toFixed(2)}`);
    });
  });
  it('a skill line glides as it earns and remounts on its reset: core on the level, run on the life and the level (spec 2026-09-24-screen-pass 4)', () => {
    const base = newState(book.roster);
    const at = (core: { level: number; exp: number }, run: { level: number; exp: number }, life = 1): GameState =>
      ({ ...base, life, skills: { ...base.skills, fish: { core, run } } });
    const fills = (c: HTMLElement) => [...c.querySelectorAll('.bar__fill')];
    const props = { skill: fishDef, content: book, running: false, row: null };
    const { container, rerender } = render(<SkillCell {...props} state={at({ level: 3, exp: 1 }, { level: 0, exp: 1 })} />);
    const [core, run] = fills(container);
    rerender(<SkillCell {...props} state={at({ level: 3, exp: 2 }, { level: 0, exp: 2 })} />);
    expect(fills(container)[0]).toBe(core);
    expect(fills(container)[1]).toBe(run);
    rerender(<SkillCell {...props} state={at({ level: 4, exp: 0 }, { level: 0, exp: 2 })} />);
    const levelled = fills(container)[0];
    expect(levelled).not.toBe(core);
    expect(fills(container)[1]).toBe(run);
    // Death: the run ledger was still level 0 with some exp, and goes back to zero; the core survives.
    rerender(<SkillCell {...props} state={at({ level: 4, exp: 0 }, { level: 0, exp: 0 }, 2)} />);
    expect(fills(container)[0]).toBe(levelled);
    expect(fills(container)[1]).not.toBe(run);
  });
});
