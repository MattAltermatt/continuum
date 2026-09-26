# The death overlay — plan (2026-09-25)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the death and finish cards with one overlay that lists what
the life kept (health, then every skill's core from and to), charts the
selected row across every life, shows the dead world behind it, and resets
only on Begin.

**Architecture:** The engine keeps one small `LifeRecord` per ended life on
`GameState.lives`, appended by `rebirth`. `useGame` stops drawing a reborn
view behind the card: the screen is the committed state, dead or alive, and a
derived `history` (the records plus the dead life's own) feeds the chart. The
UI is two new components, `LifeChart` (SVG sized to its box) and
`DeathOverlay` (the dialog, the list, the look toggle and the pill), in the
cards' existing seat.

**Tech stack:** TypeScript, React 19, Vitest (+ jsdom for components),
lucide-react. No new dependency.

**Spec:** `docs/specs/2026-09-25-death-overlay.md` (#90). Mockup:
`docs/mockups/2026-09-25-death-overlay.html`. Branch `feature/death-overlay`.

**Status (2026-09-25): built on `feature/death-overlay`, code panel round 1 fixed (9998a3f and after); awaiting the user's look before the merge.**

## Revisions

**Revision 3 (panel round 3).** Both panellists built Tasks 1–4 verbatim and
reproduced the same defect: after a finish, `ready` fell through to
`topWorks`, and resolve never checks `dead`, so a workable row queued behind
the finish was lit. `ready` is now gated on the card as a whole. Also: the
mid-fight test's entry selector (entries are `div.entry`, not list items); the
tab card is not excluded from the lighting, and that is right (it shows the
same dead state, inert, behind the tab card), so the Revision 2 sentence that
said otherwise is corrected here; Task 4 names the icon size, the sub-line
and chart-head spacing, and which `.card__begin` properties `.over__begin`
takes; Health's `now` is `summary.maxHealthTo`; three stale test and comment
names are renamed; `LifeChart` returns nothing for no points; accepted risk 1
is rewritten and risk 6 (a positive `net` on the kill screen) is logged.

**Revision 2 (panel round 2).** Round 1's fixes had gone into a header only;
every task body below is now rewritten to carry them, and the header is gone.
New in round 2: the Task 1 tests agree with a seeded `deadLife().lives`; Task 3
is written out in full (measured viewBox with a first measure in a layout
effect, every dot drawn, `DOT_MIN`/`DOT_SPACING` valued, x labels that never
collide); the overlay CSS for tiers P and O goes in a **second**
`@container (min-width: 640px)` block after the base rules, since a container
query adds no specificity and the existing block comes first; the dead-row
lighting is gated on a **death** (`card !== null && !card.finished`), never a
finish; Task 2's mid-fight test uses the setup the panel
mutation-tested; the `coreGains` removal names each line; focus moves in the
click handlers under `flushSync`, no effect; look mode keeps the dialog mounted
and `hidden`, so the list's scroll and the chart's measure survive the toggle;
#49 and #75 get no tracker comments (the record carries neither's data).

**Revision 1 (panel round 1)**, now inside the tasks: `lives` in the
classification test's `DERIVED`; no `JSX.Element` annotations (React 19 types
have none global); tier I is the base CSS; Task 2 names its real fallout
(`App.test.tsx:131-139`); the row the life died in is lit and its rate shows;
`.pick__*` cells always rendered; a heart icon for Health; the chart foot from
the mockup; `lives` guards for a hand-loaded state; `DeathSummary.coreGains`
removed; Task 4 inline with a Chrome look before the old cards go.

## Global constraints

- `decision #4`: `src/engine/` imports nothing from `src/ui/` or `src/state/`,
  no DOM; the clock and the seed stay parameters.
- `decision #3`: no tuning number outside `balance.ts`. The tuning-literal hook
  scans only `src/engine`, `src/data`, `src/state`; in `src/ui/` chart geometry
  and display precision are named `const`s by convention (as `CARD_DECIMALS`
  was), each with a one-line comment saying it is display.
- Glyphs are `\u` escapes from `src/ui/glyphs.ts` (`RISING` = `▲`, `ARROW`
  = `→`) in components; tests may write the escape.
- A component test's first line is `// @vitest-environment jsdom`.
- `active`/`inactive`, never `enabled`/`disabled`, for app state.
- No return-type annotations on components (React 19 has no global `JSX`).
- Words on screen: `Life 8 ends`; the clock as `clock()` prints it plus
  ` alive` (`06:05 alive`); `reached II · The Hollow Isle`;
  `fell during Fight pirates`; `The Windward Run, finished`; `finish 2`;
  `Health`; `Health · max health by life`; `Fight · core level by life`;
  `now 142.9`; `life 1 → 8 · the last point is this life`;
  `see how it ended`; `Begin life 9`; `Read again`; `▲ back to life 8`;
  `▲ back` (after a finish).
- Commits: terse one-line subjects, no trailers.

## Review focus

1. **A save from before this slice** (no `lives`, a malformed `lives`, a record
   naming a skill the book dropped) loads; its first overlay draws one point.
   → Task 1 (save), Task 3 (one point), Task 4 (one record).
2. **Many lives** (a hundred): every dot drawn, no `NaN`, life labels never
   closer than `MIN_LABEL_GAP` pixels at any count from 1 to 120, grid lines at
   most `MAX_GRID_LINES + 1`. → Task 3.
3. **Flat values** (a skill at 0 every life, health that did not rise): an axis
   with height, no `NaN`. → Task 3.
4. **The kill screen after a death mid-fight** shows the fight as the lit row
   with its gauge, and its rate on the rates line; **after a finish** nothing
   is lit. → Task 2.
5. **The look toggle and focus under StrictMode**: Begin has focus on open,
   the pill's back button after `see how it ended`, `see how it ended` after
   back; the selection and the list's scroll survive; the body stays inert.
   → Task 4.

---

### Task 1: The record of lives (engine + save) — inline

**Files:**
- Modify: `src/engine/types.ts` (`GameState`, near `lifeStartCore`)
- Modify: `src/engine/rebirth.ts`, `src/engine/queue.ts` (`blankRun`)
- Modify: `src/state/save.ts` (`reconcile`)
- Test: `src/engine/rebirth.test.ts`, `src/state/save.test.ts`

**Interfaces — produces:**
- `src/engine/types.ts`:
  ```ts
  /** One ended life, as it ended: what the death overlay charts (#90, spec 2026-09-25-death-overlay section 3). */
  export interface LifeRecord {
    readonly life: number;
    /** Max health after this life's gain. */
    readonly maxHealth: number;
    /** Core level of every roster skill as the life ended. */
    readonly core: Readonly<Record<SkillId, number>>;
  }
  ```
  and on `GameState`: `readonly lives: readonly LifeRecord[];` with the comment
  `/** Every ended life, oldest first; appended by rebirth, kept across lives (#90). */`.
- `src/engine/rebirth.ts`: `export function lifeRecord(dead: GameState): LifeRecord`.

- [ ] **Step 1: Failing engine tests.** In `rebirth.test.ts`: import
  `lifeRecord`; give `deadLife()` a seeded history,
  `lives: [{ life: 1, maxHealth: 100.5, core: { forage: 1, mine: 0, build: 0 } }],`
  (so "appends" is distinguishable from "replaces"); add `'lives'` to
  `DERIVED` in the every-field-is-classified block (~line 150); append:

```ts
describe('the record of lives (#90)', () => {
  it('lifeRecord is the life as it ended: its number, every core level, and the max health the card shows as "to"', () => {
    const dead = deadLife();
    const r = lifeRecord(dead);
    expect(r.life).toBe(2);
    expect(r.core).toEqual({ forage: 3, mine: 1, build: 0 });
    expect(r.maxHealth).toBe(deathSummary(dead, fixture).maxHealthTo);
  });
  it('rebirth appends the dead life after the history it had, and the next life starts at the max health the record names', () => {
    const next = rebirth(deadLife());
    expect(next.lives).toEqual([...deadLife().lives, lifeRecord(deadLife())]);
    expect(next.maxHealth).toBe(next.lives.at(-1)!.maxHealth);
  });
  it('a second death appends a second record, oldest first', () => {
    const second = { ...rebirth(deadLife()), dead: true, runTicks: 3 * minute };
    expect(rebirth(second).lives.map((r) => r.life)).toEqual([1, 2, 3]);
  });
  it('a state that is not dead is returned as it is', () => {
    const alive = { ...deadLife(), dead: false };
    expect(rebirth(alive)).toBe(alive);
  });
  it('a fresh game has no history', () => {
    expect(newState(roster).lives).toEqual([]);
  });
});
```

- [ ] **Step 2:** `npx vitest run src/engine/rebirth.test.ts` → FAIL (`lifeRecord` not exported; `lives` undefined; the classification test).

- [ ] **Step 3: Implement.** `types.ts`: `LifeRecord` and the field (import
  `SkillId` if the file does not already). `queue.ts` `blankRun`: `lives: [],`
  after `lastVerb: null,`. `rebirth.ts`:

```ts
/** The life as it ended, for the death overlay's chart (#90). Its max health is the card's "to". */
export function lifeRecord(dead: GameState): LifeRecord {
  const core = Object.fromEntries(Object.keys(dead.skills).map((id) => [id, dead.skills[id]!.core.level]));
  return { life: dead.life, maxHealth: maxHealthFor(dead.rebirthBonus + rebirthGain(dead.runTicks)), core };
}
```

  and in `rebirth`'s returned object, beside `completionCounts`:
  `lives: [...(dead.lives ?? []), lifeRecord(dead)],` with the comment
  `// ?? []: a hand-built state loaded through the dev handle skips reconcile.`

- [ ] **Step 4:** `npx vitest run src/engine/rebirth.test.ts && npm run typecheck` → PASS.

- [ ] **Step 5: Failing save tests** in `src/state/save.test.ts`, using that
  file's own helpers for writing and loading a save and its own book (the
  Salt Road: forage, mine, build). Three cases through `loadSave`:
  1. `state.lives` deleted → loads, `state.lives` is `[]`.
  2. `lives: 'nonsense'` → `[]`; `lives: [{ life: 1 }]` → `[]` (a record without numbers goes).
  3. `lives: [{ life: 1, maxHealth: 101, core: { forage: 2, gone: 5 } }]` →
     `[{ life: 1, maxHealth: 101, core: { forage: 2 } }]`; and a round trip of
     a model with two good records returns them equal and in order.

- [ ] **Step 6:** `npx vitest run src/state/save.test.ts` → FAIL.

- [ ] **Step 7: Implement** in `save.ts` beside the other guards:

```ts
/** A record the chart can draw: finite numbers, core levels keyed by skill. */
const isRecordOfLife = (r: unknown): r is LifeRecord =>
  isRecord(r) && typeof r.life === 'number' && Number.isFinite(r.life) && typeof r.maxHealth === 'number' && Number.isFinite(r.maxHealth)
  && isRecord(r.core) && Object.values(r.core).every((v) => typeof v === 'number' && Number.isFinite(v));
```

  and in `reconcile`'s `kept`:

```ts
    // A save from before #90 has no history; a record the chart cannot draw goes, and a skill the roster lacks leaves its record.
    lives: (Array.isArray(state.lives) ? state.lives : []).filter(isRecordOfLife)
      .map((r) => ({ ...r, core: keep(r.core, (id) => book.roster.some((s) => s.id === id)) })),
```

  importing `LifeRecord` from `../engine/types`.

- [ ] **Step 8:** `npm test && npm run typecheck && npm run lint` → all green, lint silent.

- [ ] **Step 9:** `git add src/engine src/state/save.ts src/state/save.test.ts && git commit -m "engine: a record of every ended life, kept across rebirths (#90)"`

---

### Task 2: The screen shows the dead life (state + App) — inline

**Files:** `src/state/useGame.ts` (~380–386, the return type ~226),
`src/ui/App.tsx` (~35–75), `src/state/useGame.test.tsx` (~268, ~274),
`src/ui/App.test.tsx` (~121–140 and new tests).

**Interfaces:** consumes `lifeRecord`, `LifeRecord`. Produces: `useGame`
returns `history: readonly LifeRecord[]` and no longer returns `view`.

- [ ] **Step 1: Rewrite the useGame tests.** At ~268 replace the `view` line
  with `expect(result.current.history).toEqual([]);` and retitle the test
  "alive, there is no card and no history". Replace the test at ~274
  with:

```ts
  it('a death keeps the dead state as the screen; the card and the history are derived from it, and Begin appends the life', () => {
    const { result } = renderHook(() => useGame(saltRoadFixture));
    die(result, 50);
    const { state, card, history, log } = result.current;
    expect(state.dead).toBe(true);
    expect(card?.life).toBe(1);
    expect(card?.runTicks).toBe(51);
    expect(history).toHaveLength(1);
    expect(history[0]!.life).toBe(1);
    expect(history[0]!.maxHealth).toBe(card!.maxHealthTo);
    expect(log[0]!.event).toEqual({ type: 'died', runTicks: 51 });
    act(() => result.current.dispatch({ type: 'begin' }));
    expect(result.current.state.life).toBe(2);
    expect(result.current.state.lives).toEqual(history);
    expect(result.current.history).toEqual([]);
  });
```

- [ ] **Step 2: Rewrite the App death test's reborn-view lines**
  (`App.test.tsx` ~131–139, which assert clock `00:00`, `100.0 / 100.0`,
  `doing · 0`, three blank food slots and a dim food cell). Read the test's
  setup, then assert the dead life instead: the clock is not `00:00`; the
  health gauge's value begins `0 /`; the doing head is not `doing · 0` (the
  queue it died with); the food slots are what the pack held (fewer than three
  blank). Measured by the panel on that setup: `00:04`, `0 / 100`, `doing · 1`,
  two blank slots.

