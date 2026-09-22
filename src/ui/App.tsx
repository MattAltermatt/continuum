import { ticksPerSecond } from '../engine/time';

/**
 * Placeholder shell. Deliberately empty of game UI.
 *
 * The first real work here is settling how a single queued action looks and
 * feels to interact with, so nothing is built speculatively ahead of that.
 */
export function App() {
  return (
    <main className="shell">
      <h1 className="shell__title">Continuum</h1>
      <p className="shell__line">
        Scaffold running. The simulation ticks {ticksPerSecond()} times per second.
      </p>
      <p className="shell__line shell__line--dim">
        Nothing is built here yet.
      </p>
    </main>
  );
}
