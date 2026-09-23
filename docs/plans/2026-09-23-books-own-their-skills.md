# Books own their skills: the seam — Implementation Plan

**Status:** written 2026-09-23, revised after plan-panel rounds one and two
(reviewer A built every task in a scratch copy; the naysayers attacked the
validator with real books and built the revised order). To be executed in a
later session on `feature/cores-books-and-the-shelf`, the branch that
carries the spec.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every book declares its own skills. The fixed twelve-verb union
becomes book data, The Salt Road becomes a value of a `Book` type with a
three-skill roster, a static validator replaces the compile-time check the
union gave, and nothing about how the one book plays changes.

**Architecture:** `Content` gains a `roster`; `Book` is `Content` plus an id,
a name and chapters. The engine builds the skill map from the roster instead
of a global list, and every UI name and icon lookup goes through the roster
instead of two module-level globals (`SKILLS`, `SKILL_ICONS`). An icon
vocabulary of plain names lives in `src/data/` so the data layer never
imports the UI. A validator in `src/data/` returns a list of problems; it
checks the format's integrity and nothing about play, because the queue and
inventory rules it would lean on are replaced by #47 and #45 right after
this seam, and the headless play (spec §9) is the judge of play.

**Tech Stack:** TypeScript (strict, `noUncheckedIndexedAccess`), React, Vite,
Vitest (`node` for engine, `// @vitest-environment jsdom` for components),
lucide-react icons.

**Spec:** `docs/specs/2026-09-23-books-own-their-skills.md`, §2, §3, §10 and
§11. The plan implements §11; §10 says which doc lines the slice edits.

## Revision 2 (2026-09-23), what round two changed

- **Revision 1's reorder was wrong and was never run.** Moving
  `newState(roster)` into the format task left the band mapping twelve ids
  over a three-key state: ten tests red and a blank page. Measured by the
  round-two naysayer. The split now: Task 4 is the format, the vocabulary,
  the helper, The Salt Road and the head prop, with `newState()` untouched
  and the state still holding twelve keys; Task 5 is the UI reading the
  roster (three cells over a twelve-key state, so every `!` is defined);
  Task 6 is `newState(roster)`, the rebirth rebuild, the call sites and the
  union drop together, where the rebirth loops typecheck because the id is
  a string. The four engine `Content` fixtures are touched in both 4 and 6;
  that is the cost.
- **Task 7's two key≠id regexes did not match the validator's own
  messages.** Fixed. Two condition-level mutations survived the mutation
  check (`Object.hasOwn` reverted to a bracket lookup; the empty-book branch
  flipped): a prototype-key test and an empty-book test are added, and the
  first-chapter rule no longer throws on a prototype-named order id. The
  manual mutation step is dropped for the claim it could not back; the
  tests are the check.
- **A books index test** makes Review Focus 1 a mechanism: every exported
  book validates.
- **Honest counts:** five tests change an asserted value; the "Craft"
  fallback is an untested behaviour change, listed as such.
- **Two more constraints:** record the Task 1 pick before Task 2's first
  commit, so the squash stays one `reset --soft`, which prompts; and a
  roster edited under a running dev server crashes the band through Fast
  Refresh's kept state, which the `book-author` slice must remember.

## Revision 1 (2026-09-23), what round one changed

- **Order.** The mockup and the user's pick move to Task 1, so the one hard
  stop sits at the front of a subagent-driven run. The UI reads the roster
  before the union drops. (Round one also moved `newState(roster)` into the
  format task; round two reversed that, see above.)
- **The validator is trimmed to format integrity.** The cycle, yield-above-cap
  and producer-in-an-earlier-chapter rules are dropped: the first two are
  written against stall-in-place and per-item caps, which #47 and #45
  replace; measured, the cycle rule accepted a same-class softlock and
  rejected a playable book; and the chapter rule decides a question the
  09-22 spec leaves open (materials may reset at a chapter boundary). They
  are filed against the headless play. Two rules gained the tests they
  lacked; duplicate roster ids and a record key that differs from its `id`
  are new rules.
- **Honest about expectations.** More than one test changes an asserted
  value; they are listed under Global Constraints (five, as Revision 2
  corrected).
- **Typecheck-red steps fixed.** Reviewer A found Tasks 3, 6 and 7 green
  under vitest and red under `tsc`; every `state.skills.<id>` read in tests
  needs `!` once the key is a string, `RunningHead.test` renders the head
  directly, and the round-trip test imports `type Book`. All folded in.
- **The rebirth loops assert the key sets**, iterating the dead state rather
  than the output, so a dropped ledger cannot hide.
- **`rebirth(dead)` keeps its signature, ratified by the panel this round.**
  Reviewer A measured `blankRun` as field-for-field equal to today's run.
  The naysayer's objection, that a saved state from before a roster change
  can never heal, is a save/load migration concern and is recorded on #27;
  no state is persisted today.
- **Review before Chrome** in the last task, per CLAUDE.md.

## Global Constraints

- **No tuning number changes.** `balance.content.scrub` stays as it is and
  the Salt Road reads every number from it. Removing `ticksPerSkillPoint` is
  the one `balance.ts` edit, named in Task 2 for the tuning guard and
  decided in spec §11 step 1.
- **No magic numbers** in `src/engine/`, `src/data/`, `src/state/`
  (`decision #3`, hook `.claude/hooks/tuning-literals.sh`).
- **The engine never imports from `src/ui/`; `src/data/` imports only
  `src/data/` and `src/balance.ts`** (`src/purity.test.ts`). The icon
  vocabulary is plain strings in `src/data/`; lucide stays in `src/ui/`.
