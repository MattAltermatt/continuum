// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from './App';

describe('App', () => {
  it('renders the shell', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Continuum' })).toBeInTheDocument();
  });

  it('reports the tick rate from balance rather than a literal', () => {
    render(<App />);
    expect(screen.getByText(/ticks 10 times per second/)).toBeInTheDocument();
  });
});