- [ ] **Step 3: New App tests** beside it:

```ts
  it('a death mid-fight: the kill screen lights the fight with its gauge, and its hurt is on the rates line', () => {
    render(<App book={windwardRun} />);
    const handle = window.continuum!;
    const hurts = balance.content.windward.pirates.hurts;
    act(() => { handle.dispatch({ type: 'load', model: { state: built(handle.state(), 'hull', 'net', 'satchel', 'sails'), log: [], nextSeq: 0 } }); });
    act(() => { handle.dispatch({ type: 'queue', actionId: 'pirates', front: true }); handle.step(1); });
    act(() => { handle.dispatch({ type: 'die' }); });
    const first = screen.getByLabelText('doing').querySelector('.entry')!;
    expect(first).toHaveClass('entry--on');
    expect(first).toHaveTextContent(/pirates/);
    expect(first.querySelector('.gauge')).not.toBeNull();
    const rowCell = screen.getByLabelText('rates').querySelectorAll('.rates__cell')[2]!;
    expect(rowCell).toHaveTextContent(new RegExp(`fight.*−${hurts.toFixed(2)}`));
  });
  it('after a finish nothing behind the card is lit, whatever the queue holds', () => {
    render(<App book={windwardRun} />);
    const handle = window.continuum!;
    act(() => { handle.dispatch({ type: 'queue', actionId: 'fish' }); handle.step(1); });
    act(() => { handle.dispatch({ type: 'load', model: { state: { ...handle.state(), dead: true, finished: true, paused: 'system' }, log: [], nextSeq: 0 } }); });
    expect(screen.getByLabelText('doing').querySelector('.entry--on')).toBeNull();
  });
```

  (Selectors verified in round 3: an entry is `div.entry`, lit `entry--on`,
  its gauge `.gauge`; the rates cells are `.rates__cell`.)

