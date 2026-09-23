// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Rates } from './Rates';

describe('Rates', () => {
  it('shows decay with the rising mark, and the food ceiling labelled "up to"', () => {
    render(<Rates decay={0.18} ceiling={0.8} covered={true} stopped={false} />);
    expect(screen.getByLabelText('rates')).toBeInTheDocument();
    expect(screen.getByText('−0.18 hp/s ▲')).toBeInTheDocument();
    expect(screen.getByText('food, up to')).toBeInTheDocument();
  });
  it('the food line is green when it covers decay', () => {
    render(<Rates decay={0.18} ceiling={0.8} covered={true} stopped={false} />);
    expect(screen.getByText('+0.80 hp/s')).toHaveClass('rates__food--covers');
  });
  it('the food line is red when decay outruns it', () => {
    render(<Rates decay={0.93} ceiling={0.8} covered={false} stopped={false} />);
    expect(screen.getByText('+0.80 hp/s')).toHaveClass('rates__food--short');
  });
  it('an empty larder reads +0.00, red, not hidden', () => {
    render(<Rates decay={0.1} ceiling={0} covered={false} stopped={false} />);
    expect(screen.getByText('+0.00 hp/s')).toHaveClass('rates__food--short');
  });
  it('there is no net line (plan Revision 2)', () => {
    render(<Rates decay={0.1} ceiling={0.8} covered={true} stopped={false} />);
    expect(screen.queryByText(/\bnet\b/i)).toBeNull();
  });
  it('a stopped clock dims the chunk and keeps the numbers', () => {
    const { container } = render(<Rates decay={0.1} ceiling={0.8} covered={true} stopped={true} />);
    expect(container.querySelector('.rates')).toHaveClass('rates--stopped');
    expect(screen.getByText('−0.10 hp/s ▲')).toBeInTheDocument();
  });
});
