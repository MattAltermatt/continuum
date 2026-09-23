import { balance } from '../balance';
import { SKILLS } from '../data/skills';
import type { SkillId } from '../data/types';
import { expToNextLevel, multiplier, tickExp } from '../engine/skills';
import { ticksPerSecond } from '../engine/time';
import type { Ledger, SkillState } from '../engine/types';
import { countdown, fraction } from './format';
import { SKILL_ICONS } from './icons';

function Line({ ledger, baseExp, running, perSecond, runFill }: { ledger: Ledger; baseExp: number; running: boolean; perSecond: number; runFill: boolean }) {
  const cost = expToNextLevel(baseExp, ledger.level);
  const pct = Math.min(100, (ledger.exp / cost) * 100);
  return (
    <>
      <div className="skill__lv">Lv {ledger.level}</div>
      <div>
        <div className="bar" aria-hidden="true"><div className={`bar__fill${runFill ? ' bar__fill--run' : ''}`} style={{ width: `${pct}%` }} /></div>
        <div className="bar__value">
          {fraction(ledger.exp, cost)}
          {running && <b>↑ {countdown((cost - ledger.exp) / perSecond)}</b>}
        </div>
      </div>
    </>
  );
}

export function SkillCell({ id, state, running }: { id: SkillId; state: SkillState; running: boolean }) {
  const Icon = SKILL_ICONS[id];
  const perSecond = tickExp(state) * ticksPerSecond();
  return (
    <div className={`item skill${running ? ' skill--on working' : ''}`} data-skill={id}>
      <div className="skill__icon"><Icon aria-hidden="true" /></div>
      <div className="skill__name">
        <b>{SKILLS[id].name}</b>
        <span className="skill__mult">×{multiplier(state).toFixed(2)}</span>
        {running && <span className="visually-hidden">running</span>}
      </div>
      <Line ledger={state.core} baseExp={balance.skills.coreMastery.baseExp} running={running} perSecond={perSecond} runFill={false} />
      <Line ledger={state.run} baseExp={balance.skills.runMastery.baseExp} running={running} perSecond={perSecond} runFill={true} />
    </div>
  );
}