- [ ] **Step 4:** `npx vitest run src/state/useGame.test.tsx src/ui/App.test.tsx` → FAIL.

- [ ] **Step 5: Implement.** `useGame.ts`: module-level
  `const NO_LIVES: readonly LifeRecord[] = [];`; replace the `view` memo with

```ts
  // Dead until Begin, and the screen shows it so: the kill screen is the dead state itself (spec 2026-09-25-death-overlay 2.2).
  // The chart's points are the history and then the life on the screen, derived, never stored twice.
  // `?? NO_LIVES`: a hand-built state loaded through the dev handle skips reconcile.
  const history = useMemo(() => (model.state.dead ? [...(model.state.lives ?? NO_LIVES), lifeRecord(model.state)] : NO_LIVES), [model.state]);
```

  return `{ state: model.state, log: model.log, dispatch, card, history, speed, setSpeed, save, load, erase, elsewhere, playHere }`;
  the return type's `view: GameState` becomes `history: readonly LifeRecord[]`.
  Keep the `rebirth` import (the `begin` case uses it).

  `App.tsx`: destructure without `view` (and without `history` until Task 4);
  `const screen = state;` with the comment rewritten: the screen is the
  committed state; while a card is up that is the life that ended (spec
  2026-09-25-death-overlay 2.2). Every other `view` reads `screen`. Then:

```ts
  // After a death the row the life died in is the lit row and its rate is on the rates line (spec 2026-09-25-death-overlay 2.2):
  // resolve would back a fight off a dead state, so it is not asked. A finish slices its row off first, so after one nothing is lit.
  // Behind any card topWorks is not asked (resolve does not check `dead`): after a finish nothing is lit, whatever is queued.
  const dying = card !== null && !card.finished;
  const ready = useMemo(() => (card !== null ? dying && screen.queue.length > 0 : topWorks(screen, book)), [card, dying, screen, book]);
```

  and where `row`/`rowBy` are computed, read the top's row when `dying`:
  `const rateId = runningActionId ?? (dying ? screen.queue[0]?.actionId ?? null : null);`
  then `row = rateId ? rowHealthPerSecond(screen, book) : 0` and `rowBy` from
  `rateId`'s verb. `runningActionId` itself (the sheen, the countdown) is
  unchanged: `live` is false on a dead state, so nothing animates.

- [ ] **Step 6:** `npm test && npm run typecheck && npm run lint` → green. Then
  revert the `ready` line to `topWorks(screen, book)` and confirm both new
  tests fail; restore. Revert the `rateId` fallback and confirm it fails;
  restore.

- [ ] **Step 7:** `git add src/state src/ui/App.tsx src/ui/App.test.tsx && git commit -m "state: the screen behind the card is the life that ended (#90)"`

---

### Task 3: LifeChart — subagent (Opus)

**Files:** Create `src/ui/LifeChart.tsx`, `src/ui/LifeChart.test.tsx`.

**Interfaces — produces:**

