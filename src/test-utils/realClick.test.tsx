// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { realClick } from './realClick';

/** A button that keeps its node across renders. */
function Stable({ onHit }: { onHit: () => void }) {
  const [n, setN] = useState(0);
  return <button type="button" onMouseDown={() => setN(n + 1)} onClick={onHit}>stable {n}</button>;
}

/** A button whose node is REPLACED between mousedown and mouseup: the hazard. */
function Rebuilt({ onHit }: { onHit: () => void }) {
  const [n, setN] = useState(0);
  return <button key={n} type="button" onMouseDown={() => setN(n + 1)} onClick={onHit}>rebuilt {n}</button>;
}

describe('realClick', () => {
  it('reaches a handler on a node that survives the mousedown/mouseup gap', async () => {
    const onHit = vi.fn();
    render(<Stable onHit={onHit} />);
    await act(() => realClick(screen.getByRole('button')));
    expect(onHit).toHaveBeenCalledTimes(1);
  });
  it('merges an init into every event, so a test can Shift+click', async () => {
    const seen: boolean[] = [];
    render(<button type="button" onMouseDown={(e) => seen.push(e.shiftKey)} onMouseUp={(e) => seen.push(e.shiftKey)} onClick={(e) => seen.push(e.shiftKey)}>b</button>);
    await act(() => realClick(screen.getByRole('button'), { shiftKey: true }));
    expect(seen).toEqual([true, true, true]);
  });
  it('MUST FIRE: a node replaced during the gap loses the click, which is the bug the helper exists to catch', async () => {
    const onHit = vi.fn();
    render(<Rebuilt onHit={onHit} />);
    await act(() => realClick(screen.getByRole('button')));
    expect(onHit).not.toHaveBeenCalled();
  });
});
