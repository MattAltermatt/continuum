# Books own their skills: the seam — Implementation Plan

**Status:** written 2026-09-23, to be executed in a later session on
`feature/cores-books-and-the-shelf` (the branch that carries the spec).

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every book declares its own skills. The fixed twelve-verb union
becomes book data, The Salt Road becomes a value of a `Book` type with a
three-skill roster, a static validator guards the format, and nothing about
how the one book plays changes.

**Architecture:** `Content` gains a `roster`; `Book` is `Content` plus an id,
a name and chapters. The engine builds the skill map from the roster instead
of a global list, and every UI name and icon lookup goes through the roster
instead of two module-level globals (`SKILLS`, `SKILL_ICONS`). An icon
vocabulary of plain names lives in `src/data/` so the data layer never
imports the UI. A validator in `src/data/` returns a list of problems and is
the only thing that checks a book once the union is gone.

**Tech Stack:** TypeScript (strict, `noUncheckedIndexedAccess`), React, Vite,
Vitest (`node` for engine, `// @vitest-environment jsdom` for components),
lucide-react icons.

**Spec:** `docs/specs/2026-09-23-books-own-their-skills.md`, §2, §3, §10 and
§11. The plan implements §11; §10 says which doc lines the slice edits.

## Global Constraints

- **No tuning number changes.** `balance.content.scrub` stays as it is and
  the Salt Road reads every number from it. Removing `ticksPerSkillPoint` is
  the one `balance.ts` edit, named in Task 1 for the tuning guard.
- **No magic numbers** in `src/engine/`, `src/data/`, `src/state/`
  (`decision #3`, hook `.claude/hooks/tuning-literals.sh`).
- **The engine never imports from `src/ui/`; `src/data/` imports only
  `src/data/` and `src/balance.ts`** (`src/purity.test.ts`). The icon
  vocabulary is plain strings in `src/data/`; lucide stays in `src/ui/`.
- **Behaviour is preserved.** Every existing test passes after mechanical
  edits; the one intended expectation change is `SkillsBand.test`'s "renders
  all twelve" (Task 5). No engine number, order or event changes.
- **The band shows the book's whole roster, in roster order** (spec §2). The
  Salt Road's roster is `forage, mine, build`, in that order.
- **Ledger names stay `core` and `run`** in code and on screen (spec §2; the
  rename is filed for later).
- **Commit messages:** terse, one line, no trailers, no emoji.
- **Gates before hand-off:** `npm run typecheck`, `npm run lint`, `npm test`,
  `npm run test:hooks`, then Chrome (`/chrome-verify`).

## Review Focus

1. **A book whose row names a verb missing from the roster** must be
   rejected by the validator, not reach the engine, where it would throw on
   the first tick (Task 6, `rejects a row whose verb is not in the roster`).
2. **A cost cycle** (rope needs plank, plank needs rope) freezes the engine
   forever under decision #41 with no death; the validator must refuse it
   (Task 6, `rejects a cost cycle`).
3. **A producer whose yield exceeds its item's cap** never lands and freezes
   the same way; refused (Task 6, `rejects a yield above the cap`).
4. **Rebirth after the union is gone** must carry every core ledger and
   snapshot `lifeStartCore` from the state's own keys, not a global list
   (Task 7, existing rebirth tests re-pointed at `Object.keys`).
5. **The death card and the log name a skill through the roster**, so a
   skill id with no roster entry can't render; the validator makes that
   unreachable and the UI uses `!` (Task 5, `DeathCard.test`, `narrate.test`).

---

### Task 1: Skill points out

**Files:**
- Modify: `src/balance.ts:17-21` (remove `ticksPerSkillPoint`)
- Modify: `src/balance.test.ts:12-25`
- Modify: `MECHANICS.md:47-56` (the "Skill points" subsection), `:369`
  (persists list), `:481` (constants table row)

**Interfaces:**
- Consumes: nothing.
- Produces: `balance.time` has two keys, `tickIntervalMs` and `ticksPerMinute`.

- [ ] **Step 1: Confirm nothing reads skill points**

Run: `grep -rn "ticksPerSkillPoint\|skillPoint" src`
Expected: hits only in `src/balance.ts` and `src/balance.test.ts`.

- [ ] **Step 2: Edit the test to expect the field gone**

In `src/balance.test.ts` replace the first `it` and delete the third:

```ts
  it('holds the canonical time constants', () => {
    expect(balance.time).toEqual({ tickIntervalMs: 100, ticksPerMinute: 600 });
  });
```

Delete the block `it('awards a skill point every fifteen minutes of survival', …)`.

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/balance.test.ts`
Expected: FAIL, the `toEqual` sees an extra key `ticksPerSkillPoint`.

- [ ] **Step 4: Remove the field**

In `src/balance.ts` delete these two lines and the blank before them:

```ts
    /** Ticks of unbroken survival that award one skill point. 15 minutes. */
    ticksPerSkillPoint: 9_000,
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/balance.test.ts`
Expected: PASS.

- [ ] **Step 6: Edit MECHANICS.md**

Delete the `### Skill points` subsection (heading through "the slowest clock
in the game."). In "What persists" delete the line `- Skill points.`. In the
constants table delete the row beginning `| \`TICKS_PER_SKILL_POINT\``.

- [ ] **Step 7: Run every gate**

Run: `npm run typecheck && npm run lint && npm test`
Expected: all green.

- [ ] **Step 8: Commit**

```bash
git add src/balance.ts src/balance.test.ts MECHANICS.md
git commit -m "engine: remove skill points, a currency nothing reads"
```

---

### Task 2: `templateKey` out

**Files:**
- Modify: `src/data/types.ts:41-42` (remove the field)
- Modify: `src/engine/queue.ts:149` (`complete`)
- Modify: `src/ui/ActionRow.tsx:73` (`done`)
- Modify: `MECHANICS.md:81,83,89-92,164,368,412` (every `templateKey` mention)

**Interfaces:**
- Consumes: nothing.
- Produces: completion counts are keyed by `action.id`, always.

- [ ] **Step 1: Confirm no content or test sets the field**

Run: `grep -rn "templateKey" src`
Expected: hits only in `src/data/types.ts`, `src/engine/queue.ts`, `src/ui/ActionRow.tsx`.

- [ ] **Step 2: Remove the field and both readers**

In `src/data/types.ts` delete:

```ts
  /** Stable identity for meta-progression; falls back to `id`. */
  readonly templateKey?: string;
```

In `src/engine/queue.ts` (`complete`) replace

```ts
  const key = action.templateKey ?? action.id;
  next = { ...next, completionCounts: { ...next.completionCounts, [key]: (next.completionCounts[key] ?? 0) + 1 } };
```

with

```ts
  next = { ...next, completionCounts: { ...next.completionCounts, [action.id]: (next.completionCounts[action.id] ?? 0) + 1 } };
```

In `src/ui/ActionRow.tsx` replace