```ts
export interface ChartPoint { readonly life: number; readonly value: number }
export function LifeChart({ points, kind, label }: { points: readonly ChartPoint[]; kind: 'health' | 'level'; label: string })
```

No return-type annotation. Imports only `react`. With no points it returns
`null` (the overlay always has at least one; this keeps `Math.min()` of
nothing out of the SVG). It renders
`<div className={`chart__box chart__box--${kind}`} ref={boxRef}>` wrapping
`<svg className="chart__svg" role="img" aria-label={label} viewBox={`0 0 ${w} ${h}`}>`.

**Size.** `const [size, setSize] = useState({ w: W, h: H })`. In a
`useLayoutEffect` on mount: read `boxRef.current.getBoundingClientRect()`
and, if both sides are positive, set it (so the first paint is at the real
size); then, when `typeof ResizeObserver !== 'undefined'`, observe the box and
set `{ w, h }` from each entry's `contentRect`, ignoring a zero side; disconnect
on unmount. jsdom has neither a real rect nor `ResizeObserver`, so tests see
the `W × H` fallback. One user unit is one pixel, so labels are 11px at every
tier.

**Constants** (top of file; each commented as display, not tuning):
`W = 600`, `H = 300` (fallback size), `PAD = 28`, `FONT = 11`, `DOT = 3`,
`DOT_NOW = 5`, `DOT_MIN = 1`, `DOT_SPACING = 3` (a dot's radius is at most a
third of the pitch between lives), `HEALTH_STEP = 10`, `HEALTH_LINES = 4`,
`MAX_GRID_LINES = 8`, `MIN_LABEL_GAP = 28` (pixels between life labels).

**Geometry.**
- `n = points.length`; `x(i) = n === 1 ? w / 2 : PAD + i * (w - 2 * PAD) / (n - 1)`.
- `health`: `lo = Math.floor(min / HEALTH_STEP) * HEALTH_STEP`, `hi = Math.ceil(max / HEALTH_STEP) * HEALTH_STEP`, and `hi = lo + HEALTH_STEP` when equal; `HEALTH_LINES + 1` grid lines at `lo + (hi - lo) * s / HEALTH_LINES`, labelled `Math.round(v)`.
- `level`: `lo = 0`, `hi = Math.max(1, max + 1)`; `every = Math.ceil(hi / MAX_GRID_LINES)`; a grid line at each multiple of `every` from 0 to `hi`, labelled with the level.
- `y(v) = h - PAD - (v - lo) * (h - 2 * PAD) / (hi - lo)`.
- Grid: `<line className="chart__grid">` and `<text className="chart__y" fontSize={FONT}>` per line, **ascending in the DOM** (lowest first).
- Line: `<polyline className={`chart__line chart__line--${kind}`} points={pairs}>` where `pairs` is `x,y` joined by single spaces; omitted when `n === 1`.
- Dots: one `<circle className="chart__dot">` per point, radius
  `r = Math.min(DOT, Math.max(DOT_MIN, (w - 2 * PAD) / Math.max(1, n - 1) / DOT_SPACING))`;
  the last point also `chart__dot--now` with radius `DOT_NOW`.
- Life labels `<text className="chart__x" fontSize={FONT}>` at `x={x(i)}`: the
  last point always; walking back from it, a label at index `i` only when its
  `x` is at least `MIN_LABEL_GAP` left of the last label placed; the first
  point takes part in that walk like any other. Emit them in ascending order.
- Colours are classes only; the CSS is Task 4's.

- [ ] **Step 1: Tests** (`src/ui/LifeChart.test.tsx`):

```ts
// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import { LifeChart, type ChartPoint } from './LifeChart';

const pts = (values: number[], first = 1): ChartPoint[] => values.map((value, i) => ({ life: first + i, value }));
const draw = (points: ChartPoint[], kind: 'health' | 'level' = 'level') =>
  render(<LifeChart points={points} kind={kind} label="chart" />).container.querySelector('svg')!;
const num = (el: Element, a: string) => Number(el.getAttribute(a));

describe('LifeChart', () => {
  it('draws one dot per life through one line, the last dot marked as this life', () => {
    const svg = draw(pts([1, 2, 2, 4]));
    expect(svg.querySelectorAll('.chart__dot')).toHaveLength(4);
    expect(svg.querySelector('.chart__line')!.getAttribute('points')!.split(' ')).toHaveLength(4);
    expect(svg.querySelectorAll('.chart__dot--now')).toHaveLength(1);
    expect(svg.querySelectorAll('.chart__dot')[3]).toHaveClass('chart__dot--now');
  });
  it('a higher value sits higher on screen, and lives run left to right', () => {
    const dots = [...draw(pts([1, 3])).querySelectorAll('.chart__dot')];
    expect(num(dots[1]!, 'cy')).toBeLessThan(num(dots[0]!, 'cy'));
    expect(num(dots[1]!, 'cx')).toBeGreaterThan(num(dots[0]!, 'cx'));
  });
  it('one recorded life draws one dot and no line, and no NaN anywhere', () => {
    const svg = draw(pts([2]));
    expect(svg.querySelectorAll('.chart__dot')).toHaveLength(1);
    expect(svg.querySelector('.chart__line')).toBeNull();
    expect(svg.outerHTML).not.toMatch(/NaN|Infinity/);
  });
  it('flat values still have an axis with height: a skill at zero, health that did not rise', () => {
    expect(draw(pts([0, 0, 0])).outerHTML).not.toMatch(/NaN|Infinity/);
    const flat = draw(pts([100, 100]), 'health');
    expect(flat.outerHTML).not.toMatch(/NaN|Infinity/);
    expect([...flat.querySelectorAll('.chart__y')].map((t) => t.textContent)).toEqual(['100', '103', '105', '108', '110']);
  });
  it('the health axis rounds out to tens around the values, lowest label first', () => {
    const labels = [...draw(pts([100.4, 142.9]), 'health').querySelectorAll('.chart__y')].map((t) => t.textContent);
    expect(labels[0]).toBe('100');
    expect(labels.at(-1)).toBe('150');
  });
  it('a hundred lives: every dot drawn, the last life labelled, at most nine grid lines, no NaN', () => {
    const svg = draw(pts(Array.from({ length: 100 }, (_, i) => Math.floor(i / 10))));
    expect(svg.querySelectorAll('.chart__dot')).toHaveLength(100);
    expect([...svg.querySelectorAll('.chart__x')].at(-1)!.textContent).toBe('100');
    expect(svg.querySelectorAll('.chart__grid').length).toBeLessThanOrEqual(9);
    expect(svg.outerHTML).not.toMatch(/NaN|Infinity/);
  });
  it('life labels never crowd: at every count from 1 to 120, adjacent labels are at least the gap apart, and the last is labelled', () => {
    for (let n = 1; n <= 120; n++) {
      const { container, unmount } = render(<LifeChart points={pts(Array.from({ length: n }, () => 1))} kind="level" label="c" />);
      const labels = [...container.querySelectorAll('.chart__x')];
      const xs = labels.map((t) => num(t, 'x'));
      for (let i = 1; i < xs.length; i++) expect(xs[i]! - xs[i - 1]!, `n=${n}`).toBeGreaterThanOrEqual(28);
      expect(labels.at(-1)!.textContent, `n=${n}`).toBe(String(n));
      unmount();
    }
  });
  it('sizes its view box to the box it is given, so one unit is one pixel', () => {
    let fire: (w: number, h: number) => void = () => {};
    vi.stubGlobal('ResizeObserver', class {
      constructor(cb: (e: { contentRect: { width: number; height: number } }[]) => void) { fire = (width, height) => cb([{ contentRect: { width, height } }]); }
      observe() {}
      disconnect() {}
    });
    const svg = draw(pts([1, 2]));
    act(() => fire(350, 180));
    expect(svg.getAttribute('viewBox')).toBe('0 0 350 180');
    act(() => fire(0, 0));
    expect(svg.getAttribute('viewBox')).toBe('0 0 350 180');
    vi.unstubAllGlobals();
  });
  it('is an image named by its label', () => {
    expect(draw(pts([1, 2]))).toHaveAttribute('role', 'img');
  });
});
```

