import { useEffect, useLayoutEffect, useMemo, useRef, type CSSProperties } from 'react';
import { flushSync } from 'react-dom';
import { balance } from '../balance';
import { skillOf } from '../data/roster';
import { windwardRun } from '../data/windward-run';
import { decayPerSecond, foodCeilingPerSecond, hurtsPerSecond } from '../engine/health';
import { topWorks } from '../engine/resolve';
import { chapterOf, pageOf } from '../engine/rows';
import { ticksToSeconds } from '../engine/time';
import { installDevHandle } from '../state/devHandle';
import { useGame } from '../state/useGame';
import { FADE_MS } from './ActionRow';
import { BottomBar } from './BottomBar';
import { ChapterPanel } from './ChapterPanel';
import { Debug } from './Debug';
import { DeathCard } from './DeathCard';
import { FinishCard } from './FinishCard';
import { Food } from './Food';
import { HealthBar } from './HealthBar';
import { Log } from './Log';
import { Pack } from './Pack';
import { Queue } from './Queue';
import { Rates } from './Rates';
import { SkillsBand } from './SkillsBand';

/** One tick, as CSS: every bar's transition is this long (spec 2026-09-24-screen-pass section 4); and the instruction's fade (section 6). */
const tickVars = { '--tick': `${balance.time.tickIntervalMs}ms`, '--fade': `${FADE_MS}ms` } as CSSProperties;

export function App() {
  const { state, view, log, dispatch, card, speed, setSpeed, save, load, erase } = useGame(windwardRun);
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
      speed: (n) => flushSync(() => setSpeed(n)),
      save,
      load: () => flushSync(load),
      erase: () => flushSync(erase),
    });
  }, [dispatch, setSpeed, save, load, erase]);

  // Every chunk renders the view: while the card is up that is the next life, never a dead state.
  // useGame keeps it settled while live (what the next tick's zero-time resolve would do is already
  // done), so a producer that just filled has left the top and the screen never flashes a stopped game
  // at a handoff. "Working" is topWorks: the top able to run as the state stands. Paused, that is where work
  // resumes, and a top that would pop or wait on a supply is not lit.
  const screen = view;
  const live = view.paused === 'none';
  const ready = useMemo(() => topWorks(view, windwardRun), [view]);
  const working = ready ? 0 : -1;
  // "Running" means working AND the clock is live: no sheen, no stop mark, no countdown on a stopped game.
  const runningActionId = live && working !== -1 ? screen.queue[working]!.actionId : null;
  const runningSkill = runningActionId ? windwardRun.actions[runningActionId]!.verb : null;
  // A hurting row takes health only while it runs (spec 2026-09-23-the-windward-run section 6.1); the rates chunk says so, by its skill.
  const hurts = runningActionId ? hurtsPerSecond(screen, windwardRun) : 0;
  const hurtsBy = runningSkill ? skillOf(windwardRun, runningSkill).name.toLowerCase() : undefined;
  const stopped = !live || working === -1;   // idle, waiting, paused, or the card (the view is on a system pause)
  const clockNote = !live ? 'paused' : screen.queue.length === 0 ? 'idle' : working === -1 ? 'waiting' : null;
  // Everything behind the death card takes no focus and no click. Wrappers carry it; no component gets a prop.
  const inert = card ? true : undefined;

  return (
    <main className="screen" style={tickVars}>
      {/* Health alone on top, sticky (spec 2026-09-24-screen-pass 2.1); the clock, the gear and pause are the bottom bar's. */}
      <div className="top" inert={inert}>
        <HealthBar health={screen.health} max={screen.maxHealth} life={screen.life} />
      </div>
      <div className="inert-wrap" inert={inert}><SkillsBand content={windwardRun} state={screen} runningSkill={runningSkill} /></div>
      <div className="columns">
        <div className="columns__chapter">
          <div inert={inert}>
            <ChapterPanel
              content={windwardRun} book={windwardRun.name} chapter={chapterOf(screen, windwardRun)} page={pageOf(screen, windwardRun)} state={screen} runningActionId={runningActionId}
              onNow={(id, once) => dispatch({ type: 'queue', actionId: id, front: true, once })}
              onQueue={(id, once) => dispatch({ type: 'queue', actionId: id, once })}
              onAutomate={(id, mode) => dispatch({ type: 'automate', actionId: id, mode })}
            />
          </div>
          {/* A finish and a death share the card's place and its Begin: the next life starts at chapter I either way (section 9). */}
          {card && (card.finished
            ? <FinishCard summary={card} content={windwardRun} book={windwardRun.name} onReadAgain={() => dispatch({ type: 'begin' })} />
            : <DeathCard summary={card} content={windwardRun} onBegin={() => dispatch({ type: 'begin' })} />)}
        </div>
        <div className="middle" inert={inert}>
          <Rates decay={decayPerSecond(screen)} ceiling={foodCeilingPerSecond(screen, windwardRun)} hurts={hurts} hurtsBy={hurtsBy} stopped={stopped} />
          <Food state={screen} content={windwardRun} />
          <Pack state={screen} content={windwardRun} />
          <Log lines={log} content={windwardRun} />
        </div>
        <div className="inert-wrap" inert={inert}><Queue state={screen} content={windwardRun} working={working} live={live} onRemove={(entryId) => dispatch({ type: 'remove', entryId })} /></div>
      </div>
      {/* Wrapped with display: contents, so the footer stays a direct grid item: a bare wrapper would be its containing block and sticky would have nowhere to stick. */}
      <div className="inert-wrap" inert={inert}>
        <BottomBar clockSeconds={ticksToSeconds(screen.runTicks)} note={clockNote} live={live} card={card !== null} onPause={() => dispatch({ type: 'pause' })} onResume={() => dispatch({ type: 'resume' })} onErase={erase} />
      </div>
      {/* Dev builds only, outside every inert wrapper: dying and beginning again from it is the point (spec 2026-09-24-screen-pass 5.1). It reads the committed state. */}
      {import.meta.env.DEV && <Debug content={windwardRun} state={state} stopped={stopped} speed={speed} onSpeed={setSpeed} dispatch={dispatch} />}
    </main>
  );
}
