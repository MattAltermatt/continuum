// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { balance } from '../balance';
import { newState } from '../engine/queue';
import { ticksPerSecond } from '../engine/time';
import type { GameState } from '../engine/types';
import { testBook } from '../test-utils/book';
import { Debug } from './Debug';

const base = newState(testBook.roster);

function setup(over: { state?: GameState; stopped?: boolean; speed?: number; sibling?: boolean } = {}) {
  const dispatch = vi.fn();
  const onSpeed = vi.fn();
  const props = { content: testBook, state: over.state ?? base, stopped: over.stopped ?? false, speed: over.speed ?? 1, onSpeed, dispatch };
  const ui = (p: typeof props) => (
    <>
      {over.sibling && <button type="button">sibling</button>}
      <Debug {...p} />
    </>
  );
  const r = render(ui(props));
  return { dispatch, onSpeed, rerender: (next: Partial<typeof props>) => r.rerender(ui({ ...props, ...next })) };
}

const toggle = () => fireEvent.keyDown(document, { code: 'Backquote' });
const openIt = () => act(() => { toggle(); });
const dialog = () => screen.queryByRole('dialog', { name: 'debug' });
const spin = (name: string) => screen.getByRole('spinbutton', { name }) as HTMLInputElement;

/** Types `text` into a focused input and blurs it: the one apply path. */
function typeAndBlur(input: HTMLInputElement, text: string) {
  act(() => input.focus());
  fireEvent.change(input, { target: { value: text } });
  act(() => input.blur());
}