- [ ] **Step 2:** `npx vitest run src/ui/LifeChart.test.tsx` → FAIL (module not found).
- [ ] **Step 3:** Implement to the interface, size and geometry above.
- [ ] **Step 4:** `npx vitest run src/ui/LifeChart.test.tsx && npm run typecheck && npm run lint` → PASS, lint silent.
- [ ] **Step 5:** `git add src/ui/LifeChart.tsx src/ui/LifeChart.test.tsx && git commit -m "ui: LifeChart, one row's value across every life (#90)"`

---

### Task 4: DeathOverlay, in the cards' place — inline

**Files:**
- Create: `src/ui/DeathOverlay.tsx`, `src/ui/DeathOverlay.test.tsx`
- Modify: `src/ui/icons.tsx` (+ `icons.test.ts`), `src/ui/App.tsx`, `src/ui/App.test.tsx`, `src/styles.css`, `src/engine/rebirth.ts`, `src/engine/rebirth.test.ts`
- Delete: `src/ui/DeathCard.tsx`, `src/ui/DeathCard.test.tsx`, `src/ui/FinishCard.tsx`, `src/ui/FinishCard.test.tsx`

**Interfaces:**
- Consumes: `DeathSummary`, `LifeRecord`, `LifeChart`/`ChartPoint`, `history` from `useGame`.
- Produces:
  ```ts
  export type OverlayContent = Pick<Content, 'roster' | 'chapters' | 'actions' | 'finish'>;
  export function DeathOverlay({ summary, content, book, history, from, onBegin }: {
    summary: DeathSummary; content: OverlayContent; book: string;
    history: readonly LifeRecord[]; from: Readonly<Record<SkillId, number>>; onBegin: () => void;
  })
  ```
  `from` is the dead state's `lifeStartCore`. A skill's "to" is the last
  record's `core[id] ?? 0`. Health's from and to are `summary.maxHealthFrom`
  and `summary.maxHealthTo`.
- `icons.tsx`: `export const HealthIcon: LucideIcon = Heart;` beside `GearIcon`.

**Markup** (the class names are the contract):

- One fragment: the dialog and, in look mode, the pill. The dialog is
  **always mounted**; in look mode it carries `hidden`.
- `<div className="over" role="dialog" aria-modal="true" aria-label={title} hidden={looking}>`:
  - `.over__head`: `.over__title` (`Life ${summary.life} ends`, or `${book}, finished`);
    after a finish `.over__beat` when `content.actions[content.finish]?.beat`
    exists; `.over__sub` with spans: `${clock(ticksToSeconds(summary.runTicks))} alive`;
    after a death `reached ${numeral} · ${chapter}` when the chapter has a head,
    and `<span className="hurt-text">fell during {skill name} {noun}</span>`
    when `summary.during` is set; after a finish `finish ${summary.finishes}`.
  - `.over__body`: `.over__list` of rows; then `.over__chart`.
  - Every row is `<button type="button" className="pick…" aria-pressed={selected}>`
    with exactly four children: an icon cell (`<span className="pick__icon">`
    holding `HealthIcon` or `ICONS[skill.icon]` at `size={ICON_SIZE}` with `ICON_SIZE = 14`, as the old card had, `aria-hidden`), `.pick__name`,
    `.pick__lv` (`{from} {ARROW} <b>{to}</b>`), and `.pick__d` (`+{gain}` when
    the value rose, **empty otherwise**). Health first (`pick pick--health`),
    from and to `floored(…, HEALTH_DECIMALS)` with `HEALTH_DECIMALS = 1`, gain
    `(Number(to) - Number(from)).toFixed(HEALTH_DECIMALS)`. Then each roster
    skill in order; `pick--still` when it did not rise.
  - `.over__chart`: `.over__chart-head` = `<span><b>{name}</b> · {max health|core level} by life</span><span>now {value}</span>`
    (Health's value `floored(summary.maxHealthTo, HEALTH_DECIMALS)`, equal to the list's "to"; a skill's the last record's level); then
    `<LifeChart points kind label>` with points
    `history.map((r) => ({ life: r.life, value: r.maxHealth }))` for Health and
    `r.core[id] ?? 0` for a skill, label the head's first span's text
    (`Health · max health by life`); then `.over__chart-foot`
    `life {first} {ARROW} {last} · the last point is this life`.
  - `.over__foot`: `<button className="over__look">see how it ended</button>` and
    `<button className="over__begin" autoFocus>` (`Begin life ${summary.life + 1}` or `Read again`).
