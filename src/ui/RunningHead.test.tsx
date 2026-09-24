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
  it('the page\'s name follows the chapter; an empty name adds no third part', () => {
    const { unmount } = render(<RunningHead book="The Windward Run" head={{ numeral: 'I', chapter: 'Port Cinder', story: 'Soot.' }} page="Fitting out" />);
    expect(screen.getByText('I \u00B7 Port Cinder \u00B7 Fitting out')).toBeInTheDocument();
    unmount();
    render(<RunningHead book="The Windward Run" head={{ numeral: 'I', chapter: 'Port Cinder', story: 'Soot.' }} page="" />);
    expect(screen.getByText('I \u00B7 Port Cinder')).toBeInTheDocument();
  });
});
