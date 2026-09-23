// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { scrub } from '../data/scrub';
import { Log } from './Log';

describe('Log', () => {
  it('is a polite live region, newest first with the time, story lines marked', () => {
    render(<Log content={scrub} lines={[
      { seq: 1, at: 600, event: { type: 'completed', actionId: 'cabin', oneTime: true } },
      { seq: 0, at: 0, event: { type: 'lifeBegins', life: 1 } },
    ]} />);
    expect(screen.getByLabelText('log')).toHaveAttribute('aria-live', 'polite');
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('01:00');
    expect(items[0]).toHaveTextContent(scrub.actions.cabin!.beat!);
    expect(items[0]).toHaveClass('log__line--story');
    expect(items[1]).toHaveTextContent('Life 1 begins');
  });
});