- Look mode only: `<div className="pill" role="group" aria-label="the life that ended">`
  with `<button className="pill__back">` (`${RISING} back to life ${summary.life}`,
  or `${RISING} back` after a finish) and a second `over__begin` button, same
  words, same `onBegin`.
- State: `picked: 'health' | SkillId` (starts `'health'`), `looking: boolean`.
  Focus moves **in the click handlers**, no effect:
  `flushSync(() => setLooking(true)); backRef.current?.focus();` and
  `flushSync(() => setLooking(false)); lookRef.current?.focus();`. Begin's
  `autoFocus` covers opening.

**CSS** (`src/styles.css`, beside `.veil`):
- Delete the rules only the two cards used: `.card__gains`, `.card__new`,
  `.card__lv`, `.card__rule`, `.card__hp`, `.card__why`, `.card__line`,
  `.card__facts`, `.card__count`, `.card__count b`, `.card__quiet`; line 304's
  `.card__sub, .card__quiet` becomes `.card__sub`. Keep `.card`,
  `.card__title`, `.card__sub`, `.card__begin` (`TabCard`).
- Base rules (tier I): `.over` fills the veil (`width: 100%; height: 100%; max-width: 1040px; max-height: 620px; display: grid; grid-template-rows: auto minmax(0, 1fr) auto; overflow: hidden;` border `--edge-on`, background `--bg`, radius 8px);
  `.over[hidden] { display: none; }`;
  `.over__body { display: grid; min-height: 0; grid-template-rows: minmax(180px, 40%) minmax(0, 1fr); }`;
  `.over__chart { order: -1; display: grid; grid-template-rows: auto minmax(0, 1fr) auto; min-height: 0; }`;
  `.over__list { overflow-y: auto; min-height: 0; }`; `.chart__box { min-height: 0; }`; `.chart__svg { display: block; width: 100%; height: 100%; }`;
  the `.pick` grid `1.6em 1fr auto 3.2em`, `aria-pressed="true"` on
  `--cell-on` with a 2px `--edge-on` left border, `.pick--still` in `--ink-3`,
  `.pick__d` in `--good`, `.pick--health` a bottom rule; `.chart__line` no
  fill, stroke width 2; `.chart__line--health` stroke `--hurt`;
  `.chart__line--level` stroke `--core`; `.chart__dot` fill `--core`,
  `.chart__box--health .chart__dot` fill `--hurt`; `.chart__dot--now` fill
  `--run`; `.chart__grid` stroke `--edge`; `.chart__x, .chart__y` fill
  `--ink-3`; `.over__sub { display: flex; flex-wrap: wrap; gap: 0 14px; }`;
  `.over__chart-head { display: flex; justify-content: space-between; }`;
  `.pick__icon { display: grid; place-items: center; }`;
  `.over__foot { display: flex; justify-content: space-between; align-items: center; gap: 10px; }`;
  `.over__begin` takes `.card__begin`'s border, background, colour, radius,
  font, weight and padding, but not its `display: block`, `width` or margin;
  `.veil:has(.pill) { background: transparent; align-items: end; }`; `.pill`
  a rounded row of two buttons.
- Then, **after** those rules, a second `@container (min-width: 640px) { … }`
  block (the same query text as the existing one, no new number):
  `.over__body { grid-template-columns: minmax(260px, 340px) 1fr; grid-template-rows: minmax(0, 1fr); }`,
  `.over__chart { order: 0; }` and the list's right border.

**Engine tidy:** `DeathSummary.coreGains` and `CoreGain` go from `rebirth.ts`,
with the now-unused `expToNextLevel` import and `ids`; `DeathSummary`'s doc
comment becomes "What the death overlay reads besides the history: the life,
its clock, its health from and to, where it ended (spec 2026-09-25-death-overlay)". In `rebirth.test.ts`:
delete the `coreGains` line of "reports the life…" (~181) and drop "and only
the skills whose core moved" from its title, delete the test
"carries the core ledger progress…" (~183–187), delete the `coreGains` line of
"a death on the first tick" (~191) and rename that test "a death on the first
tick: a tiny positive gain".

- [ ] **Step 1: Tests** (`src/ui/DeathOverlay.test.tsx`):