- **Behaviour is preserved.** No engine number, order or event changes.
  **Tests whose asserted value changes, all intended, five:** `balance.test`
  (time constants, one test deleted), `scrub.test` → `salt-road.test`
  ("names all twelve" → the roster of three), `icons.test` (twelve ids → the
  vocabulary), `rebirth.test` (`.fish` → `.build`; the loops iterate the
  dead state), `SkillsBand.test` (twelve cells → three). **One untested
  behaviour change:** the action row's unreachable "Craft" fallback text
  becomes the item name.
- **The band shows the book's whole roster, in roster order** (spec §2). The
  Salt Road's roster is `forage, mine, build`, in that order.
- **Ledger names stay `core` and `run`** in code and on screen (spec §2; the
  rename is filed for later).
- **Run in the main checkout, not a worktree.** `gates-on-stop.sh` exits
  silently when `node_modules/.bin/tsc` is missing, so an uninstalled
  worktree runs with the Stop guard off. `node_modules` here holds a
  self-referential `node_modules/node_modules` symlink; do not `cp -R` it.
- **Commands one at a time, no `&&` chains** (they defeat the allowlist).
  Run the whole suite with `npm test`; `npx vitest run <file>` is not
  allowlisted and will prompt. Deleting a file needs `git rm`, which
  prompts; so does the final `git reset --soft`. Both are expected.
- **Record the Task 1 pick in this file and commit it before Task 2's first
  commit**, so the code commits are contiguous and the squash is one
  `reset --soft`.
- **Do not edit `src/data/salt-road.ts`'s roster under a running dev
  server:** Fast Refresh keeps the reducer's state (old keys) and the band's
  `!` reads crash. Restart the server after a roster change. The
  `book-author` slice inherits this.
- **Commit messages:** terse, one line, no trailers, no emoji.
- **Gates before hand-off:** `npm run typecheck`, `npm run lint`, `npm test`,
  `npm run test:hooks`, `npm run build`, the code panel, then Chrome.

## Review Focus

1. **A book whose row names a verb missing from the roster** is rejected by
   the validator (Task 7, `rejects a row whose verb is not in the roster`),
   and every exported book is validated by the books index test, so a
   malformed book cannot reach the engine through `App` unchecked; the
   engine's own throw has a must-fire test in Task 6.
2. **A cost or a product naming an item the book does not define** is
   rejected (Task 7, two tests; the naysayer found the cost half untested).
3. **Two roster entries with one id** would render two cells with one React
   key and dirty the console; rejected (Task 7).
4. **Rebirth after the union is gone** carries every core ledger and
   snapshots `lifeStartCore` from the dead state's own keys; the tests
   assert the key sets match (Task 6).
5. **The death card and the log name a skill through the roster**; a skill
   id with no roster entry cannot render, the validator makes it unreachable
   and the UI uses `!` (Task 5, `DeathCard.test`, `narrate.test`).

---

### Task 1: A mockup of the three-cell band, and the user's pick 🎨

The one visible change of the slice. Decision #31: a committed mockup before
the UI lands; the user chooses between the two layouts. It is rendered from
the **real band**, not drawn: the mockups under `docs/mockups/` use a stale
`.sk` class whose columns and padding differ from `src/styles.css`.

**Files:**
- Create: `docs/mockups/2026-09-23-three-cell-band-a.png`, `-b.png`,
  `docs/mockups/2026-09-23-three-cell-band.html` (the two PNGs side by side
  with captions)
- Modify: `docs/mockups/README.md` (one index line)

- [ ] **Step 1: Start the dev server and open the game in Chrome**

Invoke `/chrome-verify`'s start step (background `npm run dev`, read the
port it took, open `http://localhost:<port>/` through chrome-devtools-mcp).
Resize the page to 1280 wide.

- [ ] **Step 2: Reduce the live band to three cells and capture A**

With `evaluate_script`:

```js
for (const el of document.querySelectorAll('.skills [data-skill]')) {
  if (!['forage', 'mine', 'build'].includes(el.dataset.skill)) el.remove();
}
```

`take_screenshot` of the page; save as
`docs/mockups/2026-09-23-three-cell-band-a.png`. This is layout **A**: four
columns, the fourth slot empty.

- [ ] **Step 3: Capture B**

```js
document.querySelector('.skills').style.gridTemplateColumns = 'repeat(3, 1fr)';
```

`take_screenshot`; save as `docs/mockups/2026-09-23-three-cell-band-b.png`.
Layout **B**: one column per roster entry.

- [ ] **Step 4: The index page and the README line**

`docs/mockups/2026-09-23-three-cell-band.html`: a plain page with both PNGs
stacked, each captioned `A. four across, fourth slot empty` and `B. one
column per skill`, at 1280px. Add to `docs/mockups/README.md`:

```
| 2026-09-23 | [three-cell-band](2026-09-23-three-cell-band.html) | the real band at a three-skill roster: A empty fourth slot, B stretched to three across |
```

- [ ] **Step 5: Commit**

```bash
git add docs/mockups
git commit -m "mockup: the skills band at three cells, two layouts, from the live band"
```

- [ ] **Step 6: Ask the user, and wait**

```
file:///Users/matt/dev/MattAltermatt/continuum/docs/mockups/2026-09-23-three-cell-band.html
! o docs/mockups/2026-09-23-three-cell-band.html
```

Ask: "Three cells: A (empty fourth slot, the grid stays four across) or B
(stretched, one column per skill)?" Recommend A: #46 redesigns the band at N
and A leaves the grid's geometry alone. **Stop until the answer arrives.**
Record it in this file's status line; Task 5 applies it.

---

### Task 2: Skill points out

**Files:**
- Modify: `src/balance.ts:17-21` (remove `ticksPerSkillPoint`)
- Modify: `src/balance.test.ts:12-25`
- Modify: `MECHANICS.md:47-56` (the "Skill points" subsection), `:369`
  (persists list), `:481` (constants table row)

**Interfaces:**
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

