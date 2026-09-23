/** The top row. A living player never reads 0: any health above zero shows at least 1. Spec 8.6: the bar, "71 / 100" centered under it, nothing else. */
export function HealthBar({ health, max }: { health: number; max: number }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (health / max) * 100)) : 0;
  return (
    <section className="chunk health" aria-label="health">
      <div className="bar" aria-hidden="true"><div className="bar__fill bar__fill--hp" style={{ width: `${pct}%` }} /></div>
      <div className="health__value">{health > 0 ? Math.max(1, Math.floor(health)) : 0} <small>/ {max}</small></div>
    </section>
  );
}
