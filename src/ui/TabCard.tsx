/** One tab plays (#73). Held: another tab has the game; Play here takes it. Lost: this tab lost it; a reload asks again. */
export function TabCard({ kind, onPlayHere }: { kind: 'held' | 'lost'; onPlayHere: () => void }) {
  return (
    <section className="card" aria-label={kind === 'held' ? 'open in another tab' : 'continued in another tab'}>
      {kind === 'held' ? (
        <>
          <h2 className="card__title">The game is open in another tab</h2>
          <p className="card__sub">Only one tab plays, so the save is never written from two places.</p>
          <button type="button" className="card__begin" onClick={onPlayHere}>Play here</button>
        </>
      ) : (
        <>
          <h2 className="card__title">This game continued in another tab</h2>
          <p className="card__sub">Nothing here ticks or saves any more. Reload to play here.</p>
        </>
      )}
    </section>
  );
}
