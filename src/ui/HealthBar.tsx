import { healthPair } from './format';
import { Region } from './Region';

/** The top row. A living player never reads 0: any health above zero shows at least 1. Spec 8.6: the bar, "71 / 100" centered under it, nothing else. */
export function HealthBar({ health, max, life }: {
  health: number; max: number;
  /** The fill is keyed on it, so a rebirth's full bar jumps rather than glides (spec 2026-09-24-screen-pass 4). */
  life: number;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (health / max) * 100)) : 0;
  const v = healthPair(health, max);
  return (
    <Region name="health" className="health" head={null}>
      <div className="bar" aria-hidden="true"><div key={life} className="bar__fill bar__fill--hp" style={{ width: `${pct}%` }} /></div>
      <div className="health__value">{v.now} <small>/ {v.max}</small></div>
    </Region>
  );
}
