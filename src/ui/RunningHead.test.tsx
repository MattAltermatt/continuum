// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RunningHead } from './RunningHead';

describe('RunningHead', () => {
  it('shows the book, the numeral and chapter, and the story', () => {
    render(<RunningHead book="The Salt Road" head={{ numeral: 'II', chapter: 'The Flats', story: 'White ground.' }} />);
    expect(screen.getByText('The Salt Road')).toBeInTheDocument();
    expect(screen.getByText('II · The Flats')).toBeInTheDocument();
    expect(screen.getByText('White ground.')).toBeInTheDocument();
  });
});
