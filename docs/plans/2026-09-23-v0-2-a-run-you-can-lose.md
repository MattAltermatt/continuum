# v0.2: a run you can lose — Implementation Plan

**Status:** built on `feature/v0-2-run-you-can-lose`, awaiting the user's verify. Plan panel clean at round 4; code panel (engine-reviewer, tuning-guard, vacuous-test-hunter, plan-vs-diff reviewer, naysayer) clean at round 2. Chrome-verified across seven lives.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## Revision 3 (2026-09-23)

Round 3: **Reviewer B clean**, with wording corrections that are folded in:
- The last red stretch is the larder running dry, not decay passing 0.80. The cabin keeps decay at 0.43–0.78 for a whole fed life.
- `+0.00`, the withdrawn risk 4, and the self-review line are fixed.

**The naysayer found one must-fix:**
- **The problem:** when food arrives hand to mouth, the food line flickered between `+0.00` red and `+0.80` green **while health climbed**, and "nothing to eat" flickered with it. Two queue orders showed it: a starving player's rescue (Forage queued at the front at 3:00: 13 segments, 5 of them under 2 s) and the Mine-first order.
  - The default order never feeds hand to mouth, so Task 2's test could not see it.
  - It also falsifies Revision 2's line "while there is room for a bite, berries on hand are always 0".
- **The fix, which the naysayer tested:** a food counts while it is **feeding**, meaning a unit is on hand **or** its cooldown is running (it bit within the last cooldown). That is true this second and predicts nothing.
  - Across 9 strategies and lives 1–3: 0 lies in any 30-second window, and every run has three segments.
  - Default order: R4.1s G450s R167s. Rescue: R184s G375s R220s in the naysayer's drive, and R184s G299s R126s in the plan's own drive, as Reviewer B re-measured in round 4 (covered ratio 0.49, threshold 0.4). Mine-first: R79s G380s R162s.
- **Changes in the tasks:**
  - Task 2 exports `feeding`. `foodCeilingPerSecond` uses it, and the whole-life test pins all three orders.
  - Task 5's food chunk keys its hurt border and "nothing to eat" on the same rule.
  - Task 6 plays the rescue in Chrome.
- **Reviewer A's round-3 SHOULDs, also folded in:**
  - Review Focus 4 no longer claims an equality edge test that does not exist.
  - The accepted-risks list carries risk 1's corrected reasoning.
  - A stale placeholder line is dropped from the self-review.
  - The whole-life test says it characterizes placeholder content.
- **Accepted risks:** the naysayer accepts 1 (with the corrected reasoning), 2 and 3, and accepts that the three-state net was not taken: it read the same units-on-hand ceiling and would have flickered in the same place.

## Revision 2 (2026-09-23)

Round 2: Reviewer B and the naysayer each built Revision 1 and ran it. Both found the same must-fix:

- **There is no net line.** The computed net from Revision 1 was never green on the Scrub. `eat()` bites in the same `step()` that opens room for a bite, so the rendered state is almost never "could bite now". Net equalled −decay on 6,208 of 6,208 rendered ticks, and the plan's own whole-life test failed (`rising` = 0, agreement 0.80). Every form tried either lied (measured), repeated the decay line (computed), or read green at full health (decay + full larder).
  - **Decided (the user delegated it: "you decide, you have the info"):** the rates chunk keeps two lines, both true this second. **"food, up to"** is **green when it covers decay** and **red when it does not** (an empty larder's `+0.00` included). The color answers "am I covered?" with no arithmetic.
  - `netPerSecond`, its unit tests and the whole-life net test are removed.
  - The naysayer's three-state net (falling, holding, rising) agreed with health 100% of the time. It was **considered and not taken**: the colored ceiling carries the same information (covered means holding, short means falling) with one line fewer and no net code.
  - The spec's §1 done-when and §4.1 are amended. The rates mockup's net row is superseded.
- **Doc fixes:**
  - A full bar at a fractional maximum reads `101.5 / 101.5`. The `.6` was a typo in the Revision 1 note and in Review Focus 5.
  - Task 6: "focus never leaves the card" is wrong. Tab goes to `<body>`. What holds, and what the naysayer measured in Chrome 153, is that nothing behind the card can take focus or a click.
  - Accepted risk 1's reasoning is corrected (below).
- **Task 4's App death test** now steps 30 ticks before dying, so the dead life's clock reads `00:03` while the view reads `00:00`. Before, both read `00:00`, so the assertion proved nothing (Reviewer B).
- **Accepted risk 5 is resolved by the user:** "keep the scope as is."
- **Accepted risk 4 is withdrawn:** there is no net, so there is no drain term.
- **Reviewer A's round 2** found the root cause and two small defects:
  - The root cause, measured: while there is room for a bite, berries on hand are always 0. *(Falsified in Revision 3: true of the default order only.)* `eat()` takes each berry on the tick Forage lands it. That also explains why the food chunk reads "nothing to eat" in that stretch. It is true: the player is living hand to mouth, which is exactly the moment spec §8.6 makes loud.
  - Task 4's HealthBar step no longer adds an unused `screen` import, which failed typecheck with TS6133.
  - `size={14}` for the card's icons is stated, not left to be matched.
- **Probe for the decision, run on the scrub copy before it was made:** across a fed life the food line's color changes twice. It is red for 4.1 s while the first berries come in, green for 450 s, then red for 167 s. *(Corrected in round 3, Reviewer B.)* The last red stretch is not decay passing 0.80: the cabin keeps decay at 0.43–0.78 hp/s for the rest of a fed life. It is food ceasing to arrive *(mechanism corrected again in round 4, Reviewer B)*. Forage stops at a full stack, and once re-queued it sits behind the hall and Mine, which can always run, so it never runs again. Nothing is feeding, the line reads `+0.00`, and the chunk says "nothing to eat". The color is honest either way: health falls from full to zero across that stretch. Another queue order gave the same shape plus two blips under 2 s. Task 2 pins the three-segment shape for the default order.
- **Accepted risk 1, corrected reasoning:** an in-life max-health boost would most likely write `maxHealth` directly, so the classification test would **not** catch it. It still does no harm: `rebirth` rebuilds the maximum from base + bonus, which correctly drops an in-life boost, and the card computes its from and to the same way. The decision stands.

## Revision 1 (2026-09-23)

Round 1: Reviewer A applied Tasks 1–5 in a scratch copy and ran every gate. Reviewer B checked the plan's arithmetic and its identifiers. The naysayer applied Tasks 1–3 and simulated 12 lives headless. Folded in:

- **Net is computed in the present tense, not measured** (naysayer, must-fix). The draft measured it over one food cooldown. Near full health, bites land about every 25 s, so that window read green for 5 s after every bite while health fell. In one life that happened on 1,225 of 1,250 green ticks, with 50 sign flips. The new `netPerSecond` in `health.ts` is `−decay + Σ heal ÷ cooldown`, summed over foods that could bite right now (they have a unit and would not overheal). That is the same eligibility rule as `eat()`. At full health it reads red. A headless whole-life test in Task 2 pins it: wherever net holds one sign for a full cooldown, health moved in that direction. The trail, `measuredNet`, `NET_WINDOW_TICKS`, the "—" and the hold-on-pause logic are all gone. The spec's §4.1 is amended to match.
- **The death seam keeps the dead state until Begin** (naysayer). The engine already refuses orders on a dead state. `useGame` derives `card = deathSummary(state)` and `view = rebirth(state)` when the state is dead, and **Begin** commits `setPaused(rebirth(state), 'none')`. That removes the `card` Model field, all four reducer guards, and the `withLog` fields bug (A and B, must-fix), because `Model` no longer changes. The existing "setHealth … reach death" test stays true (A and B, must-fix). Net behind the card is computed from the view, so the contradiction with spec §4.1 also goes away (A, B and the naysayer, must-fix). A save taken mid-card will re-derive the card from the saved state.
- **`inert` goes on wrappers, and the test asserts `closest('[inert]')` per chunk** (A, must-fix). No component gets an `inert` prop.
- **The health reading, with a fractional maximum** (A, naysayer). Flooring the current health only made a full bar read `101 / 101.7`, which looks hurt. When the maximum is fractional, both numbers are shown floored to tenths, so a full bar reads `101.5 / 101.5`. A whole maximum keeps v0.1's reading. The card uses the same tenths.
- **`deathSummary.maxHealthFrom` is `base + rebirthBonus`**, not `dead.maxHealth`, so the card's from and to are computed the same way (naysayer 6). The "no float drift" claim is dropped: `rebirthBonus` is a running sum, and the test asserts it `toBeCloseTo` the sum of the gains. The persist check now also asserts that each PERSISTS field in `deadLife()` differs from `newState()`, so a persist that is never exercised cannot pass (A).
- **Smaller fixes:** `screen` is imported in `HealthBar.test` (A). The glyphs are `\u` escapes (A). `setHealth` is ignored on a dead state. The `net` destructure is added in Task 5 (B). The guard test is red before the change (B). In the Chrome script, `step(7000)` covers a life of about 6,200 ticks (A). The v0.1 dead-state UI branches are removed from `App` and kept as defence in `Queue` and `ActionRow` (A, naysayer).
- **Spec amended** (§2.4, §3, §4.1): the rows behind the card show the new life's times. Run levels reset at death, so those times are slower than the moment of death (about 8–11%) and faster than the last life's start. "09:42" matches the run clock. Net is computed. Both health numbers use tenths.

### Accepted risks

1. **Objection:** `maxHealth` and `rebirthBonus` are two sources of truth, and the first in-life max-health boost breaks `maxHealth = base + bonus`. **Cheaper alternative:** drop the `maxHealth` field and derive it everywhere. **Rejected because** today only rebirth changes the maximum. Keeping the field leaves `eat()`, `HealthBar` and every test that reads `maxHealth` untouched. *(Reasoning corrected in Revision 2.)* An in-life boost would most likely write `maxHealth` directly, and the classification test would not catch it. It still does no harm: `rebirth` rebuilds the maximum from base + bonus, which correctly drops the boost, and the card computes its from and to the same way.
2. **Objection:** the RESETS check in the classification test is true by construction, because `rebirth` spreads `newState()`. **Cheaper alternative:** keep only the key-coverage check. **Rejected because** the check costs three lines, and it is what catches a later `rebirth` that stops spreading `newState()` and hand-lists fields. The coverage check and the new persist-differs check carry the real weight.
3. **Objection:** a death on the first tick reads `+0.00` and `100.0 → 100.0` on the card, which is not "tiny but positive". **Cheaper alternative:** more decimals. **Rejected because** two decimals match every other rate on screen, and a gain of 0.00016 really does round to nothing. The engine test pins the positive value.
4. *(Withdrawn in Revision 2: there is no net line.)* **Objection:** computed net has no term for a future per-action drain (Kill). **Cheaper alternative:** keep a measured net so any drain shows up automatically. **Rejected because** measurement lied in the naysayer's run. Spec §4.1 already gives Fight its own drain line, and the same change adds its term to `netPerSecond`.
5. **Objection:** on the Scrub, lives do not get longer, and the gain per death is flat at about +1.6 (every panellist's simulation). **Put to the user**, quoting the user's own words ("adding a couple seconds is fine … as the skills get better, the player gets further along, finds more things that increase health or decrease the rate"). The plan does not change on either answer: no task tunes anything.

---

**Goal:** Close the loop. A run dies, a death card shows what the life bought, **Begin** starts the next life with core mastery and a larger maximum health, and the HUD shows decay and the larder's ceiling (green when it covers decay), in the present tense only.

**Architecture:** One new pure engine module, `src/engine/rebirth.ts` (the gain, the summary, the reset), plus two rate helpers in `health.ts`. The state layer keeps the dead state until **Begin** and derives the card and the reborn view from it. The UI gets three components: `DeathCard`, `Rates` and `Food`. The pack no longer holds food.

**Tech Stack:** TypeScript (strict), React 19, Vite, Vitest (+ jsdom per component file), Testing Library.

**Spec:** [`docs/specs/2026-09-23-v0-2-a-run-you-can-lose.md`](../specs/2026-09-23-v0-2-a-run-you-can-lose.md). Mockups: [`2026-09-23-death-card.html`](../mockups/2026-09-23-death-card.html), [`2026-09-22-rates-food.html`](../mockups/2026-09-22-rates-food.html), [`2026-09-22-layout.html`](../mockups/2026-09-22-layout.html).

## Global Constraints

- The dependency runs one way: `src/engine/` imports `../balance`, `../data/*` and its siblings; `src/state/` imports engine and data; `src/ui/` imports all of them. No DOM, `Date.now()`, `Math.random()` or timers in the engine. Never widen `tsconfig.engine.json` or the allowlist in `src/purity.test.ts` (decision #4).
- Every gameplay number lives in `src/balance.ts` (decision #3). **The one sanctioned balance edit in this plan** is `rebirth: { growthFactor: 0.01 }` → `rebirth: { growthRate: 1.1 }`, which the user asked for in the brainstorm (spec §3). No other value in `balance.ts` changes. Presentation constants follow the `LOG_LINES` / `MS_PER_SECOND` rule: named, justified in a comment, and kept out of `balance.ts`.
- **The display rule (spec §1):** every number on screen is true this second. Nothing predicts. No time-to-death in any form.
- Time passes only while work happens (decision #41). Nothing here changes `step()`.
- `// @vitest-environment jsdom` is **line 1** of every component test.
- Glyphs are `\u` escapes in `src/ui/glyphs.ts`. No emoji in code or commits. Commit subjects are one line with no trailers.
- Fractions render `a/b`. The health value renders `71 / 100` (spec §8.6). With a fractional maximum, both numbers render floored to tenths (`71.4 / 101.5`).
- Colors are tokens from `src/styles.css`, never literals in components.
- Terminology: `active`/`inactive`, `allowlist`/`blocklist`, `main`.
- Definition of Done per task: `npm run typecheck`, `npm run lint` and `npm test` green, then commit. Task 6 also runs `npm run test:hooks` and `npm run build`.
- No control moves under the cursor: the rates values have pinned widths.

## Review Focus

1. **A field added to `GameState` later and never classified.** Expected: a test fails until the field is on the reset list, the persist list or the derived list (Task 1).
2. **Clicks behind the death card.** A `+` on a row, a `×` in the queue, or the corner's pause/resume pressed while the card is up must change nothing. Covered by the engine's existing dead guards, the Task 3 test, and the Task 4 `inert` test.
3. **Two deaths in one session.** The bonus accrues rather than replacing, and the second card's "from" is the first card's "to" (Tasks 1 and 3).
4. **Covered or not, across a life.** "food, up to" is green while the larder covers decay and red otherwise, including `+0.00` when nothing is feeding. It holds one color per phase of a fed life with no flicker, in the default, Mine-first and rescue orders (Task 2). At the crossover, rounding can show `+0.80` in red beside `−0.80` for under half a second. That is correct and accepted. While the clock is stopped, the chunk is dimmed and still shows the rates that apply when the clock restarts (Task 5).
5. **A full bar after rebirth.** A full health bar at a fractional maximum reads full (`101.5 / 101.5`), not hurt (Task 4).

---

## File structure

```text
src/balance.ts                 rebirth.growthRate replaces growthFactor              (Task 1)
src/engine/types.ts            GameState + life, rebirthBonus, lifeStartCore           (Task 1)
src/engine/queue.ts            newState() sets the three new fields                    (Task 1)
src/engine/rebirth.ts          rebirthGain, deathSummary, rebirth — NEW                (Task 1)
src/engine/rebirth.test.ts     gain samples, reset/persist, classification — NEW       (Task 1)
src/engine/health.ts           decayPerSecond, foodCeilingPerSecond                    (Task 2)
src/engine/playable.test.ts    three lives at the real numbers                         (Task 2)
src/state/useGame.ts           view, card, begin                                       (Task 3)
src/ui/format.ts, glyphs.ts    healthPair(), tenths(); RISING, ARROW, MINUS    (Task 4)
src/ui/HealthBar.tsx           tenths with a fractional max                            (Task 4)
src/ui/DeathCard.tsx           the card — NEW                                           (Task 4)
src/ui/App.tsx, styles.css     view, card, inert wrappers, banner removed              (Tasks 4, 5)
src/ui/Rates.tsx, Food.tsx     the two HUD chunks — NEW                                 (Task 5)
src/ui/Pack.tsx                materials only                                           (Task 5)
docs/specs/…-v0-2-….md         §2.4, §3, §4.1 amended in Revision 1                    (done)
MECHANICS.md, README.md, .claude/skills/chrome-verify/SKILL.md                          (Task 6)
```

---

### Task 1: Rebirth in the engine

**Files:**
- Modify: `src/balance.ts`, `src/engine/types.ts`, `src/engine/queue.ts` (`newState`)
- Create: `src/engine/rebirth.ts`
- Test: `src/engine/rebirth.test.ts`

**Interfaces:**
- Produces (types.ts): `GameState.life: number`, `GameState.rebirthBonus: number`, `GameState.lifeStartCore: Readonly<Record<SkillId, number>>`.
- Produces (rebirth.ts): `rebirthGain(runTicks: number): number`; `interface CoreGain { skill: SkillId; from: number; to: number; progress: number }`; `interface DeathSummary { life: number; runTicks: number; gain: number; maxHealthFrom: number; maxHealthTo: number; coreGains: readonly CoreGain[] }`; `deathSummary(dead: GameState): DeathSummary`; `rebirth(dead: GameState): GameState`.

- [ ] **Step 1: Balance.** In `src/balance.ts` replace the `rebirth` block with:

```ts
  rebirth: {
    /**
     * Max health earned per death = growthRate ^ (minutes alive) - 1. The shape a
     * player reports for Increlution (spec 2026-09-23 section 3): it rewards the
     * longer life. User-chosen in the v0.2 brainstorm; 1.1 is UNDERIVED.
     */
    growthRate: 1.1,
  },
```

- [ ] **Step 2: Types.** In `src/engine/types.ts` import `SkillId` (already imported) and add to `GameState`, after `decayMultiplier`:

```ts
  /** Which life this is, from 1. Persists and counts up at rebirth. */
  readonly life: number;
  /** Sum of every death's max-health gain. maxHealth is always base + this. */
  readonly rebirthBonus: number;
  /** Core levels as this life began, so the death card can show what moved. */
  readonly lifeStartCore: Readonly<Record<SkillId, number>>;
```

In `newState()` in `src/engine/queue.ts` add `life: 1, rebirthBonus: 0, lifeStartCore: Object.fromEntries(SKILL_IDS.map((id) => [id, 0])) as Record<SkillId, number>,` (`SKILL_IDS` is already imported there for `skills`).

- [ ] **Step 3: Write the failing tests** — `src/engine/rebirth.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { balance } from '../balance';
import { SKILL_IDS } from '../data/types';
import { newState } from './queue';
import { deathSummary, rebirth, rebirthGain } from './rebirth';
import type { GameState } from './types';

const minute = balance.time.ticksPerMinute;

/** A dead state with every field away from its default, so a reset and a persist are both visible. */
function deadLife(): GameState {
  const fresh = newState();
  return {
    ...fresh,
    runTicks: 10 * minute,
    health: 0,
    maxHealth: balance.health.base + 1,
    paused: 'system',
    dead: true,
    skills: { ...fresh.skills, forage: { core: { level: 3, exp: 2.5 }, run: { level: 2, exp: 1 } }, mine: { core: { level: 1, exp: 0 }, run: { level: 1, exp: 4 } } },
    inventory: { berries: 5, stone: 3 },
    foodCooldowns: { berries: 10 },
    queue: [{ actionId: 'hall', progress: 12, costsConsumed: 4, stalled: false }],
    completedOneTime: ['cabin'],
    completionCounts: { forage: 7, cabin: 1 },
    decayMultiplier: 0.8,
    events: [{ type: 'died', runTicks: 10 * minute }],
    life: 2,
    rebirthBonus: 1,
    lifeStartCore: { ...fresh.lifeStartCore, forage: 1, mine: 1 },
  };
}

describe('rebirthGain', () => {
  it('is growthRate ^ minutes - 1, pinned at the spec table', () => {
    expect(rebirthGain(5 * minute)).toBeCloseTo(0.6105, 4);
    expect(rebirthGain(10 * minute)).toBeCloseTo(1.5937, 4);
    expect(rebirthGain(20 * minute)).toBeCloseTo(5.7275, 4);
    expect(rebirthGain(30 * minute)).toBeCloseTo(16.4494, 4);
  });
  it('is zero at zero and positive after one tick', () => {
    expect(rebirthGain(0)).toBe(0);
    expect(rebirthGain(1)).toBeGreaterThan(0);
  });
  it('is continuous within a minute, not stepped', () => {
    expect(rebirthGain(9.5 * minute)).toBeGreaterThan(rebirthGain(9 * minute));
    expect(rebirthGain(9.5 * minute)).toBeLessThan(rebirthGain(10 * minute));
  });
});

describe('rebirth: what resets (spec 2.1)', () => {
  const next = rebirth(deadLife());
  it('empties the pack, food included, the queue, one-time completions and food cooldowns', () => {
    expect(next.inventory).toEqual({});
    expect(next.queue).toEqual([]);
    expect(next.completedOneTime).toEqual([]);
    expect(next.foodCooldowns).toEqual({});
  });
  it('zeroes the run clock, restores the decay multiplier, clears events, and is alive', () => {
    expect(next.runTicks).toBe(0);
    expect(next.decayMultiplier).toBe(1);
    expect(next.events).toEqual([]);
    expect(next.dead).toBe(false);
  });
  it('starts the life on a system pause, which Begin replaces with none', () => {
    expect(next.paused).toBe('system');
  });
  it('puts every run ledger back to level 0 with no exp', () => {
    for (const id of SKILL_IDS) expect(next.skills[id].run).toEqual({ level: 0, exp: 0 });
  });
});

describe('rebirth: what persists (spec 2.2)', () => {
  const dead = deadLife();
  const next = rebirth(dead);
  it('keeps every core ledger, level and exp', () => {
    for (const id of SKILL_IDS) expect(next.skills[id].core).toEqual(dead.skills[id].core);
  });
  it('keeps lifetime completion counts', () => {
    expect(next.completionCounts).toEqual({ forage: 7, cabin: 1 });
  });
  it('counts the life up, accrues the bonus, and fills health to the new maximum', () => {
    const gain = rebirthGain(dead.runTicks);
    expect(next.life).toBe(3);
    expect(next.rebirthBonus).toBeCloseTo(1 + gain, 12);
    expect(next.maxHealth).toBe(balance.health.base + next.rebirthBonus);
    expect(next.health).toBe(next.maxHealth);
  });
  it('snapshots the core levels this life begins with', () => {
    expect(next.lifeStartCore.forage).toBe(3);
    expect(next.lifeStartCore.mine).toBe(1);
    expect(next.lifeStartCore.fish).toBe(0);
  });
});

describe('rebirth: guard and accrual', () => {
  it('does nothing to a state that is not dead', () => {
    const alive = newState();
    expect(rebirth(alive)).toBe(alive);
  });
  it('accrues across three deaths: the bonus is the running sum of the gains, and max is base + bonus', () => {
    let s = newState();
    const gains: number[] = [];
    for (const t of [7 * minute, 9 * minute, 11 * minute]) {
      gains.push(rebirthGain(t));
      s = rebirth({ ...s, runTicks: t, dead: true, health: 0 });
    }
    expect(s.life).toBe(4);
    expect(s.maxHealth).toBe(balance.health.base + s.rebirthBonus);
    expect(s.rebirthBonus).toBeCloseTo(gains[0]! + gains[1]! + gains[2]!, 12);
  });
});

/**
 * Review focus 1. Every GameState field is decided: it resets, it persists, or
 * rebirth derives it. A field added later fails here until someone decides.
 */
describe('rebirth: every field is classified', () => {
  const RESETS = ['runTicks', 'paused', 'dead', 'inventory', 'foodCooldowns', 'queue', 'completedOneTime', 'decayMultiplier', 'events'];
  const PERSISTS = ['completionCounts'];
  const DERIVED = ['health', 'maxHealth', 'skills', 'life', 'rebirthBonus', 'lifeStartCore'];
  it('the three lists cover newState() exactly, with no overlap', () => {
    const all = [...RESETS, ...PERSISTS, ...DERIVED];
    expect(new Set(all).size).toBe(all.length);
    expect([...all].sort()).toEqual(Object.keys(newState()).sort());
  });
  it('every reset field equals newState() after rebirth, except paused, which is system', () => {
    const next = rebirth(deadLife()) as unknown as Record<string, unknown>;
    const fresh = { ...newState(), paused: 'system' } as unknown as Record<string, unknown>;
    for (const k of RESETS) expect(next[k], k).toEqual(fresh[k]);
  });
  it('every persist field is exercised (differs from newState in deadLife) and survives unchanged', () => {
    const dead = deadLife() as unknown as Record<string, unknown>;
    const fresh = newState() as unknown as Record<string, unknown>;
    const next = rebirth(deadLife()) as unknown as Record<string, unknown>;
    for (const k of PERSISTS) {
      expect(dead[k], k).not.toEqual(fresh[k]);
      expect(next[k], k).toEqual(dead[k]);
    }
  });
});

describe('deathSummary', () => {
  it('reports the life, its clock, the gain, max health from and to, and only the skills whose core moved', () => {
    const dead = deadLife();
    const s = deathSummary(dead);
    expect(s.life).toBe(2);
    expect(s.runTicks).toBe(10 * minute);
    expect(s.gain).toBeCloseTo(rebirthGain(10 * minute), 12);
    expect(s.maxHealthFrom).toBe(balance.health.base + dead.rebirthBonus);
    expect(s.maxHealthTo).toBe(rebirth(dead).maxHealth);
    expect(s.coreGains.map((g) => [g.skill, g.from, g.to])).toEqual([['forage', 1, 3]]);
  });
  it('carries the core ledger progress toward the next level, as a fraction', () => {
    const g = deathSummary(deadLife()).coreGains[0]!;
    const need = balance.skills.coreMastery.baseExp * balance.skills.expCurveExponent ** 3;
    expect(g.progress).toBeCloseTo(2.5 / need, 12);
  });
  it('a death on the first tick: a tiny positive gain and no skill lines', () => {
    const s = deathSummary({ ...newState(), runTicks: 1, dead: true, health: 0 });
    expect(s.gain).toBeGreaterThan(0);
    expect(s.coreGains).toEqual([]);
  });
});
```

- [ ] **Step 4: Run it to see it fail.** `npx vitest run src/engine/rebirth.test.ts` — Expected: FAIL, cannot resolve `./rebirth`.

- [ ] **Step 5: Implement** — `src/engine/rebirth.ts`:

```ts
/**
 * Death and rebirth, MECHANICS section 5 and spec 2026-09-23 sections 2-3.
 * What resets, what persists, and what the life bought. Pure.
 */
import { balance } from '../balance';
import { SKILL_IDS, type SkillId } from '../data/types';
import { newState } from './queue';
import { expToNextLevel, newSkill } from './skills';
import { ticksToMinutes } from './time';
import type { GameState, SkillState } from './types';

/** Max health one death earns: growthRate ^ minutes alive - 1. Fractional; nothing is floored. */
export function rebirthGain(runTicks: number): number {
  return Math.pow(balance.rebirth.growthRate, ticksToMinutes(runTicks)) - 1;
}

export interface CoreGain {
  readonly skill: SkillId;
  readonly from: number;
  readonly to: number;
  /** Progress toward the next core level, 0..1, for the card's bar. */
  readonly progress: number;
}

/** What the death card shows: gains only (spec 2.4). */
export interface DeathSummary {
  readonly life: number;
  readonly runTicks: number;
  readonly gain: number;
  readonly maxHealthFrom: number;
  readonly maxHealthTo: number;
  readonly coreGains: readonly CoreGain[];
}

function maxHealthFor(rebirthBonus: number): number {
  return balance.health.base + rebirthBonus;
}

export function deathSummary(dead: GameState): DeathSummary {
  const gain = rebirthGain(dead.runTicks);
  const coreGains = SKILL_IDS
    .filter((id) => dead.skills[id].core.level > dead.lifeStartCore[id])
    .map((id) => {
      const core = dead.skills[id].core;
      return { skill: id, from: dead.lifeStartCore[id], to: core.level, progress: core.exp / expToNextLevel(balance.skills.coreMastery.baseExp, core.level) };
    });
  // From and to are computed the same way (Revision 1, accepted risk 1).
  return { life: dead.life, runTicks: dead.runTicks, gain, maxHealthFrom: maxHealthFor(dead.rebirthBonus), maxHealthTo: maxHealthFor(dead.rebirthBonus + gain), coreGains };
}

/**
 * The next life. Resets everything a life owns, keeps what the game owns, and
 * starts on a system pause the death card's Begin lifts. A state that is not
 * dead comes back unchanged.
 */
export function rebirth(dead: GameState): GameState {
  if (!dead.dead) return dead;
  const rebirthBonus = dead.rebirthBonus + rebirthGain(dead.runTicks);
  const maxHealth = maxHealthFor(rebirthBonus);
  const skills = Object.fromEntries(SKILL_IDS.map((id) => [id, { core: dead.skills[id].core, run: newSkill().run }])) as Record<SkillId, SkillState>;
  const lifeStartCore = Object.fromEntries(SKILL_IDS.map((id) => [id, skills[id].core.level])) as Record<SkillId, number>;
  return {
    ...newState(),
    paused: 'system',
    life: dead.life + 1,
    rebirthBonus,
    maxHealth,
    health: maxHealth,
    skills,
    completionCounts: dead.completionCounts,
    lifeStartCore,
  };
}
```

- [ ] **Step 6: Run to green.** `npx vitest run src/engine/rebirth.test.ts` — Expected: PASS. Then `npm run typecheck && npm run lint && npm test` — Expected: all green. (Any existing test that builds a full `GameState` literal fails typecheck on the three new fields; add them from `newState()` by spreading it, as those tests already do.)

- [ ] **Step 7: Commit.** `git add src/balance.ts src/engine && git commit -m "feat: rebirth in the engine, gain reshaped to 1.1^min - 1"`

---


---

### Task 2: Rates in the engine, and three lives

**Files:**
- Modify: `src/engine/health.ts`, `src/engine/health.test.ts`, `src/engine/playable.test.ts`

**Interfaces:**
- Consumes: `rebirth` (Task 1); `damagePerTick` (existing).
- Produces (health.ts):
  - `decayPerSecond(state: GameState): number`: the positive hp/s lost to decay this second.
  - `foodCeilingPerSecond(state: GameState, content: Content): number`: the larder's heal ceiling in hp/s.
  - `feeding(state: GameState, itemId: ItemId): boolean`: a food has a unit on hand **or** its cooldown is running, meaning it bit within the last cooldown and is feeding the player this second (Revision 3).
  - `covers(state: GameState, content: Content): boolean`: `foodCeilingPerSecond >= decayPerSecond`, which colors the food line.

- [ ] **Step 1: Failing tests.** Append to `src/engine/health.test.ts`. Its local `content` has berries at `healPerUnit: 4`, and `newState` is already imported. Add `covers, decayPerSecond, feeding, foodCeilingPerSecond` to the `./health` import, and import `ticksPerSecond, ticksToSeconds` from `./time`:

```ts
describe('rates, true this second (spec 2026-09-23 section 4.1)', () => {
  const perBite = 4 / ticksToSeconds(foodCooldownTicks);
  it('decayPerSecond is this tick\'s damage times ticks per second, multiplier included', () => {
    const s = { ...newState(), runTicks: balance.time.ticksPerMinute * 10, decayMultiplier: 0.8 };
    expect(decayPerSecond(s)).toBeCloseTo(damagePerTick(s.runTicks, 0.8) * ticksPerSecond(), 12);
  });
  it('foodCeilingPerSecond counts each food that is feeding: heal per bite over the cooldown in seconds', () => {
    expect(foodCeilingPerSecond({ ...newState(), inventory: { berries: 1 } }, content)).toBeCloseTo(perBite, 12);
  });
  it('an empty larder with no bite in the last cooldown has no ceiling', () => {
    expect(foodCeilingPerSecond(newState(), content)).toBe(0);
    expect(foodCeilingPerSecond({ ...newState(), foodCooldowns: { berries: 0 } }, content)).toBe(0);
  });
  it('a food on cooldown counts, with units (a ceiling, not a bite) and without them (eaten as it lands: still feeding)', () => {
    expect(foodCeilingPerSecond({ ...newState(), inventory: { berries: 3 }, foodCooldowns: { berries: 20 } }, content)).toBeCloseTo(perBite, 12);
    expect(foodCeilingPerSecond({ ...newState(), foodCooldowns: { berries: 20 } }, content)).toBeCloseTo(perBite, 12);
  });
  it('feeding: a unit on hand, or a running cooldown; neither is not feeding', () => {
    expect(feeding({ ...newState(), inventory: { berries: 1 } }, 'berries')).toBe(true);
    expect(feeding({ ...newState(), foodCooldowns: { berries: 1 } }, 'berries')).toBe(true);
    expect(feeding(newState(), 'berries')).toBe(false);
  });
  it('covers: the larder covers decay at the start with a berry, and not with none', () => {
    expect(covers({ ...newState(), inventory: { berries: 1 } }, content)).toBe(true);
    expect(covers(newState(), content)).toBe(false);
  });
  it('covers stops once decay passes the ceiling, late in a run', () => {
    // Decay reaches perBite (0.8 hp/s) a little before minute 10 at the placeholder curve.
    const late = { ...newState(), runTicks: balance.time.ticksPerMinute * 12, inventory: { berries: 5 } };
    expect(decayPerSecond(late)).toBeGreaterThan(perBite);
    expect(covers(late, content)).toBe(false);
  });
});
```

Append to `src/engine/playable.test.ts` (import `rebirth` from `./rebirth`, and `covers` from `./health`):

```ts
describe('three lives at the real numbers', () => {
  it('each life dies, is reborn, and the next reaches further into the hall with a larger maximum', () => {
    let s = setPaused(newState(), 'none');
    const limit = balance.time.ticksPerMinute * 30;
    const hallProgress: number[] = [];
    const maxHealth: number[] = [];
    const queueOrder = ['forage', 'mine', 'cabin', 'hall'];
    for (let life = 0; life < 3; life++) {
      maxHealth.push(s.maxHealth);
      for (let t = 0; t < limit && !s.dead; t++) {
        for (const id of queueOrder) s = enqueue(s, scrub, id);
        s = step(s, scrub);
      }
      expect(s.dead).toBe(true);
      hallProgress.push(s.queue.find((e) => e.actionId === 'hall')?.costsConsumed ?? 0);
      s = setPaused(rebirth(s), 'none');
    }
    expect(hallProgress[1]!).toBeGreaterThan(hallProgress[0]!);
    expect(hallProgress[2]!).toBeGreaterThan(hallProgress[1]!);
    expect(maxHealth[1]!).toBeGreaterThan(maxHealth[0]!);
    expect(maxHealth[2]!).toBeGreaterThan(maxHealth[1]!);
    expect(s.life).toBe(4);
  });
});

/**
 * Review focus 4. The food line's color is the chunk's one judgement. Across a
 * fed life it must be a state the player can read, not a flicker: short until
 * food is coming in, covered while it keeps up, short once nothing is feeding.
 * Three orders, because the default one never feeds hand to mouth; the rescue
 * (Forage queued at the front at 3:00 by a starving player) and Mine-first do,
 * and flickered under Revision 2's units-only ceiling (naysayer, round 3).
 * Measured with the running-cooldown rule: default R4.1s G450s R167s,
 * rescue R184s G299s R126s (this drive), Mine-first R79s G380s R162s.
 * A characterization of the Scrub's placeholder numbers: when the content or
 * its balance changes, re-measure and update the shape. Do not bend the engine
 * to keep it.
 */
describe('the food line across a fed life', () => {
  function segmentsOf(drive: (s: GameState, t: number) => GameState) {
    let s = setPaused(newState(), 'none');
    const segments: { covered: boolean; ticks: number }[] = [];
    for (let t = 0; t < balance.time.ticksPerMinute * 30 && !s.dead; t++) {
      s = step(drive(s, t), scrub);
      const c = covers(s, scrub);
      const last = segments[segments.length - 1];
      if (last && last.covered === c) last.ticks += 1;
      else segments.push({ covered: c, ticks: 1 });
    }
    return { segments, runTicks: s.runTicks };
  }
  const all = (order: string[]) => (s: GameState) => order.reduce((acc, id) => enqueue(acc, scrub, id), s);
  const rescueAt = balance.time.ticksPerMinute * 3;
  const cases: [string, (s: GameState, t: number) => GameState][] = [
    ['default order', all(['forage', 'mine', 'cabin', 'hall'])],
    ['Mine first', all(['mine', 'cabin', 'hall', 'forage'])],
    ['the rescue: Forage to the front at 3:00', (s, t) => {
      let next = all(['hall', 'mine'])(s);
      if (t === rescueAt) next = enqueue(next, scrub, 'forage', { front: true });
      if (t > rescueAt) next = enqueue(next, scrub, 'forage');
      return next;
    }],
  ];
  for (const [name, drive] of cases) {
    it(`${name}: short, then covered, then short, and no flicker`, () => {
      const { segments, runTicks } = segmentsOf(drive);
      expect(segments.map((x) => x.covered)).toEqual([false, true, false]);
      expect(segments[1]!.ticks / runTicks).toBeGreaterThan(0.4);
    });
  }
});
```

(Import `GameState` as a type from `./types` in `playable.test.ts` if it is not already.)

- [ ] **Step 2: Run to see red.** `npx vitest run src/engine/health.test.ts src/engine/playable.test.ts`. Expected: FAIL, because `decayPerSecond`, `feeding` and `covers` are not exported. The three-lives test already passes after Task 1: it characterizes Task 1 at the real numbers. If the food-line test fails once the code exists, **stop**. It is a finding about what the player will see, not a test to loosen. Print `segments` in that case.

- [ ] **Step 3: Implement.** Append to `src/engine/health.ts`. Import `ticksPerSecond, ticksToSeconds` alongside `ticksToMinutes`, and `ItemId` as a type from `../data/types`:

```ts
/** HP lost to decay per second of run clock, this second. Spec 2026-09-23 section 4.1. */
export function decayPerSecond(state: GameState): number {
  return damagePerTick(state.runTicks, state.decayMultiplier) * ticksPerSecond();
}

/**
 * A food is feeding the player this second if a unit is on hand, or its
 * cooldown is running (it bit within the last cooldown). The second half is
 * what keeps hand-to-mouth eating, where each unit is eaten on the tick it
 * lands, from reading as an empty larder (plan Revision 3).
 */
export function feeding(state: GameState, itemId: ItemId): boolean {
  return count(state.inventory, itemId) > 0 || (state.foodCooldowns[itemId] ?? 0) > 0;
}

/**
 * The larder's heal ceiling in hp/s: every food that is feeding, one bite per
 * cooldown. A ceiling, not a rate: at full health no bite lands.
 */
export function foodCeilingPerSecond(state: GameState, content: Content): number {
  let total = 0;
  for (const item of Object.values(content.items)) {
    if (item.healPerUnit === undefined || !feeding(state, item.id)) continue;
    total += item.healPerUnit / ticksToSeconds(balance.health.foodCooldownTicks);
  }
  return total;
}

/**
 * Whether the larder covers decay this second: the rates chunk's one judgement
 * (spec 2026-09-23 section 4.1). There is no net line; every form of it either
 * lied or repeated decay (plan Revisions 1 and 2).
 */
export function covers(state: GameState, content: Content): boolean {
  return foodCeilingPerSecond(state, content) >= decayPerSecond(state);
}
```

- [ ] **Step 4: Green.** `npm run typecheck && npm run lint && npm test`. Expected: all green.

- [ ] **Step 5: Commit.** `git commit -am "feat: decay and larder rates; three lives headless"`

---

### Task 3: The state layer: view, card and Begin

**Files:**
- Modify: `src/state/useGame.ts`, `src/state/useGame.test.tsx`

**Interfaces:**
- Consumes: `rebirth`, `deathSummary`, `DeathSummary` (Task 1).
- Produces: `GameAction` gains `{ type: 'begin' }`. `useGame` returns `{ state, view, log, dispatch, card }`:
  - `state` is the raw engine state, which may be dead. The dev handle reads it.
  - `view` is what the screen renders: `rebirth(state)` while dead, `state` otherwise (the same object).
  - `card` is `deathSummary(state)` while dead, otherwise `null`.

This follows spec §2.4 with the Revision 1 seam. A dead state stays in the model until **Begin**. The engine already refuses orders on it: `enqueue`, `removeAction`, `setPaused` and `step` each return a dead state unchanged. `setHealth` gets the same guard. Behind the card, the screen renders the reborn `view`, so the reset has already happened on screen. **Begin** commits `setPaused(rebirth(state), 'none')` and logs `lifeBegins` with the new life number. `Model` does not change shape.

- [ ] **Step 1: Failing tests.** Inside `describe('useGame', …)` in `src/state/useGame.test.tsx`, append:

```ts
  function die(result: { current: ReturnType<typeof useGame> }, workTicks: number) {
    act(() => result.current.dispatch({ type: 'queue', actionId: 'forage' }));
    act(() => vi.advanceTimersByTime(balance.time.tickIntervalMs * workTicks));
    act(() => result.current.dispatch({ type: 'setHealth', health: 0.001 }));
    act(() => vi.advanceTimersByTime(balance.time.tickIntervalMs));
  }

  it('alive, the view is the state itself and there is no card', () => {
    const { result } = renderHook(() => useGame(scrub));
    expect(result.current.view).toBe(result.current.state);
    expect(result.current.card).toBeNull();
  });

  it('a death keeps the dead state; the card and the reborn view are derived from it', () => {
    const { result } = renderHook(() => useGame(scrub));
    die(result, 50);
    const { state, view, card, log } = result.current;
    expect(state.dead).toBe(true);
    expect(card?.life).toBe(1);
    expect(card?.runTicks).toBe(51);
    expect(view.dead).toBe(false);
    expect(view.life).toBe(2);
    expect(view.queue).toEqual([]);
    expect(view.inventory).toEqual({});
    expect(view.health).toBe(view.maxHealth);
    expect(view.maxHealth).toBeGreaterThan(balance.health.base);
    expect(view.paused).toBe('system');
    expect(log[0]!.event).toEqual({ type: 'died', runTicks: 51 });
  });

  it('while dead, orders, pause/resume and setHealth change nothing, and no time passes', () => {
    const { result } = renderHook(() => useGame(scrub));
    die(result, 5);
    const before = result.current.state;
    expect(before.dead).toBe(true);
    act(() => result.current.dispatch({ type: 'queue', actionId: 'mine' }));
    act(() => result.current.dispatch({ type: 'resume' }));
    act(() => result.current.dispatch({ type: 'pause' }));
    act(() => result.current.dispatch({ type: 'remove', actionId: 'forage' }));
    act(() => result.current.dispatch({ type: 'setHealth', health: 50 }));
    act(() => vi.advanceTimersByTime(balance.time.tickIntervalMs * 20));
    expect(result.current.state).toBe(before);
  });

  it('begin starts the next life live, clears the card, logs it, and the next queue ticks', () => {
    const { result } = renderHook(() => useGame(scrub));
    die(result, 5);
    act(() => result.current.dispatch({ type: 'begin' }));
    const { state, card, log } = result.current;
    expect(card).toBeNull();
    expect(state.dead).toBe(false);
    expect(state.life).toBe(2);
    expect(state.paused).toBe('none');
    expect(log[0]!.event).toEqual({ type: 'lifeBegins', life: 2 });
    act(() => result.current.dispatch({ type: 'queue', actionId: 'forage' }));
    act(() => vi.advanceTimersByTime(balance.time.tickIntervalMs * 3));
    expect(result.current.state.runTicks).toBe(3);
  });

  it('begin while alive does nothing', () => {
    const { result } = renderHook(() => useGame(scrub));
    const before = result.current.state;
    act(() => result.current.dispatch({ type: 'begin' }));
    expect(result.current.state).toBe(before);
    expect(result.current.log).toHaveLength(1);
  });

  it('two deaths: the second card starts where the first one ended', () => {
    const { result } = renderHook(() => useGame(scrub));
    die(result, 30);
    const first = result.current.card!;
    act(() => result.current.dispatch({ type: 'begin' }));
    die(result, 30);
    const second = result.current.card!;
    expect(second.life).toBe(2);
    expect(second.maxHealthFrom).toBe(first.maxHealthTo);
    expect(second.maxHealthTo).toBeGreaterThan(second.maxHealthFrom);
  });
```

The existing test "setHealth (dev handle) lets verification reach death" stays as it is: the state is still `dead` after the fatal tick.

- [ ] **Step 2: Red.** `npx vitest run src/state/useGame.test.tsx`. Expected: FAIL, because `view` and `card` are undefined and `setHealth` changes a dead state.

- [ ] **Step 3: Implement.** In `src/state/useGame.ts`:

```ts
import { useEffect, useMemo, useReducer } from 'react';
import { deathSummary, rebirth, type DeathSummary } from '../engine/rebirth';
```

Add `| { type: 'begin' }` to `GameAction`, with the doc comment `/** Lifts the death card and starts the next life (spec 2026-09-23 section 2.4). */`. In `reduce`, change `setHealth` and add `begin`:

```ts
      case 'setHealth': return s.dead ? model : { ...model, state: { ...s, health: Math.min(s.maxHealth, action.health) } };
      case 'begin': {
        if (!s.dead) return model;
        const next = setPaused(rebirth(s), 'none');
        const line: LogLine = { seq: model.nextSeq, at: 0, event: { type: 'lifeBegins', life: next.life } };
        return { state: next, log: [line, ...model.log].slice(0, LOG_LINES), nextSeq: model.nextSeq + 1 };
      }
```

`useGame`:

```ts
export function useGame(content: Content): {
  state: GameState; view: GameState; log: readonly LogLine[]; dispatch: (a: GameAction) => void; card: DeathSummary | null;
} {
  const [model, dispatch] = useReducer(reduce(content), undefined, initial);
  useEffect(() => {
    const id = setInterval(() => dispatch({ type: 'tick' }), balance.time.tickIntervalMs);
    return () => clearInterval(id);
  }, []);
  // Dead until Begin: the screen behind the card shows the life that is about to begin.
  const view = useMemo(() => (model.state.dead ? rebirth(model.state) : model.state), [model.state]);
  const card = useMemo(() => (model.state.dead ? deathSummary(model.state) : null), [model.state]);
  return { state: model.state, view, log: model.log, dispatch, card };
}
```

- [ ] **Step 4: Green.** `npx vitest run src/state/useGame.test.tsx`, then `npm run typecheck && npm run lint && npm test`. Expected: all green. `App` still reads `state` and shows the v0.1 banner, and its death test still passes, because the state is still dead. Task 4 replaces both.

- [ ] **Step 5: Commit.** `git commit -am "feat: dead until Begin; view and card derived in useGame"`

---

### Task 4: The death card on screen, and health in tenths

**Files:**
- Modify: `src/ui/format.ts`, `src/ui/format.test.ts`, `src/ui/glyphs.ts`, `src/ui/HealthBar.tsx`, `src/ui/HealthBar.test.tsx`, `src/ui/App.tsx`, `src/ui/App.test.tsx`, `src/styles.css`
- Create: `src/ui/DeathCard.tsx`, `src/ui/DeathCard.test.tsx`

**Interfaces:**
- Consumes: `DeathSummary` (Task 1); `useGame()`'s `view`, `card` and `{ type: 'begin' }` (Task 3).
- Produces:
  - format.ts: `tenths(n: number): string` and `healthPair(health: number, max: number): { now: string; max: string }`.
  - glyphs: `RISING = '\u25B2'`, `ARROW = '\u2192'`, `MINUS = '\u2212'`.
  - `DeathCard({ summary, onBegin })`.
  - App: renders every chunk from `view`, and wraps every region behind the card in an `inert` wrapper.

- [ ] **Step 1: Failing tests.**

`src/ui/format.test.ts`, append (add `healthPair, tenths` to its import):

```ts
describe('health in the bar', () => {
  it('a whole maximum keeps v0.1: current floored, never 0 while alive', () => {
    expect(healthPair(71.46, 100)).toEqual({ now: '71', max: '100' });
    expect(healthPair(0.3, 100)).toEqual({ now: '1', max: '100' });
    expect(healthPair(0, 100)).toEqual({ now: '0', max: '100' });
  });
  it('a fractional maximum: both floored to tenths, so a full bar reads full', () => {
    expect(healthPair(101.5937, 101.5937)).toEqual({ now: '101.5', max: '101.5' });
    expect(healthPair(71.46, 101.5937)).toEqual({ now: '71.4', max: '101.5' });
    expect(healthPair(0.04, 101.5)).toEqual({ now: '0.1', max: '101.5' });
  });
  it('tenths floors without float error: 101.7 stays 101.7', () => {
    expect(tenths(101.7)).toBe('101.7');
    expect(tenths(100)).toBe('100.0');
    expect(tenths(101.5198)).toBe('101.5');
  });
});
```

`src/ui/HealthBar.test.tsx`, append (it uses `container`; do not add a `screen` import, which fails typecheck as unused):

```ts
  it('after rebirth a full bar at a fractional maximum reads full, in tenths', () => {
    const { container } = render(<HealthBar health={101.5937} max={101.5937} />);
    expect(container.querySelector('.health__value')).toHaveTextContent('101.5 / 101.5');
  });
```

`src/ui/DeathCard.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { balance } from '../balance';
import type { DeathSummary } from '../engine/rebirth';
import { DeathCard } from './DeathCard';

const summary: DeathSummary = {
  life: 3, runTicks: 5820, gain: 1.5198, maxHealthFrom: 100, maxHealthTo: 101.5198,
  coreGains: [{ skill: 'forage', from: 4, to: 6, progress: 0.62 }, { skill: 'mine', from: 3, to: 5, progress: 0.18 }],
};

describe('DeathCard', () => {
  it('is a labelled modal dialog titled with the life that ended and its clock', () => {
    render(<DeathCard summary={summary} onBegin={() => {}} />);
    expect(screen.getByRole('dialog', { name: 'Life 3 ends' })).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('09:42 on the clock')).toBeInTheDocument();
  });
  it('lists each skill whose core moved, as "core from → to"', () => {
    render(<DeathCard summary={summary} onBegin={() => {}} />);
    expect(screen.getByText('Forage')).toBeInTheDocument();
    expect(screen.getByText('core 4 → 6')).toBeInTheDocument();
    expect(screen.getByText('core 3 → 5')).toBeInTheDocument();
  });
  it('shows max health from and to in tenths, and the reason in full', () => {
    render(<DeathCard summary={summary} onBegin={() => {}} />);
    expect(screen.getByText('100.0 → 101.5')).toBeInTheDocument();
    expect(screen.getByText(`+1.52 from 09:42 alive · ${balance.rebirth.growthRate}^9.7 − 1`)).toBeInTheDocument();
  });
  it('Begin names the next life, has focus, and calls onBegin', () => {
    const onBegin = vi.fn();
    render(<DeathCard summary={summary} onBegin={onBegin} />);
    const begin = screen.getByRole('button', { name: 'Begin life 4' });
    expect(begin).toHaveFocus();
    begin.click();
    expect(onBegin).toHaveBeenCalledTimes(1);
  });
  it('with no core gains there is no skill list, and the quiet line still says what starts over', () => {
    const { container } = render(<DeathCard summary={{ ...summary, coreGains: [] }} onBegin={() => {}} />);
    expect(container.querySelector('.card__gains')).toBeNull();
    expect(screen.getByText('pack, food, queue and run levels start over')).toBeInTheDocument();
  });
});
```

`src/ui/App.test.tsx`: replace the v0.1 death test ("death: an alert under the health bar…") with:

```tsx
  it('death: the card is up over the chapter, every chunk behind it is inert, and Begin starts life 2', () => {
    const { container } = render(<App />);
    const handle = window.continuum!;
    act(() => { handle.dispatch({ type: 'queue', actionId: 'forage' }); handle.step(30); handle.dispatch({ type: 'setHealth', health: 0.001 }); handle.step(1); });
    expect(handle.state().dead).toBe(true);
    expect(handle.state().runTicks).toBe(31);   // the dead life's clock reads 00:03
    const card = screen.getByRole('dialog', { name: 'Life 1 ends' });
    expect(card.parentElement).toHaveClass('columns__chapter');
    expect(card.closest('[inert]')).toBeNull();
    for (const name of ['health', 'skills', 'chapter', 'queue', 'pack', 'log']) {
      expect(screen.getByLabelText(name).closest('[inert]'), name).not.toBeNull();
    }
    expect(screen.getByRole('timer', { name: 'run clock' })).toHaveTextContent('00:00');   // the view: the next life, not the dead one's clock
    act(() => { screen.getByRole('button', { name: 'Begin life 2' }).click(); });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(handle.state().life).toBe(2);
    expect(handle.state().paused).toBe('none');
    expect(container.querySelector('[inert]')).toBeNull();
  });
```

- [ ] **Step 2: Red.** `npx vitest run src/ui`. Expected: FAIL on the new tests.

- [ ] **Step 3: Implement.**

`src/ui/glyphs.ts`, append:

```ts
/** Decay accelerates (spec 8.6). None of these three carries the Emoji property; escapes for the file's convention. */
export const RISING = '\u25B2';
export const ARROW = '\u2192';
export const MINUS = '\u2212';
```

`src/ui/format.ts`, append:

```ts
/**
 * Keeps a floor from reading 101.69999... as 101.6. Display precision, not
 * tuning; kept out of balance.ts on the same reasoning as TENTHS_BELOW_SECONDS.
 */
const TENTHS_EPSILON = 1e-9;

/** Floored to one decimal: a value never reads higher than it is. */
export function tenths(n: number): string {
  return (Math.floor(n * 10 + TENTHS_EPSILON) / 10).toFixed(1);
}

/**
 * Health and its maximum as the bar shows them. A whole maximum keeps v0.1's
 * reading (current floored, never 0 while alive). A maximum rebirth made
 * fractional shows both in floored tenths, so a full bar reads full.
 */
export function healthPair(health: number, max: number): { now: string; max: string } {
  if (Number.isInteger(max)) return { now: String(health > 0 ? Math.max(1, Math.floor(health)) : 0), max: String(max) };
  return { now: health > 0 ? tenths(Math.max(0.1, health)) : '0', max: tenths(max) };
}
```

`src/ui/HealthBar.tsx`: compute `const v = healthPair(health, max);` and render `{v.now} <small>/ {v.max}</small>`. The existing "never reads 0" tests keep passing, because a whole maximum takes the v0.1 branch.

`src/ui/DeathCard.tsx`:

```tsx
import { balance } from '../balance';
import { SKILLS } from '../data/skills';
import type { DeathSummary } from '../engine/rebirth';
import { ticksToMinutes, ticksToSeconds } from '../engine/time';
import { clock, tenths } from './format';
import { ARROW, MINUS } from './glyphs';
import { SKILL_ICONS } from './icons';

/**
 * Spec 2026-09-23 section 2.4 and its mockup: what the life bought, then a
 * button. The screen behind it already shows the next life; this shows gains only.
 */
export function DeathCard({ summary, onBegin }: { summary: DeathSummary; onBegin: () => void }) {
  const title = `Life ${summary.life} ends`;
  const at = clock(ticksToSeconds(summary.runTicks));
  const minutes = ticksToMinutes(summary.runTicks).toFixed(1);
  return (
    <div className="card" role="dialog" aria-modal="true" aria-label={title}>
      <div className="card__title">{title}</div>
      <div className="card__sub">{at} on the clock</div>
      {summary.coreGains.length > 0 && (
        <div className="card__gains">
          {summary.coreGains.map((g) => {
            const Icon = SKILL_ICONS[g.skill];
            return (
              <div key={g.skill} className="card__gain">
                <Icon aria-hidden="true" size={14} />
                <b>{SKILLS[g.skill].name}</b>
                <div className="bar" aria-hidden="true"><div className="bar__fill" style={{ width: `${g.progress * 100}%` }} /></div>
                <span className="card__lv">core {g.from} {ARROW} {g.to}</span>
              </div>
            );
          })}
        </div>
      )}
      <div className="card__rule" />
      <div className="card__hp"><span>max health</span><b>{tenths(summary.maxHealthFrom)} {ARROW} {tenths(summary.maxHealthTo)}</b></div>
      <div className="card__why">+{summary.gain.toFixed(2)} from {at} alive {'·'} {balance.rebirth.growthRate}^{minutes} {MINUS} 1</div>
      <button type="button" className="card__begin" autoFocus onClick={onBegin}>Begin life {summary.life + 1}</button>
      <div className="card__quiet">pack, food, queue and run levels start over</div>
    </div>
  );
}
```

`SKILL_ICONS` is `Record<SkillId, LucideIcon>`. `size={14}` stands: the card's gain rows are one text line tall, and `Queue.tsx` sizes its icons by CSS instead.

`src/ui/App.tsx`:
- Take `{ state, view, log, dispatch, card }` from `useGame`. The dev handle keeps reading `state`, the raw engine state.
- Every chunk renders `view`, including `firstRunnable(view, scrub)`, `live = view.paused === 'none'`, the clock and the health bar.
- Delete the v0.1 `.dead` banner and each `state.dead` branch in App: in `live`, in `clockNote`, and on the pause/resume control. `view` is never dead.
- Stop passing `dead` to `Queue`. Its `dead` prop and `ActionRow`'s `state.dead` checks stay as component-level defence; their tests still pin them.
- Wrap each region behind the card:

```tsx
  const inert = card ? true : undefined;
  // ...
  <main className="screen">
    <div className="top" inert={inert}>…health bar and corner, from view…</div>
    <div className="inert-wrap" inert={inert}><SkillsBand skills={view.skills} runningSkill={runningSkill} /></div>
    <div className="columns">
      <div className="columns__chapter">
        <div inert={inert}><ChapterPanel … state={view} … /></div>
        {card && <DeathCard summary={card} onBegin={() => dispatch({ type: 'begin' })} />}
      </div>
      <div className="middle" inert={inert}>
        <Pack state={view} content={scrub} />
        <Log lines={log} content={scrub} />
      </div>
      <div className="inert-wrap" inert={inert}><Queue state={view} content={scrub} working={working} live={live} onRemove={…} /></div>
    </div>
  </main>
```

`src/styles.css`: delete the `.dead` rule and append:

```css
/* A wrapper that only carries inert: it adds no box, so the grid it sits in is unchanged. */
.inert-wrap { display: contents; }
.columns__chapter { position: relative; }
.card { position: absolute; left: 40px; right: 40px; top: 24px; z-index: 1; border: 1px solid var(--edge-on); background: var(--cell-on); border-radius: 6px; padding: 14px 16px; box-shadow: 0 8px 28px oklch(0% 0 0 / .5); font-variant-numeric: tabular-nums; }
.card__title { font-family: var(--serif); font-style: italic; font-size: 16px; text-align: center; }
.card__sub, .card__quiet { color: var(--ink-2); text-align: center; }
.card__sub { margin-bottom: 12px; }
.card__gains { display: grid; gap: 3px; }
.card__gain { display: grid; grid-template-columns: 1.4em 6em 1fr auto; gap: 0 8px; align-items: center; }
.card__lv { text-align: right; white-space: nowrap; }
.card__rule { border-top: 1px solid var(--edge); margin: 10px 0; }
.card__hp { display: flex; justify-content: space-between; align-items: baseline; }
.card__why { color: var(--ink-2); font-size: 10px; margin-top: 2px; }
.card__begin { display: block; margin: 14px auto 0; padding: 6px 18px; border: 1px solid var(--run); background: var(--run); color: var(--bg); border-radius: 4px; font: inherit; font-weight: 700; }
.card__quiet { font-size: 10px; margin-top: 8px; }
```

(`.inert-wrap` with `display: contents` keeps `inert`: inertness is a DOM-subtree property, not a box property. Task 6 confirms it in Chrome by pressing Tab and clicking behind the card.)

- [ ] **Step 4: Green.** `npm run typecheck && npm run lint && npm test`. Expected: all green.

- [ ] **Step 5: Commit.** `git add -A src && git commit -m "feat: the death card, Begin, and health in tenths"`

---

### Task 5: Rates and food chunks; the pack keeps materials

**Files:**
- Create: `src/ui/Rates.tsx`, `src/ui/Rates.test.tsx`, `src/ui/Food.tsx`, `src/ui/Food.test.tsx`
- Modify: `src/ui/Pack.tsx`, `src/ui/Pack.test.tsx`, `src/ui/App.tsx`, `src/ui/App.test.tsx`, `src/styles.css`

**Interfaces:**
- Consumes: `decayPerSecond`, `foodCeilingPerSecond`, `covers`, `feeding` (Task 2); `useGame()`'s `view` and `card` (Task 3); App's `inert` wrappers (Task 4); `RISING`, `MINUS` (Task 4).
- Produces: `Rates({ decay, ceiling, covered, stopped })` and `Food({ state, content })`.

- [ ] **Step 1: Failing tests.**

`src/ui/Rates.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Rates } from './Rates';

describe('Rates', () => {
  it('shows decay with the rising mark, and the food ceiling labelled "up to"', () => {
    render(<Rates decay={0.18} ceiling={0.8} covered={true} stopped={false} />);
    expect(screen.getByLabelText('rates')).toBeInTheDocument();
    expect(screen.getByText('\u22120.18 hp/s \u25B2')).toBeInTheDocument();
    expect(screen.getByText('food, up to')).toBeInTheDocument();
  });
  it('the food line is green when it covers decay', () => {
    render(<Rates decay={0.18} ceiling={0.8} covered={true} stopped={false} />);
    expect(screen.getByText('+0.80 hp/s')).toHaveClass('rates__food--covers');
  });
  it('the food line is red when decay outruns it', () => {
    render(<Rates decay={0.93} ceiling={0.8} covered={false} stopped={false} />);
    expect(screen.getByText('+0.80 hp/s')).toHaveClass('rates__food--short');
  });
  it('an empty larder reads +0.00, red, not hidden', () => {
    render(<Rates decay={0.1} ceiling={0} covered={false} stopped={false} />);
    expect(screen.getByText('+0.00 hp/s')).toHaveClass('rates__food--short');
  });
  it('there is no net line (plan Revision 2)', () => {
    render(<Rates decay={0.1} ceiling={0.8} covered={true} stopped={false} />);
    expect(screen.queryByText('net')).toBeNull();
  });
  it('a stopped clock dims the chunk and keeps the numbers', () => {
    const { container } = render(<Rates decay={0.1} ceiling={0.8} covered={true} stopped={true} />);
    expect(container.querySelector('.rates')).toHaveClass('rates--stopped');
    expect(screen.getByText('\u22120.10 hp/s \u25B2')).toBeInTheDocument();
  });
});
```

`src/ui/Food.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { balance } from '../balance';
import { scrub } from '../data/scrub';
import { newState } from '../engine/queue';
import { Food } from './Food';

describe('Food', () => {
  it('each food: name, what one bite heals, a cooldown bar, and count/cap under it', () => {
    const cd = balance.health.foodCooldownTicks / 2;
    const { container } = render(<Food state={{ ...newState(), inventory: { berries: 6 }, foodCooldowns: { berries: cd } }} content={scrub} />);
    expect(screen.getByLabelText('food')).toBeInTheDocument();
    expect(screen.getByText('+4 hp')).toBeInTheDocument();
    expect(screen.getByText('6/20')).toBeInTheDocument();
    expect(container.querySelector('[data-item="berries"] .food__cooldown .bar__fill')).toHaveStyle({ width: '50%' });
  });
  it('a ready food has an empty cooldown bar', () => {
    const { container } = render(<Food state={{ ...newState(), inventory: { berries: 6 } }} content={scrub} />);
    expect(container.querySelector('[data-item="berries"] .food__cooldown .bar__fill')).toHaveStyle({ width: '0%' });
  });
  it('eaten as it lands is still feeding: zero on hand with a running cooldown is not loud', () => {
    const { container } = render(<Food state={{ ...newState(), foodCooldowns: { berries: 10 } }} content={scrub} />);
    expect(container.querySelector('[data-item="berries"]')).not.toHaveClass('food__item--empty');
    expect(screen.queryByText('nothing to eat')).toBeNull();
  });
  it('zero food and no bite in the last cooldown is the one loud moment: a hurt border and "nothing to eat"', () => {
    const { container } = render(<Food state={newState()} content={scrub} />);
    expect(container.querySelector('[data-item="berries"]')).toHaveClass('food__item--empty');
    expect(screen.getByText('nothing to eat')).toBeInTheDocument();
  });
  it('a full stack is warn', () => {
    const { container } = render(<Food state={{ ...newState(), inventory: { berries: 20 } }} content={scrub} />);
    expect(container.querySelector('[data-item="berries"]')).toHaveClass('food__item--full');
  });
});
```

`src/ui/Pack.test.tsx`: replace its four tests with:

```tsx
  it('lists materials only: no food, no structures, count/cap centered under a bar; zero is dimmed', () => {
    const s = { ...newState(), inventory: { berries: 3, cabin: 1 } };
    const { container } = render(<Pack state={s} content={scrub} />);
    expect(container.querySelector('[data-item="berries"]')).toBeNull();
    expect(container.querySelector('[data-item="cabin"]')).toBeNull();
    expect(screen.getByText('0/5')).toBeInTheDocument();
    expect(container.querySelector('[data-item="stone"]')).toHaveClass('pack__item--zero');
    expect(screen.queryByText('nothing to eat')).toBeNull();
  });
  it('a full stack is warn', () => {
    const { container } = render(<Pack state={{ ...newState(), inventory: { stone: 5 } }} content={scrub} />);
    expect(container.querySelector('[data-item="stone"]')).toHaveClass('pack__item--full');
  });
```

`src/ui/App.test.tsx`:
- The chunk list in "renders every chunk" becomes `['health', 'skills', 'chapter', 'queue', 'rates', 'food', 'pack', 'log']`.
- The Task 4 death test's inert list gains `'rates', 'food'`.
- Add:

```tsx
  it('the middle column stacks rates, food, pack, then the log (spec 8.6)', () => {
    const { container } = render(<App />);
    const labels = [...container.querySelectorAll('.middle > [aria-label]')].map((e) => e.getAttribute('aria-label'));
    expect(labels).toEqual(['rates', 'food', 'pack', 'log']);
  });
  it('rates dim while the clock is stopped (idle at the start)', () => {
    const { container } = render(<App />);
    expect(container.querySelector('.rates')).toHaveClass('rates--stopped');
  });
```

- [ ] **Step 2: Red.** `npx vitest run src/ui`. Expected: FAIL.

- [ ] **Step 3: Implement.**

`src/ui/Rates.tsx`:

```tsx
import { MINUS, RISING } from './glyphs';

/** Two decimals: the smallest decay the Scrub shows is 0.10 hp/s. Display precision, not tuning. */
const RATE_DECIMALS = 2;

function signed(n: number): string {
  return `${n < 0 ? MINUS : '+'}${Math.abs(n).toFixed(RATE_DECIMALS)} hp/s`;
}

/**
 * Spec 8.6 and 2026-09-23 section 4.1. Two lines, each true this second;
 * nothing predicts. The food line's color is the one judgement: green when the
 * larder covers decay, red when it does not. There is no net line (plan
 * Revision 2). A stopped clock dims the chunk and keeps the rates that apply
 * when it restarts.
 */
export function Rates({ decay, ceiling, covered, stopped }: { decay: number; ceiling: number; covered: boolean; stopped: boolean }) {
  return (
    <section className={`chunk rates${stopped ? ' rates--stopped' : ''}`} aria-label="rates">
      <div className="rates__kv">
        <span className="ink-2">decay</span><span className="rates__v hurt-text">{`${signed(-decay)} ${RISING}`}</span>
        <span className="ink-2">food, up to</span><span className={`rates__v ${covered ? 'rates__food--covers' : 'rates__food--short'}`}>{signed(ceiling)}</span>
      </div>
    </section>
  );
}
```

`src/ui/Food.tsx`:

```tsx
import { balance } from '../balance';
import type { Content } from '../data/types';
import { feeding } from '../engine/health';
import { count } from '../engine/inventory';
import type { GameState } from '../engine/types';

/**
 * Spec 8.6: food is its own chunk because it is the only thing that survives
 * between books within a life. Each food: name, one bite's heal, a cooldown bar
 * that drains until it can be eaten again, count/cap centered under it.
 */
export function Food({ state, content }: { state: GameState; content: Content }) {
  const foods = Object.values(content.items).filter((it) => it.kind === 'food');
  // Loud only when nothing is feeding the player: eaten-as-it-lands is not starving (plan Revision 3).
  const starving = foods.length > 0 && foods.every((it) => !feeding(state, it.id));
  return (
    <section className="chunk food" aria-label="food">
      <header className="chunk__head"><span>food</span>{starving && <span className="hurt-text">nothing to eat</span>}</header>
      {foods.map((it) => {
        const have = count(state.inventory, it.id);
        const full = have >= it.cap;
        const cooling = (state.foodCooldowns[it.id] ?? 0) / balance.health.foodCooldownTicks;
        const cls = !feeding(state, it.id) ? ' food__item--empty' : full ? ' food__item--full' : '';
        return (
          <div key={it.id} data-item={it.id} className={`item food__item${cls}`}>
            <span>{it.name}</span>
            <span>+{it.healPerUnit} hp</span>
            <div className="food__cooldown">
              <div className="bar" aria-hidden="true"><div className="bar__fill" style={{ width: `${cooling * 100}%` }} /></div>
              <div className="bar__value">{have}/{it.cap}</div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
```

`src/ui/Pack.tsx`:
- Filter to `it.kind === 'material'`.
- Delete `foods`, `starving`, the "nothing to eat" header span, the `pack__item--empty` branch and the heal column.
- In `styles.css`, `.pack__item` becomes `grid-template-columns: 1fr 90px`, and the `.pack__item--empty` rule is removed.

`src/ui/App.tsx`, in the middle column, where `view` and the `inert` wrapper are already Task 4's:

```tsx
import { covers, decayPerSecond, foodCeilingPerSecond } from '../engine/health';
// ...
const stopped = !live || working === -1;   // idle, waiting, paused, or the card (the view is on a system pause)
// ...
<div className="middle" inert={inert}>
  <Rates decay={decayPerSecond(view)} ceiling={foodCeilingPerSecond(view, scrub)} covered={covers(view, scrub)} stopped={stopped} />
  <Food state={view} content={scrub} />
  <Pack state={view} content={scrub} />
  <Log lines={log} content={scrub} />
</div>
```

`src/styles.css`, append:

```css
.rates { font-variant-numeric: tabular-nums; }
.rates--stopped { opacity: .55; }
.rates__kv { display: grid; grid-template-columns: 1fr auto; gap: 1px 8px; }
.rates__v { text-align: right; min-width: 13ch; display: inline-block; }
.rates__food--covers { color: var(--good); }
.rates__food--short { color: var(--hurt-text); }
.food { display: grid; gap: 4px; }
.food__item { display: grid; grid-template-columns: 1fr auto 90px; gap: 0 10px; align-items: center; padding: 5px 8px; font-variant-numeric: tabular-nums; }
.food__item--empty { border-color: var(--hurt); }
.food__item--full { color: var(--warn); }
```

`min-width: 13ch` pins the value column, so when `−0.93 hp/s ▲` becomes `−12.40 hp/s ▲` nothing moves.

- [ ] **Step 4: Green.** `npm run typecheck && npm run lint && npm test`. Expected: all green.

- [ ] **Step 5: Commit.** `git add -A src && git commit -m "feat: rates and food chunks; the pack holds materials"`

---

### Task 6: Chrome verification and the documents

**Files:**
- Modify: `MECHANICS.md`, `README.md`, `.claude/skills/chrome-verify/SKILL.md`, and this plan's status line

- [ ] **Step 1: Gates.** `npm run typecheck && npm run lint && npm test && npm run test:hooks && npm run build`. Expected: all green, with lint silent.

- [ ] **Step 2: Run the `chrome-verify` skill.** Drive it through the handle and by hand:

```js
continuum.dispatch({ type: 'queue', actionId: 'forage' });
continuum.step(300);
continuum.dispatch({ type: 'setHealth', health: 0.001 });
continuum.step(1);
continuum.state().dead                   // true: dead until Begin; the card is up
continuum.dispatch({ type: 'queue', actionId: 'mine' });
continuum.state().queue.map(e => e.actionId)   // ['forage']: a dead state takes no orders
continuum.dispatch({ type: 'begin' });
continuum.state().life                   // 2
continuum.state().maxHealth              // > 100
```

1. **By real click:**
   - The card shows over the chapter column, with "Life 1 ends", Forage's core line, `max health 100.0 → 100.x`, the reason line, and focus on **Begin life 2**.
   - Behind the card, the rows show the new life's times and the health bar reads full in tenths.
   - Click a `+` on a row, the corner's play control and a queue `×`: nothing happens. Press Tab from Begin: focus goes to the page or the browser, never to anything behind the card.
   - Click **Begin**: the card goes away and the log says "Life 2 begins".
2. **Three lives by play:**
   - Reload, then queue Forage, Mine, cabin and hall.
   - `continuum.step(7000)` reaches the card. Press Begin. Do this twice more.
   - Each card's "from" equals the previous card's "to".
   - Forage's row time is shorter at the start of life 3 than at the start of life 1. Read it before the first Forage and after each Begin.
3. **Rates:**
   - Decay shows `−0.10 hp/s ▲` at the start and grows.
   - "food, up to" reads `+0.00` in red with no berries, then `+0.80` in green once a berry is on hand.
   - It stays green while the larder keeps up. Late in the life it turns red at `+0.00`, with "nothing to eat", once nothing is feeding: in the default order, Forage sits behind the hall and Mine and never runs again. That should be one change each way, not a flicker.
   - There is no net line.
   - Pause, and while idle: the chunk dims and keeps its numbers.
   - The value column does not change width as decay grows. Compare the `▲`'s `getBoundingClientRect().right` at 0:10 and at 8:00.
4. **Food:**
   - The berries box shows `+4 hp`, a cooldown bar that fills on a bite and drains over five seconds, and `n/20` under it.
   - With zero food and no bite in the last five seconds: the hurt border and "nothing to eat". Starve a run, then queue Forage at the front: the line goes green once and stays green while health climbs, with no flicker.
   - The pack shows stone only.
5. Console clean, 404s included. Begin has the focus ring. At a 1280px viewport there is no horizontal scroll. The skills band and queue still lay out as before, so the `display: contents` wrappers have not moved anything. Compare against the v0.1 screenshot in `docs/mockups/`.

- [ ] **Step 3: MECHANICS.md.** In §5:
  - Replace "The game starts **paused**…" with the decision #41 reading: a new life costs nothing until something is queued, and the death card holds the dead state until Begin.
  - Replace the rebirth-bonus code block, its prose and its table with `growthRate ^ minutes − 1` (1.1), the spec's table, and the reason: it rewards the longer life, and content multipliers are the real lever, filed separately.
  - Note that food resets with the inventory.

  In the constants table, the row becomes `REBIRTH_GROWTH_RATE | 1.1 🎚️ | Per-death bonus = 1.1^minutes − 1`. In "Numbers not yet derived", replace the `REBIRTH_GROWTH_FACTOR` bullet: the gain is small by design (spec §3).

- [ ] **Step 4: README.md.** In the "🚧 Early" block, add:
  - A run now dies to a death card that shows what the life bought.
  - The next life keeps core mastery and a larger maximum health.
  - The HUD shows decay and the food ceiling, green when the larder covers decay.

  Link the v0.2 spec beside the v0.1 one. Do not list open work.

- [ ] **Step 5: chrome-verify skill.** Update the death paragraph:
  - `setHealth` then one step reaches the **card**. The state stays `dead` until `dispatch({ type: 'begin' })`.
  - While dead, the handle's `state()` is the dead life, and the screen shows the next one.

- [ ] **Step 6: Commit.** `git commit -am "docs: v0.2 rebirth, rates, food in MECHANICS, README, chrome-verify"`

The tracker writes are carried in the build-this-out handoff under **Open**, not done here:
- close #11 and #12 as built in v0.1;
- close #13, #14 and #15 with this branch's commits, and comment on #15 with the amended done-when;
- file the gain-multiplier issue and the health-throb issue.

---

## Self-review

- **Spec coverage:**
  - §1 display rule → Global Constraints, Task 2 `covers`, Task 5. Nothing predicts, and the row timers are untouched.
  - §2.1 and §2.2 → Task 1 tests. §2.3 → Task 1 classification.
  - §2.4 card → Tasks 3 and 4.
  - §3 bonus → Task 1 (balance, formula) and Task 4 (tenths, reason line).
  - §4.1 rates → Tasks 2 and 5. §4.2 food → Task 5.
  - §5: nothing here builds anything out of scope. §6 → Task 6 and the handoff.
- **Placeholders:** none.
- **Types:**
  - `DeathSummary`, `CoreGain`, `rebirth`, `rebirthGain` and `deathSummary` (Task 1) are used with the same fields in Tasks 3 and 4.
  - `decayPerSecond`, `foodCeilingPerSecond` and `covers` (Task 2) are used in Task 5.
  - `view`, `card` and `begin` (Task 3) are used in Tasks 4 and 5.
  - `tenths`, `healthPair` and the glyphs (Task 4) are used in Tasks 4 and 5.
- **Review Focus:**
  - 1: Task 1 classification.
  - 2: Task 3's dead-guard test and Task 4's inert test.
  - 3: Task 1 accrual and Task 3's two-deaths test.
  - 4: Task 2's `covers` edge tests and its food-line-across-a-life test, and Task 5's stopped test.
  - 5: Task 4's HealthBar and format tests.

## Execution handoff

Decided per task rather than asked, following the global rules:

```text
task  what                                   mode        why
----  -------------------------------------  ----------  ------------------------------------------
1     rebirth in the engine                  inline      locks the state shape every task reads
2     rates, covers, three lives             subagent    pure engine, pattern set by Task 1
3     state: view, card, Begin               inline      the one wiring task; sets the UI contract
4     death card on screen, tenths           subagent    component + test, contract fixed by Task 3
5     rates + food chunks                    subagent    component + test, same idiom as Task 4
6     Chrome pass + docs                     inline      needs the dev server and Chrome MCP
```