describe('Debug', () => {
  it('nothing renders while closed, but the listener is live: the backquote opens and closes', () => {
    setup();
    expect(dialog()).toBeNull();
    openIt();
    expect(dialog()).toBeInTheDocument();
    openIt();
    expect(dialog()).toBeNull();
  });

  it('Escape closes it while focus is on the body', () => {
    setup();
    openIt();
    expect(document.activeElement).toBe(document.body);
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    expect(dialog()).toBeNull();
  });

  it('Escape with focus on an element outside the overlay does not close it', () => {
    setup({ sibling: true });
    openIt();
    const sibling = screen.getByRole('button', { name: 'sibling' });
    act(() => sibling.focus());
    fireEvent.keyDown(sibling, { key: 'Escape', code: 'Escape' });
    expect(dialog()).toBeInTheDocument();
  });

  it('the backquote typed in the health input leaves the overlay open and the input focused', () => {
    setup();
    openIt();
    const input = spin('health');
    act(() => input.focus());
    fireEvent.keyDown(input, { code: 'Backquote', key: '`' });
    expect(dialog()).toBeInTheDocument();
    expect(document.activeElement).toBe(input);
  });

  it('a focused button inside the overlay does not swallow the backquote', () => {
    setup();
    openIt();
    const die = screen.getByRole('button', { name: 'die now' });
    act(() => die.focus());
    fireEvent.keyDown(die, { code: 'Backquote', key: '`' });
    expect(dialog()).toBeNull();
  });

  it('the close button closes it', () => {
    setup();
    openIt();
    fireEvent.click(screen.getByRole('button', { name: 'close debug' }));
    expect(dialog()).toBeNull();
  });

  it('the title reads debug, and debug · dead for a dead state', () => {
    const { rerender } = setup();
    openIt();
    expect(dialog()!.querySelector('.debug__title')).toHaveTextContent(/^debug(?! · dead)/);
    rerender({ state: { ...base, dead: true } });
    expect(dialog()!.querySelector('.debug__title')).toHaveTextContent(/^debug · dead/);
  });

  it('the skills and items lists start collapsed and open on press', () => {
    setup();
    openIt();
    const skills = screen.getByRole('button', { name: `skills (${testBook.roster.length})` });
    const items = screen.getByRole('button', { name: `items (${Object.keys(testBook.items).length})` });
    expect(skills).toHaveAttribute('aria-expanded', 'false');
    expect(items).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('spinbutton', { name: 'Fish core' })).toBeNull();
    expect(screen.queryByRole('spinbutton', { name: 'scrap have' })).toBeNull();
    fireEvent.click(skills);
    expect(skills).toHaveAttribute('aria-expanded', 'true');
    for (const s of testBook.roster) {
      expect(spin(`${s.name} core`)).toHaveValue(0);
      expect(spin(`${s.name} run`)).toHaveValue(0);
    }
    fireEvent.click(items);
    expect(items).toHaveAttribute('aria-expanded', 'true');
    for (const item of Object.values(testBook.items)) expect(spin(`${item.name} have`)).toBeInTheDocument();
  });

  it('health: Enter applies once by blurring the input', () => {
    const { dispatch } = setup();
    openIt();
    const input = spin('health');
    act(() => input.focus());
    fireEvent.change(input, { target: { value: '50' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith({ type: 'setHealth', health: 50 });
    expect(document.activeElement).not.toBe(input);
  });

  it('health takes a fraction and keeps it in the field; a blank, a negative or text dispatches nothing', () => {
    const { dispatch } = setup();
    openIt();
    const input = spin('health');
    typeAndBlur(input, '97.3');
    expect(dispatch).toHaveBeenCalledWith({ type: 'setHealth', health: 97.3 });
    expect(input).toHaveValue(97.3);
    dispatch.mockClear();
    for (const bad of ['', '-3', 'abc']) {
      typeAndBlur(input, bad);
      expect(dispatch, bad).not.toHaveBeenCalled();
      expect(input, bad).toHaveValue(base.health);
    }
  });

  it('a skill level applies setSkill on blur, for its ledger', () => {
    const { dispatch } = setup();
    openIt();
    fireEvent.click(screen.getByRole('button', { name: /^skills/ }));
    typeAndBlur(spin('Fish core'), '4');
    expect(dispatch).toHaveBeenLastCalledWith({ type: 'setSkill', skill: 'fish', ledger: 'core', level: 4 });
    typeAndBlur(spin('Rig run'), '2');
    expect(dispatch).toHaveBeenLastCalledWith({ type: 'setSkill', skill: 'rig', ledger: 'run', level: 2 });
    expect(dispatch).toHaveBeenCalledTimes(2);
  });

  it('an item count applies setItem on blur', () => {
    const { dispatch } = setup();
    openIt();
    fireEvent.click(screen.getByRole('button', { name: /^items/ }));
    typeAndBlur(spin('scrap have'), '7');
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith({ type: 'setItem', item: 'scrap', count: 7 });
  });

  it('a level or a count ignores a blank, a negative and a fraction, and shows the state again', () => {
    const state = { ...base, inventory: { ...base.inventory, scrap: 3 } };
    const { dispatch } = setup({ state });
    openIt();
    fireEvent.click(screen.getByRole('button', { name: /^skills/ }));
    fireEvent.click(screen.getByRole('button', { name: /^items/ }));
    for (const bad of ['', '-3', '1.5']) {
      typeAndBlur(spin('Fish core'), bad);
      expect(spin('Fish core'), bad).toHaveValue(0);
      typeAndBlur(spin('scrap have'), bad);
      expect(spin('scrap have'), bad).toHaveValue(3);
    }
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('a focused input keeps its typed text when the state changes; an unfocused one follows it', () => {
    const { rerender } = setup();
    openIt();
    const input = spin('health');
    act(() => input.focus());
    fireEvent.change(input, { target: { value: '12' } });
    rerender({ state: { ...base, health: 45 } });
    expect(input).toHaveValue(12);
    act(() => input.blur());
    rerender({ state: { ...base, health: 30 } });
    expect(input).toHaveValue(30);
  });

  it('die now, the chips and the time buttons dispatch their actions', () => {
    const { dispatch } = setup();
    openIt();
    fireEvent.click(screen.getByRole('button', { name: 'die now' }));
    expect(dispatch).toHaveBeenLastCalledWith({ type: 'die' });
    fireEvent.click(screen.getByRole('button', { name: 'earn every chip on this page' }));
    expect(dispatch).toHaveBeenLastCalledWith({ type: 'earnChips' });
    fireEvent.click(screen.getByRole('button', { name: '+10s' }));
    expect(dispatch).toHaveBeenLastCalledWith({ type: 'tick', n: 10 * ticksPerSecond() });
    fireEvent.click(screen.getByRole('button', { name: '+1m' }));
    expect(dispatch).toHaveBeenLastCalledWith({ type: 'tick', n: balance.time.ticksPerMinute });
    fireEvent.click(screen.getByRole('button', { name: '+10m' }));
    expect(dispatch).toHaveBeenLastCalledWith({ type: 'tick', n: 10 * balance.time.ticksPerMinute });
    expect(screen.queryByText('time passes only while work happens')).toBeNull();
  });

  it('a field focused and left alone applies nothing: health shown to a tenth would otherwise round down on blur', () => {
    const { dispatch } = setup({ state: { ...newState(testBook.roster), health: 97.36 } });
    openIt();
    const health = screen.getByRole('spinbutton', { name: 'health' });
    expect(health).toHaveValue(97.3);
    act(() => health.focus());
    fireEvent.blur(health);
    expect(dispatch).not.toHaveBeenCalled();
  });
  it('a field focused while the value moves under it still applies nothing on blur: only a typed value applies', () => {
    const { dispatch, rerender } = setup({ state: { ...newState(testBook.roster), health: 96.3 } });
    openIt();
    const health = screen.getByRole('spinbutton', { name: 'health' });
    act(() => health.focus());
    // Health decays while the field is focused: the sync waits, and the blur must not write 96.3 back.
    rerender({ state: { ...newState(testBook.roster), health: 96.1 } });
    expect(health).toHaveValue(96.3);
    fireEvent.blur(health);
    expect(dispatch).not.toHaveBeenCalled();
    expect(health).toHaveValue(96.1);
  });
  it('while stopped the time buttons are aria-disabled, dispatch nothing, and say why', () => {
    const { dispatch } = setup({ stopped: true });
    openIt();
    for (const name of ['+10s', '+1m', '+10m']) {
      const b = screen.getByRole('button', { name });
      expect(b).toHaveAttribute('aria-disabled', 'true');
      fireEvent.click(b);
    }
    expect(dispatch).not.toHaveBeenCalled();
    expect(screen.getByText('time passes only while work happens')).toHaveClass('debug__note');
  });

  it('the speed group presses the speed prop, and a press calls onSpeed', () => {
    const { onSpeed, rerender } = setup({ speed: 1 });
    openIt();
    const group = screen.getByRole('group', { name: 'speed' });
    const pressed = () => Array.from(group.querySelectorAll('[aria-pressed="true"]')).map((b) => b.textContent);
    expect(pressed()).toEqual(['×1']);
    rerender({ speed: 100 });
    expect(pressed()).toEqual(['×100']);
    fireEvent.click(screen.getByRole('button', { name: '×10' }));
    expect(onSpeed).toHaveBeenCalledWith(10);
  });

  describe('position', () => {
    const w = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth')!;
    const h = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight')!;
    afterEach(() => {
      Object.defineProperty(HTMLElement.prototype, 'offsetWidth', w);
      Object.defineProperty(HTMLElement.prototype, 'offsetHeight', h);
    });

    it('is saved when a drag ends', () => {
      setup();
      openIt();
      const title = dialog()!.querySelector('.debug__title')!;
      // Up and right: the default position is bottom-left, and a drag stays inside the window.
      fireEvent.mouseDown(title, { clientX: 10, clientY: 500 });
      fireEvent.mouseMove(document, { clientX: 60, clientY: 420 });
      fireEvent.mouseUp(document);
      const saved = JSON.parse(localStorage.getItem('continuum.debug')!) as { left: number; top: number };
      const style = dialog()!.style;
      expect(saved).toEqual({ left: parseFloat(style.left), top: parseFloat(style.top) });
      expect(saved).toEqual({ left: 50, top: window.innerHeight - 80 });
      fireEvent.mouseDown(title, { clientX: 60, clientY: 420 });
      fireEvent.mouseMove(document, { clientX: 70, clientY: 415 });
      fireEvent.mouseUp(document);
      expect(JSON.parse(localStorage.getItem('continuum.debug')!)).toEqual({ left: saved.left + 10, top: saved.top - 5 });
    });

    it('is clamped to the window on open', () => {
      Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, get: () => 400 });
      Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, get: () => 300 });
      localStorage.setItem('continuum.debug', JSON.stringify({ left: 5000, top: 5000 }));
      setup();
      openIt();
      expect(dialog()!.style.left).toBe(`${window.innerWidth - 400}px`);
      expect(dialog()!.style.top).toBe(`${window.innerHeight - 300}px`);
    });

    it('is clamped again when a list opens and the panel grows, and when the window shrinks', () => {
      let height = 300;
      Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, get: () => 400 });
      Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, get: () => height });
      localStorage.setItem('continuum.debug', JSON.stringify({ left: 0, top: window.innerHeight - 300 }));
      setup();
      openIt();
      expect(dialog()!.style.top).toBe(`${window.innerHeight - 300}px`);
      // The skills list opens: the panel is taller now, and its top moves up so its bottom stays on screen.
      height = 700;
      fireEvent.click(screen.getByRole('button', { name: /^skills/ }));
      expect(dialog()!.style.top).toBe(`${window.innerHeight - 700}px`);
      // The window shrinks under it.
      const innerHeight = window.innerHeight;
      Object.defineProperty(window, 'innerHeight', { configurable: true, value: 720 });
      try {
        act(() => { window.dispatchEvent(new Event('resize')); });
        expect(dialog()!.style.top).toBe(`${720 - 700}px`);
      } finally {
        Object.defineProperty(window, 'innerHeight', { configurable: true, value: innerHeight });
      }
    });
  });
});
