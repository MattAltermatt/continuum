import { useEffect, useLayoutEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import { scrub, SCRUB_HEAD, SCRUB_ORDER } from '../data/scrub';
import { firstRunnable } from '../engine/queue';
import { ticksPerSecond, ticksToSeconds } from '../engine/time';
import { installDevHandle } from '../state/devHandle';
import { useGame } from '../state/useGame';
import { ChapterPanel } from './ChapterPanel';
import { clock } from './format';
import { PAUSE, PLAY } from './glyphs';
import { HealthBar } from './HealthBar';
import { GearIcon } from './icons';
import { Log } from './Log';
import { Pack } from './Pack';
import { Queue } from './Queue';
import { SkillsBand } from './SkillsBand';

export function App() {
  const { state, log, dispatch } = useGame(scrub);
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

  const working = firstRunnable(state, scrub);
  const live = state.paused === 'none' && !state.dead;
  // "Running" means working AND the clock is live: no sheen, no stop mark, no countdown on a stopped game.
  const runningActionId = live && working !== -1 ? state.queue[working]!.actionId : null;
  const runningSkill = runningActionId ? scrub.actions[runningActionId]!.verb : null;
  const clockNote = state.dead ? null : !live ? 'paused' : state.queue.length === 0 ? 'idle' : working === -1 ? 'waiting' : null;

  return (
    <main className="screen">
      <div className="top">
        <div className="top__health">
          <HealthBar health={state.health} max={state.maxHealth} />
          {/* Over the health chunk, where the eye already is, and out of the layout flow so nothing below moves. */}
          {state.dead && <div className="dead" role="alert">Dead at {clock(ticksToSeconds(state.runTicks))}. Rebirth is a later milestone.</div>}
        </div>
        <div className="corner">
          <GearIcon aria-hidden="true" className="corner__gear" />
          <span role="timer" className={`corner__clock${clockNote ? ' corner__clock--dim' : ''}`} aria-label="run clock">
            {clock(ticksToSeconds(state.runTicks))}{clockNote && <small> {clockNote}</small>}
          </span>
          {state.dead ? null : state.paused === 'none'
            ? <button type="button" className="btn" aria-label="pause" onClick={() => dispatch({ type: 'pause' })}>{PAUSE}</button>
            : <button type="button" className="btn btn--play" aria-label="resume" onClick={() => dispatch({ type: 'resume' })}>{PLAY}</button>}
          <span className="visually-hidden">{ticksPerSecond()} ticks per second</span>
        </div>
      </div>
      <SkillsBand skills={state.skills} runningSkill={runningSkill} />
      <div className="columns">
        <ChapterPanel
          content={scrub} order={SCRUB_ORDER} head={SCRUB_HEAD} state={state} runningActionId={runningActionId}
          onNow={(id) => dispatch({ type: 'queue', actionId: id, front: true })}
          onQueue={(id) => dispatch({ type: 'queue', actionId: id })}
        />
        <div className="middle">
          <Pack state={state} content={scrub} />
          <Log lines={log} content={scrub} />
        </div>
        <Queue state={state} content={scrub} working={working} live={live} dead={state.dead} onRemove={(id) => dispatch({ type: 'remove', actionId: id })} />
      </div>
    </main>
  );
}