```ts
  const done = state.completionCounts[action.templateKey ?? action.id] ?? 0;
```

with

```ts
  const done = state.completionCounts[action.id] ?? 0;
```

- [ ] **Step 3: Edit MECHANICS.md**

Delete the `templateKey?: string` line from the `ActionDefinition` block and
the bullet that begins `- **\`templateKey\`** is the action's *stable*
identity`. Change `requires?: Record<string, number> // gating: templateKey →
completions needed` to `// gating: action id → completions needed`. Change
step 5 of the completion order to `Increment \`actionCompletionCounts[id]\``.
In "What persists" change `keyed by \`templateKey\`` to `keyed by action id`.
Under the automation thresholds change `Keyed by \`templateKey\`` to `Keyed by
action id`.

- [ ] **Step 4: Run every gate**

Run: `npm run typecheck && npm run lint && npm test`
Expected: all green; no test changed.

- [ ] **Step 5: Commit**

```bash
git add src/data/types.ts src/engine/queue.ts src/ui/ActionRow.tsx MECHANICS.md
git commit -m "engine: drop templateKey; completion counts key on the action id"
```

---

### Task 3: The book format, the icon vocabulary, and The Salt Road as a value

The union stays. `SKILLS` and `SKILL_ICONS` stay for one more task so the UI
is untouched here; the band still shows twelve.

**Files:**
- Modify: `src/data/types.ts` (add `IconName`, `SkillDefinition`, `Chapter`,
  `Book`; add `roster` to `Content`; drop `book` from `ChapterHead`)
- Create: `src/data/icons.ts`
- Create: `src/data/roster.ts`
- Create: `src/data/salt-road.ts` (replaces `src/data/scrub.ts`)
- Create: `src/data/salt-road.test.ts` (replaces `src/data/scrub.test.ts`)
- Delete: `src/data/scrub.ts`, `src/data/scrub.test.ts`
- Modify: every `Content` fixture: `src/engine/inventory.test.ts:5`,
  `src/engine/queue.test.ts:8`, `src/engine/tick.test.ts:9`,
  `src/engine/health.test.ts:9`
- Modify: every importer of `scrub`: `src/ui/App.tsx`, `src/ui/ChapterPanel.test.tsx`,
  `src/ui/ActionRow.test.tsx`, `src/ui/Food.test.tsx`, `src/ui/Pack.test.tsx`,
  `src/ui/Log.test.tsx`, `src/ui/Queue.test.tsx`, `src/ui/narrate.test.ts`,
  `src/state/useGame.test.tsx`, `src/engine/skills.test.ts`, `src/engine/playable.test.ts`
- Modify: `src/ui/RunningHead.tsx`, `src/ui/ChapterPanel.tsx` (the book name
  is a prop, not a head field)

**Interfaces:**
- Consumes: `Content`, `ChapterHead` from `src/data/types.ts`.
- Produces:

```ts
// src/data/types.ts
export type IconName = (typeof ICON_NAMES)[number];            // from ./icons
export interface SkillDefinition { readonly id: SkillId; readonly name: string; readonly icon: IconName }
export interface Chapter { readonly head: ChapterHead; readonly order: readonly ActionId[] }
export interface Content {
  readonly roster: readonly SkillDefinition[];
  readonly actions: Readonly<Record<ActionId, ActionDefinition>>;
  readonly items: Readonly<Record<ItemId, ItemDefinition>>;
}
export interface Book extends Content { readonly id: string; readonly name: string; readonly chapters: readonly Chapter[] }
export interface ChapterHead { readonly numeral: string; readonly chapter: string; readonly story: string }   // no `book`
// src/data/icons.ts
export const ICON_NAMES: readonly [...] ; export type IconName
// src/data/roster.ts
export function skillOf(content: Pick<Content, 'roster'>, id: SkillId): SkillDefinition   // throws if absent
// src/data/salt-road.ts
export const saltRoad: Book
```

- [ ] **Step 1: Write the failing tests for the vocabulary and the roster helper**

Create `src/data/roster.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ICON_NAMES } from './icons';
import { skillOf } from './roster';
import type { Content } from './types';

const content: Pick<Content, 'roster'> = {
  roster: [{ id: 'forage', name: 'Forage', icon: 'sprout' }, { id: 'mine', name: 'Mine', icon: 'pickaxe' }],
};

describe('the icon vocabulary', () => {
  it('is a closed list of plain names with no duplicates', () => {
    expect(ICON_NAMES.length).toBeGreaterThan(0);
    expect(new Set(ICON_NAMES).size).toBe(ICON_NAMES.length);
    for (const n of ICON_NAMES) expect(n).toMatch(/^[a-z][a-z-]*$/);
  });
});

describe('skillOf', () => {
  it('finds a roster entry by id', () => {
    expect(skillOf(content, 'mine')).toEqual({ id: 'mine', name: 'Mine', icon: 'pickaxe' });
  });
  it('throws on an id the roster does not have: a validated book never asks', () => {
    expect(() => skillOf(content, 'chop')).toThrow(/chop/);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/data/roster.test.ts`
Expected: FAIL, modules `./icons` and `./roster` not found.

- [ ] **Step 3: Add the vocabulary, the types, and the helper**

Create `src/data/icons.ts`:

```ts
/**
 * The icon vocabulary: plain names the UI maps to components (src/ui/icons.tsx).
 * Data may not import the UI, so a roster names an icon and never holds one.
 * The list grows by a code change; a book picks from what exists.
 */
export const ICON_NAMES = [
  'sprout', 'axe', 'pickaxe', 'fishing-rod', 'bow-arrow',
  'wrench', 'house', 'chef-hat',
  'sword', 'route', 'message-circle', 'eye',
] as const;

export type IconName = (typeof ICON_NAMES)[number];
```

In `src/data/types.ts`, add after the `SKILL_IDS` block:

```ts
import type { IconName } from './icons';

/** One skill a book declares. The roster is the skills that have rows (spec 2026-09-23 section 2). */
export interface SkillDefinition {
  readonly id: SkillId;
  readonly name: string;
  readonly icon: IconName;
}
```

Change `Content` to:

```ts
export interface Content {
  /** In display order: the band shows the whole roster from life 1, in this order. */
  readonly roster: readonly SkillDefinition[];
  readonly actions: Readonly<Record<ActionId, ActionDefinition>>;
  readonly items: Readonly<Record<ItemId, ItemDefinition>>;
}
```

Change `ChapterHead` to drop `book` and add `Chapter` and `Book`:

```ts
/** The running head (spec section 8.6). The book's name comes from the book. */
export interface ChapterHead {
  readonly numeral: string;
  readonly chapter: string;
  readonly story: string;
}

/** A chapter: its head and its rows in display order, which is also queue order. */
export interface Chapter {
  readonly head: ChapterHead;
  readonly order: readonly ActionId[];
}

/** A book: content plus what the shelf and the chapter panel need. The format a generator emits. */
export interface Book extends Content {
  readonly id: string;
  readonly name: string;
  readonly chapters: readonly Chapter[];
}
```

