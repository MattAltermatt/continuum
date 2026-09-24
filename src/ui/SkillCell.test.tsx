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
  chapters: [{ head: { numeral: 'I', chapter: 'One', story: 'A start.' }, order: ['fish', 'net'], event: 'net' }],
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
  it('shows the name, Lv on each line, and a multiplier that includes the gear', () => {
    renderCell();
    const withGear = `×${multiplier(fish, net).toFixed(2)}`;
    const without = `×${multiplier(fish).toFixed(2)}`;
    expect(withGear).not.toBe(without);
    expect(screen.getByText('Fish')).toBeInTheDocument();
    expect(screen.getByText(withGear)).toBeInTheDocument();
    expect(screen.queryByText(without)).toBeNull();
    expect(screen.getByText('Lv 12')).toBeInTheDocument();
    expect(screen.getByText('Lv 5')).toBeInTheDocument();
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
});
