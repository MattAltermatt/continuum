import { useRef, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { skillOf } from '../data/roster';
import type { Content, SkillId } from '../data/types';
import type { DeathSummary } from '../engine/rebirth';
import { ticksToSeconds } from '../engine/time';
import type { LifeRecord } from '../engine/types';
import { clock, floored } from './format';
import { ARROW, RISING } from './glyphs';
import { HealthIcon, ICONS } from './icons';
import { LifeChart } from './LifeChart';

/** Max health on the overlay, to one decimal. Display precision, not tuning. */
const HEALTH_DECIMALS = 1;
/** The list's icons, the old card's size. Display. */
const ICON_SIZE = 14;

export type OverlayContent = Pick<Content, 'roster' | 'chapters' | 'actions' | 'finish'>;

/** One row of the list: from and to as shown, and whether it rose. */
function PickRow({ icon, name, from, to, rose, selected, onPick, className }: {
  icon: ReactNode; name: string; from: string; to: string; rose: string | null; selected: boolean; onPick: () => void; className: string;
}) {
  return (
    <button type="button" className={className} aria-pressed={selected} onClick={onPick}>
      <span className="pick__icon" aria-hidden="true">{icon}</span>
      <span className="pick__name">{name}</span>
      <span className="pick__lv">{from} {ARROW} <b>{to}</b></span>
      <span className="pick__d">{rose === null ? '' : `+${rose}`}</span>
    </button>
  );
}

/**
 * The death overlay (#90, spec 2026-09-25-death-overlay; mockup
 * 2026-09-25-death-overlay). Health and then every skill in book order, each
 * with its core from and to; the selected row charted by life; the life that
 * ended behind it, frozen, which "see how it ended" shows by hiding the
 * dialog, leaving a pill to come back or begin. One overlay for a death and a
 * finish; Begin (or Read again) is the reset.
 */
export function DeathOverlay({ summary, content, book, history, from, onBegin }: {
  summary: DeathSummary; content: OverlayContent; book: string;
  history: readonly LifeRecord[]; from: Readonly<Record<SkillId, number>>; onBegin: () => void;
}) {
  const [picked, setPicked] = useState<'health' | SkillId>('health');
  const [looking, setLooking] = useState(false);
  const lookRef = useRef<HTMLButtonElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  // Focus moves in the handlers, not in an effect: StrictMode's second effect run would take Begin's autofocus.
  const look = () => { flushSync(() => setLooking(true)); backRef.current?.focus(); };
  const back = () => { flushSync(() => setLooking(false)); lookRef.current?.focus(); };

  const finished = summary.finished;
  const title = finished ? `${book}, finished` : `Life ${summary.life} ends`;
  const beat = finished ? content.actions[content.finish]?.beat : undefined;
  const head = content.chapters[summary.chapter]?.head;
  const during = summary.during === null ? undefined : content.actions[summary.during];
  const last = history[history.length - 1];
  const levelTo = (id: SkillId) => last?.core[id] ?? 0;
  const begin = finished ? 'Read again' : `Begin life ${summary.life + 1}`;

  // Health's from and to as shown, and the gain as their difference, so from + gain = to on screen.
  const hpFrom = floored(summary.maxHealthFrom, HEALTH_DECIMALS);
  const hpTo = floored(summary.maxHealthTo, HEALTH_DECIMALS);
  const hpGain = (Number(hpTo) - Number(hpFrom)).toFixed(HEALTH_DECIMALS);

  const skill = picked === 'health' ? null : skillOf(content, picked);
  const chartName = skill === null ? 'Health' : skill.name;
  const chartLabel = `${chartName} \u00B7 ${skill === null ? 'max health' : 'core level'} by life`;
  const now = skill === null ? hpTo : String(levelTo(skill.id));
  const points = history.map((r) => ({ life: r.life, value: skill === null ? r.maxHealth : r.core[skill.id] ?? 0 }));

  return (
    <>
      <div className="over" role="dialog" aria-modal="true" aria-label={title} hidden={looking}>
        <div className="over__head">
          <div className="over__title">{title}</div>
          {beat !== undefined && <p className="over__beat">{beat}</p>}
          <div className="over__sub">
            <span>{clock(ticksToSeconds(summary.runTicks))} alive</span>
            {!finished && head !== undefined && <span>reached {head.numeral} {'\u00B7'} {head.chapter}</span>}
            {!finished && during !== undefined && <span className="hurt-text">fell during {skillOf(content, during.verb).name} {during.noun}</span>}
            {finished && <span>finish {summary.finishes}</span>}
          </div>
        </div>
        <div className="over__body">
          <div className="over__list">
            <PickRow
              className={Number(hpGain) > 0 ? 'pick pick--health' : 'pick pick--health pick--still'} icon={<HealthIcon size={ICON_SIZE} />} name="Health" from={hpFrom} to={hpTo}
              rose={Number(hpGain) > 0 ? hpGain : null} selected={picked === 'health'} onPick={() => setPicked('health')}
            />
            {content.roster.map((s) => {
              const Icon = ICONS[s.icon];
              const a = from[s.id] ?? 0;
              const b = levelTo(s.id);
              return (
                <PickRow
                  key={s.id} className={b > a ? 'pick' : 'pick pick--still'} icon={<Icon size={ICON_SIZE} />} name={s.name}
                  from={String(a)} to={String(b)} rose={b > a ? String(b - a) : null} selected={picked === s.id} onPick={() => setPicked(s.id)}
                />
              );
            })}
          </div>
          <div className="over__chart">
            <div className="over__chart-head"><span><b>{chartName}</b> {'\u00B7'} {skill === null ? 'max health' : 'core level'} by life</span><span>now {now}</span></div>
            <LifeChart points={points} kind={skill === null ? 'health' : 'level'} label={chartLabel} />
            <div className="over__chart-foot">life {history[0]?.life} {ARROW} {last?.life} {'\u00B7'} the last point is this life</div>
          </div>
        </div>
        <div className="over__foot">
          <button type="button" className="over__look" ref={lookRef} onClick={look}>see how it ended</button>
          <button type="button" className="over__begin" autoFocus onClick={onBegin}>{begin}</button>
        </div>
      </div>
      {looking && (
        <div className="pill" role="group" aria-label="the life that ended">
          <button type="button" className="pill__back" ref={backRef} onClick={back}>{finished ? `${RISING} back` : `${RISING} back to life ${summary.life}`}</button>
          <button type="button" className="over__begin" onClick={onBegin}>{begin}</button>
        </div>
      )}
    </>
  );
}