Create `src/data/roster.ts`:

```ts
import type { Content, SkillDefinition, SkillId } from './types';

/** The roster entry for a skill id. Throws: a validated book has one for every verb its rows use. */
export function skillOf(content: Pick<Content, 'roster'>, id: SkillId): SkillDefinition {
  const s = content.roster.find((d) => d.id === id);
  if (!s) throw new Error(`no skill "${id}" in the roster`);
  return s;
}
```

- [ ] **Step 4: Run the new test to verify it passes**

Run: `npx vitest run src/data/roster.test.ts`
Expected: PASS. (`npm run typecheck` is red now: every `Content` lacks `roster`. Next steps fix that.)

- [ ] **Step 5: Write The Salt Road as a `Book`**

Create `src/data/salt-road.ts` (the body of `scrub.ts`, reshaped; every
number still from `balance.content.scrub`):

```ts
/**
 * Book one, as much of it as v0.2 needs: one chapter, three rows that feed
 * each other, and the hall, a big sink no first life finishes (spec 2026-09-22
 * section 2). Every tuning number comes from balance.content.scrub; a yield of
 * one per completion and a cap of one on a structure are counts, not tuning.
 * The text is placeholder content; the chapter brainstorm replaces it.
 *
 * The roster is the skills that have rows (spec 2026-09-23 section 2): three
 * today. Display order, which is also the order a player who presses + down
 * the page queues them in: the cabin ahead of the hall, so the hall does not
 * take the cabin's stone.
 */
import { balance } from '../balance';
import type { Book } from './types';

const n = balance.content.scrub;

export const saltRoad: Book = {
  id: 'salt-road',
  name: 'The Salt Road',
  roster: [
    { id: 'forage', name: 'Forage', icon: 'sprout' },
    { id: 'mine', name: 'Mine', icon: 'pickaxe' },
    { id: 'build', name: 'Build', icon: 'house' },
  ],
  chapters: [
    { head: { numeral: 'I', chapter: 'The Scrub', story: 'Dry country. The pass is watched.' }, order: ['forage', 'mine', 'cabin', 'hall'] },
  ],
  items: {
    berries: { id: 'berries', name: 'berries', kind: 'food', cap: n.berries.cap, healPerUnit: n.berries.healPerUnit },
    stone: { id: 'stone', name: 'stone', kind: 'material', cap: n.stone.cap },
    cabin: { id: 'cabin', name: 'cabin', kind: 'structure', cap: 1 },
    hall: { id: 'hall', name: 'hall', kind: 'structure', cap: 1 },
  },
  actions: {
    forage: { id: 'forage', verb: 'forage', noun: 'berries', expCost: n.forage.expCost, producedItem: 'berries', producedAmount: 1, itemCosts: [], isOneTime: false },
    mine: { id: 'mine', verb: 'mine', noun: 'stone', expCost: n.mine.expCost, producedItem: 'stone', producedAmount: 1, itemCosts: [], isOneTime: false },
    cabin: {
      id: 'cabin', verb: 'build', noun: 'a cabin', expCost: n.cabin.expCost, producedItem: 'cabin', producedAmount: 1,
      itemCosts: [{ item: 'stone', amount: n.cabin.stone }], isOneTime: true, healthDecayMultiplier: n.cabin.decayMultiplier,
      beat: 'The cabin stands. The wind is somebody else\'s problem now.',
    },
    hall: {
      id: 'hall', verb: 'build', noun: 'a stone hall', expCost: n.hall.expCost, producedItem: 'hall', producedAmount: 1,
      itemCosts: [{ item: 'stone', amount: n.hall.stone }], isOneTime: true,
      beat: 'The hall stands. Nobody who started it lived to see it.',
    },
  },
};
```

Create `src/data/salt-road.test.ts` from `scrub.test.ts`, with these changes:
import `saltRoad` instead of `scrub, SCRUB_HEAD, SCRUB_ORDER`; replace every
`scrub.` with `saltRoad.`; replace `SCRUB_ORDER` with
`saltRoad.chapters[0]!.order`; replace the last test with:

```ts
  it('declares a roster of the three skills its rows use, and one chapter with a head', () => {
    expect(saltRoad.roster.map((s) => s.id)).toEqual(['forage', 'mine', 'build']);
    for (const s of saltRoad.roster) expect(s.name.length).toBeGreaterThan(0);
    expect(saltRoad.chapters).toHaveLength(1);
    expect(saltRoad.chapters[0]!.head.story.length).toBeGreaterThan(0);
    expect(saltRoad.name).not.toBe(saltRoad.chapters[0]!.head.chapter);
  });
```

Delete `src/data/scrub.ts` and `src/data/scrub.test.ts` (`git rm`).

- [ ] **Step 6: Give every engine `Content` fixture a roster**

In each of `src/engine/inventory.test.ts`, `src/engine/queue.test.ts`,
`src/engine/tick.test.ts`, `src/engine/health.test.ts`, add as the first
field of the `content` literal a roster that names every verb the fixture's
actions use. For `queue.test.ts`, whose `quick` row uses `craft`:

```ts
  roster: [
    { id: 'forage', name: 'Forage', icon: 'sprout' },
    { id: 'mine', name: 'Mine', icon: 'pickaxe' },
    { id: 'build', name: 'Build', icon: 'house' },
    { id: 'craft', name: 'Craft', icon: 'wrench' },
  ],
```

For the other three, the same list without `craft` (check each fixture's
`verb` fields; a verb with no roster entry is what Task 7 makes a thrown
error, so get it right here).

- [ ] **Step 7: Re-point every importer of `scrub`**

Run: `grep -rln "data/scrub'\|'./scrub'" src`

In each file replace `import { scrub, SCRUB_HEAD, SCRUB_ORDER } from '../data/scrub'`
(or whichever subset) with `import { saltRoad } from '../data/salt-road'`,
and `scrub` with `saltRoad` throughout. `SCRUB_ORDER` becomes
`saltRoad.chapters[0]!.order`; `SCRUB_HEAD` becomes
`saltRoad.chapters[0]!.head`.

In `src/ui/App.tsx`, the chapter panel call becomes:

```tsx
            <ChapterPanel
              content={saltRoad} book={saltRoad.name} chapter={saltRoad.chapters[0]!} state={view} runningActionId={runningActionId}
```

and `useGame(scrub)` becomes `useGame(saltRoad)`; every other `scrub` becomes `saltRoad`.

- [ ] **Step 8: The head takes the book name as a prop**

`src/ui/RunningHead.tsx`:

```tsx
import type { ChapterHead } from '../data/types';

/** Spec 8.6: a running head like a printed book, and the chapter's one-line story. */
export function RunningHead({ book, head }: { book: string; head: ChapterHead }) {
  return (
    <header className="head">
      <div className="head__line"><span>{book}</span><span>{head.numeral} · {head.chapter}</span></div>
      <p className="head__story">{head.story}</p>
    </header>
  );
}
```

