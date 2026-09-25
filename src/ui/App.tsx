import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { flushSync } from 'react-dom';
import { balance } from '../balance';
import { skillOf } from '../data/roster';
import type { Book } from '../data/types';
import { modeOf } from '../engine/automation';
import { decayPerSecond, foodCeilingPerSecond, rowHealthPerSecond } from '../engine/health';
import { topWorks } from '../engine/resolve';
import { chapterOf, isDone, pageOf } from '../engine/rows';
import { ticksToSeconds } from '../engine/time';
import { installDevHandle } from '../state/devHandle';
import { useGame } from '../state/useGame';
import { BottomBar } from './BottomBar';
import { ChapterPanel } from './ChapterPanel';
import { Debug } from './Debug';
import { DeathCard } from './DeathCard';
import { FinishCard } from './FinishCard';
import { Food } from './Food';
import { duration } from './format';
import { Log } from './Log';
import { Pack } from './Pack';
import { Queue, queuedSeconds } from './Queue';
import { Region } from './Region';
import { Sheet, type SheetName } from './Sheet';
import { SkillCell } from './SkillCell';
import { SkillsBand } from './SkillsBand';
import { TabCard } from './TabCard';
import { TopStrip, topLabel } from './TopStrip';
import { useTier } from './useTier';

/** One tick, as CSS: every bar's transition is this long (spec 2026-09-24-screen-pass section 4). */
const tickVars = { '--tick': `${balance.time.tickIntervalMs}ms` } as CSSProperties;

