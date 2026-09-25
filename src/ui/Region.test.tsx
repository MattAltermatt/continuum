// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Region } from './Region';

describe('Region', () => {
  it('is a labelled section with its name as the heading, the caller\'s class carried, and the children after', () => {
    const { container } = render(<Region name="rates" className="rates rates--stopped"><p>body</p></Region>);
    const region = screen.getByLabelText('rates');
    expect(region.tagName).toBe('SECTION');
    expect(region).toHaveClass('region', 'region--rates', 'rates', 'rates--stopped');
    expect(container.querySelector('.region__head')).toHaveTextContent('rates');
    expect(region.firstElementChild).toHaveClass('region__head');
    expect(region.lastElementChild).toHaveTextContent('body');
    expect(region).not.toHaveAttribute('aria-live');
  });
  it('a title replaces the heading text and a note sits beside it', () => {
    render(<Region name="queue" title="queue · 2" note={<span>waiting</span>}>x</Region>);
    expect(screen.getByLabelText('queue').querySelector('.region__head')).toHaveTextContent('queue · 2waiting');
  });
  it('head={null} renders no heading; a head node replaces it; live sets aria-live', () => {
    const { container, unmount } = render(<Region name="health" head={null}>bar</Region>);
    expect(container.querySelector('.region__head')).toBeNull();
    expect(screen.getByLabelText('health').firstChild).toHaveTextContent('bar');
    unmount();
    render(<Region name="chapter" head={<header className="region__head region__head--book">The Book</header>} live>rows</Region>);
    expect(screen.getByLabelText('chapter').querySelector('.region__head--book')).toHaveTextContent('The Book');
    expect(screen.getByLabelText('chapter')).toHaveAttribute('aria-live', 'polite');
  });
});
