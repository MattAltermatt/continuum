// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { realClick } from '../test-utils/realClick';
import { TabCard } from './TabCard';

describe('TabCard', () => {
  it('held: names the other tab and Play here takes over', async () => {
    const onPlayHere = vi.fn();
    render(<TabCard kind="held" onPlayHere={onPlayHere} />);
    expect(screen.getByRole('heading')).toHaveTextContent('open in another tab');
    await act(async () => { await realClick(screen.getByRole('button', { name: 'Play here' })); });
    expect(onPlayHere).toHaveBeenCalledTimes(1);
  });
  it('lost: says to reload and offers nothing', () => {
    render(<TabCard kind="lost" onPlayHere={() => {}} />);
    expect(screen.getByRole('heading')).toHaveTextContent('continued in another tab');
    expect(screen.queryByRole('button')).toBeNull();
  });
});
