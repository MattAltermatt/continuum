/// <reference types="vite/client" />
/**
 * A dev-only window handle so chrome-verify reads the simulation instead of
 * pixels (issue #33). Never installed in a production build.
 */
import type { GameAction } from './useGame';
import type { GameState } from '../engine/types';

export interface ContinuumHandle {
  readonly state: () => GameState;
  readonly dispatch: (a: GameAction) => void;
  /** Advance n ticks, for verification. */
  readonly step: (n: number) => void;
}

declare global {
  interface Window { continuum?: ContinuumHandle }
}

export function installDevHandle(handle: ContinuumHandle): void {
  if (!import.meta.env.DEV) return;
  window.continuum = handle;
}
