import { useEffect, useLayoutEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import { scrub, SCRUB_HEAD, SCRUB_ORDER } from '../data/scrub';
import { covers, decayPerSecond, foodCeilingPerSecond } from '../engine/health';
import { firstRunnable } from '../engine/queue';
import { ticksPerSecond, ticksToSeconds } from '../engine/time';
import { installDevHandle } from '../state/devHandle';
import { useGame } from '../state/useGame';
import { ChapterPanel } from './ChapterPanel';
import { DeathCard } from './DeathCard';
import { Food } from './Food';
import { clock } from './format';
import { PAUSE, PLAY } from './glyphs';
import { HealthBar } from './HealthBar';
import { GearIcon } from './icons';
import { Log } from './Log';
import { Pack } from './Pack';
import { Queue } from './Queue';
import { Rates } from './Rates';
import { SkillsBand } from './SkillsBand';

export function App() {
  const { state, view, log, dispatch, card } = useGame(scrub);
  // The dev handle reads the committed state. The handle wraps its writes in
  // flushSync, so a read on the line after a dispatch or step sees its result;
  // the layout effect updates the ref inside that same commit.
  const latest = useRef(state);
  useLayoutEffect(() => { latest.current = state; }, [state]);
  useEffect(() => {
    installDevHandle({
      state: () => latest.current,
      dispatch: (a) => flushSync(() => dispatch(a)),
      step: (n) => flushSync(() => { for (let i = 0; i < n; i++) dispatch({ type: 'tick' }); }),
    });
  }, [dispatch]);

  // Every chunk renders the view: while the card is up that is the next life, never a dead state.
  const working = firstRunnable(view, scrub);
  const live = view.paused === 'none';
  // "Running" means working AND the clock is live: no sheen, no stop mark, no countdown on a stopped game.
  const runningActionId = live && working !== -1 ? view.queue[working]!.actionId : null;
  const runningSkill = runningActionId ? scrub.actions[runningActionId]!.verb : null;
  const stopped = !live || working === -1;   // idle, waiting, paused, or the card (the view is on a system pause)
  const clockNote = !live ? 'paused' : view.queue.length === 0 ? 'idle' : working === -1 ? 'waiting' : null;
  // Everything behind the death card takes no focus and no click. Wrappers carry it; no component gets a prop.
  const inert = card ? true : undefined;

  return (
    <main className="screen">
      <div className="top" inert={inert}>
        <div className="top__health">
          <HealthBar health={view.health} max={view.maxHealth} />
        </div>
        <div className="corner">
          <GearIcon aria-hidden="true" className="corner__gear" />
          <span role="timer" className={`corner__clock${clockNote ? ' corner__clock--dim' : ''}`} aria-label="run clock">
            {clock(ticksToSeconds(view.runTicks))}{clockNote && <small> {clockNote}</small>}
          </span>
          {/* Behind the card the control's box stays, unseen, so the corner does not reflow on death or Begin. */}
          {card ? <span className="btn btn--placeholder" aria-hidden="true" /> : view.paused === 'none'
            ? <button type="button" className="btn" aria-label="pause" onClick={() => dispatch({ type: 'pause' })}>{PAUSE}</button>
            : <button type="button" className="btn btn--play" aria-label="resume" onClick={() => dispatch({ type: 'resume' })}>{PLAY}</button>}
          <span className="visually-hidden">{ticksPerSecond()} ticks per second</span>
        </div>
      </div>
      <div className="inert-wrap" inert={inert}><SkillsBand skills={view.skills} runningSkill={runningSkill} /></div>
      <div className="columns">
        <div className="columns__chapter">
          <div inert={inert}>
            <ChapterPanel
              content={scrub} order={SCRUB_ORDER} head={SCRUB_HEAD} state={view} runningActionId={runningActionId}
              onNow={(id) => dispatch({ type: 'queue', actionId: id, front: true })}
              onQueue={(id) => dispatch({ type: 'queue', actionId: id })}
            />
          </div>
          {card && <DeathCard summary={card} onBegin={() => dispatch({ type: 'begin' })} />}
        </div>
        <div className="middle" inert={inert}>
          <Rates decay={decayPerSecond(view)} ceiling={foodCeilingPerSecond(view, scrub)} covered={covers(view, scrub)} stopped={stopped} />
          <Food state={view} content={scrub} />
          <Pack state={view} content={scrub} />
          <Log lines={log} content={scrub} />
        </div>
        <div className="inert-wrap" inert={inert}><Queue state={view} content={scrub} working={working} live={live} onRemove={(id) => dispatch({ type: 'remove', actionId: id })} /></div>
      </div>
    </main>
  );
}