- [ ] **Step 3: Run the suite to verify it fails**

Run: `npm test`
Expected: one failure, `balance.test` sees an extra key `ticksPerSkillPoint`.

- [ ] **Step 4: Remove the field**

In `src/balance.ts` delete these two lines:

```ts
    /** Ticks of unbroken survival that award one skill point. 15 minutes. */
    ticksPerSkillPoint: 9_000,
```

- [ ] **Step 5: Edit MECHANICS.md**

Delete the `### Skill points` subsection (heading through "the slowest clock
in the game."). In "What persists" delete the line `- Skill points.`. In the
constants table delete the row beginning `| \`TICKS_PER_SKILL_POINT\``.

- [ ] **Step 6: Gates**

Run `npm run typecheck`, then `npm run lint`, then `npm test`.
Expected: all green, 223 tests.

- [ ] **Step 7: Commit**

```bash
git add src/balance.ts src/balance.test.ts MECHANICS.md
git commit -m "engine: remove skill points, a currency nothing reads (spec 2026-09-23 s11 step 1)"
```

---

### Task 3: `templateKey` out

**Files:**
- Modify: `src/data/types.ts:41-42` (remove the field)
- Modify: `src/engine/queue.ts:149` (`complete`)
- Modify: `src/engine/types.ts:46` (a comment)
- Modify: `src/ui/ActionRow.tsx:73` (`done`)
- Modify: `MECHANICS.md:72,81,83,86-92,164,368,412`

**Interfaces:**
- Produces: completion counts are keyed by `action.id`, always.

- [ ] **Step 1: Confirm no content or test sets the field**

Run: `grep -rn "templateKey" src`
Expected: hits only in `src/data/types.ts`, `src/engine/queue.ts`,
`src/engine/types.ts` (a comment), `src/ui/ActionRow.tsx`.

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

In `src/engine/types.ts` change the comment on `completionCounts` to
`/** Lifetime completions by action id. Drives automation later. */`.

In `src/ui/ActionRow.tsx` replace

```ts
  const done = state.completionCounts[action.templateKey ?? action.id] ?? 0;
```

with

```ts
  const done = state.completionCounts[action.id] ?? 0;
```

- [ ] **Step 3: Edit MECHANICS.md**

In the `ActionDefinition` block delete the `category: ActionCategory` line
(spec §10) and the `templateKey?: string` line. Change
`requires?: Record<string, number> // gating: templateKey → completions needed`
to end `// gating: action id → completions needed`. Delete the bullet that
begins `- **\`templateKey\`** is the action's *stable* identity`, and change
the sentence above it from "Two fields carry more weight than their size
suggests" to "One field carries more weight than its size suggests". Change
step 5 of the completion order to `Increment \`actionCompletionCounts[id]\``.
In "What persists" change `keyed by \`templateKey\`` to `keyed by action id`.
Under the automation thresholds change `Keyed by \`templateKey\`` to `Keyed by
action id`.

- [ ] **Step 4: Gates**

Run `npm run typecheck`, then `npm run lint`, then `npm test`.
Expected: all green; no test changed.

- [ ] **Step 5: Commit**

```bash
git add src/data/types.ts src/engine/queue.ts src/engine/types.ts src/ui/ActionRow.tsx MECHANICS.md
git commit -m "engine: drop templateKey; completion counts key on the action id"
```

---

### Task 4: The book format, the icon vocabulary, and The Salt Road as a value

The union stays, `newState()` stays, the state keeps twelve keys, and
`SKILLS` and `SKILL_ICONS` stay for one more task, so the band still shows
twelve here. Only the shape of content changes.

**Files:**
- Modify: `src/data/types.ts` (add `SkillDefinition`, `Chapter`, `Book`;
  add `roster` to `Content`; drop `book` from `ChapterHead`)
- Create: `src/data/icons.ts`, `src/data/roster.ts`, `src/data/roster.test.ts`
- Create: `src/data/salt-road.ts`, `src/data/salt-road.test.ts`
- Delete: `src/data/scrub.ts`, `src/data/scrub.test.ts`
- Modify: every `Content` fixture: `src/engine/inventory.test.ts:5`,
  `src/engine/queue.test.ts:8`, `src/engine/tick.test.ts:9`,
  `src/engine/health.test.ts:9`
- Modify: every importer of `scrub`: `src/ui/App.tsx`, `src/ui/ChapterPanel.test.tsx`,
  `src/ui/ActionRow.test.tsx`, `src/ui/Food.test.tsx`, `src/ui/Pack.test.tsx`,
  `src/ui/Log.test.tsx`, `src/ui/Queue.test.tsx`, `src/ui/narrate.test.ts`,
  `src/state/useGame.test.tsx`, `src/engine/playable.test.ts`
- Modify: `src/ui/RunningHead.tsx`, `src/ui/RunningHead.test.tsx`,
  `src/ui/ChapterPanel.tsx` (the book name is a prop, not a head field)

**Interfaces:**
- Produces:

```ts
// src/data/icons.ts
export const ICON_NAMES: readonly [...twelve names...]; export type IconName = (typeof ICON_NAMES)[number]
// src/data/types.ts
export interface SkillDefinition { readonly id: SkillId; readonly name: string; readonly icon: IconName }
export interface Chapter { readonly head: ChapterHead; readonly order: readonly ActionId[] }
export interface Content { readonly roster: readonly SkillDefinition[]; readonly actions: …; readonly items: … }
export interface Book extends Content { readonly id: string; readonly name: string; readonly chapters: readonly Chapter[] }
export interface ChapterHead { readonly numeral: string; readonly chapter: string; readonly story: string }
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

- [ ] **Step 2: Run the suite to verify it fails**

Run: `npm test`
Expected: `roster.test` fails to load (`./icons`, `./roster` not found).

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

Change `ChapterHead` to drop `book`, and add `Chapter` and `Book`:

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

- [ ] **Step 4: Write The Salt Road as a `Book`**

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

Create `src/data/salt-road.test.ts` from `scrub.test.ts` with these edits:
import `saltRoad` from `./salt-road` instead of `scrub, SCRUB_HEAD,
SCRUB_ORDER`; replace the **imported identifier** `scrub` with `saltRoad`
(leave `balance.content.scrub` alone, it is a balance key); replace
`SCRUB_ORDER` with `saltRoad.chapters[0]!.order`; drop the `SKILLS` and
`SKILL_IDS` imports; replace the last test with:

```ts
  it('declares a roster of the three skills its rows use, and one chapter with a head', () => {
    expect(saltRoad.roster.map((s) => s.id)).toEqual(['forage', 'mine', 'build']);
    for (const s of saltRoad.roster) expect(s.name.length).toBeGreaterThan(0);
    expect(saltRoad.chapters).toHaveLength(1);
    expect(saltRoad.chapters[0]!.head.story.length).toBeGreaterThan(0);
    expect(saltRoad.name).not.toBe(saltRoad.chapters[0]!.head.chapter);
  });
```

`git rm src/data/scrub.ts src/data/scrub.test.ts`.

- [ ] **Step 5: Every engine `Content` fixture gets a roster**

In each of `src/engine/inventory.test.ts`, `src/engine/queue.test.ts`,
`src/engine/tick.test.ts`, `src/engine/health.test.ts`, add as the first
field of the `content` literal a roster naming every verb the fixture's
actions use. For `queue.test.ts`, whose `quick` row uses `craft`:

```ts
  roster: [
    { id: 'forage', name: 'Forage', icon: 'sprout' },
    { id: 'mine', name: 'Mine', icon: 'pickaxe' },
    { id: 'build', name: 'Build', icon: 'house' },
    { id: 'craft', name: 'Craft', icon: 'wrench' },
  ],
```

For the other three, the same list without `craft` after checking each
fixture's `verb` fields (a verb without a roster entry becomes a thrown
error in Task 6).

- [ ] **Step 6: Re-point every importer of `scrub`, and the head's book name**

Run: `grep -rln "data/scrub'\|'./scrub'" src`

In each file replace the `scrub` import with `import { saltRoad } from '../data/salt-road'`
and the imported identifier `scrub` with `saltRoad` (never `balance.content.scrub`).
`SCRUB_ORDER` becomes `saltRoad.chapters[0]!.order`; `SCRUB_HEAD` becomes
`saltRoad.chapters[0]!.head`.

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

`src/ui/RunningHead.test.tsx` renders the head directly; its render becomes
`render(<RunningHead book="The Salt Road" head={{ numeral: 'II', chapter: 'The Flats', story: 'White ground.' }} />);`
(keep the file's own numeral, chapter and story; only move `book` out of
the head literal into the prop).

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
becomes `[...saltRoad.chapters[0]!.order]`.

`src/ui/App.tsx`: `useGame(saltRoad)`; the chapter panel call becomes

```tsx
            <ChapterPanel
              content={saltRoad} book={saltRoad.name} chapter={saltRoad.chapters[0]!} state={view} runningActionId={runningActionId}
```

and every other `scrub` becomes `saltRoad`.

- [ ] **Step 7: Gates**

Run `npm run typecheck`, then `npm run lint`, then `npm test`.
Expected: all green, 226 tests. The band still shows twelve; the state
still holds twelve keys.

- [ ] **Step 8: Commit**

```bash
git add -A src
git commit -m "data: the book format; The Salt Road as a Book with a roster of three"
```

---

### Task 5: The UI reads the roster; the band shows three

`SKILLS` and `SKILL_ICONS` go. Every name and icon comes from the roster
through `skillOf`; the icon component comes from a UI map keyed by
`IconName`. The union is still the type of `SkillId`, and the state still
holds twelve keys, so `skills[s.id]!` is defined for every roster entry.
(`SkillsBand.test`'s `newState()` call gains a roster in Task 6.)

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
- Modify: `src/styles.css:73` (per the Task 1 pick)
- Delete: `src/data/skills.ts`

**Interfaces:**
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

`src/ui/SkillsBand.test.tsx`:

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

- [ ] **Step 2: Run the suite to verify it fails**

Run: `npm test`
Expected: `icons.test`, `SkillsBand.test` and `SkillCell.test` fail
(`DeathCard.test` is red only under `tsc`, since React ignores the extra prop).

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
      {content.roster.map((s) => <SkillCell key={s.id} skill={s} state={skills[s.id]!} running={s.id === runningSkill} />)}
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

`src/styles.css:73`, per the Task 1 pick. If **A**, leave the rule and add
above it `/* four across; a three-skill roster leaves the fourth slot empty (mockup 2026-09-23-three-cell-band, pick A) */`.
If **B**, change it to `.skills { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; }`
with `/* one column per roster entry (mockup 2026-09-23-three-cell-band, pick B); #46 revisits the band at N */`.

- [ ] **Step 5: The row, the queue, the card, the log**

`src/ui/ActionRow.tsx`: replace `import { SKILLS } from '../data/skills';`
with `import { skillOf } from '../data/roster';` and `SKILL_ICONS` with
`ICONS`. Then:

```tsx
function makerOf(content: Content, item: ItemId): string | null {
  const producer = Object.values(content.actions).find((a) => a.producedItem === item);
  return producer ? skillOf(content, producer.verb).name : null;
}
```

In the component: `const skill = skillOf(content, action.verb);`,
`const Icon = ICONS[skill.icon];`, `const perSecond = tickExp(state.skills[action.verb]!) * ticksPerSecond();`,
`const rowName = \`${skill.name} ${action.noun}\`;`, `<b>{skill.name}</b>` in
place of `<b>{SKILLS[action.verb].name}</b>`, and the instruction line becomes

```tsx
            <div key={c.item}>missing {c.owed - c.have} {c.item} · <b>{makerOf(content, c.item) ?? c.item} {c.atCap ? 'more as it builds' : 'some!'}</b></div>
```

`src/ui/Queue.tsx`: same two import swaps; `tickExp(state.skills[a.verb]!)`
in `remainingSeconds`; inside the map, `const skill = skillOf(content, a.verb); const Icon = ICONS[skill.icon];`
and `skill.name` in place of both `SKILLS[a.verb].name`.

`src/ui/DeathCard.tsx`: add `content: Pick<Content, 'roster'>` to the props
(import `type { Content }`), import `skillOf` and `ICONS`, and in the gains map:

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

`git rm src/data/skills.ts`.

- [ ] **Step 6: Gates**

Run `npm run typecheck`, then `npm run lint`, then `npm test`.
Expected: all green; `grep -rn "SKILLS\b\|SKILL_ICONS" src` returns nothing.

- [ ] **Step 7: Commit**

```bash
git add -A src
git commit -m "ui: names and icons come from the roster; the band shows the book's skills"
```

---

### Task 6: Drop the union, `newState(roster)`, and rebirth from the dead state's keys

`SkillId` becomes `string`. `newState` builds the skill map from a roster;
`rebirth` rebuilds from the dead state's own keys through a shared run
literal; the engine throws on a verb with no skill state. This is the
mechanical edit: about 116 `newState()` call sites in 11 test files.

**Files:**
- Modify: `src/data/types.ts:6-15` (`SkillId = string`; delete `SKILL_IDS`)
- Modify: `src/engine/queue.ts` (`blankRun`, `newState(roster)`, the guard)
- Modify: `src/engine/rebirth.ts` (rebuild from `Object.keys(dead.skills)`)
- Modify: `src/state/useGame.ts` (`initial(content)`)
- Modify: every `newState()` caller (about 116 in 11 test files)
- Modify: `src/engine/rebirth.test.ts` (the two loops; `.fish` → `.build`)
- Modify: `src/engine/queue.test.ts` (nine `.skills.<id>` reads gain `!`; a throw test)
- Modify: `src/engine/tick.test.ts:63` (one read gains `!`)
- Modify: `README.md:16`

**Interfaces:**
- Produces:

```ts
export type SkillId = string;
// src/engine/queue.ts
export function blankRun(skills: Readonly<Record<SkillId, SkillState>>, lifeStartCore: Readonly<Record<SkillId, number>>): GameState
export function newState(roster: readonly SkillDefinition[]): GameState
export function rebirth(dead: GameState): GameState   // unchanged signature
```

- [ ] **Step 1: Write the failing test for the guard**

Append to `src/engine/queue.test.ts`:

```ts
describe('a verb with no skill state', () => {
  it('throws: a validated book cannot produce one, so a fixture that does is a bug', () => {
    const chop: Content = {
      ...content,
      actions: { chop: { id: 'chop', verb: 'chop', noun: 'wood', expCost: 1, itemCosts: [], isOneTime: false } },
    };
    const s = enqueue(newState(content.roster), chop, 'chop');
    expect(() => stepQueue(s, chop, 0)).toThrow(/chop/);
  });
});
```

Run: `npm test`
Expected: red. `newState(content.roster)` does not typecheck yet and, at
runtime, `stepQueue` throws a `TypeError` without "chop" in it.

- [ ] **Step 2: The type, the run literal, `newState(roster)`, the guard**

In `src/data/types.ts` replace the `SkillId` union and `SKILL_IDS` with:

```ts
/** A skill id is book data: whatever the book's roster declares (spec 2026-09-23 section 2). */
export type SkillId = string;
```

In `src/engine/queue.ts` drop the `SKILL_IDS` import, add `SkillDefinition`
to the type import, and replace `newState` with:

```ts
/** A fresh run around the given ledgers. newState builds them from a roster; rebirth carries them over. */
export function blankRun(skills: Readonly<Record<SkillId, SkillState>>, lifeStartCore: Readonly<Record<SkillId, number>>): GameState {
  return {
    runTicks: 0,
    health: balance.health.base,
    maxHealth: balance.health.base,
    paused: 'system',
    dead: false,
    skills,
    inventory: {},
    foodCooldowns: {},
    queue: [],
    completedOneTime: [],
    completionCounts: {},
    decayMultiplier: 1,
    events: [],
    life: 1,
    rebirthBonus: 0,
    lifeStartCore,
  };
}

/** The first life of a book: one fresh skill per roster entry (spec 2026-09-23 section 2). */
export function newState(roster: readonly SkillDefinition[]): GameState {
  return blankRun(
    Object.fromEntries(roster.map((s) => [s.id, newSkill()])),
    Object.fromEntries(roster.map((s) => [s.id, 0])),
  );
}
```

In `stepQueue` replace `const skill = next.skills[action.verb];` with:

```ts
  const skill = next.skills[action.verb];
  // A validated book has a roster entry for every verb (src/data/validate.ts); an unvalidated fixture that lacks one is a bug, not a state.
  if (skill === undefined) throw new Error(`no skill state for verb "${action.verb}"`);
```

In `src/engine/rebirth.ts` replace `import { SKILL_IDS, type SkillId } from '../data/types';`
with `import type { SkillId } from '../data/types';` and
`import { newState } from './queue';` with `import { blankRun } from './queue';`.
In `deathSummary`:

```ts
  const ids = Object.keys(dead.skills);
  const coreGains = ids
    .filter((id) => dead.skills[id]!.core.level > (dead.lifeStartCore[id] ?? 0))
    .map((id) => {
      const core = dead.skills[id]!.core;
      return { skill: id, from: dead.lifeStartCore[id] ?? 0, to: core.level, progress: core.exp / expToNextLevel(balance.skills.coreMastery.baseExp, core.level) };
    });
```

In `rebirth`:

```ts
  const ids = Object.keys(dead.skills);
  const skills: Record<SkillId, SkillState> = Object.fromEntries(ids.map((id) => [id, { core: dead.skills[id]!.core, run: newSkill().run }]));
  const lifeStartCore: Record<SkillId, number> = Object.fromEntries(ids.map((id) => [id, skills[id]!.core.level]));
  return { ...blankRun(skills, lifeStartCore), paused: 'system', life: dead.life + 1, rebirthBonus, maxHealth, health: maxHealth, completionCounts: dead.completionCounts };
```

`src/state/useGame.ts`:

```ts
function initial(content: Content): Model {
  return { state: setPaused(newState(content.roster), 'none'), log: [{ seq: 0, at: 0, event: { type: 'lifeBegins', life: 1 } }], nextSeq: 1 };
}
```

and `useReducer(reduce(content), content, initial)`.

Run: `npm run typecheck`
Expected: red in every test that calls `newState()` or reads
`state.skills.<id>.…` directly. That is the edit list for the next step.

- [ ] **Step 3: Every `newState()` gets a roster, every direct skill read gets `!`**

`newState()` becomes `newState(content.roster)` where the file has a local
`content` fixture, `newState(saltRoad.roster)` where it imports `saltRoad`,
and where it has neither add at the top

```ts
const roster = [{ id: 'forage', name: 'Forage', icon: 'sprout' }, { id: 'mine', name: 'Mine', icon: 'pickaxe' }, { id: 'build', name: 'Build', icon: 'house' }] as const;
```

and call `newState(roster)`. Run `grep -rn "newState()" src` until it
returns nothing.

`src/engine/queue.test.ts`: every `s.skills.<id>` / `settled.skills.<id>`
read (nine; the compiler names each line) becomes `s.skills.<id>!`.
`src/engine/tick.test.ts:63` likewise.

`src/engine/rebirth.test.ts`: drop the `SKILL_IDS` import. Name the
`deadLife()` result `dead` in the first describe as the second already
does, and replace the two loops:

```ts
  it('puts every run ledger back to level 0 with no exp, for every skill the dead state had', () => {
    expect(Object.keys(next.skills)).toEqual(Object.keys(dead.skills));
    for (const id of Object.keys(dead.skills)) expect(next.skills[id]!.run).toEqual({ level: 0, exp: 0 });
  });
```

```ts
  it('keeps every core ledger, level and exp, and snapshots the same keys', () => {
    expect(Object.keys(next.skills)).toEqual(Object.keys(dead.skills));
    expect(Object.keys(next.lifeStartCore)).toEqual(Object.keys(dead.skills));
    for (const id of Object.keys(dead.skills)) expect(next.skills[id]!.core).toEqual(dead.skills[id]!.core);
  });
```

`expect(next.lifeStartCore.fish).toBe(0)` becomes
`expect(next.lifeStartCore.build).toBe(0)` (this fixture's roster has no
fish; build is the roster skill that did not move).

- [ ] **Step 4: Gates**

Run `npm run typecheck`, then `npm run lint`, then `npm test`.
Expected: green, including the throw test (its message now contains "chop")
and `playable.test.ts`'s progression assertions untouched.
`grep -rn "SKILL_IDS" src` returns nothing.

- [ ] **Step 5: README, and commit**

`README.md:16`: replace `the twelve skills` with `the book's three skills
(forage, mine, build)`.

```bash
git add -A src README.md
git commit -m "engine: the skill id is book data; newState takes the roster"
```

---

### Task 7: The validator

Static, in `src/data/`, one test per rule plus two that pin a condition
(own-property lookup, the empty book). It checks the format's integrity:
the checks the union used to give at compile time, plus what the format
promises. It says nothing about play; that is the headless play's job (spec
§9), and the rules a first draft had about cycles, caps and chapter order
are filed against it. A books index makes "every shipped book validates" a
test rather than a habit.

