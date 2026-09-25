// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Sheet } from './Sheet';

describe('Sheet', () => {
  it('closed: inert and its scrim hidden; open: a modal dialog; Escape and the scrim close it', () => {
    const onClose = vi.fn();
    const { rerender } = render(<Sheet name="pack" open={false} docked={false} onClose={onClose} head={<b>pack</b>}><p>items</p></Sheet>);
    expect(screen.queryByRole('dialog', { name: 'pack sheet' })).toBeNull();   // hidden
    expect(document.querySelector('.scrim')).toHaveAttribute('hidden');   // or a 35% veil would sit over the screen and eat every click
    rerender(<Sheet name="pack" open docked={false} onClose={onClose} head={<b>pack</b>}><p>items</p></Sheet>);
    expect(screen.getByRole('dialog', { name: 'pack sheet' })).toBeVisible();
    expect(document.querySelector('.scrim')).not.toHaveAttribute('hidden');
    expect(screen.getByRole('dialog', { name: 'pack sheet' })).toHaveFocus();   // focus follows the sheet in
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(document.querySelector('.scrim')!);
    expect(onClose).toHaveBeenCalledTimes(2);
  });
  it('Escape is ignored while another dialog is open (a ledger closes first)', () => {
    const onClose = vi.fn();
    render(<><div role="dialog" aria-label="ledger" /><Sheet name="pack" open docked={false} onClose={onClose} head={<b>pack</b>}><p>items</p></Sheet></>);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });
  it('docked: a plain column, no dialog, no scrim', () => {
    render(<Sheet name="skills" open={false} docked onClose={() => {}} head={<b>skills</b>}><p>cells</p></Sheet>);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.querySelector('.scrim')).toBeNull();
    expect(screen.getByLabelText('skills sheet')).toBeVisible();
  });
  it('inert reaches the sheet and the dock', () => {
    const { rerender } = render(<Sheet name="pack" open docked={false} inert onClose={() => {}} head={<b>pack</b>}><p>items</p></Sheet>);
    expect(document.querySelector('.sheet')).toHaveAttribute('inert');
    rerender(<Sheet name="pack" open={false} docked inert onClose={() => {}} head={<b>pack</b>}><p>items</p></Sheet>);
    expect(document.querySelector('.dock')).toHaveAttribute('inert');
  });
});
