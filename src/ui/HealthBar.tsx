import type { ReactNode } from 'react';
import { healthPair } from './format';
import { Gauge } from './Gauge';
import { Region } from './Region';

/**
 * The health gauge (spec 2026-09-25-the-watched-screen 4.1 and 5): the bar,
 * and on the right the label the top strip gives it over "97 / 100". A living
 * player never reads 0: any health above zero shows at least 1.
 */
export function HealthBar({ health, max, life, label, tone }: {
  health: number; max: number;
  /** The fill is keyed on it, so a rebirth's full bar jumps rather than glides (spec 2026-09-24-screen-pass 4). */
  life: number;
  label: ReactNode; tone?: 'warn' | 'dim' | 'hurt' | 'good';
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (health / max) * 100)) : 0;
  const v = healthPair(health, max);
  return (
    <Region name="health" className="health" head={null}>
      <Gauge fill="hp" pct={pct} resetKey={life} tall label={label} tone={tone} value={<>{v.now} <small>/ {v.max}</small></>} />
    </Region>
  );
}
