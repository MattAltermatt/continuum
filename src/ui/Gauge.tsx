import type { ReactNode } from 'react';

/**
 * One grammar for every bar (spec 2026-09-25-the-watched-screen section 5):
 * the bar on the left, and on the right, in a column whose width the region
 * pins (--g-right), the label with its time or state over the value. Bone is
 * XP, ember is time and work, red is health. The fill is keyed on the counter
 * whose change is a reset, so a reset remounts and jumps (spec
 * 2026-09-24-screen-pass section 4).
 */
export function Gauge({ pct, fill, resetKey, label, value, tone, tall = false }: {
  pct: number; fill: 'core' | 'run' | 'hp'; resetKey: string | number; label: ReactNode; value: ReactNode;
  tone?: 'warn' | 'dim' | 'hurt' | 'good'; tall?: boolean;
}) {
  const width = Math.max(0, Math.min(100, pct));
  return (
    <div className={`gauge gauge--${fill}${tall ? ' gauge--tall' : ''}`}>
      <div className="bar" aria-hidden="true">
        <div key={resetKey} className={`bar__fill${fill === 'run' ? ' bar__fill--run' : fill === 'hp' ? ' bar__fill--hp' : ''}`} style={{ width: `${width}%` }} />
      </div>
      <span className={`gauge__label${tone ? ` gauge__label--${tone}` : ''}`}>{label}</span>
      <span className="gauge__value">{value}</span>
    </div>
  );
}