`src/ui/ChapterPanel.tsx`:

```tsx
import type { ActionId, Chapter, Content } from '../data/types';
import type { GameState } from '../engine/types';
import { ActionRow } from './ActionRow';
import { RunningHead } from './RunningHead';

export function ChapterPanel({ content, book, chapter, state, runningActionId, onNow, onQueue }: {
  content: Content; book: string; chapter: Chapter;
  state: GameState; runningActionId: ActionId | null;
  onNow: (id: ActionId) => void; onQueue: (id: ActionId) => void;
}) {
  return (
    <section className="chapter" aria-label="chapter">
      <RunningHead book={book} head={chapter.head} />
      {chapter.order.map((id) => {
        const action = content.actions[id];
        if (!action) return null;
        return <ActionRow key={id} action={action} content={content} state={state} running={id === runningActionId} onNow={onNow} onQueue={onQueue} />;
      })}
    </section>
  );
}
```

`src/ui/ChapterPanel.test.tsx`: every `<ChapterPanel content={scrub} order={SCRUB_ORDER} head={SCRUB_HEAD}`
becomes `<ChapterPanel content={saltRoad} book={saltRoad.name} chapter={saltRoad.chapters[0]!}`;
`SCRUB_HEAD.story` becomes `saltRoad.chapters[0]!.head.story`; `[...SCRUB_ORDER]`
becomes `[...saltRoad.chapters[0]!.order]`. Any test that rendered
`RunningHead` directly passes `book="The Salt Road"`.

- [ ] **Step 9: Run every gate**

Run: `npm run typecheck && npm run lint && npm test`
Expected: all green. The band still shows twelve (`SkillsBand` untouched).

- [ ] **Step 10: Commit**

```bash
git add -A src
git commit -m "data: the book format; The Salt Road as a Book with a roster of three"
```

---

### Task 4: A mockup of the three-cell band, and the user's pick 🎨

The one visible change of the slice. Decision #31: a committed mockup before
the UI lands; the user chooses between the two layouts.

**Files:**
- Create: `docs/mockups/2026-09-23-three-cell-band.html`
- Modify: `docs/mockups/README.md` (one index line)

- [ ] **Step 1: Build the mockup**

Copy the skills-band markup and styles from
`docs/mockups/2026-09-22-skills-hover.html` (or the layout mockup that holds
the band) into a new page that renders the same band twice, one above the
other, each with the three Salt Road cells (Forage, Mine, Build) at Lv 0:

- **A. Empty slot:** the band keeps `grid-template-columns: repeat(4, 1fr)`;
  three cells fill the left three quarters and the fourth is blank.
- **B. Stretched:** the band uses `grid-template-columns: repeat(3, 1fr)`
  (one column per roster entry); three cells span the width.

Label each variant with a letter and a one-line caption. Keep the page at
the 1280px minimum width the layout assumes. Add the line to
`docs/mockups/README.md`:

```
| 2026-09-23 | [three-cell-band](2026-09-23-three-cell-band.html) | the skills band at a three-skill roster: A empty fourth slot, B stretched to three across |
```

- [ ] **Step 2: Commit the mockup**

```bash
git add docs/mockups
git commit -m "mockup: the skills band at three cells, two layouts"
```

- [ ] **Step 3: Ask the user, and wait**

Give both lines:

```
file:///Users/matt/dev/MattAltermatt/continuum/docs/mockups/2026-09-23-three-cell-band.html
! o docs/mockups/2026-09-23-three-cell-band.html
```

Ask: "Three cells: A (empty fourth slot, the grid stays four across for the
day the roster grows) or B (stretched, one column per skill)?" Recommend A:
#46 redesigns the band at N anyway, and A leaves the grid's geometry alone.
**Stop until the answer arrives.** Record it in the plan's status line and
in `src/styles.css` as a comment beside `.skills` in Task 5.

---

### Task 5: The UI reads the roster; the band shows three

`SKILLS` and `SKILL_ICONS` go. Every name and icon comes from the roster
through `skillOf`; the icon component comes from a UI map keyed by
`IconName`. The union is still the type of `SkillId`.

**Files:**
- Modify: `src/ui/icons.tsx` (`ICONS: Record<IconName, LucideIcon>`; remove `SKILL_ICONS`)
- Modify: `src/ui/icons.test.ts`
- Modify: `src/ui/SkillsBand.tsx`, `src/ui/SkillsBand.test.tsx`
- Modify: `src/ui/SkillCell.tsx`, `src/ui/SkillCell.test.tsx`
- Modify: `src/ui/ActionRow.tsx` (names, icon, `makerOf`)
- Modify: `src/ui/Queue.tsx`
- Modify: `src/ui/DeathCard.tsx` (takes `content`), `src/ui/DeathCard.test.tsx`
- Modify: `src/ui/narrate.ts`
- Modify: `src/ui/App.tsx` (passes `content` to the band and the card)
- Modify: `src/styles.css:73` (only if the user picked B in Task 4)
- Delete: `src/data/skills.ts`

**Interfaces:**
- Consumes: `skillOf`, `ICON_NAMES`, `IconName`, `SkillDefinition` (Task 3).
- Produces:

```ts
// src/ui/icons.tsx
export const ICONS: Readonly<Record<IconName, LucideIcon>>
// src/ui/SkillsBand.tsx
SkillsBand({ content, skills, runningSkill }: { content: Pick<Content,'roster'>; skills: Readonly<Record<SkillId, SkillState>>; runningSkill: SkillId | null })
// src/ui/SkillCell.tsx
SkillCell({ skill, state, running }: { skill: SkillDefinition; state: SkillState; running: boolean })
// src/ui/DeathCard.tsx
DeathCard({ summary, content, onBegin }: { summary: DeathSummary; content: Pick<Content,'roster'>; onBegin: () => void })
```

- [ ] **Step 1: Change the tests first**

`src/ui/icons.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ICON_NAMES } from '../data/icons';
import { GearIcon, ICONS } from './icons';

describe('icons', () => {
  it('has a defined component for every name in the vocabulary, and the gear', () => {
    for (const name of ICON_NAMES) expect(ICONS[name]).toBeDefined();
    expect(GearIcon).toBeDefined();
  });
});
```

`src/ui/SkillsBand.test.tsx` (the one intended expectation change):

```tsx
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { saltRoad } from '../data/salt-road';
import { newState } from '../engine/queue';
import { SkillsBand } from './SkillsBand';

describe('SkillsBand', () => {
  it('renders the roster in roster order, with only the running one marked', () => {
    const { container } = render(<SkillsBand content={saltRoad} skills={newState().skills} runningSkill="mine" />);
    const cells = Array.from(container.querySelectorAll('[data-skill]')).map((el) => el.getAttribute('data-skill'));
    expect(cells).toEqual(['forage', 'mine', 'build']);
    expect(container.querySelectorAll('.working')).toHaveLength(1);
    expect(container.querySelector('.working')).toHaveAttribute('data-skill', 'mine');
  });
});
```

