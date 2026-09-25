// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Rates } from './Rates';

describe('Rates', () => {
  it('shows decay with the rising mark, and the food ceiling labelled "up to"', () => {
    render(<Rates decay={0.18} ceiling={0.8} stopped={false} />);
    expect(screen.getByLabelText('rates')).toBeInTheDocument();
    expect(screen.getByText('\u22120.18 hp/s \u25B2')).toBeInTheDocument();
    expect(screen.getByText('food, up to')).toBeInTheDocument();
  });
  it('the food line is green when it covers decay, red when decay outruns it', () => {
    const on = render(<Rates decay={0.18} ceiling={0.8} stopped={false} />);
    expect(screen.getByText('+0.80 hp/s')).toHaveClass('rates__food--covers');
    on.unmount();
    render(<Rates decay={0.93} ceiling={0.8} stopped={false} />);
    expect(screen.getByText('+0.80 hp/s')).toHaveClass('rates__food--short');
  });
  it('an empty larder reads +0.00, red, not hidden', () => {
    render(<Rates decay={0.1} ceiling={0} stopped={false} />);
    expect(screen.getByText('+0.00 hp/s')).toHaveClass('rates__food--short');
  });
  it('a hurting row running adds a third line with its skill and what it takes', () => {
    render(<Rates decay={0.1} ceiling={0.8} row={-1} rowBy="fight" stopped={false} />);
    expect(screen.getByText('fight')).toBeInTheDocument();
    expect(screen.getByText('\u22121.00 hp/s')).toHaveClass('hurt-text');
  });
  it('no hurts line while nothing hurting runs, but its box stays so nothing below moves', () => {
    const { container } = render(<Rates decay={0.1} ceiling={0.8} stopped={false} />);
    expect(screen.queryByText('fight')).toBeNull();
    expect(screen.getAllByText(/hp\/s/)).toHaveLength(2);
    expect(container.querySelectorAll('.rates__kv > span')).toHaveLength(6);
    expect(container.querySelectorAll('.rates__blank[aria-hidden="true"]')).toHaveLength(2);
  });
  it('the food line judges decay plus hurts: food that covers decay alone is red once a fight takes more', () => {
    const calm = render(<Rates decay={0.5} ceiling={0.8} row={0} stopped={false} />);
    expect(screen.getByText('+0.80 hp/s')).toHaveClass('rates__food--covers');
    calm.unmount();
    render(<Rates decay={0.5} ceiling={0.8} row={-0.5} rowBy="fight" stopped={false} />);
    expect(screen.getByText('+0.80 hp/s')).toHaveClass('rates__food--short');
  });
  it('there is no net line (plan Revision 2)', () => {
    render(<Rates decay={0.1} ceiling={0.8} row={-0.3} rowBy="fight" stopped={false} />);
    expect(screen.queryByText(/\bnet\b/i)).toBeNull();
  });
  it('a stopped clock dims the chunk and keeps the numbers', () => {
    const { container } = render(<Rates decay={0.1} ceiling={0.8} stopped={true} />);
    expect(container.querySelector('.rates')).toHaveClass('rates--stopped');
    expect(screen.getByText('\u22120.10 hp/s \u25B2')).toBeInTheDocument();
  });
  it('a healing row shows a green plus under its skill, and counts toward covering decay', () => {
    render(<Rates decay={0.5} ceiling={0.2} row={0.4} rowBy="rest" stopped={false} />);
    expect(screen.getByText('rest')).toBeInTheDocument();
    expect(screen.getByText('+0.40 hp/s')).toHaveClass('heal-text');
    expect(screen.getByText('+0.20 hp/s')).toHaveClass('rates__food--covers');
  });
  it('a draining row is red and counts against the larder', () => {
    render(<Rates decay={0.1} ceiling={0.2} row={-0.3} rowBy="fight" stopped={false} />);
    expect(screen.getByText('\u22120.30 hp/s')).toHaveClass('hurt-text');
    expect(screen.getByText('+0.20 hp/s')).toHaveClass('rates__food--short');
  });
});