export function App({ book }: { book: Book }) {
  const { state, view, log, dispatch, card, speed, setSpeed, save, load, erase, elsewhere, playHere } = useGame(book);
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
  // A held or lost tab (#73) shows the loaded save at rest: nothing ticks, so nothing reads as running.
  const live = view.paused === 'none' && elsewhere === 'none';
  const ready = useMemo(() => topWorks(view, book), [view, book]);
  const working = ready ? 0 : -1;
  // "Running" means working AND the clock is live: no sheen, no stop mark, no countdown on a stopped game.
  const runningActionId = live && working !== -1 ? screen.queue[working]!.actionId : null;
  const runningSkill = runningActionId ? book.actions[runningActionId]!.verb : null;
  // A row's health rate applies only while it runs (spec 2026-09-23-the-windward-run section 6.1, 2026-09-24-proving-ground section 1); the rates chunk says so, by its skill.
  const row = runningActionId ? rowHealthPerSecond(screen, book) : 0;
  const rowBy = runningSkill ? skillOf(book, runningSkill).name.toLowerCase() : undefined;
  const stopped = !live || working === -1;   // idle, waiting, paused, or the card (the view is on a system pause)
  const net = foodCeilingPerSecond(screen, book) + row - decayPerSecond(screen);
  const label = topLabel({ elsewhere, card: card !== null, paused: view.paused !== 'none' && elsewhere === 'none' && card === null, queued: screen.queue.length, fighting: row < 0, health: screen.health, net, life: screen.life });
  // Everything behind the death card, or the tab card (#73), takes no focus and no click. Wrappers carry it; no component gets a prop.
  const carded = card !== null || elsewhere !== 'none';
  const page = pageOf(screen, book);
  const inert = carded ? true : undefined;

  // The body's arrangement (spec 2026-09-25-the-watched-screen section 3) and which operated region is open over it.
  // On the desktop tier the sheets are docked columns, always open, and the bar has no buttons for them.
  const tier = useTier();
  const docked = tier === 'O';
  const [sheet, setSheet] = useState<SheetName | null>(null);
  const close = useCallback(() => setSheet(null), [setSheet]);
  // A card closes any open sheet: the card takes the sheet's place, and nothing behind it opens (section 4.7).
  // Adjusted during render on the card's arrival, React's pattern for state that follows a prop, not an effect after a paint.
  const [wasCarded, setWasCarded] = useState(carded);
  if (carded !== wasCarded) {
    setWasCarded(carded);
    if (carded) setSheet(null);
  }
  // Docked, the sheets are columns with no button: a sheet left open would spring back on the way down to a narrower window.
  const [wasDocked, setWasDocked] = useState(docked);
  if (docked !== wasDocked) {
    setWasDocked(docked);
    if (docked) setSheet(null);
  }
  // The tab's title says idle while nothing is queued and the clock runs, for the player who is elsewhere (#91).
  const nudge = live && screen.queue.length === 0;
  useEffect(() => {
    document.title = nudge ? 'Continuum \u00b7 idle' : 'Continuum';
    return () => { document.title = 'Continuum'; };
  }, [nudge]);

  // The screen's one cell (section 4.2): the running skill, or the last that ran, dimmed; a fresh run's is the same box, empty.
  // Its ledger pops out on every tier (the user's call, 2026-09-25); the skills sheet opens from the bar's button.
  const shownSkill = runningSkill ?? screen.lastVerb ?? null;   // `?? null`: a hand-built state loaded through the dev handle skips reconcile
  const top = screen.queue[0] === undefined ? undefined : book.actions[screen.queue[0].actionId];
  const skillNote = runningSkill !== null ? undefined : shownSkill !== null ? 'last used' : 'nothing yet';
  const skillNow = (
    <Region name="skill" title="skill" note={skillNote && <span>{skillNote}</span>}>
      {shownSkill === null
        ? <SkillCell skill={book.roster[0]!} content={book} state={screen} running={false} row={null} empty />
        : <SkillCell skill={skillOf(book, shownSkill)} content={book} state={screen} running={runningSkill !== null} row={runningSkill !== null && top?.verb === runningSkill ? top : null} idle={runningSkill === null} />}
    </Region>
  );
  const skillsHead = <div className="region__head"><span>skills {'\u00b7'} {book.roster.length}</span><span>{runningSkill ? `${skillOf(book, runningSkill).name.toLowerCase()} is running` : ''}</span></div>;
  // The actions button's count: the page's rows still in the player's hands (not chipped, not built).
  const actionsCount = page.order.filter((id) => { const a = book.actions[id]!; return modeOf(screen, book, a) === 'off' && !isDone(screen, a); }).length;

  return (
    <main className="screen" style={tickVars}>
      {/* The top strip (spec 2026-09-25-the-watched-screen 4.1): the running head, the health gauge and the rates line, sticky. */}
      <div className="inert-wrap" inert={inert}>
        <TopStrip book={book.name} head={chapterOf(screen, book).head} page={page.name} health={screen.health} max={screen.maxHealth} life={screen.life} label={label} decay={decayPerSecond(screen)} ceiling={foodCeilingPerSecond(screen, book)} row={row} rowBy={rowBy ?? null} />
      </div>
      {/* The body (spec 2026-09-25-the-watched-screen section 3): the watched column, and the three operated regions as sheets over it,
          docked columns on the desktop tier. Each sheet's head is its count or the doing line; the region inside keeps its own. */}
      <div className={`body body--${tier}`}>
        <div className="watch" inert={inert}>
          {skillNow}
          <Food state={screen} content={book} />
          <Queue state={screen} content={book} working={working} live={live} onRemove={(entryId) => dispatch({ type: 'remove', entryId })} />
          <Log lines={log} content={book} />
        </div>
        <Sheet name="skills" open={sheet === 'skills'} docked={docked} inert={inert} onClose={close} head={skillsHead}>
          {/* Inline everywhere: the docked column scrolls, and a pop-out inside a scrolling column clips. The screen's cell has the pop-out. */}
          <SkillsBand content={book} state={screen} runningSkill={runningSkill} ledger="inline" />
        </Sheet>
        {/* The doing line rides the actions sheet's head, live, so a + press is seen under the finger (section 4.5). */}
        <Sheet name="actions" open={sheet === 'actions'} docked={docked} inert={inert} onClose={close} head={<div className="region__head sheet__doing"><span>doing {'\u00b7'} {screen.queue.length}</span>{screen.queue.length === 0 ? <span className="ink-3">idle</span> : <span>{duration(queuedSeconds(screen, book))} queued</span>}</div>}>
          <ChapterPanel
            content={book} book={book.name} chapter={chapterOf(screen, book)} page={page} state={screen} runningActionId={runningActionId}
            onNow={(id, once) => dispatch({ type: 'queue', actionId: id, front: true, once })}
            onQueue={(id, once) => dispatch({ type: 'queue', actionId: id, once })}
            onAutomate={(id, mode) => dispatch({ type: 'automate', actionId: id, mode })}
          />
        </Sheet>
        <Sheet name="pack" open={sheet === 'pack'} docked={docked} inert={inert} onClose={close} head={null}>
          <Pack state={screen} content={book} />
        </Sheet>
        {/* A finish and a death share the card's place and its Begin: the next life starts at chapter I either way (section 9).
            The tab card takes that place, never sits beside it: a held tab that opened a dead save must not offer Begin (#73). */}
        {(card !== null || elsewhere !== 'none') && (
          <div className="veil">
            {elsewhere !== 'none'
              ? <TabCard kind={elsewhere} onPlayHere={playHere} />
              : card && (card.finished
                ? <FinishCard summary={card} content={book} book={book.name} onReadAgain={() => dispatch({ type: 'begin' })} />
                : <DeathCard summary={card} content={book} onBegin={() => dispatch({ type: 'begin' })} />)}
          </div>
        )}
      </div>
      {/* Wrapped with display: contents, so the footer stays a direct grid item: a bare wrapper would be its containing block and sticky would have nowhere to stick. */}
      <div className="inert-wrap" inert={inert}>
        <BottomBar clockSeconds={ticksToSeconds(screen.runTicks)} live={live} card={card !== null} onPause={() => dispatch({ type: 'pause' })} onResume={() => dispatch({ type: 'resume' })} onErase={erase} sheet={sheet} onSheet={setSheet} actionsCount={actionsCount} nudge={nudge} docked={docked} />
      </div>
      {/* Dev builds only, outside every inert wrapper: dying and beginning again from it is the point (spec 2026-09-24-screen-pass 5.1). It reads the committed state. */}
      {import.meta.env.DEV && <Debug content={book} state={state} stopped={stopped} speed={speed} onSpeed={setSpeed} dispatch={dispatch} />}
    </main>
  );
}
