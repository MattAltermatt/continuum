// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { realClick } from '../test-utils/realClick';
import { Settings } from './Settings';

describe('Settings', () => {
  it('the gear opens and closes the panel; Escape and a click outside close it', async () => {
    render(<Settings onErase={() => {}} />);
    const gear = screen.getByRole('button', { name: 'settings' });
    expect(gear).toHaveAttribute('aria-expanded', 'false');
    await act(() => realClick(gear));
    expect(screen.getByRole('dialog', { name: 'settings' })).toBeInTheDocument();
    expect(gear).toHaveAttribute('aria-expanded', 'true');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    await act(() => realClick(gear));
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('dialog')).toBeNull();
    await act(() => realClick(gear));
    await act(() => realClick(gear));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('erase save takes two presses: the first arms it, the second erases', async () => {
    const onErase = vi.fn();
    render(<Settings onErase={onErase} />);
    await act(() => realClick(screen.getByRole('button', { name: 'settings' })));
    await act(() => realClick(screen.getByRole('button', { name: 'erase save' })));
    expect(onErase).not.toHaveBeenCalled();
    await act(() => realClick(screen.getByRole('button', { name: 'press again to erase' })));
    expect(onErase).toHaveBeenCalledTimes(1);
  });
  it('the arm lapses after its hold, so a later single press does not erase', () => {
    // Timing only, so plain clicks under fake timers (realClick needs real ones).
    vi.useFakeTimers();
    try {
      const onErase = vi.fn();
      render(<Settings onErase={onErase} />);
      fireEvent.click(screen.getByRole('button', { name: 'settings' }));
      fireEvent.click(screen.getByRole('button', { name: 'erase save' }));
      expect(screen.getByRole('button', { name: 'press again to erase' })).toBeInTheDocument();
      act(() => vi.advanceTimersByTime(3000));
      fireEvent.click(screen.getByRole('button', { name: 'erase save' }));
      expect(onErase).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
  it('holds no speed control: that is the debug overlay\'s (spec 2026-09-24-screen-pass 5.2)', async () => {
    render(<Settings onErase={() => {}} />);
    await act(() => realClick(screen.getByRole('button', { name: 'settings' })));
    expect(screen.queryByRole('group', { name: 'speed' })).toBeNull();
  });
});