**Files:**
- Create: `src/data/validate.ts`, `src/data/validate.test.ts`
- Create: `src/data/books.ts`, `src/data/books.test.ts`
- Modify: `src/data/salt-road.test.ts` (round-trips)
- Modify: `CLAUDE.md` (source layout note on `src/data/`)

**Interfaces:**
- Produces: `export function validateBook(book: Book): readonly string[]`;
  `export const BOOKS: readonly Book[]` (`src/data/books.ts`)

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
    const b = withActions({ ...good.actions, chop: { ...good.actions.forage!, id: 'chop', verb: 'chop' } });
    expect(validateBook(b)).toContainEqual(expect.stringMatching(/chop.*roster/));
  });
  it('rejects a roster skill with no row', () => {
    const b: Book = { ...good, roster: [...good.roster, { id: 'fish', name: 'Fish', icon: 'fishing-rod' }] };
    expect(validateBook(b)).toContainEqual(expect.stringMatching(/fish.*no row/));
  });
  it('rejects two roster entries with one id', () => {
    const b: Book = { ...good, roster: [...good.roster, { id: 'forage', name: 'Forage again', icon: 'sprout' }] };
    expect(validateBook(b)).toContainEqual(expect.stringMatching(/forage.*twice/));
  });
  it('rejects an icon name outside the vocabulary', () => {
    const b: Book = { ...good, roster: [{ id: 'forage', name: 'Forage', icon: 'dragon' as never }, good.roster[1]!] };
    expect(validateBook(b)).toContainEqual(expect.stringMatching(/dragon/));
  });
  it('rejects a row that produces an item the book does not define', () => {
    const b = withActions({ ...good.actions, forage: { ...good.actions.forage!, producedItem: 'nuts' } });
    expect(validateBook(b)).toContainEqual(expect.stringMatching(/produces "nuts"/));
  });
  it('rejects a row that costs an item the book does not define', () => {
    const b = withActions({ ...good.actions, hut: { ...good.actions.hut!, itemCosts: [{ item: 'planks', amount: 1 }] } });
    expect(validateBook(b)).toContainEqual(expect.stringMatching(/costs "planks"/));
  });
  it('rejects an action whose record key differs from its id, and an item likewise', () => {
    const b = withActions({ ...good.actions, shed: { ...good.actions.hut!, id: 'hut' } }, ['forage', 'hut', 'shed']);
    expect(validateBook(b)).toContainEqual(expect.stringMatching(/"shed".*id is "hut"/));
    const c: Book = { ...good, items: { ...good.items, rock: { id: 'stone', name: 'stone', kind: 'material', cap: 5 } } };
    expect(validateBook(c)).toContainEqual(expect.stringMatching(/"rock".*id is "stone"/));
  });
  it('looks up own properties only: a cost, a product or an order id named like a prototype member is undefined', () => {
    const b = withActions({ ...good.actions, hut: { ...good.actions.hut!, itemCosts: [{ item: 'constructor', amount: 1 }] } });
    expect(validateBook(b)).toContainEqual(expect.stringMatching(/costs "constructor"/));
    const c = withActions({ ...good.actions, forage: { ...good.actions.forage!, producedItem: 'toString' } });
    expect(validateBook(c)).toContainEqual(expect.stringMatching(/produces "toString"/));
    expect(() => validateBook(withActions(good.actions, ['forage', 'hut', 'toString']))).not.toThrow();
    expect(validateBook(withActions(good.actions, ['forage', 'hut', 'toString']))).toContainEqual(expect.stringMatching(/toString/));
  });
  it('rejects an empty book: no chapters means no first chapter', () => {
    const b: Book = { id: 'empty', name: 'Empty', roster: [], chapters: [], items: {}, actions: {} };
    expect(validateBook(b)).toContainEqual(expect.stringMatching(/first chapter/));
  });
  it('rejects a chapter order naming an action the book lacks', () => {
    expect(validateBook(withActions(good.actions, ['forage', 'hut', 'ghost']))).toContainEqual(expect.stringMatching(/ghost/));
  });
  it('rejects an action that is in no chapter, and one that is in two', () => {
    expect(validateBook(withActions(good.actions, ['forage']))).toContainEqual(expect.stringMatching(/hut.*no chapter/));
    const twice: Book = { ...good, chapters: [good.chapters[0]!, { head: { numeral: 'II', chapter: 'Two', story: 'Again.' }, order: ['hut'] }] };
    expect(validateBook(twice)).toContainEqual(expect.stringMatching(/hut.*more than one chapter/));
  });
  it('rejects a first chapter with no row that needs nothing in hand', () => {
    const b = withActions({ hut: good.actions.hut! }, ['hut']);
    expect(validateBook({ ...b, roster: [good.roster[1]!] })).toContainEqual(expect.stringMatching(/first chapter/));
  });
});
```

- [ ] **Step 2: Run the suite to verify it fails**

Run: `npm test`
Expected: `validate.test` fails to load (`./validate` not found).

- [ ] **Step 3: Write the validator**

`src/data/validate.ts`:

```ts
/**
 * Static checks on a book (spec 2026-09-23 section 11, step 4): the format's
 * integrity, which is what the fixed skill union used to guarantee at compile
 * time, and nothing about play. Whether a book can be finished is the headless
 * play's question (spec section 9). Returns every problem found; an empty list
 * is a valid book. Own-property checks throughout, so a key like "constructor"
 * is not mistaken for a definition.
 */
