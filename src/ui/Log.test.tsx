// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { saltRoadFixture } from '../test-utils/salt-road';
import { MINUS, PLUS_MINUS } from './glyphs';
import { Log } from './Log';

describe('Log', () => {
  it('is a polite live region, newest first with the time, story lines marked', () => {
    render(<Log content={saltRoadFixture} lines={[
      { seq: 1, at: 600, event: { type: 'completed', actionId: 'cabin', oneTime: true } },
      { seq: 0, at: 0, event: { type: 'lifeBegins', life: 1 } },
    ]} />);
    expect(screen.getByLabelText('log')).toHaveAttribute('aria-live', 'polite');
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('01:00');
    expect(items[0]).toHaveTextContent(saltRoadFixture.actions.cabin!.beat!);
    expect(items[0]).toHaveClass('log__line--story');
    expect(items[1]).toHaveTextContent('Life 1 begins');
  });
  it('a completion with a last-life split shows the delta in its own cell, toned', () => {
    const { container } = render(<Log content={saltRoadFixture} lines={[
      { seq: 1, at: 450, event: { type: 'completed', actionId: 'cabin', oneTime: true, lastAt: 600 } },
    ]} />);
    const dt = container.querySelector('.log__dt');
    expect(dt).toHaveTextContent(`${MINUS}0:15`);
    expect(dt).toHaveClass('log__dt--sooner');
  });
  it('a screen reader hears the delta in words, since the log is a live region and a sign glyph may go unspoken', () => {
    render(<Log content={saltRoadFixture} lines={[
      { seq: 2, at: 450, event: { type: 'completed', actionId: 'cabin', oneTime: true, lastAt: 600 } },
      { seq: 1, at: 900, event: { type: 'completed', actionId: 'cabin', oneTime: true, lastAt: 600 } },
      { seq: 0, at: 600, event: { type: 'completed', actionId: 'cabin', oneTime: true, lastAt: 600 } },
    ]} />);
    // Each line's own cell, whole: the words match that line's sign, and the spaces keep them apart from the clock and the sentence.
    const cells = screen.getAllByRole('listitem').map((li) => li.querySelector('.log__dt')!);
    expect(cells.map((c) => c.textContent)).toEqual([
      `${MINUS}0:15 sooner than last life, `,
      '+0:30 later than last life, ',
      `${PLUS_MINUS}0:00 the same as last life, `,
    ]);
    // And the words are the hidden part: what shows is the sign and the time alone.
    expect(cells.map((c) => c.querySelector('.visually-hidden')?.textContent)).toEqual([
      ' sooner than last life, ', ' later than last life, ', ' the same as last life, ',
    ]);
  });
  it('a line without a delta keeps an empty cell with no tone, so every line has the column', () => {
    const { container } = render(<Log content={saltRoadFixture} lines={[
      { seq: 2, at: 900, event: { type: 'completed', actionId: 'cabin', oneTime: true, lastAt: 600 } },
      { seq: 1, at: 600, event: { type: 'completed', actionId: 'cabin', oneTime: true } },
      { seq: 0, at: 0, event: { type: 'lifeBegins', life: 1 } },
    ]} />);
    const items = screen.getAllByRole('listitem');
    for (const li of items) expect(li.querySelectorAll('.log__dt')).toHaveLength(1);
    expect(items[0]!.querySelector('.log__dt')).toHaveClass('log__dt--later');
    for (const li of items.slice(1)) {
      const dt = li.querySelector('.log__dt')!;
      expect(dt.textContent).toBe('');
      expect(dt.className).toBe('log__dt');
    }
    expect(container.querySelectorAll('.log__dt')).toHaveLength(3);
  });
});
