// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { testBook as book } from '../test-utils/book';
import { TopStrip, topLabel } from './TopStrip';

const head = book.chapters[0]!.head;
const strip = (label: ReturnType<typeof topLabel>, over: Partial<Parameters<typeof TopStrip>[0]> = {}) =>
  render(<TopStrip book={book.name} head={head} page="Fitting out" health={97} max={100} life={1} label={label} decay={0.11} ceiling={0} row={0} rowBy={null} {...over} />);

describe('topLabel', () => {
  const base = { elsewhere: 'none' as const, card: false, paused: false, queued: 2, fighting: false, health: 97, net: -0.11, life: 4 };
  it('orders the states: elsewhere, life, paused, idle, left, steady; a fight is never counted down', () => {
    expect(topLabel({ ...base, elsewhere: 'held' }).kind).toBe('elsewhere');
    expect(topLabel({ ...base, card: true })).toEqual({ kind: 'life', life: 4 });
    expect(topLabel({ ...base, paused: true }).kind).toBe('paused');
    expect(topLabel({ ...base, queued: 0 }).kind).toBe('idle');
    expect(topLabel(base)).toEqual({ kind: 'left', seconds: 97 / 0.11 });
    expect(topLabel({ ...base, fighting: true, net: -0.4 }).kind).toBe('steady');
    expect(topLabel({ ...base, net: 0 }).kind).toBe('steady');
    expect(topLabel({ ...base, net: 0.2 }).kind).toBe('steady');
    // The order holds when two apply at once.
    expect(topLabel({ ...base, paused: true, queued: 0 }).kind).toBe('paused');
    expect(topLabel({ ...base, card: true, paused: true }).kind).toBe('life');
    expect(topLabel({ ...base, elsewhere: 'lost', card: true }).kind).toBe('elsewhere');
  });
});

describe('TopStrip', () => {
  it('is the running head, the health gauge and the rates line', () => {
    strip({ kind: 'left', seconds: 882 });
    expect(screen.getByText(/Fitting out/)).toHaveClass('head__page');
    expect(screen.getByLabelText('health').querySelector('.gauge__label')).toHaveTextContent('\u2248 14:42 left');
    expect(screen.getByLabelText('rates')).toHaveTextContent(/decay.*food.*net/);
  });
  it('the row cell names the running skill, or a dash', () => {
    strip({ kind: 'steady' }, { row: -0.3, rowBy: 'fight' });
    expect(screen.getByLabelText('rates')).toHaveTextContent('fight');
    strip({ kind: 'steady' });
    expect(screen.getAllByLabelText('rates')[1]).toHaveTextContent('\u2014');
  });
  it('net is food plus the running row less decay, judged by its sign: a fight hurts, a healing row helps', () => {
    const cell = (i: number) => screen.getByLabelText('rates').querySelectorAll('.rates__cell b')[i]!;
    const { unmount } = strip({ kind: 'steady' }, { decay: 0.1, ceiling: 0.2, row: -0.3, rowBy: 'fight' });
    expect(cell(3)).toHaveTextContent('\u22120.20 hp/s');
    expect(cell(3)).toHaveClass('hurt-text');
    unmount();
    strip({ kind: 'steady' }, { decay: 0.5, ceiling: 0.2, row: 0.4, rowBy: 'rest' });
    expect(cell(3)).toHaveTextContent('+0.10 hp/s');
    expect(cell(3)).toHaveClass('heal-text');
  });
  it('a long countdown reads in hours, so it never overflows its column', () => {
    strip({ kind: 'left', seconds: 1616 * 60 + 40 });
    expect(screen.getByLabelText('health').querySelector('.gauge__label')).toHaveTextContent('\u2248 26h+ left');
  });
  it('idle, paused, elsewhere and life read as words; steady is blank', () => {
    for (const [label, word] of [[{ kind: 'idle' }, 'idle'], [{ kind: 'paused' }, 'paused'], [{ kind: 'elsewhere' }, 'elsewhere'], [{ kind: 'life', life: 4 }, 'life 4']] as const) {
      const { unmount } = strip(label as ReturnType<typeof topLabel>);
      expect(screen.getByLabelText('health').querySelector('.gauge__label')).toHaveTextContent(word);
      unmount();
    }
    strip({ kind: 'steady' });
    // A blank line, not none: the label keeps its height so the bar never moves when a word comes back (spec 2026-09-25 section 5).
    expect(screen.getByLabelText('health').querySelector('.gauge__label')!.textContent).toBe('\u00a0');
  });
});