import { ICON_NAMES } from './icons';
import type { ActionId, Book } from './types';

const icons: ReadonlySet<string> = new Set(ICON_NAMES);
const has = (record: object, key: string): boolean => Object.hasOwn(record, key);

export function validateBook(book: Book): readonly string[] {
  const problems: string[] = [];

  const seen = new Set<string>();
  for (const s of book.roster) {
    if (seen.has(s.id)) problems.push(`skill "${s.id}" is declared twice`);
    seen.add(s.id);
    if (!icons.has(s.icon)) problems.push(`skill "${s.id}" names an icon outside the vocabulary: "${s.icon}"`);
  }

  for (const [key, a] of Object.entries(book.actions)) {
    if (key !== a.id) problems.push(`action key "${key}" holds a row whose id is "${a.id}"`);
  }
  for (const [key, item] of Object.entries(book.items)) {
    if (key !== item.id) problems.push(`item key "${key}" holds an item whose id is "${item.id}"`);
  }

  const actions = Object.values(book.actions);
  for (const s of book.roster) {
    if (!actions.some((a) => a.verb === s.id)) problems.push(`skill "${s.id}" has no row`);
  }
  for (const a of actions) {
    if (!seen.has(a.verb)) problems.push(`row "${a.id}" uses verb "${a.verb}", which is not in the roster`);
    if (a.producedItem !== undefined && !has(book.items, a.producedItem)) problems.push(`row "${a.id}" produces "${a.producedItem}", which the book does not define`);
    for (const c of a.itemCosts) {
      if (!has(book.items, c.item)) problems.push(`row "${a.id}" costs "${c.item}", which the book does not define`);
    }
  }

  const chapterOf = new Map<ActionId, number>();
  book.chapters.forEach((ch, k) => {
    for (const id of ch.order) {
      if (!has(book.actions, id)) problems.push(`chapter ${k + 1} orders "${id}", which the book does not define`);
      else if (chapterOf.has(id)) problems.push(`row "${id}" is ordered more than once (appears in more than one chapter, or twice in one)`);
      else chapterOf.set(id, k);
    }
  });
  for (const a of actions) if (!chapterOf.has(a.id)) problems.push(`row "${a.id}" is in no chapter`);

  const first = book.chapters[0];
  const opens = first !== undefined && first.order.some((id) => has(book.actions, id) && book.actions[id]!.itemCosts.length === 0);
  if (!opens) problems.push('the first chapter has no row that needs nothing in hand');
  return problems;
}
```

- [ ] **Step 4: Run the suite to verify it passes**

Run: `npm test`
Expected: PASS, all thirteen `validateBook` tests. (Round two's naysayer
automated a mutation loop over this file: every `problems.push` removal and
both condition flips now turn at least one test red.)

- [ ] **Step 5: The books index, and the round trip**

Create `src/data/books.ts`:

```ts
import { saltRoad } from './salt-road';
import type { Book } from './types';