`src/ui/SkillCell.test.tsx`: add `const skill = { id: 'forage', name: 'Forage', icon: 'sprout' } as const;`
and replace every `id="forage"` with `skill={skill}`.

`src/ui/DeathCard.test.tsx`: import `saltRoad` and pass `content={saltRoad}`
to every `<DeathCard …>`.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/ui`
Expected: FAIL on the four files above (unknown props, missing exports).

- [ ] **Step 3: The icon map**

`src/ui/icons.tsx`:

```tsx
import type { LucideIcon } from 'lucide-react';
import { Axe, BowArrow, ChefHat, Eye, FishingRod, House, MessageCircle, Pickaxe, Route, Settings, Sprout, Sword, Wrench } from 'lucide-react';
import type { IconName } from '../data/icons';

/** Spec 8.1: chosen to stay apart at 15px. Verified in lucide-react 1.47.0. Keyed by the data layer's vocabulary. */
export const ICONS: Readonly<Record<IconName, LucideIcon>> = {
  'sprout': Sprout, 'axe': Axe, 'pickaxe': Pickaxe, 'fishing-rod': FishingRod, 'bow-arrow': BowArrow,
  'wrench': Wrench, 'house': House, 'chef-hat': ChefHat,
  'sword': Sword, 'route': Route, 'message-circle': MessageCircle, 'eye': Eye,
};

export const GearIcon: LucideIcon = Settings;
```

- [ ] **Step 4: The band and the cell**

`src/ui/SkillsBand.tsx`:

```tsx
import type { Content, SkillId } from '../data/types';
import type { SkillState } from '../engine/types';
import { SkillCell } from './SkillCell';