```ts
// @vitest-environment jsdom
import { StrictMode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import { rebirthGain, type DeathSummary } from '../engine/rebirth';
import type { LifeRecord } from '../engine/types';
import { testBook as book } from '../test-utils/book';
import { DeathOverlay } from './DeathOverlay';

const ids = book.roster.map((s) => s.id);
const core = (lv: Record<string, number>) => Object.fromEntries(ids.map((id) => [id, lv[id] ?? 0]));
const [a, b] = ids as [string, string];
const history: LifeRecord[] = [
  { life: 1, maxHealth: 100.4, core: core({ [a]: 1 }) },
  { life: 2, maxHealth: 101.3, core: core({ [a]: 2, [b]: 1 }) },
  { life: 3, maxHealth: 103.0, core: core({ [a]: 3, [b]: 1 }) },
];
const summary: DeathSummary = {
  life: 3, runTicks: 5820, gain: rebirthGain(5820), maxHealthFrom: 101.3, maxHealthTo: 103.0,
  chapter: 0, finished: false, finishes: 0, during: null,
};
const from = core({ [a]: 2, [b]: 1 });
const el = (s: DeathSummary = summary, onBegin = () => {}, h: readonly LifeRecord[] = history) =>
  <DeathOverlay summary={s} content={book} book={book.name} history={h} from={from} onBegin={onBegin} />;
const show = (s?: DeathSummary, onBegin?: () => void) => render(el(s, onBegin));
const picks = () => [...document.querySelectorAll<HTMLButtonElement>('button.pick')];

describe('DeathOverlay', () => {
  it('is a modal dialog titled with the life that ended, its clock as "alive"', () => {
    show();
    expect(screen.getByRole('dialog', { name: 'Life 3 ends' })).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('09:42 alive')).toBeInTheDocument();
  });
  it('lists Health first, then every roster skill in book order, each with core from and to', () => {
    show();
    expect(picks().map((p) => p.querySelector('.pick__name')!.textContent)).toEqual(['Health', ...book.roster.map((s) => s.name)]);
    expect(picks()[1]!.querySelector('.pick__lv')).toHaveTextContent('2 → 3');
    expect(picks()[1]!.querySelector('.pick__d')).toHaveTextContent('+1');
  });
  it('a skill whose core did not move is listed, dimmed, with an empty gain cell', () => {
    show();
    const rowB = picks()[2]!;
    expect(rowB).toHaveClass('pick--still');
    expect(rowB.querySelector('.pick__lv')).toHaveTextContent('1 → 1');
    expect(rowB.querySelector('.pick__d')!.textContent).toBe('');
  });
  it('health reads to one decimal from the summary, and from + gain = to as shown', () => {
    show({ ...summary, maxHealthFrom: 101.34, maxHealthTo: 103.08 });
    const health = picks()[0]!;
    expect(health.querySelector('.pick__lv')).toHaveTextContent('101.3 → 103.0');
    expect(health.querySelector('.pick__d')).toHaveTextContent('+1.7');
  });
  it('Health is selected on open and charted, one dot per recorded life', () => {
    show();
    expect(picks()[0]).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('img', { name: 'Health · max health by life' }).querySelectorAll('.chart__dot')).toHaveLength(3);
    expect(screen.getByText('now 103.0')).toBeInTheDocument();
    expect(screen.getByText('life 1 → 3 · the last point is this life')).toBeInTheDocument();
  });
  it('a click selects a skill and charts its core level', () => {
    show();
    act(() => picks()[1]!.click());
    expect(picks()[1]).toHaveAttribute('aria-pressed', 'true');
    expect(picks()[0]).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('img', { name: `${book.roster[0]!.name} · core level by life` })).toBeInTheDocument();
    expect(screen.getByText('now 3')).toBeInTheDocument();
  });
  it('see how it ended hides the dialog and shows the pill; back restores it, the selection kept', () => {
    show();
    act(() => picks()[1]!.click());
    act(() => screen.getByRole('button', { name: 'see how it ended' }).click());
    expect(screen.queryByRole('dialog')).toBeNull();
    const pill = screen.getByRole('group', { name: 'the life that ended' });
    act(() => within(pill).getByRole('button', { name: '▲ back to life 3' }).click());
    expect(screen.getByRole('dialog', { name: 'Life 3 ends' })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'the life that ended' })).toBeNull();
    expect(picks()[1]).toHaveAttribute('aria-pressed', 'true');
  });
  it('under StrictMode: Begin has focus on open, the back button after looking, the toggle after back', () => {
    render(<StrictMode>{el()}</StrictMode>);
    expect(screen.getByRole('button', { name: 'Begin life 4' })).toHaveFocus();
    act(() => screen.getByRole('button', { name: 'see how it ended' }).click());
    expect(screen.getByRole('button', { name: '▲ back to life 3' })).toHaveFocus();
    act(() => screen.getByRole('button', { name: '▲ back to life 3' }).click());
    expect(screen.getByRole('button', { name: 'see how it ended' })).toHaveFocus();
  });
  it('Begin calls onBegin, from the dialog and from the pill', () => {
    const onBegin = vi.fn();
    show(summary, onBegin);
    act(() => screen.getByRole('button', { name: 'Begin life 4' }).click());
    act(() => screen.getByRole('button', { name: 'see how it ended' }).click());
    act(() => within(screen.getByRole('group', { name: 'the life that ended' })).getByRole('button', { name: 'Begin life 4' }).click());
    expect(onBegin).toHaveBeenCalledTimes(2);
  });
  it('a death mid-fight says so, and names the port reached', () => {
    const raid = book.actions.raid!;
    show({ ...summary, during: 'raid' });
    expect(screen.getByText(new RegExp(`fell during .* ${raid.noun}`))).toHaveClass('hurt-text');
    expect(screen.getByText(new RegExp(`reached ${book.chapters[0]!.head.numeral}`))).toBeInTheDocument();
  });
  it('a finish: the book finished as title, the beat, the count, and Read again; back reads "back"', () => {
    show({ ...summary, finished: true, finishes: 2 });
    expect(screen.getByRole('dialog', { name: `${book.name}, finished` })).toBeInTheDocument();
    expect(screen.getByText(book.actions[book.finish]!.beat!)).toBeInTheDocument();
    expect(screen.getByText('finish 2')).toBeInTheDocument();
    act(() => screen.getByRole('button', { name: 'see how it ended' }).click());
    expect(screen.getByRole('button', { name: '▲ back' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Read again' })).toBeInTheDocument();
  });
  it('a first overlay after an old save (one record) draws one dot', () => {
    render(el(summary, () => {}, history.slice(-1)));
    expect(screen.getByRole('img').querySelectorAll('.chart__dot')).toHaveLength(1);
  });
});
```

  In `icons.test.ts` assert `HealthIcon` is defined.

- [ ] **Step 2:** `npx vitest run src/ui/DeathOverlay.test.tsx` → FAIL.
- [ ] **Step 3:** Implement `HealthIcon`, `DeathOverlay.tsx`, and the CSS.
- [ ] **Step 4: Chrome look before wiring the old cards out.** Render the
  overlay in App in place of `DeathCard` for a death (keep `FinishCard` for
  the moment), start the dev server (the `chrome-verify` skill), die from the
  debug overlay, and look at 390×800 and 1280×820: two columns at 1280, the
  chart stacked over the list at 390, labels legible, the list scrolling,
  the foot visible, Begin focused. Fix the CSS here.
- [ ] **Step 5: Wire it in fully.** App: destructure `history`; the veil's card
  branch is `<DeathOverlay summary={card} content={book} book={book.name} history={history} from={state.lifeStartCore} onBegin={() => dispatch({ type: 'begin' })} />`
  for a death and a finish (the tab card keeps precedence). Delete the four
  card files. Engine tidy as above; drop `coreGains` wherever typecheck names it.
  `App.test.tsx`: in the death test (~121) and the veil test (~149)
  `card__begin` becomes `over__begin`, the rest stands; the finish test (~161)
  asserts `finish 1` in place of `finished 1×`. Add:

```ts
  it('see how it ended leaves the body inert and the pill outside it, and Begin from the pill starts the next life', async () => {
    render(<App book={windwardRun} />);
    act(() => { window.continuum!.dispatch({ type: 'die' }); });
    await act(() => realClick(screen.getByRole('button', { name: 'see how it ended' })));
    const pill = screen.getByRole('group', { name: 'the life that ended' });
    expect(pill.closest('[inert]')).toBeNull();
    expect(pill.closest('.veil')).not.toBeNull();
    expect(screen.getByLabelText('doing').closest('[inert]')).not.toBeNull();
    await act(() => realClick(within(pill).getByRole('button', { name: 'Begin life 2' })));
    expect(screen.queryByRole('group', { name: 'the life that ended' })).toBeNull();
    expect(window.continuum!.state().life).toBe(2);
  });
```

- [ ] **Step 6:** `npm run typecheck && npm run lint && npm test && npm run test:hooks` → all green.
- [ ] **Step 7:** `git add -A src && git commit -m "ui: the death overlay replaces the death and finish cards (#90)"`

---

### Task 5: Chrome pass — inline

The `chrome-verify` skill: vite in the background, its real port, the Windward
Run.

- [ ] At 1280×820, 696×793 and 390×800: build the first page with the debug
  handle, queue the pirates at the front, step, `die`. The top strip reads
  health 0 and life 1, the rates line names the fight, the doing box's first
  row is lit with its gauge; the overlay lists Health then seven skills;
  Health selected; the chart's labels read at 11px.
- [ ] Real coordinate clicks on three rows: the chart retitles and redraws.
  `see how it ended`: the overlay goes, the dead world is readable, the pill at
  the bottom; `▲ back to life 1` restores it with the row and the list's
  scroll kept.
- [ ] `Begin life 2` from the pill; die again: two points.
- [ ] Finish words: `window.continuum.dispatch({ type: 'load', model: { state: { ...window.continuum.state(), dead: true, finished: true, paused: 'system' }, log: [], nextSeq: 0 } })`; nothing lit behind it.
- [ ] Console clean. Screenshots `docs/mockups/2026-09-25-live-death-*.png`,
  indexed in `docs/mockups/README.md`; commit.

### Task 6: Code panel — inline dispatch

Gates first. Then in parallel: `engine-reviewer`, `tuning-guard`,
`vacuous-test-hunter`, a generic reviewer (plan vs diff, task by task), and
the naysayer. Converge to a clean round.

### Task 7: Docs, version, tracker — inline

- [ ] `package.json` 0.3.0 → 0.3.1.
- [ ] `CLAUDE.md`: a Gotchas line: while dead the screen is the dead state (no
  reborn view); the overlay's chart reads `useGame().history`;
  `GameState.lives` grows one record per rebirth; the lit row after a death is
  the queue's top without `topWorks`.
- [ ] `.claude/skills/chrome-verify/SKILL.md` (~55–57 the next-life claim, ~69
  the finish card; the rigidity script also reads the six boxes while dead) and
  `MECHANICS.md` (~433–434, ~559).
- [ ] The watched-screen spec 4.8: a one-line amendment pointing here. This
  spec's and this plan's status lines: shipped, with the sha.
- [ ] For the handoff's **Open**: close #90 naming the squash sha and the
  tests. No comments on #49 or #75.

## Accepted risks

Each: objection · cheaper alternative · why rejected.

1. **Look mode: the log and the doing box cannot be scrolled, and the pill
   covers part of them** (the clear veil is the hit target everywhere but the
   pill, and the body is inert). Measured by the code panel's naysayer at
   500×800: the log box spans y 650–751 and the pill y 696–743, so only the
   log's first line (the death) is clear and lines 2–4 are under the pill; at
   800 wide the pill crosses the foot of both the doing box and the log. ·
   Seat the pill clear of the watched column (a reserved row, or the top of the
   body) and let the log scroll. · Not decided here: the spec (2.2) put the
   pill at the bottom centre, but the approved mockup never showed it over a
   full log, so this goes to the user at the handoff as something new, with a
   screenshot and a recommendation. Keeping the body inert stands on the spec
   (2.2); whether the dead log may scroll goes with it. Filed as an issue if
   the user defers.
2. **x spacing is by index, and a skill missing from an older record charts
   as 0.** · Space by life number; draw gaps. · Rejected: in play, records are
   appended once per rebirth with consecutive life numbers, so the only
   discontinuity is an old save's history starting late, and its labels name
   the real lives; a hand-edited or corrupt save can leave a gap (reconcile
   drops a bad record alone) or out-of-order life numbers, and the chart then
   spaces them evenly, which is accepted for a save nobody plays into; a skill missing from a record was not on that life's roster, and
   its level really was 0.
3. **History on `GameState` rather than on the `Model` beside the log.** ·
   Append in the `begin` reducer, keeping the engine out of it. · Rejected:
   rebirth is where a life ends on every path (the reducer, the headless play,
   the property test), so a record made there cannot be skipped by a path
   that forgets it, and the engine test pins it; the probe measured no cost
   (the engine suite 23.7 s before, 23.0 s after; plays of 92–95 lives
   unchanged).
4. ~~The health axis labels are not round.~~ Resolved: the user asked for round
   axes after the code panel, and they shipped (round steps of 1, 2, 5 × 10ⁿ,
   life 1 always labelled).
5. **At a thousand lives the dots are a smear** (radius floors at
   `DOT_MIN`). · Thin the dots past a count. · Rejected: the user's mockup
   draws one per life, the Windward Run finishes in about ninety-three, and
   the line stays readable under the dots.
6. **The kill screen's `net` can read positive, in the good colour** (a death
   on the tick's decay before that tick's eating, at very low health with food
   in the pack; the debug `die` shows it every time). · Blank the net cell
   while dying. · Rejected: the rates line is the world as it stood, and the
   food rate is true of it; hiding one cell on one screen is a special case
   for a rare order of events. Measured by the code panel: 0 of 277 headless
   deaths across the three policies had a positive net; the debug `die` shows
   one every time, so screenshots taken with `die` overstate it.

## Execution handoff

- **Task 1 inline**, **Task 2 inline**: the record's shape and the reversed
  screen rule, with judgement-heavy test fallout.
- **Task 3 subagent (Opus)**, dispatched once Task 2 is committed: a pure
  component with its full text above.
- **Task 4 inline**: CSS across tiers, focus, and the Chrome look before the
  old cards go.
- **Tasks 5–7 inline**: Chrome, agents, docs.