/** Every book the game ships, in shelf order. A book that is not here is not in the game. */
export const BOOKS: readonly Book[] = [saltRoad];
```

Create `src/data/books.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { BOOKS } from './books';
import { validateBook } from './validate';

describe('the shelf', () => {
  it('holds only valid books, with distinct ids', () => {
    for (const b of BOOKS) expect(validateBook(b)).toEqual([]);
    expect(new Set(BOOKS.map((b) => b.id)).size).toBe(BOOKS.length);
  });
});
```

Append to `src/data/salt-road.test.ts`, adding
`import { validateBook } from './validate';` and `import type { Book } from './types';`:

```ts
  it('round-trips through JSON: the value is serializable, which is what a generator emits', () => {
    const copy = JSON.parse(JSON.stringify(saltRoad)) as Book;
    expect(copy).toEqual(saltRoad);
    expect(validateBook(copy)).toEqual([]);
  });
```

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: CLAUDE.md, gates, commit**

`CLAUDE.md`, source layout: under `data/` add `— a book is a value of the
Book type in types.ts; src/data/validate.ts is the only check on it, and
books.test.ts runs it over every shipped book`.

Run `npm run typecheck`, then `npm run lint`, then `npm test`, then `npm run test:hooks`.
Expected: all green. The purity test accepts `src/data/validate.ts` (it
imports only `./icons` and `./types`).

```bash
git add src/data CLAUDE.md
git commit -m "data: a static book validator and the shelf; The Salt Road passes and round-trips"
```

---

### Task 8: Gates, the review panel, Chrome, hand-off

**Files:** none new.

- [ ] **Step 1: Every gate, from clean**

Run each on its own: `npm run typecheck`, `npm run lint`, `npm test`,
`npm run test:hooks`, `npm run build`.
Expected: all green.

- [ ] **Step 2: The code review panel**

Dispatch fresh, in parallel, with no implementation context: `engine-reviewer`;
`tuning-guard` (it must see the `ticksPerSkillPoint` removal as the intended
change spec §11 step 1 names, and nothing else moved in `balance.ts`);
`vacuous-test-hunter` (the validator tests, the mutation check, the round
trip and the rebirth key-set assertions are its targets); and a general
reviewer briefed to diff the branch against spec §11 step by step. Loop
until a clean round. Fix, re-run Step 1.

- [ ] **Step 3: Chrome**

Invoke `/chrome-verify`. Check, with the dev handle and by eye:
- the band shows three cells, Forage, Mine, Build, in that order, in the layout picked in Task 1;
- queue Forage: the Forage cell carries the sheen and its bars move;
- let Forage run about ten seconds (a core level costs 10 XP at 0.1 a tick), then `setHealth(0)` through the dev handle: the death card names Forage with "core 0 → 1";
- the log's level-up line reads "Forage reaches Lv 1";
- the console is clean, including 404s.

- [ ] **Step 4: Squash the code commits and hand off**

Squash the **code** commits (Tasks 2–7) into one whose subject reads as what
shipped, e.g. `feat: books own their skills; the format, the validator, a
roster of three`. Keep the spec, plan and mockup commits as they are: they
are the record of the design rounds. Do not FF-merge: the user verifies in
Chrome first (CLAUDE.md, "user-verify before FF-merge"). Hand over the URL
and the three things to look at: the band, the death card, the log line.

**For the session's wrap-up (GitHub writes, gated mid-session, standing at
stop time):** close #24 with its answer (keyed per action, book-scoped
because the state is); file, with no milestone, the items spec §11 lists as
out of the slice: the headless play (carrying the cycle, cap and
chapter-order rules dropped from the validator), the `book-author` skill,
book two, `hurts` and the damage field, badges, the shop, the bookmark map,
the shelf, finish detection and the finishing screen, the generator, the
decision #3 carve-out, the ledger rename, the roster cap; and note on #27
that `rebirth` rebuilds from a state's own keys, so a saved state from
before a roster change needs a migration.

---

## Self-review

- **Spec coverage:** §11 steps 1–5 map to Tasks 2, 3, 4+5, 7, 6 (the union
  drops before the validator lands, which the spec's order allowed either
  way; the spec's step 4 list is trimmed by the panel and the spec is
  amended alongside). Round two's rebuild shows the reorder of round one
  was wrong; the order here is the one reviewer A measured green in round
  one, with the UI task ahead of the union drop. The mockup gate (§2, §12) is Task 1. §10's
  "when each lands" holds: only the named doc lines change. §3's bookmark
  map, §6, §8 and §9 are explicitly not in the slice.
- **Placeholders:** none; every step has its code or its exact command.
- **Type consistency:** `SkillDefinition`, `Chapter`, `Book`, `Content.roster`,
  `skillOf`, `ICONS`, `ICON_NAMES`, `validateBook`, `blankRun`, `newState(roster)`
  keep the same names and shapes in every task that touches them.
- **Review Focus:** each of the five lines has its test in Task 6 or 7.