/** The book's whole roster, in roster order, from life 1 (spec 2026-09-23 section 2). */
export function SkillsBand({ content, skills, runningSkill }: {
  content: Pick<Content, 'roster'>; skills: Readonly<Record<SkillId, SkillState>>; runningSkill: SkillId | null;
}) {
  return (
    <section className="skills" aria-label="skills">
      {content.roster.map((s) => <SkillCell key={s.id} skill={s} state={skills[s.id]} running={s.id === runningSkill} />)}
    </section>
  );
}
```

`src/ui/SkillCell.tsx`: replace the imports of `SKILLS`, `SkillId` and
`SKILL_ICONS` with `import type { SkillDefinition } from '../data/types';`
and `import { ICONS } from './icons';`; change the signature and the two
lookups:

```tsx
export function SkillCell({ skill, state, running }: { skill: SkillDefinition; state: SkillState; running: boolean }) {
  const Icon = ICONS[skill.icon];
  const perSecond = tickExp(state) * ticksPerSecond();
  return (
    <div className={`item skill${running ? ' skill--on working' : ''}`} data-skill={skill.id}>
      <div className="skill__icon"><Icon aria-hidden="true" /></div>
      <div className="skill__name">
        <b>{skill.name}</b>
```

(the rest unchanged).

If the user picked **B** in Task 4, change `src/styles.css:73` to
`.skills { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; }`
with the comment `/* one column per roster entry; #46 revisits the band at N */`.
If **A**, leave the line and add the comment
`/* four across; a three-skill roster leaves the fourth slot empty (mockup 2026-09-23-three-cell-band, pick A) */`.

- [ ] **Step 5: The row, the queue, the card, the log**

`src/ui/ActionRow.tsx`: replace `import { SKILLS } from '../data/skills';`
with `import { skillOf } from '../data/roster';` and `SKILL_ICONS` with
`ICONS`. Then:

```tsx
function makerOf(content: Content, item: ItemId): string | null {
  const producer = Object.values(content.actions).find((a) => a.producedItem === item);
  return producer ? skillOf(content, producer.verb).name : null;   // a validated book always has one (Task 6)
}
```

In the component: `const skill = skillOf(content, action.verb);`,
`const Icon = ICONS[skill.icon];`, `const rowName = \`${skill.name} ${action.noun}\`;`,
`<b>{skill.name}</b>` in place of `<b>{SKILLS[action.verb].name}</b>`, and the
instruction line becomes

```tsx
            <div key={c.item}>missing {c.owed - c.have} {c.item} · <b>{makerOf(content, c.item) ?? c.item} {c.atCap ? 'more as it builds' : 'some!'}</b></div>
```

`src/ui/Queue.tsx`: same two import swaps; inside the map,
`const skill = skillOf(content, a.verb); const Icon = ICONS[skill.icon];`
and `skill.name` in place of both `SKILLS[a.verb].name`.

`src/ui/DeathCard.tsx`: add `content: Pick<Content, 'roster'>` to the props,
import `skillOf` and `ICONS`, and in the gains map:

```tsx
            const skill = skillOf(content, g.skill);
            const Icon = ICONS[skill.icon];
            …
                <b>{skill.name}</b>
```

`src/ui/narrate.ts`: replace the `SKILLS` import with `skillOf`;
`rowName` returns `` `${skillOf(content, a.verb).name} ${a.noun}` `` and the
`coreLevel` case returns `` `${skillOf(content, e.skill).name} reaches Lv ${e.level}` ``.

`src/ui/App.tsx`: `<SkillsBand content={saltRoad} skills={view.skills} runningSkill={runningSkill} />`
and `<DeathCard summary={card} content={saltRoad} onBegin={…} />`.

Delete `src/data/skills.ts` (`git rm`).

- [ ] **Step 6: Run every gate**

Run: `npm run typecheck && npm run lint && npm test`
Expected: all green; `grep -rn "SKILLS\b\|SKILL_ICONS" src` returns nothing.

- [ ] **Step 7: Commit**

```bash
git add -A src
git commit -m "ui: names and icons come from the roster; the band shows the book's skills"
```

---

### Task 6: The validator

Static, in `src/data/`, one test per rule. Returns problems; an empty list
means valid. Nothing calls it at runtime yet; The Salt Road's test does.

**Files:**
- Create: `src/data/validate.ts`
- Create: `src/data/validate.test.ts`
- Modify: `src/data/salt-road.test.ts` (accepts; round-trips)

**Interfaces:**
- Consumes: `Book`, `ICON_NAMES`.
- Produces: `export function validateBook(book: Book): readonly string[]`

- [ ] **Step 1: Write the failing tests**

`src/data/validate.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { Book } from './types';
import { validateBook } from './validate';

/** A minimal valid book to break in one place per test. */
const good: Book = {
  id: 'test', name: 'Test',
  roster: [{ id: 'forage', name: 'Forage', icon: 'sprout' }, { id: 'build', name: 'Build', icon: 'house' }],
  chapters: [{ head: { numeral: 'I', chapter: 'One', story: 'A start.' }, order: ['forage', 'hut'] }],
  items: {
    berries: { id: 'berries', name: 'berries', kind: 'food', cap: 20, healPerUnit: 4 },
    hut: { id: 'hut', name: 'hut', kind: 'structure', cap: 1 },
  },
  actions: {
    forage: { id: 'forage', verb: 'forage', noun: 'berries', expCost: 1, producedItem: 'berries', producedAmount: 1, itemCosts: [], isOneTime: false },
    hut: { id: 'hut', verb: 'build', noun: 'a hut', expCost: 6, producedItem: 'hut', producedAmount: 1, itemCosts: [{ item: 'berries', amount: 3 }], isOneTime: true },
  },
};

const withActions = (actions: Book['actions'], order?: readonly string[]): Book =>
  ({ ...good, actions, chapters: [{ ...good.chapters[0]!, order: order ?? Object.keys(actions) }] });

describe('validateBook', () => {
  it('accepts a well-formed book', () => {
    expect(validateBook(good)).toEqual([]);
  });
  it('rejects a row whose verb is not in the roster', () => {
    const b = withActions({ ...good.actions, chop: { ...good.actions.forage!, id: 'chop', verb: 'chop', producedItem: 'berries' } });
    expect(validateBook(b)).toContainEqual(expect.stringMatching(/chop.*roster/));
  });
  it('rejects a roster skill with no row', () => {
    const b: Book = { ...good, roster: [...good.roster, { id: 'fish', name: 'Fish', icon: 'fishing-rod' }] };
    expect(validateBook(b)).toContainEqual(expect.stringMatching(/fish.*no row/));
  });
  it('rejects an icon name outside the vocabulary', () => {
    const b: Book = { ...good, roster: [{ id: 'forage', name: 'Forage', icon: 'dragon' as never }, good.roster[1]!] };
    expect(validateBook(b)).toContainEqual(expect.stringMatching(/dragon/));
  });
  it('rejects a row that names an item the book does not define', () => {
    const b = withActions({ ...good.actions, forage: { ...good.actions.forage!, producedItem: 'nuts' } });
    expect(validateBook(b)).toContainEqual(expect.stringMatching(/nuts/));
  });
  it('rejects a cost with no producer in the same or an earlier chapter', () => {
    const b: Book = {
      ...good,
      items: { ...good.items, stone: { id: 'stone', name: 'stone', kind: 'material', cap: 5 } },
      actions: {
        ...good.actions,
        hut: { ...good.actions.hut!, itemCosts: [{ item: 'stone', amount: 1 }] },
        mine: { id: 'mine', verb: 'forage', noun: 'stone', expCost: 1, producedItem: 'stone', producedAmount: 1, itemCosts: [], isOneTime: false },
      },
      chapters: [
        { head: good.chapters[0]!.head, order: ['forage', 'hut'] },
        { head: { numeral: 'II', chapter: 'Two', story: 'Later.' }, order: ['mine'] },
      ],
    };
    expect(validateBook(b)).toContainEqual(expect.stringMatching(/stone.*hut/));
  });
  it('rejects a cost cycle: rope needs plank, plank needs rope', () => {
    const b: Book = {
      ...good,
      items: { ...good.items, rope: { id: 'rope', name: 'rope', kind: 'material', cap: 5 }, plank: { id: 'plank', name: 'plank', kind: 'material', cap: 5 } },
      actions: {
        ...good.actions,
        rope: { id: 'rope', verb: 'build', noun: 'rope', expCost: 1, producedItem: 'rope', producedAmount: 1, itemCosts: [{ item: 'plank', amount: 1 }], isOneTime: false },
        plank: { id: 'plank', verb: 'build', noun: 'a plank', expCost: 1, producedItem: 'plank', producedAmount: 1, itemCosts: [{ item: 'rope', amount: 1 }], isOneTime: false },
      },
      chapters: [{ head: good.chapters[0]!.head, order: ['forage', 'hut', 'rope', 'plank'] }],
    };
    expect(validateBook(b)).toContainEqual(expect.stringMatching(/cycle/));
  });
  it('rejects a yield above the cap', () => {
    const b = withActions({ ...good.actions, forage: { ...good.actions.forage!, producedAmount: 21 } });
    expect(validateBook(b)).toContainEqual(expect.stringMatching(/forage.*cap/));
  });
  it('rejects a first chapter with no row that needs nothing in hand', () => {
    const b = withActions({ hut: good.actions.hut! }, ['hut']);
    const problems = validateBook({ ...b, roster: [good.roster[1]!] });
    expect(problems).toContainEqual(expect.stringMatching(/first chapter/));
  });
  it('rejects a chapter order naming an action the book lacks, and an action in no chapter', () => {
    expect(validateBook(withActions(good.actions, ['forage', 'hut', 'ghost']))).toContainEqual(expect.stringMatching(/ghost/));
    expect(validateBook(withActions(good.actions, ['forage']))).toContainEqual(expect.stringMatching(/hut.*chapter/));
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/data/validate.test.ts`
Expected: FAIL, `./validate` not found.

- [ ] **Step 3: Write the validator**

`src/data/validate.ts`:

```ts
/**
 * Static checks on a book (spec 2026-09-23 section 11, step 4). Once the skill
 * id is book data nothing checks these at compile time. Two of them, the cost
 * cycle and the yield above cap, guard against a book that freezes the engine
 * forever: under decision #41 a queue nothing can run passes no time, so the
 * player never dies and never gets a rebirth. Returns every problem found; an
 * empty list is a valid book.
 */
import { ICON_NAMES } from './icons';
import type { ActionId, Book, ItemId } from './types';

const icons: ReadonlySet<string> = new Set(ICON_NAMES);

export function validateBook(book: Book): readonly string[] {
  const problems: string[] = [];
  const rosterIds = new Set(book.roster.map((s) => s.id));
  const actions = Object.values(book.actions);

  for (const s of book.roster) {
    if (!icons.has(s.icon)) problems.push(`skill "${s.id}" names an icon outside the vocabulary: "${s.icon}"`);
    if (!actions.some((a) => a.verb === s.id)) problems.push(`skill "${s.id}" has no row`);
  }
  for (const a of actions) {
    if (!rosterIds.has(a.verb)) problems.push(`row "${a.id}" uses verb "${a.verb}", which is not in the roster`);
    if (a.producedItem !== undefined && book.items[a.producedItem] === undefined) problems.push(`row "${a.id}" produces "${a.producedItem}", which the book does not define`);
    for (const c of a.itemCosts) {
      if (book.items[c.item] === undefined) problems.push(`row "${a.id}" costs "${c.item}", which the book does not define`);
    }
    const item = a.producedItem !== undefined ? book.items[a.producedItem] : undefined;
    if (item !== undefined && (a.producedAmount ?? 1) > item.cap) problems.push(`row "${a.id}" yields more than the cap of "${item.id}"`);
  }

  // Chapters: every order id is an action, every action is in exactly one chapter.
  const chapterOf = new Map<ActionId, number>();
  book.chapters.forEach((ch, k) => {
    for (const id of ch.order) {
      if (book.actions[id] === undefined) problems.push(`chapter ${k + 1} orders "${id}", which the book does not define`);
      else if (chapterOf.has(id)) problems.push(`row "${id}" appears in more than one chapter`);
      else chapterOf.set(id, k);
    }
  });
  for (const a of actions) if (!chapterOf.has(a.id)) problems.push(`row "${a.id}" is in no chapter`);

  // Every cost has a producer in the same or an earlier chapter.
  const producersOf = (item: ItemId) => actions.filter((p) => p.producedItem === item);
  for (const a of actions) {
    const k = chapterOf.get(a.id) ?? Number.POSITIVE_INFINITY;
    for (const c of a.itemCosts) {
      if (book.items[c.item] === undefined) continue;
      const ok = producersOf(c.item).some((p) => (chapterOf.get(p.id) ?? Number.POSITIVE_INFINITY) <= k);
      if (!ok) problems.push(`"${c.item}" has no producer in the same or an earlier chapter as row "${a.id}"`);
    }
  }

  // The cost graph is acyclic: an edge from a row to each producer of each of its costs.
  const state = new Map<ActionId, 'visiting' | 'done'>();
  const visit = (id: ActionId): boolean => {
    const st = state.get(id);
    if (st === 'visiting') return true;
    if (st === 'done') return false;
    state.set(id, 'visiting');
    const a = book.actions[id];
    const found = a !== undefined && a.itemCosts.some((c) => producersOf(c.item).some((p) => visit(p.id)));
    state.set(id, 'done');
    return found;
  };
  if (actions.some((a) => visit(a.id))) problems.push('the cost graph has a cycle');

  const first = book.chapters[0];
  if (first === undefined || !first.order.some((id) => book.actions[id]?.itemCosts.length === 0)) {
    problems.push('the first chapter has no row that needs nothing in hand');
  }
  return problems;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/data/validate.test.ts`
Expected: PASS, all ten.

- [ ] **Step 5: The Salt Road is accepted and round-trips**

Append to `src/data/salt-road.test.ts` (import `validateBook`):

```ts
  it('is a valid book', () => {
    expect(validateBook(saltRoad)).toEqual([]);
  });
  it('round-trips through JSON: the value is what a generator would emit', () => {
    const copy = JSON.parse(JSON.stringify(saltRoad)) as Book;
    expect(copy).toEqual(saltRoad);
    expect(validateBook(copy)).toEqual([]);
  });
```

Run: `npx vitest run src/data`
Expected: PASS.

- [ ] **Step 6: Run every gate**

Run: `npm run typecheck && npm run lint && npm test && npm run test:hooks`
Expected: all green. The purity test accepts `src/data/validate.ts` (it imports only `./icons` and `./types`).

- [ ] **Step 7: Commit**

```bash
git add src/data/validate.ts src/data/validate.test.ts src/data/salt-road.test.ts
git commit -m "data: a static book validator; The Salt Road passes and round-trips"
```

---

### Task 7: Drop the union

`SkillId` becomes `string`. The engine builds the skill map from the roster
and throws on a verb with no skill state; the UI trusts the validator.

**Files:**
- Modify: `src/data/types.ts:6-15` (`SkillId = string`; delete `SKILL_IDS`)
- Modify: `src/engine/queue.ts:15-36` (`newState(roster)`), `:186` (guard)
- Modify: `src/engine/rebirth.ts` (iterate the state's keys; no `SKILL_IDS`)
- Modify: `src/engine/types.ts:31,40,54` (string keys)
- Modify: `src/state/useGame.ts:78` (`newState(content.roster)`)
- Modify: `src/ui/ActionRow.tsx:55`, `src/ui/Queue.tsx:17` (`!` on the skill lookup)
- Modify: every `newState()` call in tests (about 116 across 11 files) and
  the two `SKILL_IDS` loops in `src/engine/rebirth.test.ts:69,77`
- Modify: `README.md:16`, `CLAUDE.md` (source layout note on `src/data/`)

**Interfaces:**
- Consumes: `SkillDefinition`, `Content.roster`.
- Produces:

```ts
export type SkillId = string;
export function newState(roster: readonly SkillDefinition[]): GameState
export function rebirth(dead: GameState): GameState          // unchanged signature; rebuilds from Object.keys(dead.skills)
```

- [ ] **Step 1: Change the type**

In `src/data/types.ts` replace the `SkillId` union and `SKILL_IDS` with:

```ts
/** A skill id is book data: whatever the book's roster declares (spec 2026-09-23 section 2). */
export type SkillId = string;
```

Run: `npm run typecheck`
Expected: red, in `queue.ts`, `rebirth.ts`, `icons.tsx` (if any reference
remains) and every test that calls `newState()` with no argument once the
next step lands. That list is the edit list.

- [ ] **Step 2: The engine builds the map from the roster and guards the lookup**

`src/engine/queue.ts`: replace the `SKILL_IDS` import with
`import type { SkillDefinition } from '../data/types';` and:

```ts
export function newState(roster: readonly SkillDefinition[]): GameState {
  const skills = Object.fromEntries(roster.map((s) => [s.id, newSkill()])) as Record<SkillId, SkillState>;
  return {
    …(unchanged fields)…
    lifeStartCore: Object.fromEntries(roster.map((s) => [s.id, 0])) as Record<SkillId, number>,
  };
}
```

In `stepQueue` replace `const skill = next.skills[action.verb];` with:

```ts
  const skill = next.skills[action.verb];
  // A validated book has a roster entry for every verb (src/data/validate.ts); an unvalidated fixture that lacks one is a bug, not a state.
  if (skill === undefined) throw new Error(`no skill state for verb "${action.verb}"`);
```

`src/engine/rebirth.ts`: remove the `SKILL_IDS` import; in `deathSummary`
and `rebirth` replace `SKILL_IDS` with `Object.keys(dead.skills)` and the
two `dead.skills[id]` / `dead.lifeStartCore[id]` reads with `!`-asserted
reads (the keys came from the same object):

```ts
  const ids = Object.keys(dead.skills);
  const coreGains = ids
    .filter((id) => dead.skills[id]!.core.level > (dead.lifeStartCore[id] ?? 0))
    .map((id) => {
      const core = dead.skills[id]!.core;
      return { skill: id, from: dead.lifeStartCore[id] ?? 0, to: core.level, progress: core.exp / expToNextLevel(balance.skills.coreMastery.baseExp, core.level) };
    });
```

`rebirth` must not invent roster entries to call `newState`, so the run
literal moves into a shared helper that takes the two maps. In `queue.ts`,
replace `newState` with:

```ts
// src/engine/queue.ts
/** A fresh run around the given ledgers. newState builds them from a roster; rebirth carries them over. */
export function blankRun(skills: Readonly<Record<SkillId, SkillState>>, lifeStartCore: Readonly<Record<SkillId, number>>): GameState {
  return {
    runTicks: 0, health: balance.health.base, maxHealth: balance.health.base, paused: 'system', dead: false,
    skills, inventory: {}, foodCooldowns: {}, queue: [], completedOneTime: [], completionCounts: {},
    decayMultiplier: 1, events: [], life: 1, rebirthBonus: 0, lifeStartCore,
  };
}

export function newState(roster: readonly SkillDefinition[]): GameState {
  return blankRun(
    Object.fromEntries(roster.map((s) => [s.id, newSkill()])),
    Object.fromEntries(roster.map((s) => [s.id, 0])),
  );
}
```

and in `rebirth.ts`:

```ts
  const ids = Object.keys(dead.skills);
  const skills = Object.fromEntries(ids.map((id) => [id, { core: dead.skills[id]!.core, run: newSkill().run }])) as Record<SkillId, SkillState>;
  const lifeStartCore = Object.fromEntries(ids.map((id) => [id, skills[id]!.core.level])) as Record<SkillId, number>;
  return { ...blankRun(skills, lifeStartCore), paused: 'system', life: dead.life + 1, rebirthBonus, maxHealth, health: maxHealth, completionCounts: dead.completionCounts };
```

(`rebirth.ts` imports `blankRun` instead of `newState`.)

`src/engine/types.ts`: the `coreLevel` event's `skill`, `skills` and
`lifeStartCore` already use `SkillId`, which is now `string`; no edit unless
the compiler asks.

`src/state/useGame.ts`: `initial()` becomes a function of `content`:

```ts
function initial(content: Content): Model {
  return { state: setPaused(newState(content.roster), 'none'), log: [{ seq: 0, at: 0, event: { type: 'lifeBegins', life: 1 } }], nextSeq: 1 };
}
…
  const [model, dispatch] = useReducer(reduce(content), content, initial);
```

`src/ui/ActionRow.tsx` and `src/ui/Queue.tsx`: `tickExp(state.skills[action.verb]!)`
and `tickExp(state.skills[a.verb]!)`.

`src/ui/SkillsBand.tsx`: `state={skills[s.id]!}`.

- [ ] **Step 3: Every test passes a roster**

Rule: `newState()` becomes `newState(<the fixture's roster>)`. In a file with
a local `content` fixture (engine tests), use `newState(content.roster)`. In
a file that imports `saltRoad`, use `newState(saltRoad.roster)`. Where a test
builds neither, add at the top:

```ts
const roster = [{ id: 'forage', name: 'Forage', icon: 'sprout' }, { id: 'mine', name: 'Mine', icon: 'pickaxe' }, { id: 'build', name: 'Build', icon: 'house' }] as const;
```

and call `newState(roster)`. Run `grep -rn "newState()" src` until it
returns nothing.

`src/engine/rebirth.test.ts`: replace `for (const id of SKILL_IDS)` (two
places) with `for (const id of Object.keys(next.skills))`, and delete the
`SKILL_IDS` import. The `lifeStartCore.fish` assertion at `:92` becomes
`expect(next.lifeStartCore.build).toBe(0);` (the fixture's roster has no
fish; build is the roster skill that did not move).

`src/engine/queue.test.ts:250`: unchanged; `craft` is in that fixture's
roster from Task 3.

- [ ] **Step 4: Run every gate**

Run: `npm run typecheck && npm run lint && npm test && npm run test:hooks`
Expected: all green. `playable.test.ts`'s progression assertions
(`toBeGreaterThan`) are untouched. `grep -rn "SKILL_IDS" src` returns nothing.

- [ ] **Step 5: Docs that this task makes true**

`README.md:16`: replace `the twelve skills` with `the book's three skills
(forage, mine, build)`. `CLAUDE.md` source layout: under `data/` add
`— a book is a value of the Book type in types.ts; src/data/validate.ts is
the only check on it`. In the guard-layer table row for `src/purity.test.ts`
nothing changes. Update the pointer paragraph at the top of
`docs/specs/2026-09-22-books-chapters-verbs.md` only if it still says
"categories as tags" (it should already say the current shape).

- [ ] **Step 6: Commit**

```bash
git add -A src README.md CLAUDE.md
git commit -m "engine: the skill id is book data; newState takes the roster"
```

---

### Task 8: Gates, review panel, Chrome

**Files:** none new.

- [ ] **Step 1: Every gate, from clean**

Run: `npm run typecheck && npm run lint && npm test && npm run test:hooks && npm run build`
Expected: all green.

- [ ] **Step 2: Chrome**

Invoke `/chrome-verify`. Check, with the dev handle and by eye:
- the band shows three cells, Forage, Mine, Build, in that order, in the layout the user picked in Task 4;
- queue Forage: the Forage cell carries the sheen and its bars move;
- the death card (use the dev handle's `setHealth`) names Forage or Mine with "core N → M";
- the log's level-up line reads "Forage reaches Lv 1";
- the console is clean, including 404s.

- [ ] **Step 3: The code review panel**

Dispatch fresh, in parallel, with no implementation context: `engine-reviewer`,
`tuning-guard` (it must see the `ticksPerSkillPoint` removal as intended and
nothing else changed in `balance.ts`), `vacuous-test-hunter` (the validator
tests and the round trip are its targets), and a general reviewer briefed to
diff the branch against spec §11 step by step. Loop until a clean round.

- [ ] **Step 4: Squash and hand off**

Squash the branch to one commit whose subject reads as what shipped, e.g.
`feat: books own their skills; the format, the validator, a roster of three`.
Do not FF-merge: the user verifies in Chrome first (CLAUDE.md, "user-verify
before FF-merge"). Hand over the URL, the three-cell band, the death card and
the log line as the things to look at.

---

## Self-review

- **Spec coverage:** §11 steps 1–5 map to Tasks 1, 2, 3+5, 6, 7; the mockup
  gate (§2, §12) is Task 4; §10's "when each lands" is satisfied (only the
  named doc lines change). §3's bookmark map, §6, §8 and §9 are explicitly
  not in the slice.
- **Deviation from the spec, recorded:** §11 step 5 says `rebirth(dead, roster)`.
  This plan keeps `rebirth(dead)` and rebuilds from the dead state's own keys
  through a shared `blankRun`; the roster is already the keys of a live
  state, and ten call sites stay untouched. The spec line is amended in the
  same commit as this plan.
- **Placeholders:** none; every step has its code or its exact command.
- **Type consistency:** `SkillDefinition`, `Chapter`, `Book`, `Content.roster`,
  `skillOf`, `ICONS`, `ICON_NAMES`, `validateBook`, `blankRun`, `newState(roster)`
  are used with the same names and shapes in every task that touches them.
- **Review Focus:** each of the five lines has its test in Task 6 or 7.
