# The Windward Run — Implementation Plan

**Status:** built 2026-09-24 on `feature/playable-windward-run`, the branch
that carries the spec; code panel rounds one to five folded in (below),
approved to ship by the user 2026-09-24 ("it makes sense to ship this"). The spec went straight from brainstorm to spec to
plan, so the plan panel reviewed the spec too. Revised after plan-panel rounds
one to four (Revisions 1 to 4 below; the task text is already updated and wins
over any of them); round five converged. **The code panel sections supersede
the task text where they differ** (Task 7's `topReady` is gone, for one).

## Code panel round five (2026-09-24)

Four seats found no must-fix and every seat accepted all six entries. The
naysayer reproduced one regression from round four in Chrome: the player's
own + order for a JIT food, below an idle order that does not supply it,
counted as the food's fill, so the food sat at zero while the idle order
filled its stack (283 ticks at zero at port I against 39 before). The fix
restores round three's supply-chain rule (`serves`) for the player's own
order only; an automation fill keeps round four's rule. Also: a maker queued
as a food fill may still supply another row's fill in the same resolve (a
food another row costs popped its consumer as blocked); `reconcile` drops a
supply whose order the book no longer has; the property test now runs from
each port of The Windward Run, adds a fixture where one food costs another,
and checks liveness after every tick (a JIT food out and makeable is on its
way within one tick); tests for a two-deep supply chain (x while paused, and
above the player's food order), re-owed provisions (only the row's own, and
the provision coming again), leaving JIT sparing the player's orders, the
pop-out's rate names, and the finish rule inside the last chapter. Accepted,
not changed: a better-ranked producer going first above a JIT food fill runs
to its look-ahead (spec 3.3, the user's "must first see if there is anything
of higher priority"); unreachable in the book, where the only food with an
input (canapés) has no better-ranked producer to go first.

A focused check of the fix (engine-reviewer and the naysayer) found one
regression in it, the same by both: the supply guard marked a maker as
having supplied before the better-ranked producer branch, so when that
producer left at once (its look-ahead already met by a part-built one-time
below), the maker could not supply and the player's order was dropped as
"blocked" (reproduced at the Hollow Isle and the Fortune). The maker is now
marked only once it is queued; a regression test pins it, and the property
test's liveness check now counts only the first order for a food row, so it
catches round five's own defect without the unit test.

Reading after rounds four and five: unchanged, attentive 30.70 h / 90,
handsOn 30.33 / 91, prioritized 29.32 / 86. No balance value changed. With
enforcers at its first pick of 600: 31.82 / 31.73 / 30.43 h.

## Code panel round four (2026-09-24, at the user's "A")

Same five seats on round three's supply link. Engine-reviewer and
tuning-guard found no must-fix; the others found four, all narrow, and two
seats rejected entry 4 because round three's new `for` check had no test.

- **Only a player's order buries a fill.** Round three's rule (anything
  above a fill but its own supply chain buries it) made two JIT food fills
  bury each other on every tick, and undid spec 3.3's better-ranked producer
  going first; the committed state never settled. The shipped book cannot
  reach either (one food per port), but the rule was wrong. A fill is under
  way unless a player's order sits above it; orphans are gone before the
  question is asked. `serves` is gone with it.
- **A supply leaves with its order at once, paused or not.** `withoutOrphans`
  (automation.ts) runs in `removeEntry` and in `setAutomation`'s drop, not
  only in resolve, so a paused x no longer leaves a supply reading "0/0".
  Leaving JIT also re-owes that departure's provision.
- **Tests:** automation orders round-trip in the save (`midRun` carries a
  supply and a fill) and a bad `for` sets a save aside (entry 4 holds again);
  a one-time supply (the gate for the raid) leaves with its order having done
  no work; an orphan in a loaded queue leaves on the first resolve; the
  supply look-ahead's still-owed, done and need cases; two rows leaving at
  once each say why; "0/1 scrap".
- **A seeded property test** (`src/engine/property.test.ts`): random play
  presses, +, x, chips and pauses with every chip earned, on the fixture with
  two JIT foods and on The Windward Run, checking after every action that
  the state is settled, no supply is orphaned or doubled, automation's other
  orders stay few, no two fills share a row, no JIT food out and makeable is
  left under the player's orders, and no stack goes over its cap or below
  zero. Mutated back to round one's food rule, round three's burial rule, or
  no orphan pass, it fails each time.
- Smaller: the validator's stack rule is stated as the authoring limit it is
  (the base cap); `lengthTolerance`'s comment says target 8 reads it; the
  spec's pick record points at the plan's readings and states the finish
  range the test enforces (22.5–37.5 h over the 24 h floor); round one's
  enforcers reason is marked superseded where it sits.

## Code panel round three (2026-09-24)

Same five seats on round two's fixes. All six entries were accepted by every
seat. Three must-fixes, one root cause: an automation supply order had no
link to the order it served. It fetched for every one-time queued below the
fill it supplied (15 chips before the first canapé with the door queued), it
outlived its order when that order was removed or taken back to the top (and
then filled its item to the cap for nothing; x repeated on a fill piled them
up), and any automation order above a fill made the fill look under way (a
leftover Wardens order ran its hurting fight above a starving eel fill).

- **The supply link.** A supply order carries `for`, the id of the order it
  supplies (`QueueEntry.for`, checked by the save's shape check). It fetches
  for that order alone (`lookAheadTarget`), and resolve drops a supply order
  whose order has left, before anything else. A fill is under way only on
  top or below nothing but its own input's supply chain (`serves`); the
  player's own order for the food row counts as its fill, so settling twice
  changes nothing. A food row taken off JIT drops its fill (`setAutomation`).
- **"Working" is an engine query,** `topWorks` in resolve.ts, tested headless
  (a paused top that would pop, or that a JIT maker would supply first, is
  not working).
- Smaller: "0/1 chip" in the queue's target and "1 chip" in the pop-out's
  rate (a key named without its amount); a shortfall said once when two
  orders for the row leave together; the validator rejects a completion
  bigger than an empty stack, a non-positive decay multiplier and an empty
  one-unit name; tests for the quiet-shortfall rule's row condition, reachOf
  with two cost items, a food fill sparing the player's own order; the spec's
  2.4 words; the canapé reason now says it bounds target 8 from above (1% at
  1 chip, 11% at 2, 34% at 3); the target-8 assertion's comment says what it
  can and cannot catch.

Reading after round three: attentive 30.70 h / 90 lives, handsOn 30.33 /
91, prioritized 29.32 / 86; life 1 12.8 min, late lives 22.7-23.0 min; port
II at life 5-6, port III at 19-21. No balance value changed.

Three rounds ran without a clean one (build-this-out: after three, the
unresolved items go to the user). Round three's must-fixes are fixed above;
what is unresolved is that no panel has read these fixes.

## Code panel round two (2026-09-24)

Same five seats, briefed that round one's fixes and its six entries were the
targets. Five entries were accepted by every seat; entry 4 was rejected by
two, and entry 5 by the tuning-guard for the canapé. Two defects a player
hits, one of them round one's own:

- **A food fill buried under a play press never came back.** Automation's
  food rule skipped a row with any automation order anywhere in the queue, so
  a fill pushed down by a play press sat under the pressed row with the food
  at zero (the naysayer died of it at the guardian). Now a fill is under way
  only on top or below nothing but automation's own orders (its input's
  supply); otherwise, food out, it goes back to the top, and a provision
  replaces a buried fill (spec 3.2, round-two note). A first version of this
  fix, "on top only", re-queued the fill behind its own supply every tick and
  piled up Salvage orders; a probe caught it, and a test pins it.
- **Round one's look-ahead starved JIT food chains.** Counting every
  completion of an automation fill below made the chip supply fetch 15 chips
  before the first canapé. An automation order on top now fetches for one
  completion of each repeating row below (just in time; it supplies again);
  only the player's own order fetches for all (spec 2.3, round-two note).
- **Orders act on the state the screen shows.** Round one rendered
  `resolve(view)` while orders applied to the unresolved state, so a play
  press or an x could do nothing for a tick. `useGame` now settles the
  committed state after every action and tick while live; the screen, the dev
  handle and the next order read the same state. Paused, the top is lit only
  if it could run as it stands.
- **Entry 4 corrected** (below): the queue-entry and log-line checks loaded a
  bad value silently, so they are now tested; only the list checks are crash
  guards. `loadSave` calling `reconcile` is tested on the path a player takes.
- **The canapé's reason corrected** (entry 5, balance.ts, spec section 11):
  at 2 chips the automating player is 11% behind hands-on, well inside the
  25% target, so the price is a length lever with pirates, not target 8's;
  the end-to-end measure test now asserts target 8.
- Smaller: the sharper #42 fix (a shortfall is not logged while its row
  still has an order queued: that pop resumes by itself); a cycle of makers,
  none automated, ends its walk and names no row already on the chain; a
  deep cause reads "can't run: further down, needs chips"; "1 chip", "1
  canapé"; "+4 hp" no longer wraps; the queue's countdown runs to where the
  row will stop (`reachOf`); the validator rejects non-positive or fractional
  amounts and XP costs; the look-ahead stop test now distinguishes the stop
  from the cap; the unreachable completion guard is commented as defensive.

**Reading after round two:**

```text
player       game hours  lives  life 1     late lives  port II  port III
-----------  ----------  -----  ---------  ----------  -------  --------
attentive    30.69       90     12.8 min   23.0 min    life 5   life 20
handsOn      30.33       91     12.8 min   22.7 min    life 6   life 21
prioritized  29.31       86     12.8 min   23.0 min    life 5   life 19
```

Sensitivity on this engine (one value changed, attentive / handsOn /
prioritized hours): canapé 2 chips 46.76 / 42.19 / 43.78; enforcers 600
32.20 / 31.73 / 30.43; pirates 480 14.41 / 13.30 / 13.72 (port III at life
8); port I/II costs at their first picks 22.61 / 21.21 / 20.27 (port III at
life 11-14). Round one's enforcers reason ("back to about 31 h after pirates
raised it") is superseded: at 600 the book still reads 32 h; 500 stays as a
pick.

## Code panel round one (2026-09-24)

Five seats: engine-reviewer, tuning-guard, vacuous-test-hunter, a
plan-against-diff reviewer, and the naysayer playing in Chrome. Gates were
green; the must-fixes were missing tests, one screen defect and one wording
defect. What changed:

- **Tests restored and added.** The queue rewrite had dropped main's tests of
  incremental cost consumption (the clamp at an unpaid unit, two units in one
  tick, XP as the progress made, the last unpaid unit); they are ported onto
  `work()`. New tests pin `acquired`, a one-time earning its chip (and the
  event's count on cast-off and finish), the catch-up cap dropping the
  backlog, the loop's leftover milliseconds, the tick reducer's idle break,
  the save's shape checks and chapter clamp, Shift+"now" on a met look-ahead,
  the look-ahead's stop at the next maker (at a cap of 10, where the stop and
  the cap differ), and five priority rules. Each was run against the mutant
  that should break it.
- **The screen renders the resolved view.** "Running" was read from the state
  after a tick, before the next tick's zero-time resolve, so every fill-then-
  build handoff showed a stopped game for one frame. Live, App now renders
  `resolve(view)` (pure, no time); paused, the view as is. `topReady` is gone.
- **Words.** An unearned maker reads "{row} automation is not yet earned", as
  spec section 2.4 and the mockup have it (the word "automation" had been
  dropped, so a first click read as the Salvage row being locked). A maker
  off or unearned that cannot start by hand either now follows its chain to
  the first thing a hand can do (spec 2.4, code panel note).
- **The look-ahead** counts a row below once however many entries it has, and
  a repeating consumer for every completion it is asked for up to its own
  full stack (spec 2.3, code panel note). By hand, dealers then kitchens had
  made one canapé and stopped.
- **Provisioning waits until the event could start** (spec 3.2, code panel
  note): with the key makers on JIT, every guardian start had provisioned
  first and fought on 1 to 5 of 15 eels.
- Small: the validator rejects a key needed or costed more than once; the
  test setup no longer prints Node's localStorage warning 27 times; the dev
  handle's speed takes only the offered speeds; `scrollbar-gutter: stable`,
  so a long queue growing the page does not shift it; food names do not
  break at a hyphen; MECHANICS section 1 describes the catch-up loop;
  CLAUDE.md gains decision #68, the two-tab limit and two corrections.

**Reading after round one** (headless, `balance.policy.checkEverySeconds`):

```text
player       game hours  lives  life 1     late lives  port II  port III
-----------  ----------  -----  ---------  ----------  -------  --------
attentive    29.39       88     12.8 min   22.3 min    life 5   life 20
handsOn      30.33       91     12.8 min   22.7 min    life 6   life 21
prioritized  27.62       83     12.8 min   22.3 min    life 5   life 19
```

No balance value changed. Round one's attentive was 30.69 h over 90 lives;
the look-ahead and provisioning changes account for the difference.

**Not changed, with reasons** (each: the objection, the cheaper alternative,
why it was not taken):

1. *The death card says "fell during" a fight that decay finished.* The
   alternative records which drain did the killing and names the row only
   for a hurts death. Not taken: the line says where the life ended, not
   what ended it; the hurting row was running and draining, and dropping it
   on a decay death would hide where the player was.
2. *Two tabs overwrite each other's save.* The alternative listens for the
   storage event and stops the other tab's autosave. Not taken in this
   build: an autosave that stops silently is worse than the race, and an
   honest version needs words on screen; it is written down as a known
   limit (CLAUDE.md) and filed.
3. *The "stops" log lines are still chatty (#42).* The alternative logs a
   row's shortfall once per life. Not taken: for a hand-queued entry the log
   is the only place a pop explains itself, and how much of it to keep is a
   feel call for after the user plays; #42 stays open. *(Round two took the
   sharper alternative: a shortfall is not logged while its row still has an
   order queued, since that pop resumes by itself; the last one keeps its
   words.)*
4. *(Corrected in round two.)* The list checks (`acquired`, `queue`,
   `completedOneTime`, `provisioned`), the log array and the state record
   have no test of their own: a bad value there throws inside `loadSave`'s
   try/catch (in `reconcile`'s filter or `wellFormed`), which sets the save
   aside anyway, so a test could only pass. They are kept as crash guards.
   The queue-entry and log-line checks do not throw later (a bad value
   loaded silently) and are now tested one by one.
5. *The x2 port I/II costs, the one-chip canapé and the pirates/enforcers
   pair compensate for mechanism behaviour (tuning-guard).* They were picks
   under the user's standing instruction and are shown to the user in the
   handoff; if #72 is answered B or C, the doubled costs lose their reason
   and are re-tuned (noted on #72).
6. *"waiting" in the corner is now reachable only if a resolve runs out of
   passes.* Under pop-until-runnable a queue that cannot run empties, so the
   clock reads "idle"; the label stays as the fallback, and decision #41's
   substance (no time without work) is unchanged.

## Round five (2026-09-23): the plan converged

Round five read Revision 4 with the same four seats. Reviewer A, reviewer B
and the executor reported no must-fix and accepted all six risks; the
naysayer raised two, both folded in while Tasks 5-8 were being built:

1. **The waiting look's words said "waits", which Revision 3 had replaced**
   with words that say what to do. Task 7's words now read `Salvage drifting
   scrap 120/200 · earn it by hand` (or `… automation is off`), on the row.
2. **Accepted risk 3 overclaimed.** Content ordering closes the lock-out for a
   player who builds every upgrade before switching chips on (asserted in
   `windward.test.ts` from life 10); a player who skips one upgrade and
   switches on the others is still locked out (the naysayer measured the
   satchel skipped: Salvage at 140/200 for 83 lives). The waiting look's
   instruction is the load-bearing mitigation, and whether an engine rule is
   wanted is the user's call: #72.

Should-fixes taken in code (13ba37f): the withhold's no-freeze half, one
one-time per dry ask, and `prioritized`'s picks are pinned by tests (the
freeze-half mutant now fails); the save drops a `castOff` line whose chapter
is not a whole number in range. In docs: spec §4 states the event-last rule,
§3.3 the honest risk 3; Task 3's files include the validator. Noted for the
handoff: the first Fortune lives build little there (port III is reached late
in a life), the costs doubled by tuning mean more interleaving by hand early
(accepted risk 4's size), and the pacing spread a player feels comes from how
often they check in, more than from automation.

## Revision 4 (2026-09-23, after plan-panel round four)

Round four: the same four seats on Revision 3, each building Tasks 2-4 and
playing the book with all three players. Revision 3's fixes held when built
(the trunk in every Fortune life once first built; queue max 4; the JIT food
resumption at exactly 5; the five-second ask test). What round four found:

**Fixed (must):**

1. **The cycle case contradicted `supplyVia`** (A, executor): a cause-less
   blocked maker was wrapped into a `cause` naming itself ("Press can't run:
   Press's automation is blocked"). `supplyVia` now keeps a blocked block
   without a cause as it is; `SupplyCause` carries the `item` the cause lacks,
   so the words can name it.
2. **`prioritized` hand-queued the port's event over its own automated
   upgrades** (A, measured at pirates ×4 and ×5): with the upgrades on `high`
   and the event's chip still off, the event was the first unfinished
   one-time `mine` allowed, the queue never emptied, and the idle fill never
   ran. `byHand` now withholds the event while the idle fill will still take
   one of the port's one-times (set to a priority and able to start). A
   measured it: 0 violations from life 10; `attentive` and `handsOn`
   unchanged. (Withholding it whenever any one-time is unfinished froze at
   life 7: JIT key makers are pulled only through the event's chain.)
3. **A Task 3 test needed casting off** (B, executor): "after casting off,
   `provisioned` is empty" moves to Task 4.
4. **The `fillLeft` test described an unreachable state** (naysayer, A,
   executor): a JIT food fill only starts at zero; it is the provision fill,
   with the raid unstarted on top.
5. **Target 6 rested on a misreading, and content alone meets it** (naysayer):
   the line the user approved read *"automation unlock 200 repeat / 5
   one-time kept unless play shows the first unlock later than ~life 3"*: the
   FIRST unlock of any row, not a harvest's chip. Every retune that slows port
   II (which Task 5 must do anyway) puts the first unlock at Fish, life 3, with
   the threshold at 200, so the condition holds and nothing licenses moving a
   global constant that would also re-pace every later book. The lock-out is
   closed by content instead: a harvest earns its chip no later than the
   one-times it feeds when those one-times cost enough of it (the naysayer
   measured pirates ×2.4, port I/II material costs ×2 and canapés at 1 chip,
   at 200: 0 bad cast-offs, the Salvage chip and the hull chip both at life
   5, the automating and hands-on players level). Target 6 is now the user's
   words plus that content ordering; the Global Constraint that automation
   constants stay stands, and if content cannot meet it, that goes to the
   user.

**Accepted risk 3, re-reasoned again** (the naysayer rejected Revision 3's
reasoning, not the rule): the rule is the user's (the approved queue section);
the lock-out is closed by content ordering, not by a constant; and the waiting
look now shows its words on the row, not only in a tooltip, with a committed
mockup frame before Task 7 builds it (decision #31).

**Fixed (should):** a three-deep chain test pins the cause's propagation; the
big-fight test uses the gate (a one-time that makes something), which is what
`readyHigher`'s one-time guard is for; `keepLines` checks a `short` line's
`cause` maker; words exist for a blocked maker without a cause; the validator
enforces what `byHand` relies on: a chapter's event is its last one-time; a
committed test pins "one unfinished one-time per dry ask"; `prioritized` is
asserted in `windward.test.ts` for ports I and II, and reported for the
Fortune (which never casts off); Task 5 re-runs the gate's lines on the tuned
book; the canapé price is named as target 8's lever; the check-in cadence
range goes in the reading and the handoff; the words are one function for
both the row and the log and name rows; ▶ asks `frontBlock`; four ambiguous
expectations are pinned; spec §3.2, §3.4 and §11 are aligned; the worktree
runs all four gates after its rebase; Task 3's Produces lists the new names;
`attentive`'s doc comment describes this revision.

## Revision 3 (2026-09-23, after plan-panel round three)

Round three: the same four seats on Revision 2, each building Tasks 2-4 and
playing the book. Round two's fixes held (0 of 96 measured lives cast off with
an unbuilt one-time; queue max 10; three resolve passes at most; the give-up
tests down from 42-83 s to under 0.4 s). Round three was not clean, but every
finding came with a fix that keeps the user's rules, and all four seats
accepted accepted risks 1, 2, 4, 5 and 6. So nothing contested is left for
the user; round four confirms this revision.

**Fixed (must):**

1. **Two test expectations contradicted Revision 2's own code** (all four).
   The blocked chain now names both: the direct maker as blocked, and the
   deepest cause (`cause`), so the words never blame a row that does not make
   the missing item (`needs 2 scrap · Press can't run: Fight the gate's
   automation is not yet earned`). The JIT food resumption reads exactly 5
   (the fill's `left` removes it inside `work`), then 5 plus a tick.
2. **An old harness test broke on the stall-ask design** (A, B, executor):
   `a policy that checks in every 5 seconds is asked about once per 5 seconds`
   now counts only the interval asks.
3. **The hands-on player left the trunk unbuilt for 20 lives** (executor): a
   dry ask queued every pending one-time, so the trunk (20 chips at cap 15)
   popped short after one fill and the 600-XP enforcers, queued in the same
   batch, ran until death. `byHand` now queues food plus the port's FIRST
   unfinished one-time (the event is the last one-time, so it comes last by
   construction). Measured by the executor: both players build the trunk in
   every Fortune life once first built; queue max 4.
4. **The accepted-risk-3 fix failed when measured** (naysayer): a player who
   sets upgrades to priorities as their chips arrive (life 5) and the fight
   too locks itself out for the rest of the game. Salvage's chip needs 200 at
   about 24 a life (life 9), the idle fill casts off past the upgrades from
   life 6, nothing salvages after, and Salvage sits at 120/200 for 44 lives;
   the chip's "waits on" promised a wait that never ends. The user's rule
   stays, and the window closes: the user approved the numbers section with
   *"automation unlock 200 repeat / 5 one-time kept unless play shows the
   first unlock later than ~life 3"*, and play shows life 4-5, so Task 5
   re-picks `unlockRepeatable` until the first harvest chip lands by about life
   3 and every harvest feeding a port's one-times earns its chip no later than
   those one-times do. A third measured player, `prioritized` (the naysayer's
   lock-out player), is reported in the gate and the reading and must build
   every port's upgrades from life 10. The waiting look says what to do, not
   to wait: `Salvage 120/200 · earn it by hand` or `Salvage automation is off`.
5. **Target 6 was stated three ways** (naysayer, A): it is now the user's
   words above, in the plan, spec §3.4 and the §11 table alike.
6. **The gate's cap line read two ways, and the strict reading failed for a
   pacing reason** (all four): it now reads "once a life has built the
   Fortune's capacity row, every later life that reaches the Fortune builds
   it"; when the cap first reaches 20 is a Task 5 reading.

**Fixed (should):** ▶ uses `frontBlock` with the Shift state in Task 7, or an
`enough` refusal would be silent (A, B); provisioning refired back to back
when eating outpaced it: each food row is provisioned once per departure
(`provisioned`, cleared at casting off and death) (B); the food-fill test uses
a local fish slow enough to be eaten mid-fill (A, B, naysayer); `left` must be
a positive whole number in a save, and `complete` leaves at `left <= 1` (A);
`keepLines` also checks a `short` line's item and maker (A); the event-withhold
and handsOn rules get unit tests (B, executor); the big-fight test makes the
raid runnable so the guard is what it pins (B, executor); `fillLeft`'s
subtraction is pinned (executor); the words name the maker row, not its
skill, and a key's amount is not printed (naysayer); a seventh target keeps
automation from being the slow end (canapé refills made the JIT player finish
later than the hands-on one: naysayer, measured 38.4 h against 27.6 h); a
casual player (asks every 300 s) is reported, not asserted (naysayer); spec
§11 and §3.2 describe this revision's players and `left` (A, naysayer); the
worktree adds files by explicit path (B); Task 4's Produces lists `during`
(B); the plan no longer cites an ephemeral scratch path (B).

## Revision 2 (2026-09-23, after plan-panel round two)

Round two: the same four seats on Revision 1. The executor built Tasks 2-4
verbatim (289, 313 and 323 tests green after each, both programs typecheck,
lint silent) and ran Task 4's gate; the naysayer and both reviewers built and
played it too. Round one's fixes 1, 2, 3, 5, 8, 9 and 10 held under execution.

**Fixed (must):**

1. **The measuring player abandoned a port's upgrades once they earned a chip**
   (all four, measured: hull, net and satchel built in lives 1-5 and never in
   6-51; the stack cap stuck at 5; a 25-entry queue failed the gate). One-time
   chips arrive at 5 completions and harvest chips at 200, so an upgrade set
   to `high` was blocked, skipped by the idle fill, and skipped by hand, while
   the event was hand-queued. The policy now never uses priorities: it sets
   only foods and makers (key makers included) to JIT as they are earned, it
   hand-queues every unfinished one-time of the port whatever its chip says,
   and it queues the big event only once the port's other one-times are done.
   A second sane policy, `handsOn`, is the same player never touching
   automation; Task 5 measures both, so the report is a range. Task 4's gate
   gains a per-life line: from life 10, every life that casts off built every
   one-time of that port first.
2. **By-hand fills were unbounded** (executor, B: 40,005 entries on a
   100,000-stone monument; three give-up tests at 42-83 s against 30 s). The
   policy queues one maker fill per cost per ask; `play()` asks again the
   moment the queue drains (a step that does not advance), so nothing is lost,
   and with the event withheld until the port is built, nothing casts off in
   between. A dry ask queues at most two entries per one-time plus food.
3. **Task 3's harness tests broke on their premises, not their numbers**
   (executor, B). Task 3 Step 11 now names each rebuild, taken from the
   executor's green copy (`scratchpad/exec-r2`): the give-up cases use an
   unreachable but cheap finish (`monumentBook(3, 1e9)`); the endless-life case
   keeps a local policy that queues its `balm`; the off-length and too-short
   cases choose their tolerance and floor from the two runs as measured; the
   later-life freeze is re-measured with its rationale rewritten to what
   actually freezes. Task 2's short-life case takes an 8-minute line (control
   shortest 8.43 min, trap longest 7.88) that Task 3 returns to the default.

**Fixed (should):** a priority maker's supply step could start the port's big
fight: the row that goes first is now only a repeatable producer (the user's
Forage example) (naysayer); JIT food and provision fills could run until death
when eating outpaced them: an automated food fill carries `left`, the
completions it has before it leaves (MECHANICS §6's `targetCount`) (naysayer);
supply now walks every automated maker in rank order and uses the first whose
chain closes, and a blocked chain names the deepest cause it found (naysayer);
▶ on a producer whose look-ahead from the top is already met is refused with
`enough` instead of accepted and popped silently (A); `Resolved` reports
`passes`, which the gate reads (A, naysayer); test helpers take the content
they step (A, B); the LOG_LINES test fills with `short` lines from an
unsupplied row (A, B, executor); three unpinned rules get tests: an unsupplied
JIT food stays idle, an auto food entry under a player's ▶ is not doubled, a
higher row already queued is not queued again (executor's surviving mutants);
the blocked-chain expectation includes `amount: 2` (B); the JIT food
resumption reads 5 plus one tick (executor); `chaptersPerLife` is tested in
Task 4, where a chapter can change (B); the cast-off test checks kept work on
a row that is not done (B); nested save hand-edits (a skill that is not a pair
of ledgers, a `castOff` line past the last chapter) read as corrupt or are
dropped (A); the queue countdown shows on the top entry only; `DeathCard`'s
content prop widens and it gains the book's name (executor); file lists,
interfaces and Task 8's `multiplier(skill, …)` wording (B); the worktree gets
`node_modules` linked and lands by rebase then fast-forward (B); spec §3.3
records the narrowing and §5.3's table shows the on-screen names (A, B).

**Accepted risk 3, re-reasoned** (rejected by the naysayer and the executor,
accepted by the reviewers): the objection was that the plan quoted MECHANICS,
not the user. The idle-fill rule is the user's: the queue section the user
approved with "y" in the brainstorm read *"empty queue → the highest-priority
row that can run is queued, one at a time"*. A player who sets an upgrade to
`high` before its harvest has a chip will see the event cast off past it; the
engine does what the user approved. What changes is that the player can see
it: a chip whose row is set but cannot start shows a waiting look and says
why (`high`, dashed, *"waits on Salvage automation, not yet earned"*; Task 7),
and the handoff names it as something to report back on. The measuring
policy no longer uses priorities at all (must-fix 1), so tuning does not rest
on it. Risks 1, 2, 4, 5 and 6 were accepted by all four; risk 5's handoff
line quotes the user's #47 words exactly ("it can be added to any spot after
the top spot, because the player may do some shenanigans").

## Revision 1 (2026-09-23, after plan-panel round one)

Round one: reviewer A (design vs code), reviewer B (plan vs design), the
naysayer and an executor. The executor and the naysayer each built Tasks 2-4
verbatim in a scratch copy (both programs typecheck; 14 of 14 behaviour tests
passed; 7 of 7 mutations caught) and played The Windward Run headless. Every
finding below was reproduced by at least one of them.

**Fixed (must):**

1. **A supply chain that cannot close looped every tick** (A, B, naysayer):
   `supplier` said `ok` for an automated maker that could not itself run, so
   passive fill re-queued the row and resolve popped it again, tick after tick,
   with two `short` log lines each time and `step` never idle. `startBlock` now
   follows the chain (`chainGap`, one maker at a time, a `seen` set against
   cycles) and returns `gap: 'blocked'`; resolve pops such a row at once
   without queuing its maker; the idle fill, the food check and ▶ all go
   through it. New tests: after a blocked chain pops once the next `step`
   returns the same object; passive fill never queues a blocked row; ▶ refuses it.
2. **Priority-first supply flooded the queue with duplicate one-time entries**
   (naysayer, measured 9 entries with 5 duplicates on the real book). The row
   that goes before a priority maker must now be not already queued and able
   to work without any supply of its own (`readyHigher`), which is exactly the
   user's example (Forage filling first). New test: two one-times on `high`
   and their maker on `mid` leave no duplicate.
3. **Provisioning fired before the finish** (naysayer: 1.5 min and 130 hp of
   the finishing life). The finish is not a departure; provisions only happen
   when the event casts off to another port. New test.
4. **Task 2 could not end green** (all four): the shared cap moves the
   `monumentBook` readings under the old engine, one test needed a per-item
   cap of 200, and swapping component tests to a new fixture broke 36 of them
   on values, not names. Task 2 now re-measures the readings itself, rewrites
   the later-life freeze test with a capacity row, and moves The Salt Road into
   `src/test-utils/salt-road.ts` as a fixture in the new format, so component
   tests change only where the cap does. `structure` fixtures become `key`.
5. **`play()` read a queue that resolve drained as frozen** (executor, B: 5
   play and 11 measure tests). Frozen now means two steps in a row that did not
   advance with the policy asked in between (`!advanced && stalled`).
6. **The measuring policy did not play like a person** (naysayer, executor):
   one maker fill per cost at a cap of 5 left every Rig/Tinker row short, and
   the event, queued last in the same batch, cast off past them; port II's
   upgrades never completed in 53 lives. The attentive policy now queues
   section 2.3's shape, `ceil(owed / cap)` maker-and-row pairs, leaves rows
   automation already runs to it, presses ▶ on a food's input maker when ▶
   refuses the food, and puts the event on a priority only once every other
   one-time of the port has earned its chip. A new gate: every one-time of
   every port completes at least once before the finish.
7. **Task order** (naysayer): three engine rules above only showed up by
   playing. The attentive policy now lands in Task 3 (no throwaway stand-in),
   and Task 4 ends with a whole-book gate run before anything is built on the
   engine. Task 5 is numeric tuning only.
8. **The play needs the port reached per life** (A, B): `PlayRun` gains
   `chaptersPerLife`.
9. **Lint** (executor): `payDue`'s parameter `work` shadowed the exported
   `work()`; renamed `w`.
10. `monumentFirst` in `measure.test.ts` flooded the new queue (A, B); it now
    queues its reversed order only when the queue is empty.

**Fixed (should):** `runUntil` collected the previous tick's events on idle
steps; `realClick` gains a `MouseEventInit` for Shift; `ChapterPanel` joins
Task 3; the engine fixture is a valid book (chapter II has its own food row)
and lives in `src/engine/fixture.ts`; gear reaches every rate the screen shows
(row time, xp/s, queue countdown, the skill cell); the rebirth test's dead life
is finished, so the `finished` reset is exercised; `localStorage` is cleared
between tests; the save survives a malformed queue entry or log line, keeps up
to three set-aside saves, and the dev handle gains `load`; `deathSummary`'s
new parameter joins the card's `useMemo` deps; the check-in interval is
`balance.policy.checkEverySeconds`, outside `PlayBounds`; the validator's
opening-row rule counts `needs`; the four validator messages that had none;
the spec's contradictions (§3.4's stale unlock claim, §4's "until the next
life", §7's keys, §10's wake, §11's lives against hours, §5.3's row names);
#54 gets a comment, not a close; closing #47 files its two remaining asks;
Task 8 runs after Task 7 (both edit `App.tsx` and `styles.css`).

**Accepted risks** (objection, cheaper alternative, why rejected):

1. *Refuse a second entry of a one-time row* (naysayer). *Alternative:*
   `enqueue` returns the same state when that one-time is already queued.
   *Rejected because* the user's own example queues a one-time twice
   ("mine stone, build a cabin, mine stone, build a cabin", #47) and the spec's
   walk-through rests on it; a second entry after the first completes pops
   `done`, silently and harmlessly.
2. *Drop `needs` and the `key` kind; make keys a cost of 1* (naysayer).
   *Alternative:* every key becomes an ordinary material costing 1. *Rejected
   because* the user approved section 6 as written ("needs: checked, not
   consumed, shown as a chip"), and a consumed key is not what the row says.
3. *An automated big event casts off from an idle queue past unbuilt rows*
   (naysayer). *Alternative:* the idle fill skips the port's event while any
   one-time of the port is undone. *Rejected because* the user defined a
   priority as "queued when the queue is empty, highest first", and a special
   case for events is a rule the user did not state; a player who automates
   the event and not the rows chose that. The measuring policy avoids it
   (point 6), and the behaviour goes in the handoff for the user to judge.
4. *Every stack-cap row costs more than the cap in force* (naysayer).
   *Alternative:* price each at or under the cap when it is reached.
   *Rejected because* the user's own cabin costs more than its cap, and
   interleaving by hand until automation is earned is the game ("a, thats the
   game"); Task 5 may still move these numbers.
5. *+ only appends; a player cannot slot a pair ahead of a queued event*
   (naysayer). *Alternative:* insert or reorder controls in the queue.
   *Rejected because* the user approved section 2.5 ("+ appends the row at
   the bottom"), and 09-22 §8.5 keeps remove as the queue's only control; it
   goes in the handoff as something to report back on.
6. *At the user's 24 h floor a finish takes about 100 lives and 30 hours of
   play at ×1* (naysayer). *Alternative:* a shorter book. *Rejected because*
   the floor is the user's rule; the dev ×100 speed reaches the end in about
   18 minutes, and the handoff says so.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** a playable game: the queue of orders with earned automation, one
three-port book (The Windward Run) with ends, the skill pop-out, and a save.

**Architecture:** the engine stays pure (decision #4). A row's progress moves
off the queue entry onto the state (`work`), so entries become plain orders.
A new zero-time pass, `resolve()`, runs automation and pops the top until it
can work; only then does `step()` spend a tick (decision #41). Effects of
completed one-times (stack cap, gear) are derived from `completedOneTime`.
`src/state/` adds the save, a catch-up loop and settings.

**Tech stack:** TypeScript strict, React 19, Vite, Vitest (node for the
engine, jsdom per component file), oxlint.

**Spec:** [`docs/specs/2026-09-23-the-windward-run.md`](../specs/2026-09-23-the-windward-run.md).
Section numbers below (§n) are the spec's.

## Global Constraints

- Every gameplay number lives in `src/balance.ts` (decision #3). A new one is
  marked `UNDERIVED` and `picked 2026-09-23` with a one-line reason. Presentation
  timings stay in the component as named constants, as `INSTRUCTION_MS` does.
- The engine never imports `src/ui/` or `src/state/`, and takes no clock or
  seed (decision #4). No `Date.now()`, `Math.random()` or `performance` below
  the wall. `npm run typecheck` runs both programs.
- Time passes only while work happens (decision #41).
- Mockups are committed before the screen they design (decision #31).
- Existing balance values do not change, except: `content.scrub` is removed
  with The Salt Road, and the per-item caps become `inventory.stackCap: 5`
  (the user's decision on #45). The global decay, rebirth, skill and
  automation constants stay exactly as they are (§11).
- `active`/`inactive`, `allowlist`/`blocklist`; no emoji in code, comments or
  commits; spec glyphs are `\u` escapes in `src/ui/glyphs.ts`, imported.
- A component test's first line is `// @vitest-environment jsdom`.
- Commits: one terse line, no trailers.
- Definition of Done per task: `npm run typecheck`, `npm run lint` (silent),
  `npm test`, `npm run test:hooks`, all green.

## Review Focus

1. **A save from before this build, a corrupt save, or a storage that throws**
   (a private window). The game must open on a fresh run, never a blank page,
   and never overwrite the old save until the new game has saved once. Pinned
   in Task 6.
2. **A supply chain that cannot close** (canapés need chips while the tables
   are not yet earned, or a content cycle). No infinite loop and no queue that
   grows tick after tick. Pinned in Task 3 (`blocked`, the pass bound).
3. **JIT food interrupting a fight.** The fight's progress must be kept while
   the food runs, and its damage must stop while it is not the top. Pinned in
   Tasks 3 and 4.
4. **A hidden tab left for an hour, then a laptop asleep overnight.** The
   hidden tab keeps pace; the sleep advances at most the capped five minutes,
   in one batch that does not lock the page. Pinned in Task 6.
5. **Shift+click and plain click on ▶ for a full, done, or unsupplied row.** A
   refusal flashes red and changes nothing, and Enter on the button (no Shift)
   queues a repeat. Pinned in Task 7.

---

## File structure

```text
src/data/types.ts            MODIFY  item kinds (key), no per-item cap, row fields (needs, hurts,
                                     capacityBonus, gear), Chapter.event; Content gains chapters, finish
src/data/validate.ts         MODIFY  rules for the new fields
src/data/icons.ts            MODIFY  + recycle, sailboat
src/data/windward-run.ts     CREATE  book one
src/data/salt-road.ts        DELETE  (and salt-road.test.ts)
src/data/books.ts            MODIFY  BOOKS = [windwardRun]
src/balance.ts               MODIFY  inventory, loop, content.windward (Task 2); policy (Task 3)
src/engine/types.ts          MODIFY  entries, work, chapter, automation, counters, events
src/engine/effects.ts        CREATE  capOf, capacityBonus, gearFor, gearMultiplier
src/engine/inventory.ts      MODIFY  room/add take a cap
src/engine/rows.ts           CREATE  here, workOf, shortfall, isFull, lookAheadTarget ...
src/engine/automation.ts     CREATE  modes, unlock, cycle, makersOf
src/engine/queue.ts          REWRITE entries, startBlock, enqueue, removeEntry, work, complete, castOff
src/engine/resolve.ts        CREATE  the zero-time pass; topReady
src/engine/tick.ts           MODIFY  step = resolve, then decay, hurts, eat, work
src/engine/health.ts         MODIFY  smallest heal first; hurts
src/engine/rebirth.ts        MODIFY  carries automation, counters; finishes; summary fields
src/engine/play.ts           MODIFY  attentive policy; finished; PLAY_VERSION 2
src/state/useGame.ts         MODIFY  new actions, default branch, catch-up loop, save, speed
src/state/save.ts            CREATE  versioned save, reconcile
src/state/devHandle.ts       MODIFY  speed, save, erase
src/engine/fixture.ts        CREATE  engine test data: a two-port book (Task 3)
src/engine/windward.test.ts  CREATE  The Windward Run's whole-life characterization (Task 5)
src/test-utils/salt-road.ts  CREATE  The Salt Road as a component-test fixture (Task 2)
src/test-utils/book.ts       CREATE  testBook, for the rebuilt components (Task 7)
src/test-utils/fixtures.test.ts CREATE  both test-utils books validate
src/ui/*                     MODIFY  per Tasks 7 and 8; CREATE FinishCard, Settings, SkillLedger
docs/mockups/2026-09-23-*    CREATE  Task 1
```

---

### Task 1: Mockups (decision #31)

**Files:** Create `docs/mockups/2026-09-23-queue-orders.html`,
`docs/mockups/2026-09-23-finish-card.html`, `docs/mockups/2026-09-23-settings.html`,
`docs/mockups/2026-09-23-skills-ledger-gear.html`, a PNG of each, and index lines in
`docs/mockups/README.md`.

Built in the house style: copy the tokens and markup conventions from
`docs/mockups/2026-09-22-action-row.html`, `2026-09-22-queue.html`,
`2026-09-23-death-card.html` and `2026-09-22-skills-hover.html` (09-22 §8.1:
OKLCH tokens, every list item boxed, values centered under bars, one ember
sheen, controls at least 24px, `a/b` fractions). Content is The Windward Run's
real rows and names (§5.3).

- [ ] **queue-orders:** (a) Port Cinder's six rows in the 09-22 §8.4 grammar,
  now with: a `needs the star chart` chip (met and unmet), `−0.30 hp/s` on
  the pirates row, effect outputs (`decay ×0.80`, `stack +5`, `Fish ×1.25`,
  `casts off`, `the end`), and the automation chip in all its looks
  (`37/200` earning, `off`, `JIT`, `top`, `high`, `mid`, `low`, `last`), pinned
  width. (b) A refused ▶: the row's red flash frame and the instruction line
  `needs 3 scrap · Salvage automation is off`. (c) The queue with five
  entries: the working top (ember bar, countdown), a `repeat` entry, a `once`
  entry, and two entries automation added (`auto` in the automation color,
  one a JIT supply fetching `3 of 8`), kept progress on a Rig entry
  (`5/8 scrap`), a single-press ×.
- [ ] **finish-card:** the finish card over the chapter column, in the death
  card's frame: the book's name as title, the cliffhanger in the running
  head's serif, `31:04 on the clock`, core gains with bars, max health
  from → to, `finished 1×`, a **Read again** button, and the quiet line.
  Beside it the death card with its new line `reached II · The Hollow Isle`.
- [ ] **settings:** the gear opening a small panel under it: one entry,
  `erase save`, and its armed state `press again to erase`; below a rule, the
  dev-only `speed ×1 ×10 ×100` segmented control marked `dev build`.
- [ ] **skills-ledger-gear:** the 09-22 hover mockup with the "tools" section
  renamed **gear**, listing `a trawl net ×1.25`, and the "right now" and
  "lifetime · 12 lives" blocks with real Fish numbers.
- [ ] Render each at 1280px in Chrome to a PNG beside it; add one index line
  per mockup to `docs/mockups/README.md`.
- [ ] Commit: `mockup: queue orders, finish card, settings, gear ledger`

---

### Task 2: The format, the shared cap, effects, and book one

**Files:**
- Modify: `src/data/types.ts`, `src/data/validate.ts`, `src/data/validate.test.ts`,
  `src/data/icons.ts`, `src/ui/icons.tsx`, `src/ui/icons.test.ts`, `src/data/books.ts`,
  `src/data/books.test.ts`, `src/balance.ts`, `src/balance.test.ts`,
  `src/engine/inventory.ts`, `src/engine/inventory.test.ts`, `src/engine/queue.ts`
  (cap calls only), `src/ui/ActionRow.tsx`, `src/ui/Food.tsx`, `src/ui/Pack.tsx`
  (cap calls only), `src/ui/App.tsx` and `src/ui/App.test.tsx` (the real book),
  and every test with an inline `Content`/`Book` fixture: `queue.test.ts`,
  `tick.test.ts`, `health.test.ts`, `rebirth.test.ts`, `play.test.ts`,
  `measure.test.ts`, `validate.test.ts`, `roster.test.ts`, `skills.test.ts`
  (add `chapters`/`finish`/`event`, drop `cap`, `structure` becomes `key`)
- Create: `src/data/windward-run.ts`, `src/data/windward-run.test.ts`,
  `src/engine/effects.ts`, `src/engine/effects.test.ts`,
  `src/test-utils/salt-road.ts`, `src/test-utils/fixtures.test.ts`
- Delete: `src/data/salt-road.ts`, `src/data/salt-road.test.ts`,
  `src/engine/playable.test.ts` (the Scrub's whole-life tests; Task 4's gate
  and Task 5 write The Windward Run's), the "The Salt Road v1, end to end"
  block of `src/engine/measure.test.ts` (Task 5 writes The Windward Run's)
- Re-point: every component and state test that imports `saltRoad`
  (`ActionRow`, `ChapterPanel`, `DeathCard`, `Food`, `Log`, `Pack`, `Queue`,
  `SkillsBand`, `narrate.test.ts`, `useGame.test.tsx`) imports
  `saltRoadFixture` from `src/test-utils/salt-road.ts`

**Interfaces:**
- Produces: `Content.chapters`, `Content.finish`, `Chapter.event`,
  `ItemKind = 'material' | 'food' | 'key'`, `ActionDefinition.needs/hurts/capacityBonus/gear`,
  `Gear`; `capOf(state, content, item)`, `capacityBonus(state, content)`,
  `gearFor(state, content, skill): readonly GearPiece[]`,
  `gearMultiplier(state, content, skill)`; `room(inv, id, cap)`,
  `add(inv, id, n, cap)`; `windwardRun: Book`; `saltRoadFixture: Book` (test-utils).

- [ ] **Step 1: The types.** `src/data/types.ts` becomes (unchanged parts
  elided only where marked):

```ts
/** What an item is, for where it is shown and how many can be held (spec 2026-09-23-the-windward-run section 7). */
export type ItemKind = 'material' | 'food' | 'key';

export interface ItemCost { readonly item: ItemId; readonly amount: number }

/** A skill's tick multiplier for the rest of the life (section 6.3). */
export interface Gear { readonly skill: SkillId; readonly multiplier: number }

export interface ActionDefinition {
  readonly id: ActionId;
  /** The verb is the skill (spec 2026-09-22 section 6). */
  readonly verb: SkillId;
  /** The chapter's flavor, shown after the verb. */
  readonly noun: string;
  /** Total XP of effort to complete once; progress is in the same unit. */
  readonly expCost: number;
  readonly producedItem?: ItemId;
  readonly producedAmount?: number;
  /** Consumed incrementally, in declared order; an item appears at most once. MECHANICS section 2. */
  readonly itemCosts: readonly ItemCost[];
  /** Checked, never spent (section 6.2). */
  readonly needs?: readonly ItemCost[];
  readonly isOneTime: boolean;
  /** Health lost per second while this row runs (section 6.1). */
  readonly hurts?: number;
  /** Effects on completion, for the rest of the life. One-time rows only (section 6.3). */
  readonly healthDecayMultiplier?: number;
  readonly capacityBonus?: number;
  readonly gear?: Gear;
  /** One authored sentence the log prints when a one-time completes (spec 2026-09-22 section 9). */
  readonly beat?: string;
}

export interface ItemDefinition {
  readonly id: ItemId;
  readonly name: string;
  readonly kind: ItemKind;
  /** Food only: HP restored per unit eaten. */
  readonly healPerUnit?: number;
}

/** A port of call (section 4): its head, its rows in display order, and its big event. */
export interface Chapter {
  readonly head: ChapterHead;
  readonly order: readonly ActionId[];
  /** Completing it casts off; in the last chapter it is the book's finish. A one-time row in `order`. */
  readonly event: ActionId;
}

export interface Content {
  /** In display order: the band shows the whole roster from life 1, in this order. */
  readonly roster: readonly SkillDefinition[];
  readonly actions: Readonly<Record<ActionId, ActionDefinition>>;
  readonly items: Readonly<Record<ItemId, ItemDefinition>>;
  /** Ports of call, in order (section 4). */
  readonly chapters: readonly Chapter[];
  /** The last chapter's event: its completion finishes the book. */
  readonly finish: ActionId;
}

/** A book: content plus what the shelf and the play need. The format a generator emits. */
export interface Book extends Content {
  readonly id: string;
  readonly name: string;
  readonly version: number;
  readonly length: BookLength;
}
```

`ChapterHead`, `SkillDefinition`, the id aliases and `BookLength` are
unchanged. `Book` loses `chapters` and `finish` to `Content`.

- [ ] **Step 2: Balance.** Replace `content.scrub` and add two groups:

```ts
  /** The pack (#45). */
  inventory: {
    /** The user's decision on #45: "start at 5". Every item but a key holds at most this, raised by capacity rows. */
    stackCap: 5,
  },

  /** The loop in src/state/ (spec section 10). */
  loop: {
    /** UNDERIVED, picked 2026-09-23: a wake catches up at most this much game time, so a laptop opened after a night does not fast-forward it. Chrome wakes a hidden tab about once a minute; five leaves room. */
    maxCatchUpMinutes: 5,
  },
```

and `content.windward`, every value `UNDERIVED, picked 2026-09-23` as a
starting point that Task 5 tunes against §11's targets:

```ts
  /**
   * The Windward Run (spec 2026-09-23-the-windward-run section 5.3). UNDERIVED,
   * all of them, picked 2026-09-23 under the user's instruction ("pick
   * something, remember it, and make it tunable") as starting points; Task 5
   * of the plan tunes them against the spec's section 11 targets with the
   * headless play, and the final values are recorded there.
   */
  content: {
    windward: {
      fish: { expCost: 4 },
      cloudFish: { healPerUnit: 4 },
      salvage: { expCost: 5 },
      hull: { expCost: 60, scrap: 8, decayMultiplier: 0.8 },
      net: { expCost: 40, scrap: 6, fishMultiplier: 1.25 },
      satchel: { expCost: 50, scrap: 10, capacity: 5 },
      pirates: { expCost: 480, hurts: 0.3 },
      eels: { expCost: 8 },
      skyEel: { healPerUnit: 10 },
      ruin: { expCost: 7 },
      wardens: { expCost: 200, hurts: 0.5 },
      halls: { expCost: 150 },
      fittings: { expCost: 80, brass: 10, decayMultiplier: 0.8 },
      chest: { expCost: 70, brass: 12, capacity: 5 },
      cutlass: { expCost: 60, brass: 8, fightMultiplier: 1.25 },
      compass: { expCost: 900, hurts: 0.6 },
      dealers: { expCost: 6 },
      kitchens: { expCost: 8, chips: 2 },
      canape: { healPerUnit: 16 },
      door: { expCost: 120, chips: 15 },
      dock: { expCost: 100, chips: 15, decayMultiplier: 0.8 },
      trunk: { expCost: 90, chips: 20, capacity: 5 },
      enforcers: { expCost: 600, hurts: 1 },
      salons: { expCost: 300 },
      varro: { expCost: 400 },
    },
  },
```

`balance.test.ts`: the content lock becomes `balance.content.windward`
`toEqual` the block above; add `expect(balance.inventory).toEqual({ stackCap: 5 })`
and `expect(balance.loop).toEqual({ maxCatchUpMinutes: 5 })`.

- [ ] **Step 3: Effects.** Write `src/engine/effects.test.ts` first, against
  an inline two-row fixture (a capacity row `+5` and two gear rows for one
  skill, ×1.25 and ×1.2), asserting: `capOf` is `balance.inventory.stackCap`
  for a material and a food with nothing done; `+5` once the capacity row is
  in `completedOneTime`; `1` for a key whatever is done; `Infinity` for an
  unknown item id; `gearMultiplier` is `1` with nothing done and `1.25 × 1.2`
  with both, `gearFor` lists them in completion order; a gear row for another
  skill does not count. Run: `npx vitest run src/engine/effects.test.ts`,
  expected FAIL (module missing). Then:

```ts
/**
 * What the life's completed one-time rows do for the rest of it (spec
 * 2026-09-23-the-windward-run section 6.3): a bigger stack and faster skills.
 * Derived from completedOneTime, so each resets at death with it. The decay
 * multiplier is the one effect kept on the state, as before. Pure.
 */
import { balance } from '../balance';
import type { ActionDefinition, ActionId, Content, ItemId, SkillId } from '../data/types';
import type { GameState } from './types';

/** A key is held or not: a count, not tuning. */
const KEY_CAP = 1;

function doneRows(state: GameState, content: Content): ActionDefinition[] {
  return state.completedOneTime.flatMap((id) => {
    const a = content.actions[id];
    return a === undefined ? [] : [a];
  });
}

/** The shared stack cap's raise from this life's rows (section 7). */
export function capacityBonus(state: GameState, content: Content): number {
  return doneRows(state, content).reduce((sum, a) => sum + (a.capacityBonus ?? 0), 0);
}

/** How many of an item the pack holds (#45): one shared number raised by capacity rows; a key, one; an unknown item, no limit. */
export function capOf(state: GameState, content: Content, item: ItemId): number {
  const def = content.items[item];
  if (def === undefined) return Number.POSITIVE_INFINITY;
  return def.kind === 'key' ? KEY_CAP : balance.inventory.stackCap + capacityBonus(state, content);
}

export interface GearPiece { readonly actionId: ActionId; readonly multiplier: number }

/** This life's gear for a skill, in the order it was made (the pop-out lists it). */
export function gearFor(state: GameState, content: Content, skill: SkillId): readonly GearPiece[] {
  return doneRows(state, content)
    .filter((a) => a.gear?.skill === skill)
    .map((a) => ({ actionId: a.id, multiplier: a.gear!.multiplier }));
}

/** The product of a skill's gear: the tool factor in (1 + core x 5%) x (1 + run x 1%) x tool. */
export function gearMultiplier(state: GameState, content: Content, skill: SkillId): number {
  return gearFor(state, content, skill).reduce((m, g) => m * g.multiplier, 1);
}
```

`effects.ts` imports `GameState` from `./types`; the new state fields it does
not read arrive in Task 3, and this file compiles against today's type.

- [ ] **Step 4: Inventory takes a cap.** `room(inv, id, cap)` returns
  `cap - count(inv, id)`; `add(inv, id, n, cap)` clamps with it. Every caller
  passes `capOf(state, content, id)`: `fullItem` and `complete` in
  `src/engine/queue.ts`, `owedShortfalls` in `src/ui/ActionRow.tsx`, and
  `Food.tsx`/`Pack.tsx`, which show `n/{capOf(...)}` and warn at it.
  `inventory.test.ts` passes caps explicitly.

- [ ] **Step 5: The validator.** Add a failing test per rule to
  `src/data/validate.test.ts` (each mutates a valid fixture and matches the
  message), then the rules in `validateBook`:
  - a chapter's `event` is in that chapter's `order` and is a one-time row:
    `chapter 2's event "x" is not one of its rows` / `... is repeatable; it must be one-time`
  - the last chapter's `event` is the book's `finish`:
    `finish "x" is not the last chapter's event`. It replaces the rule "finish
    is not in the last chapter" (its test is rewritten to this message).
  - a row lists an item at most once in its costs: `row "x" costs "y" twice`
  - every `needs` item exists: `row "x" needs "y", which the book does not define`
  - `hurts`, when present, is a finite number above 0:
    `row "x" hurts by y, which is not a positive number`
  - `healthDecayMultiplier`, `capacityBonus` and `gear` appear only on one-time
    rows: `row "x" has an effect but is repeatable`
  - `capacityBonus` is a positive integer:
    `row "x" raises the stack by y, which is not a positive whole number`;
    `gear.multiplier` a finite number above 0:
    `row "x" gears by y, which is not a positive number`; `gear.skill` is in
    the roster: `row "x" gears "y", which is not in the roster`
  - a food item has `healPerUnit` above 0 (`food "x" heals y, which is not a
    positive number`) and nothing else has one (`item "x" is not food but heals`)
  - the existing opening-row rule counts `needs` too: the first chapter needs a
    row with no costs and no needs

- [ ] **Step 6: Icons.** Add `'recycle'` and `'sailboat'` to `ICON_NAMES`,
  and `Recycle`, `Sailboat` from `lucide-react` to `ICONS`. `icons.test.ts`
  keeps checking every vocabulary name has a component.

- [ ] **Step 7: Book one.** `src/data/windward-run.ts`, every number from
  `balance.content.windward` (`n`); a yield of 1 and a need of 1 key are
  counts, not tuning:

```ts
/**
 * Book one: The Windward Run (spec 2026-09-23-the-windward-run section 5). A
 * sky world, and we are the heroes. Three ports of call, each with a food, a
 * harvest, a decay reducer, a stack-cap row and a big event that casts off.
 * Every tuning number comes from balance.content.windward; a yield of one and
 * a need of one key are counts, not tuning. Names and text are a first draft
 * for the user to rewrite after playing.
 */
import { balance } from '../balance';
import type { Book } from './types';

const n = balance.content.windward;

export const windwardRun: Book = {
  id: 'windward-run',
  name: 'The Windward Run',
  version: 1,
  finish: 'varro',
  /** The author's claim, not tuning (headless-play spec section 3); Task 5 measures it. */
  length: { hours: 30 },
  roster: [
    { id: 'fish', name: 'Fish', icon: 'fishing-rod' },
    { id: 'salvage', name: 'Salvage', icon: 'recycle' },
    { id: 'tinker', name: 'Tinker', icon: 'wrench' },
    { id: 'rig', name: 'Rig', icon: 'sailboat' },
    { id: 'fight', name: 'Fight', icon: 'sword' },
    { id: 'search', name: 'Search', icon: 'eye' },
    { id: 'talk', name: 'Talk', icon: 'message-circle' },
  ],
  chapters: [
    {
      head: { numeral: 'I', chapter: 'Port Cinder', story: 'A market town adrift on warm air. Word is, something old sleeps on a drifting ruin.' },
      order: ['fish', 'salvage', 'hull', 'net', 'satchel', 'pirates'],
      event: 'pirates',
    },
    {
      head: { numeral: 'II', chapter: 'The Hollow Isle', story: 'A ruin the wind forgot. Whatever it guards, it guards still.' },
      order: ['eels', 'ruin', 'wardens', 'halls', 'fittings', 'chest', 'cutlass', 'compass'],
      event: 'compass',
    },
    {
      head: { numeral: 'III', chapter: 'The Gilded Fortune', story: 'A casino the size of a city, and one old man somewhere inside it.' },
      order: ['dealers', 'kitchens', 'door', 'dock', 'trunk', 'enforcers', 'salons', 'varro'],
      event: 'varro',
    },
  ],
  items: {
    'cloud-fish': { id: 'cloud-fish', name: 'cloud-fish', kind: 'food', healPerUnit: n.cloudFish.healPerUnit },
    scrap: { id: 'scrap', name: 'scrap', kind: 'material' },
    'sky-eel': { id: 'sky-eel', name: 'sky-eel', kind: 'food', healPerUnit: n.skyEel.healPerUnit },
    brass: { id: 'brass', name: 'brass', kind: 'material' },
    'inner-door': { id: 'inner-door', name: 'the inner door', kind: 'key' },
    'star-chart': { id: 'star-chart', name: 'the star chart', kind: 'key' },
    chips: { id: 'chips', name: 'chips', kind: 'material' },
    canape: { id: 'canape', name: 'canapés', kind: 'food', healPerUnit: n.canape.healPerUnit },
    'deck-pass': { id: 'deck-pass', name: 'a deck pass', kind: 'key' },
    'lift-key': { id: 'lift-key', name: 'the lift key', kind: 'key' },
    'varros-table': { id: 'varros-table', name: "Varro's table", kind: 'key' },
  },
  actions: {
    fish: { id: 'fish', verb: 'fish', noun: 'the cloud shallows', expCost: n.fish.expCost, producedItem: 'cloud-fish', producedAmount: 1, itemCosts: [], isOneTime: false },
    salvage: { id: 'salvage', verb: 'salvage', noun: 'drifting scrap', expCost: n.salvage.expCost, producedItem: 'scrap', producedAmount: 1, itemCosts: [], isOneTime: false },
    hull: {
      id: 'hull', verb: 'rig', noun: 'the hull', expCost: n.hull.expCost, itemCosts: [{ item: 'scrap', amount: n.hull.scrap }], isOneTime: true,
      healthDecayMultiplier: n.hull.decayMultiplier, beat: 'The hull holds. Let the wind try harder.',
    },
    net: {
      id: 'net', verb: 'tinker', noun: 'a trawl net', expCost: n.net.expCost, itemCosts: [{ item: 'scrap', amount: n.net.scrap }], isOneTime: true,
      gear: { skill: 'fish', multiplier: n.net.fishMultiplier }, beat: 'A trawl net, fine as smoke. The shallows give up more.',
    },
    satchel: {
      id: 'satchel', verb: 'tinker', noun: 'a canvas satchel', expCost: n.satchel.expCost, itemCosts: [{ item: 'scrap', amount: n.satchel.scrap }], isOneTime: true,
      capacityBonus: n.satchel.capacity, beat: 'A canvas satchel. Room for more of everything.',
    },
    pirates: {
      id: 'pirates', verb: 'fight', noun: 'the harbor pirates', expCost: n.pirates.expCost, itemCosts: [], isOneTime: true, hurts: n.pirates.hurts,
      beat: 'The harbor pirates scatter. The town cheers us off the dock, bound for the ruin.',
    },
    eels: { id: 'eels', verb: 'fish', noun: 'the eel runs', expCost: n.eels.expCost, producedItem: 'sky-eel', producedAmount: 1, itemCosts: [], isOneTime: false },
    ruin: { id: 'ruin', verb: 'salvage', noun: 'the ruin', expCost: n.ruin.expCost, producedItem: 'brass', producedAmount: 1, itemCosts: [], isOneTime: false },
    wardens: {
      id: 'wardens', verb: 'fight', noun: 'the wardens', expCost: n.wardens.expCost, producedItem: 'inner-door', producedAmount: 1, itemCosts: [], isOneTime: true,
      hurts: n.wardens.hurts, beat: 'The last warden stills. The inner door stands open.',
    },
    halls: {
      id: 'halls', verb: 'search', noun: 'the halls', expCost: n.halls.expCost, producedItem: 'star-chart', producedAmount: 1, itemCosts: [],
      needs: [{ item: 'inner-door', amount: 1 }], isOneTime: true, beat: 'Behind a fallen shelf: a star chart, and a route in old ink.',
    },
    fittings: {
      id: 'fittings', verb: 'rig', noun: 'brass fittings', expCost: n.fittings.expCost, itemCosts: [{ item: 'brass', amount: n.fittings.brass }], isOneTime: true,
      healthDecayMultiplier: n.fittings.decayMultiplier, beat: 'Brass fittings, polished bright. The ship rides easier.',
    },
    chest: {
      id: 'chest', verb: 'tinker', noun: 'a sea chest', expCost: n.chest.expCost, itemCosts: [{ item: 'brass', amount: n.chest.brass }], isOneTime: true,
      capacityBonus: n.chest.capacity, beat: 'A sea chest from the ruin. More room below.',
    },
    cutlass: {
      id: 'cutlass', verb: 'tinker', noun: 'a cutlass', expCost: n.cutlass.expCost, itemCosts: [{ item: 'brass', amount: n.cutlass.brass }], isOneTime: true,
      gear: { skill: 'fight', multiplier: n.cutlass.fightMultiplier }, beat: 'A cutlass that remembers its last owner. Fights go quicker.',
    },
    compass: {
      id: 'compass', verb: 'fight', noun: 'the guardian', expCost: n.compass.expCost, itemCosts: [], needs: [{ item: 'star-chart', amount: 1 }], isOneTime: true,
      hurts: n.compass.hurts,
      beat: 'The Sky Compass is ours. A maker’s mark nobody aboard can read, and a rumor: the one man who knows it deals cards on the Gilded Fortune.',
    },
    dealers: { id: 'dealers', verb: 'talk', noun: 'to the dealers', expCost: n.dealers.expCost, producedItem: 'chips', producedAmount: 1, itemCosts: [], isOneTime: false },
    kitchens: {
      id: 'kitchens', verb: 'talk', noun: 'to the kitchens', expCost: n.kitchens.expCost, producedItem: 'canape', producedAmount: 1,
      itemCosts: [{ item: 'chips', amount: n.kitchens.chips }], isOneTime: false,
    },
    door: {
      id: 'door', verb: 'talk', noun: 'past the door', expCost: n.door.expCost, producedItem: 'deck-pass', producedAmount: 1,
      itemCosts: [{ item: 'chips', amount: n.door.chips }], isOneTime: true, beat: 'The doorman smiles at the chips, then at us. We are in.',
    },
    dock: {
      id: 'dock', verb: 'rig', noun: 'the high dock', expCost: n.dock.expCost, itemCosts: [{ item: 'chips', amount: n.dock.chips }], isOneTime: true,
      healthDecayMultiplier: n.dock.decayMultiplier, beat: 'A berth at the high dock. The ship rests, and so do we.',
    },
    trunk: {
      id: 'trunk', verb: 'tinker', noun: 'a gilded trunk', expCost: n.trunk.expCost, itemCosts: [{ item: 'chips', amount: n.trunk.chips }], isOneTime: true,
      capacityBonus: n.trunk.capacity, beat: 'A gilded trunk, won at the tables. Room for the rest.',
    },
    enforcers: {
      id: 'enforcers', verb: 'fight', noun: 'the enforcers', expCost: n.enforcers.expCost, producedItem: 'lift-key', producedAmount: 1, itemCosts: [],
      needs: [{ item: 'deck-pass', amount: 1 }], isOneTime: true, hurts: n.enforcers.hurts,
      beat: 'Bruised and grinning, we take the lift key off the last of them.',
    },
    salons: {
      id: 'salons', verb: 'search', noun: 'the salons', expCost: n.salons.expCost, producedItem: 'varros-table', producedAmount: 1, itemCosts: [],
      needs: [{ item: 'lift-key', amount: 1 }], isOneTime: true, beat: 'Past velvet and smoke, in the last salon: Varro’s table.',
    },
    varro: {
      id: 'varro', verb: 'talk', noun: 'to Varro', expCost: n.varro.expCost, itemCosts: [], needs: [{ item: 'varros-table', amount: 1 }], isOneTime: true,
      beat: 'He takes one look at the Compass and goes white. “Where did you get this?” The lights go out.',
    },
  },
};
```

(The Write tool unescapes
`\u` sequences: write this file with a script, per memory
`reference_write-tool-unescapes-unicode`, or type the curly quotes directly;
they are punctuation, not emoji, and either is fine in data.)

`windward-run.test.ts` asserts: the roster ids and icons in order (7); three
chapters whose events are `pirates`, `compass`, `varro`; `finish === 'varro'`
and its beat ends `The lights go out.`; every chapter has a row with a
`healthDecayMultiplier` and a row with a `capacityBonus`, and the capacity
bonuses sum to 15, so the cap reaches `stackCap + 15 = 20`; chapter III has
no `fish`-verb row; `hull`'s cost reads `balance.content.windward.hull.scrap`
(one spot check per group is enough, the lock is `balance.test.ts`).
`books.test.ts`: `BOOKS` contains `windwardRun`, every book validates.

- [ ] **Step 8: The Salt Road becomes a test fixture.** `src/test-utils/salt-road.ts`
  exports `saltRoadFixture: Book`: today's Salt Road in the new format, with
  the numbers that were `balance.content.scrub` written as literals (forage
  4.2, mine 6, cabin 60 XP / 6 stone / decay 0.8, hall 5000 XP / 500 stone,
  berries heal 4). `cabin` and `hall` items become `kind: 'key'` (a cap of 1, as
  before); the chapter gains `event: 'hall'`; `finish: 'hall'`. Literal numbers
  are fine here: `src/test-utils/` is outside the tuning hook and the purity
  scan. `fixtures.test.ts` asserts `validateBook(saltRoadFixture)` is empty.
  Component tests keep their rows and change only where the cap does
  (berries `0/20` becomes `0/5`, a forage run stops at 5). They move to a
  richer fixture in Task 7, when their components are rebuilt.

- [ ] **Step 9: Migrate and re-measure.**
  - Every inline engine fixture gains `chapters` (one chapter ordering its
    rows, `event` its last one-time) and `finish`, drops `cap`, and turns
    `kind: 'structure'` into `kind: 'key'`. Expectations that read a per-item
    cap now read `balance.inventory.stackCap`. `queue.test.ts`'s coreLevel
    test is re-derived at the new cap.
  - **Re-measure the `monumentBook` characterizations** in `play.test.ts` and
    `measure.test.ts` under the shared cap (berries go 20 → 5): the
    3.66 h / 7.18 h / 5 h floor readings (the executor measured 5.13 h and
    7.18 h; the floor moves between them) and every comment that quotes them.
    The short-life control inverts at cap 5 (33 of 33 deaths under 10 min:
    shortest 8.43, the trap's longest 7.88), so that case passes
    `minLifeMinutes: 8` to both measures, and Task 3 returns it to the default.
  - **The later-life freeze test** was built on a stone cap of 200, which the
    format can no longer say per item. Rebuild it with a cheap one-time row
    carrying `capacityBonus: 195` (the new way to hold 200), re-measured so a
    later life still freezes; if no setting reproduces a later-life freeze,
    delete the test and say so in this plan under Task 2.
  - `App.test.tsx` drives the real App, now The Windward Run: its rows become
    Fish and Salvage, and every number it asserts is derived from
    `balance.content.windward` (ticks per fish from `fish.expCost`, the food
    line from `cloudFish.healPerUnit` and the cooldown), so Task 5's tuning
    cannot turn it red.
  - The old queue engine keeps working in this task: it plays chapter I's rows.
- [ ] **Step 10: Verify.** `npm run typecheck && npm run lint && npm test && npm run test:hooks`: all green.
- [ ] **Step 11: Commit** `feat: the book format grows; one stack cap; The Windward Run replaces The Salt Road`

---

### Task 3: The queue of orders and its automation

**Files:**
- Rewrite: `src/engine/types.ts`, `src/engine/queue.ts`, `src/engine/queue.test.ts`, `src/engine/tick.test.ts`
- Create: `src/engine/rows.ts`, `src/engine/automation.ts`, `src/engine/resolve.ts`,
  `src/engine/fixture.ts` (engine test data), `src/engine/rows.test.ts`,
  `src/engine/automation.test.ts`, `src/engine/resolve.test.ts`
- Modify: `src/engine/tick.ts`, `src/engine/health.ts` (+ test), `src/engine/rebirth.ts`
  (+ test), `src/engine/play.ts` (+ `play.test.ts`, `measure.test.ts`; it imports
  `isPriority` from `./automation`), `src/data/validate.ts` (+ test: Step 12),
  `src/balance.ts` and `src/balance.test.ts` (`policy`),
  `src/state/useGame.ts` (+ test), `src/ui/App.tsx`, `src/ui/Queue.tsx` (+ test),
  `src/ui/ActionRow.tsx` (+ test), `src/ui/ChapterPanel.tsx` (+ test),
  `src/ui/narrate.ts` (+ test), `src/test-utils/realClick.ts` (+ test)

**Interfaces:**
- Consumes: Task 2's `capOf`, `gearMultiplier`, `room(inv, id, cap)`, `add(inv, id, n, cap)`, `Content.chapters`, `Chapter.event`.
- Produces (later tasks rely on these exact names):
  - `types.ts`: `AutoMode`, `QueueEntry { id, actionId, mode: 'repeat' | 'once', by: 'player' | 'auto' }`,
    `Work { progress, costsConsumed }`, `SkillStats { ticks, bestRun }`, `SupplyGap`,
    the `GameEvent` union below, and `GameState` with `finished`, `skillStats`,
    `acquired`, `nextEntryId`, `work`, `chapter`, `automation`, `finishes`
  - `rows.ts`: `NO_WORK`, `chapterOf`, `here`, `workOf`, `isDone`, `stillOwed`,
    `Shortfall`, `shortfall(state, action)`, `isFull(state, content, action)`,
    `lookAheadTarget(state, content, index)`
  - `automation.ts`: `PRIORITIES`, `rankOf`, `isPriority`, `unlockAt`, `isUnlocked`,
    `modeOf(state, action)`, `canJit`, `cycleOf`, `nextMode`, `setAutomation`, `makersOf`
  - `queue.ts`: `NO_STATS`, `blankRun`, `newState`, `StartBlock` (with `enough`), `Supply`,
    `supplyVia`, `startBlock`, `frontBlock`, `EnqueueOptions` (with `left`), `enqueue`,
    `removeEntry`, `work`
  - `resolve.ts`: `Resolved` (with `passes`), `resolve`, `topReady`
  - `types.ts` also: `SupplyCause { item, maker, gap }`, `QueueEntry.left`, `GameState.provisioned`
  - `play.ts`: `attentive`, `handsOn` and `prioritized` policies (replacing `everyRowInOrder`),
    `PlayRun.chaptersPerLife`, `PLAY_VERSION = 2`; `balance.policy.checkEverySeconds`
  - `useGame.ts`: `GameAction` adds `{ type: 'queue'; actionId; front?; once? }`,
    `{ type: 'remove'; entryId: number }`, `{ type: 'automate'; actionId; mode: AutoMode }`
  - UI: `ActionRow`/`ChapterPanel` props `onNow(id, once)`, `onQueue(id, once)`;
    `realClick(el, init?: MouseEventInit)`

- [ ] **Step 1: The state.** `src/engine/types.ts`:

```ts
/**
 * Engine state. Nothing here decides anything; every rule lives in the module
 * that owns it. Content arrives as `Content` from the data layer.
 */
import type { ActionId, ItemId, SkillId } from '../data/types';

/** One mastery ledger. `exp` is progress toward the NEXT level. */
export interface Ledger { readonly level: number; readonly exp: number }

/** MECHANICS section 3: two ledgers advancing from the same effort. */
export interface SkillState { readonly core: Ledger; readonly run: Ledger }

/** Lifetime counters the pop-out shows that the ledgers cannot derive (spec 2026-09-23-the-windward-run section 8). */
export interface SkillStats { readonly ticks: number; readonly bestRun: number }

/** A row's automation (section 3.1): off, just in time, or a passive priority. */
export type AutoMode = 'off' | 'jit' | 'top' | 'high' | 'mid' | 'low' | 'last';

/** An order in the queue (section 2.1). Its own id, so a row can be queued more than once. */
export interface QueueEntry {
  readonly id: number;
  readonly actionId: ActionId;
  readonly mode: 'repeat' | 'once';
  readonly by: 'player' | 'auto';
  /**
   * Automation's food and provision fills only: completions left before the
   * entry leaves (MECHANICS section 6's targetCount), so a fill that eating
   * outpaces still ends and lets the row behind it run.
   */
  readonly left?: number;
}

/** A row's work in progress this life (section 2.2). It lives on the row, so a popped entry loses nothing. */
export interface Work { readonly progress: number; readonly costsConsumed: number }

export type PauseReason = 'none' | 'player' | 'system';

/**
 * Why a short row got no supply (section 2.4): nothing here makes the item;
 * its maker is off or not yet earned; or its maker is automated but could not
 * run either.
 */
export type SupplyGap = 'none' | 'off' | 'unearned' | 'blocked';

/** Where a blocked chain stops: the item the deepest maker lacks, that maker (or null when nothing makes it) and why (the words name all three). */
export interface SupplyCause { readonly item: ItemId; readonly maker: ActionId | null; readonly gap: SupplyGap }

/** What happened this tick, for the UI to narrate. The engine writes no prose. */
export type GameEvent =
  /** The top entry left without working: its row is not here, is done, is full, or has fetched what is needed. */
  | { readonly type: 'popped'; readonly actionId: ActionId; readonly reason: 'elsewhere' | 'done' | 'full' | 'enough' }
  /** The top entry left because it lacks an item and nothing supplies it; `cause` is the deepest reason when its maker is blocked. */
  | { readonly type: 'short'; readonly actionId: ActionId; readonly item: ItemId; readonly amount: number; readonly maker: ActionId | null; readonly gap: SupplyGap; readonly cause?: SupplyCause }
  /** Automation queued a row: to supply the top, food at zero, provisions before casting off, or an empty queue. */
  | { readonly type: 'automated'; readonly actionId: ActionId; readonly why: 'supply' | 'food' | 'provision' | 'idle' }
  | { readonly type: 'completed'; readonly actionId: ActionId; readonly oneTime: boolean }
  | { readonly type: 'coreLevel'; readonly skill: SkillId; readonly level: number }
  /** A row earned its automation chip (section 3.4). */
  | { readonly type: 'unlocked'; readonly actionId: ActionId }
  /** The chapter's big event completed; `chapter` is the index now entered (section 4). */
  | { readonly type: 'castOff'; readonly chapter: number }
  | { readonly type: 'died'; readonly runTicks: number }
  /** The book's finish completed; the life is over (section 9). */
  | { readonly type: 'finished'; readonly runTicks: number };

export interface GameState {
  readonly runTicks: number;
  readonly health: number;
  readonly maxHealth: number;
  readonly paused: PauseReason;
  /** The life is over and its card is up: a death, or the book's finish (then `finished` too). */
  readonly dead: boolean;
  readonly finished: boolean;
  readonly skills: Readonly<Record<SkillId, SkillState>>;
  readonly skillStats: Readonly<Record<SkillId, SkillStats>>;
  readonly inventory: Readonly<Record<ItemId, number>>;
  /** Items in the order this life first acquired them: the pack's order (section 7). */
  readonly acquired: readonly ItemId[];
  /** Ticks until each food may be eaten again. Absent means ready. */
  readonly foodCooldowns: Readonly<Record<ItemId, number>>;
  readonly queue: readonly QueueEntry[];
  /** The next entry's id. Counts up within a life; a new life starts at 0 with an empty queue. */
  readonly nextEntryId: number;
  /** Each row's kept progress this life (section 2.2). */
  readonly work: Readonly<Record<ActionId, Work>>;
  /** Food rows already provisioned for this port's departure (section 3.2): once each, cleared at casting off and death. */
  readonly provisioned: readonly ActionId[];
  /** Index into content.chapters: the port this life is in (section 4). */
  readonly chapter: number;
  readonly completedOneTime: readonly ActionId[];
  /** Lifetime completions by action id. Drives automation (section 3.4). */
  readonly completionCounts: Readonly<Record<string, number>>;
  /** Each row's mode, once set. Kept across lives (MECHANICS section 5). */
  readonly automation: Readonly<Record<ActionId, AutoMode>>;
  readonly decayMultiplier: number;
  /** Which life this is, from 1. Persists and counts up at rebirth. */
  readonly life: number;
  /** Times the book has been finished. */
  readonly finishes: number;
  /** Sum of every life's max-health gain. maxHealth is always base + this. */
  readonly rebirthBonus: number;
  /** Core levels as this life began, so the card can show what moved. */
  readonly lifeStartCore: Readonly<Record<SkillId, number>>;
  /** This tick's events. Replaced every tick; never accumulates. */
  readonly events: readonly GameEvent[];
}
```

- [ ] **Step 2: Row questions.** `src/engine/rows.ts`:

```ts
/**
 * Questions about a row in the state it is in, shared by the queue, its
 * automation and the screen (spec 2026-09-23-the-windward-run sections 2-4).
 * Nothing here changes anything. Pure.
 */
import type { ActionDefinition, ActionId, Chapter, Content, ItemId } from '../data/types';
import { consumedOf, nextCostItem, nextUnitDue } from './costs';
import { capOf } from './effects';
import { count, has, room } from './inventory';
import type { GameState, Work } from './types';

export const NO_WORK: Work = { progress: 0, costsConsumed: 0 };

export function chapterOf(state: GameState, content: Content): Chapter {
  const chapter = content.chapters[state.chapter];
  if (chapter === undefined) throw new Error(`no chapter ${state.chapter}`);
  return chapter;
}

/** Whether the port this life is in has the row (section 4: only its rows are on screen). */
export function here(state: GameState, content: Content, id: ActionId): boolean {
  return chapterOf(state, content).order.includes(id);
}

/** The row's kept progress this life (section 2.2). */
export function workOf(state: GameState, id: ActionId): Work {
  return state.work[id] ?? NO_WORK;
}

export function isDone(state: GameState, action: ActionDefinition): boolean {
  return action.isOneTime && state.completedOneTime.includes(action.id);
}

/** Units of `item` the row has yet to spend, given what its kept progress spent. 0 if it does not cost the item. */
export function stillOwed(action: ActionDefinition, work: Work, item: ItemId): number {
  const cost = action.itemCosts.find((c) => c.item === item);
  return cost === undefined ? 0 : cost.amount - consumedOf(action, work.costsConsumed, item);
}

export interface Shortfall { readonly item: ItemId; readonly amount: number }

/**
 * What stops the row working its next tick: an unmet need first (section
 * 6.2), then the unit it owes when the pack has none. `amount` is what the
 * pack still lacks of the item for the whole row. null: it can work.
 */
export function shortfall(state: GameState, action: ActionDefinition): Shortfall | null {
  for (const need of action.needs ?? []) {
    const have = count(state.inventory, need.item);
    if (have < need.amount) return { item: need.item, amount: need.amount - have };
  }
  const w = workOf(state, action.id);
  if (!nextUnitDue(action, w.progress, w.costsConsumed)) return null;
  const item = nextCostItem(action, w.costsConsumed)!;
  return has(state.inventory, item, 1) ? null : { item, amount: stillOwed(action, w, item) };
}

/** A producer whose stack has no room for one more completion. */
export function isFull(state: GameState, content: Content, action: ActionDefinition): boolean {
  const item = action.producedItem;
  if (item === undefined) return false;
  return room(state.inventory, item, capOf(state, content, item)) < (action.producedAmount ?? 1);
}

/**
 * Section 2.3: the count of its item a repeating producer at `index` stops
 * at. It sums what the entries below still need of the item, down to the next
 * entry that makes it, and stops there or at the cap; with nothing below
 * needing it, the cap.
 */
export function lookAheadTarget(state: GameState, content: Content, index: number): number {
  const entry = state.queue[index];
  const item = entry === undefined ? undefined : content.actions[entry.actionId]?.producedItem;
  if (item === undefined) return 0;
  let need = 0;
  for (const e of state.queue.slice(index + 1)) {
    const b = content.actions[e.actionId];
    if (b === undefined || isDone(state, b)) continue;
    if (b.producedItem === item) break;
    need += stillOwed(b, workOf(state, b.id), item);
    for (const n of b.needs ?? []) if (n.item === item) need += n.amount;
  }
  const cap = capOf(state, content, item);
  return need > 0 ? Math.min(cap, need) : cap;
}
```

- [ ] **Step 3: Automation's questions.** `src/engine/automation.ts`:

```ts
/**
 * Automation, earned per row (spec 2026-09-23-the-windward-run section 3):
 * its modes, its unlock, and which row supplies an item. The queue acts on
 * these (resolve.ts); this file only answers. Pure.
 */
import { balance } from '../balance';
import type { ActionDefinition, ActionId, Content, ItemId } from '../data/types';
import { chapterOf, isDone } from './rows';
import type { AutoMode, GameState } from './types';

/** The priorities, highest first (section 3.1: the user's words for 1 to 5). */
export const PRIORITIES = ['top', 'high', 'mid', 'low', 'last'] as const;

export function isPriority(mode: AutoMode): boolean {
  return (PRIORITIES as readonly AutoMode[]).includes(mode);
}

/** Lower goes first: JIT before every priority (section 3.3); off never. */
export function rankOf(mode: AutoMode): number {
  if (mode === 'jit') return -1;
  const i = (PRIORITIES as readonly AutoMode[]).indexOf(mode);
  return i === -1 ? Number.POSITIVE_INFINITY : i;
}

/** Lifetime completions that earn a row its chip (MECHANICS section 6). */
export function unlockAt(action: ActionDefinition): number {
  return action.isOneTime ? balance.automation.unlockOneTime : balance.automation.unlockRepeatable;
}

export function isUnlocked(state: GameState, action: ActionDefinition): boolean {
  return (state.completionCounts[action.id] ?? 0) >= unlockAt(action);
}

/** A row's mode as it acts: off until earned, whatever a save holds. */
export function modeOf(state: GameState, action: ActionDefinition): AutoMode {
  return isUnlocked(state, action) ? state.automation[action.id] ?? 'off' : 'off';
}

/** JIT means something only for a row that makes a food, or an item some row costs or needs (section 3.1). */
export function canJit(content: Content, action: ActionDefinition): boolean {
  const item = action.producedItem;
  if (item === undefined) return false;
  if (content.items[item]?.kind === 'food') return true;
  return Object.values(content.actions).some((b) =>
    b.itemCosts.some((c) => c.item === item) || (b.needs ?? []).some((n) => n.item === item));
}

/** The chip's cycle (section 3.1). */
export function cycleOf(content: Content, action: ActionDefinition): readonly AutoMode[] {
  return canJit(content, action) ? ['off', 'jit', ...PRIORITIES] : ['off', ...PRIORITIES];
}

export function nextMode(content: Content, action: ActionDefinition, mode: AutoMode): AutoMode {
  const cycle = cycleOf(content, action);
  return cycle[(cycle.indexOf(mode) + 1) % cycle.length]!;
}

/** Sets a row's mode. The same state back for an unknown row, a dead run, a row not yet earned, or a mode outside its cycle. */
export function setAutomation(state: GameState, content: Content, id: ActionId, mode: AutoMode): GameState {
  const action = content.actions[id];
  if (action === undefined || state.dead || !isUnlocked(state, action) || !cycleOf(content, action).includes(mode)) return state;
  if ((state.automation[id] ?? 'off') === mode) return state;
  return { ...state, automation: { ...state.automation, [id]: mode } };
}

/** The rows here that make `item` and are not done this life (section 2.4). Who of them can supply it is queue.ts's supplyVia. */
export function makersOf(state: GameState, content: Content, item: ItemId): readonly ActionDefinition[] {
  return chapterOf(state, content).order
    .map((id) => content.actions[id]!)
    .filter((a) => a.producedItem === item && !isDone(state, a));
}
```

- [ ] **Step 4: The queue.** `src/engine/queue.ts`:

```ts
/**
 * The queue as a list of orders (spec 2026-09-23-the-windward-run section 2,
 * #47): entries with their own identity, repeating or single; only the top
 * runs; a row's progress lives on the row. This file adds, removes and works
 * entries; what happens before any time passes is resolve.ts. The engine
 * reports what happened as typed events and writes no prose.
 */
import { balance } from '../balance';
import type { ActionDefinition, ActionId, Content, ItemId, SkillDefinition, SkillId } from '../data/types';
import { isUnlocked, makersOf, modeOf, rankOf, unlockAt } from './automation';
import { nextCostItem, nextUnitDue, unitThreshold } from './costs';
import { capOf, gearMultiplier } from './effects';
import { add, count, has, take, type Inventory } from './inventory';
import { here, isDone, isFull, lookAheadTarget, NO_WORK, shortfall, workOf } from './rows';
import { award, newSkill, tickExp } from './skills';
import type { AutoMode, GameEvent, GameState, QueueEntry, SkillState, SkillStats, SupplyCause, SupplyGap, Work } from './types';

export const NO_STATS: SkillStats = { ticks: 0, bestRun: 0 };

/** A fresh life around the given ledgers. newState builds them from a roster; rebirth carries them over. */
export function blankRun(skills: Readonly<Record<SkillId, SkillState>>, lifeStartCore: Readonly<Record<SkillId, number>>): GameState {
  return {
    runTicks: 0,
    health: balance.health.base,
    maxHealth: balance.health.base,
    paused: 'system',
    dead: false,
    finished: false,
    skills,
    skillStats: Object.fromEntries(Object.keys(skills).map((id) => [id, NO_STATS])),
    inventory: {},
    acquired: [],
    foodCooldowns: {},
    queue: [],
    nextEntryId: 0,
    work: {},
    provisioned: [],
    chapter: 0,
    completedOneTime: [],
    completionCounts: {},
    automation: {},
    decayMultiplier: 1,
    life: 1,
    finishes: 0,
    rebirthBonus: 0,
    lifeStartCore,
    events: [],
  };
}

/** The first life of a book: one fresh skill per roster entry (spec 2026-09-23 section 2). */
export function newState(roster: readonly SkillDefinition[]): GameState {
  return blankRun(
    Object.fromEntries(roster.map((s) => [s.id, newSkill()])),
    Object.fromEntries(roster.map((s) => [s.id, 0])),
  );
}

/** Why a row cannot start now (section 2.5). `enough` is ▶'s alone: a producer whose look-ahead from the top is already met. */
export type StartBlock =
  | { readonly kind: 'elsewhere' }
  | { readonly kind: 'done' }
  | { readonly kind: 'full'; readonly item: ItemId }
  | { readonly kind: 'enough'; readonly item: ItemId }
  | { readonly kind: 'short'; readonly item: ItemId; readonly amount: number; readonly maker: ActionId | null; readonly gap: SupplyGap; readonly cause?: SupplyCause };

export type Supply =
  | { readonly kind: 'ok'; readonly maker: ActionId; readonly mode: AutoMode }
  | { readonly kind: 'gap'; readonly maker: ActionId | null; readonly gap: SupplyGap; readonly cause?: SupplyCause };

/**
 * Who supplies `item` here (section 2.4): the best-ranked automated maker
 * whose own chain closes, walking the makers in rank order (JIT first). `seen`
 * holds the rows already on the chain, so a cycle reads as blocked. When none
 * can, why not: nothing here makes it, its maker is off or not yet earned, or
 * an automated maker is blocked, which names that maker and, as `cause`, the
 * deepest reason down its chain: what the player can change.
 */
export function supplyVia(state: GameState, content: Content, item: ItemId, seen: ReadonlySet<ActionId>): Supply {
  const makers = makersOf(state, content, item);
  const on = makers.filter((a) => modeOf(state, a) !== 'off').sort((a, b) => rankOf(modeOf(state, a)) - rankOf(modeOf(state, b)));
  let blocked: Supply | null = null;
  for (const m of on) {
    if (seen.has(m.id)) { blocked ??= { kind: 'gap', maker: m.id, gap: 'blocked' }; continue; }
    const block = blockOf(state, content, m.id, new Set([...seen, m.id]));
    if (block === null) return { kind: 'ok', maker: m.id, mode: modeOf(state, m) };
    if (blocked === null) {
      // A deeper cause travels up as it is; a blocked block with no cause (a cycle) stays cause-less rather than naming itself.
      const cause = block.kind === 'short' ? block.cause ?? (block.gap === 'blocked' ? undefined : { item: block.item, maker: block.maker, gap: block.gap }) : undefined;
      blocked = cause === undefined ? { kind: 'gap', maker: m.id, gap: 'blocked' } : { kind: 'gap', maker: m.id, gap: 'blocked', cause };
    }
  }
  if (blocked !== null) return blocked;
  const first = makers[0];
  if (first === undefined) return { kind: 'gap', maker: null, gap: 'none' };
  return { kind: 'gap', maker: first.id, gap: isUnlocked(state, first) ? 'off' : 'unearned' };
}

function blockOf(state: GameState, content: Content, id: ActionId, seen: ReadonlySet<ActionId>): StartBlock | null {
  const action = content.actions[id];
  if (action === undefined || !here(state, content, id)) return { kind: 'elsewhere' };
  if (isDone(state, action)) return { kind: 'done' };
  if (isFull(state, content, action)) return { kind: 'full', item: action.producedItem! };
  const short = shortfall(state, action);
  if (short === null) return null;
  const supply = supplyVia(state, content, short.item, seen);
  if (supply.kind === 'ok') return null;
  const base = { kind: 'short' as const, item: short.item, amount: short.amount, maker: supply.maker, gap: supply.gap };
  return supply.cause === undefined ? base : { ...base, cause: supply.cause };
}

/** Why the row cannot start now, counting automation that would supply it along the whole chain. null: it can start. */
export function startBlock(state: GameState, content: Content, id: ActionId): StartBlock | null {
  return blockOf(state, content, id, new Set([id]));
}

/**
 * ▶'s refusal (section 2.5): startBlock, and for a repeating producer, a
 * look-ahead from the top that the pack already meets: it would pop at once
 * and do nothing, so ▶ says so instead of accepting it silently.
 */
export function frontBlock(state: GameState, content: Content, id: ActionId, once = false): StartBlock | null {
  const block = startBlock(state, content, id);
  const action = content.actions[id];
  if (block !== null || once || action === undefined || action.isOneTime || action.producedItem === undefined) return block;
  const probe: GameState = { ...state, queue: [{ id: -1, actionId: id, mode: 'repeat', by: 'player' }, ...state.queue] };
  return count(state.inventory, action.producedItem) >= lookAheadTarget(probe, content, 0) ? { kind: 'enough', item: action.producedItem } : null;
}

export interface EnqueueOptions {
  /** ▶: the top. Otherwise, +: the bottom. */
  readonly front?: boolean;
  /** Shift+click: exactly one completion (section 2.1). A one-time row is always single. */
  readonly once?: boolean;
  readonly by?: 'player' | 'auto';
  /** Automation's food and provision fills: completions before the entry leaves. */
  readonly left?: number;
}

/**
 * Adds an order (sections 2.1, 2.5). The same state back on a dead run, for a
 * row this port does not have, or a one-time already done. A player's ▶ is
 * refused too while startBlock says the row cannot start; + appends even then.
 * Automation always queues what it decides.
 */
export function enqueue(state: GameState, content: Content, id: ActionId, opts: EnqueueOptions = {}): GameState {
  const action = content.actions[id];
  if (action === undefined || state.dead || !here(state, content, id) || isDone(state, action)) return state;
  const by = opts.by ?? 'player';
  if (opts.front === true && by === 'player' && frontBlock(state, content, id, opts.once === true) !== null) return state;
  const mode = action.isOneTime || opts.once === true ? 'once' : 'repeat';
  const base: QueueEntry = { id: state.nextEntryId, actionId: id, mode, by };
  const entry: QueueEntry = by === 'auto' && mode === 'repeat' && opts.left !== undefined ? { ...base, left: opts.left } : base;
  return {
    ...state,
    nextEntryId: state.nextEntryId + 1,
    queue: opts.front === true ? [entry, ...state.queue] : [...state.queue, entry],
  };
}

/** Removes one order. Its row keeps its progress (section 2.2), so nothing is lost. */
export function removeEntry(state: GameState, entryId: number): GameState {
  if (state.dead || !state.queue.some((e) => e.id === entryId)) return state;
  return { ...state, queue: state.queue.filter((e) => e.id !== entryId) };
}

/**
 * Pay every unit whose threshold the work's progress has reached. On a unit it
 * cannot pay, progress is clamped to that unit's threshold and `short` names
 * the item: work never runs ahead of its materials. MECHANICS section 2.
 */
function payDue(inventory: Inventory, action: ActionDefinition, w: Work): { inventory: Inventory; work: Work; short?: ItemId } {
  let inv = inventory;
  let consumed = w.costsConsumed;
  while (nextUnitDue(action, w.progress, consumed)) {
    const item = nextCostItem(action, consumed)!;
    if (!has(inv, item, 1)) {
      return { inventory: inv, work: { progress: Math.min(w.progress, unitThreshold(action, consumed)), costsConsumed: consumed }, short: item };
    }
    inv = take(inv, item, 1);
    consumed += 1;
  }
  return { inventory: inv, work: { progress: w.progress, costsConsumed: consumed } };
}

/** MECHANICS section 2's completion, on the top entry. Task 4 adds casting off at the end. */
function complete(state: GameState, content: Content, action: ActionDefinition, events: GameEvent[]): GameState {
  let s = state;
  const item = action.producedItem;
  if (item !== undefined) {
    s = {
      ...s,
      inventory: add(s.inventory, item, action.producedAmount ?? 1, capOf(s, content, item)).inventory,
      acquired: s.acquired.includes(item) ? s.acquired : [...s.acquired, item],
    };
  }
  if (action.healthDecayMultiplier !== undefined) s = { ...s, decayMultiplier: s.decayMultiplier * action.healthDecayMultiplier };
  const done = (s.completionCounts[action.id] ?? 0) + 1;
  s = { ...s, completionCounts: { ...s.completionCounts, [action.id]: done }, work: { ...s.work, [action.id]: NO_WORK } };
  events.push({ type: 'completed', actionId: action.id, oneTime: action.isOneTime });
  if (done === unlockAt(action)) events.push({ type: 'unlocked', actionId: action.id });
  if (action.isOneTime) s = { ...s, completedOneTime: [...s.completedOneTime, action.id] };
  const top = s.queue[0];
  if (action.isOneTime || top?.mode === 'once' || (top?.left !== undefined && top.left <= 1)) s = { ...s, queue: s.queue.slice(1) };
  else if (top?.left !== undefined) s = { ...s, queue: [{ ...top, left: top.left - 1 }, ...s.queue.slice(1)] };
  return s;
}

/**
 * One tick of work on the top entry. The caller (step) has resolved the queue,
 * so the top can work, and has advanced the clock.
 */
export function work(state: GameState, content: Content): { readonly state: GameState; readonly events: readonly GameEvent[] } {
  const events: GameEvent[] = [];
  const top = state.queue[0];
  const action = top === undefined ? undefined : content.actions[top.actionId];
  if (action === undefined) return { state, events };
  const skill = state.skills[action.verb];
  // A validated book has a roster entry for every verb (src/data/validate.ts); a fixture that lacks one is a bug, not a state.
  if (skill === undefined) throw new Error(`no skill state for verb "${action.verb}"`);
  const before = payDue(state.inventory, action, workOf(state, action.id));
  let next: GameState = { ...state, inventory: before.inventory, work: { ...state.work, [action.id]: before.work } };
  if (before.short !== undefined) return { state: next, events };
  const gain = tickExp(skill, gearMultiplier(state, content, action.verb));
  const after = payDue(before.inventory, action, { ...before.work, progress: before.work.progress + gain });
  // XP is the progress actually made (spec 2026-09-22 section 9): a clamped tick earns only what it applied.
  const awarded = award(skill, after.work.progress - before.work.progress);
  const stats = state.skillStats[action.verb] ?? NO_STATS;
  next = {
    ...next,
    inventory: after.inventory,
    work: { ...next.work, [action.id]: after.work },
    skills: { ...next.skills, [action.verb]: awarded.skill },
    skillStats: { ...next.skillStats, [action.verb]: { ticks: stats.ticks + 1, bestRun: Math.max(stats.bestRun, awarded.skill.run.level) } },
  };
  for (let l = 0; l < awarded.coreLevelsGained; l++) {
    events.push({ type: 'coreLevel', skill: action.verb, level: awarded.skill.core.level - awarded.coreLevelsGained + l + 1 });
  }
  if (after.short === undefined && after.work.progress >= action.expCost) next = complete(next, content, action, events);
  return { state: next, events };
}
```

- [ ] **Step 5: The zero-time pass.** `src/engine/resolve.ts`:

```ts
/**
 * Everything that happens before any time passes (spec 2026-09-23-the-windward-run
 * section 2.4, decision #41): automation queues what it decides (section 3),
 * and the top entry pops until one can work or the queue is empty. Only then
 * does a tick spend time. Pure.
 */
import type { ActionDefinition, ActionId, Content } from '../data/types';
import { isPriority, modeOf, rankOf } from './automation';
import { capOf } from './effects';
import { count } from './inventory';
import { enqueue, startBlock, supplyVia } from './queue';
import { chapterOf, here, isDone, isFull, lookAheadTarget, shortfall, workOf } from './rows';
import type { GameEvent, GameState } from './types';

/**
 * Zero-time passes in one resolve. Each pass pops or queues exactly one entry,
 * so a real queue settles in a handful; this only keeps a content cycle from
 * spinning. A loop bound, not tuning.
 */
const RESOLVE_PASSES = 64;

export interface Resolved {
  readonly state: GameState;
  readonly events: readonly GameEvent[];
  /** The top entry can work this tick. */
  readonly ready: boolean;
  /** Zero-time passes this resolve used, of RESOLVE_PASSES (the whole-book gate reads it). */
  readonly passes: number;
}

function rowsHere(state: GameState, content: Content): readonly ActionDefinition[] {
  return chapterOf(state, content).order.map((id) => content.actions[id]!);
}

function makesFood(content: Content, action: ActionDefinition): boolean {
  return action.producedItem !== undefined && content.items[action.producedItem]?.kind === 'food';
}

/** Automation already has an order in for this row. */
function autoQueued(state: GameState, id: ActionId): boolean {
  return state.queue.some((e) => e.actionId === id && e.by === 'auto');
}

/** A JIT food row whose food is out (section 3.2): it goes in at the top at once. */
function foodDue(state: GameState, content: Content, tried: ReadonlySet<ActionId>): ActionId | null {
  for (const a of rowsHere(state, content)) {
    if (!makesFood(content, a) || tried.has(a.id) || modeOf(state, a) !== 'jit') continue;
    if (count(state.inventory, a.producedItem!) > 0) continue;
    if (state.queue[0]?.actionId === a.id || autoQueued(state, a.id)) continue;
    if (startBlock(state, content, a.id) !== null) continue;
    return a.id;
  }
  return null;
}

/** A JIT food row below its cap, not yet provisioned for this departure, while the port's big event waits unstarted on top (section 3.2). */
function provisionDue(state: GameState, content: Content, tried: ReadonlySet<ActionId>): ActionId | null {
  for (const a of rowsHere(state, content)) {
    if (!makesFood(content, a) || tried.has(a.id) || modeOf(state, a) !== 'jit' || state.provisioned.includes(a.id)) continue;
    if (count(state.inventory, a.producedItem!) >= capOf(state, content, a.producedItem!)) continue;
    if (autoQueued(state, a.id) || startBlock(state, content, a.id) !== null) continue;
    return a.id;
  }
  return null;
}

/** The best priority row that can start now, for an empty queue (section 3.3). Ties go to the earlier row. */
function bestIdle(state: GameState, content: Content, tried: ReadonlySet<ActionId>): ActionId | null {
  let best: { readonly id: ActionId; readonly rank: number } | null = null;
  for (const a of rowsHere(state, content)) {
    const mode = modeOf(state, a);
    if (!isPriority(mode) || tried.has(a.id)) continue;
    const rank = rankOf(mode);
    if (best !== null && rank >= best.rank) continue;
    if (startBlock(state, content, a.id) !== null) continue;
    best = { id: a.id, rank };
  }
  return best === null ? null : best.id;
}

/** Completions a food fill needs to reach the cap from here: the `left` of automation's food and provision entries. */
function fillLeft(state: GameState, content: Content, id: ActionId): number {
  const a = content.actions[id]!;
  const item = a.producedItem!;
  return Math.max(1, Math.ceil((capOf(state, content, item) - count(state.inventory, item)) / (a.producedAmount ?? 1)));
}

/**
 * A row that goes before a priority maker supplies the top (section 3.3): a
 * repeatable producer ranked better than `betterThan`, not already queued, and
 * able to work at once with no supply of its own. The user's example: Forage
 * on a higher priority fills the berries first. A one-time is never taken
 * this way, so a supply step cannot start the port's big fight.
 */
function readyHigher(state: GameState, content: Content, tried: ReadonlySet<ActionId>, betterThan: number, except: ActionId): ActionId | null {
  let best: { readonly id: ActionId; readonly rank: number } | null = null;
  for (const a of rowsHere(state, content)) {
    const mode = modeOf(state, a);
    if (!isPriority(mode) || tried.has(a.id) || a.id === except || a.isOneTime || a.producedItem === undefined) continue;
    const rank = rankOf(mode);
    if (rank >= betterThan || (best !== null && rank >= best.rank)) continue;
    if (state.queue.some((e) => e.actionId === a.id)) continue;
    if (isDone(state, a) || isFull(state, content, a) || shortfall(state, a) !== null) continue;
    best = { id: a.id, rank };
  }
  return best === null ? null : best.id;
}

export function resolve(state: GameState, content: Content): Resolved {
  let s = state;
  const events: GameEvent[] = [];
  const tried = new Set<ActionId>();
  const byAutomation = (id: ActionId, why: 'supply' | 'food' | 'provision' | 'idle', left?: number) => {
    s = enqueue(s, content, id, { front: why !== 'idle', by: 'auto', ...(left === undefined ? {} : { left }) });
    tried.add(id);
    events.push({ type: 'automated', actionId: id, why });
  };
  const pop = () => { s = { ...s, queue: s.queue.slice(1) }; };
  let pass = 0;
  for (; pass < RESOLVE_PASSES; pass++) {
    const food = foodDue(s, content, tried);
    if (food !== null) { byAutomation(food, 'food', fillLeft(s, content, food)); continue; }
    const top = s.queue[0];
    if (top === undefined) {
      const idle = bestIdle(s, content, tried);
      if (idle === null) break;
      byAutomation(idle, 'idle');
      continue;
    }
    const action = content.actions[top.actionId];
    if (action === undefined || !here(s, content, action.id)) {
      pop(); events.push({ type: 'popped', actionId: top.actionId, reason: 'elsewhere' }); continue;
    }
    if (isDone(s, action)) { pop(); events.push({ type: 'popped', actionId: action.id, reason: 'done' }); continue; }
    // The last port's event is the finish, not a departure: nothing to provision for.
    const departing = action.id === chapterOf(s, content).event && s.chapter < content.chapters.length - 1;
    if (departing && workOf(s, action.id).progress === 0) {
      const provision = provisionDue(s, content, tried);
      if (provision !== null) {
        byAutomation(provision, 'provision', fillLeft(s, content, provision));
        s = { ...s, provisioned: [...s.provisioned, provision] };
        continue;
      }
    }
    if (isFull(s, content, action)) { pop(); events.push({ type: 'popped', actionId: action.id, reason: 'full' }); continue; }
    if (action.producedItem !== undefined && top.mode === 'repeat' && count(s.inventory, action.producedItem) >= lookAheadTarget(s, content, 0)) {
      pop(); events.push({ type: 'popped', actionId: action.id, reason: 'enough' }); continue;
    }
    const short = shortfall(s, action);
    if (short === null) return { state: s, events, ready: true, passes: pass + 1 };
    const supply = supplyVia(s, content, short.item, new Set([action.id]));
    if (supply.kind === 'ok' && !tried.has(supply.maker)) {
      const first = supply.mode === 'jit' ? null : readyHigher(s, content, tried, rankOf(supply.mode), action.id);
      byAutomation(first ?? supply.maker, 'supply');
      continue;
    }
    pop();
    const shortEvent = { type: 'short' as const, actionId: action.id, item: short.item, amount: short.amount, maker: supply.maker, gap: supply.kind === 'ok' ? 'blocked' as const : supply.gap };
    events.push(supply.kind === 'gap' && supply.cause !== undefined ? { ...shortEvent, cause: supply.cause } : shortEvent);
  }
  return { state: s, events, ready: false, passes: pass };
}

/** The screen's "running": the top can work as the state stands, before anything resolve would do first. */
export function topReady(state: GameState, content: Content): boolean {
  const top = state.queue[0];
  const action = top === undefined ? undefined : content.actions[top.actionId];
  if (top === undefined || action === undefined) return false;
  if (!here(state, content, action.id) || isDone(state, action) || isFull(state, content, action)) return false;
  if (action.producedItem !== undefined && top.mode === 'repeat' && count(state.inventory, action.producedItem) >= lookAheadTarget(state, content, 0)) return false;
  return shortfall(state, action) === null;
}
```

- [ ] **Step 6: The tick.** `src/engine/tick.ts`:

```ts
/**
 * One tick. Time passes only while work happens (decision #41). Paused or
 * dead: nothing. Otherwise resolve, which takes no time; if the top cannot
 * work, stop there with the clock untouched. Otherwise advance the clock,
 * decay, eat, work the top.
 */
import type { Content } from '../data/types';
import { applyDecay, eat } from './health';
import { work } from './queue';
import { resolve } from './resolve';
import type { GameState, PauseReason } from './types';

/** Death is a system pause that nothing but rebirth lifts: a dead state ignores this. */
export function setPaused(state: GameState, paused: PauseReason): GameState {
  return state.dead ? state : { ...state, paused };
}

export function step(state: GameState, content: Content): GameState {
  if (state.paused !== 'none' || state.dead) return state;
  const r = resolve(state, content);
  if (!r.ready) return r.state === state ? state : { ...r.state, events: r.events };
  let next: GameState = { ...r.state, runTicks: r.state.runTicks + 1, events: [] };
  next = applyDecay(next);
  if (next.dead) return { ...next, events: [...r.events, ...next.events] };
  next = eat(next, content);
  const worked = work(next, content);
  return { ...worked.state, events: [...r.events, ...worked.events] };
}
```

`step` returns the same object when nothing happened, which `useGame` relies
on (CLAUDE.md gotcha): `resolve` returns the input state untouched when it
neither pops nor queues.

- [ ] **Step 7: Smallest heal first.** In `src/engine/health.ts`, `eat`
  walks `foodsByHeal(content)` instead of `Object.values(content.items)`:

```ts
/** Foods smallest heal first (#45): the order they are eaten in and shown in, which never changes. Ties keep declaration order. */
export function foodsByHeal(content: Content): readonly ItemDefinition[] {
  return Object.values(content.items)
    .filter((item) => item.healPerUnit !== undefined)
    .sort((a, b) => a.healPerUnit! - b.healPerUnit!);
}
```

Test: two foods declared `eel` (heal 10) before `fish` (heal 4), both on hand,
health at `max − 12`: one tick of `eat` bites the fish only (4, then 8 of
room is under the eel's 10). With declaration order it would bite the eel.

- [ ] **Step 8: Rebirth carries the new lists.** `rebirth` returns
  `{ ...blankRun(skills, lifeStartCore), paused: 'system', life: dead.life + 1, rebirthBonus, maxHealth, health: maxHealth,
  completionCounts: dead.completionCounts, automation: dead.automation, skillStats: dead.skillStats,
  finishes: dead.finishes + (dead.finished ? 1 : 0) }`. The classification
  test becomes:

```ts
  const RESETS = ['runTicks', 'paused', 'dead', 'finished', 'inventory', 'acquired', 'foodCooldowns', 'queue', 'nextEntryId', 'work', 'provisioned', 'chapter', 'completedOneTime', 'decayMultiplier', 'events'];
  const PERSISTS = ['completionCounts', 'automation', 'skillStats'];
  const DERIVED = ['health', 'maxHealth', 'skills', 'life', 'finishes', 'rebirthBonus', 'lifeStartCore'];
```

and `deadLife()` sets `automation: { forage: 'jit' }` (a key the fixture's
roster rows use), `skillStats: { forage: { ticks: 40, bestRun: 3 } }`, a
non-empty `work`, `acquired`, `provisioned`, `nextEntryId: 4`, `chapter: 1` with a
two-chapter fixture, and `finished: true`, so every persist field differs from
`newState` and every reset field is exercised (a `finished` that failed to
reset would show). A test: a finished dead state reborn has
`finishes === dead.finishes + 1`; an unfinished one keeps `finishes`.

- [ ] **Step 9: The engine tests.** Rewrite `queue.test.ts`, write
  `rows.test.ts`, `automation.test.ts`, `resolve.test.ts`. They share one
  fixture, `src/engine/fixture.ts`: engine test data only (engine tests may
  not import `src/test-utils/`; this file is inside the engine layer, holds no
  number the tuning hook flags, and nothing in the app imports it). A test
  in `resolve.test.ts` asserts `validateBook({ ...fixture, id: 'f', name: 'F', version: 1, length: { hours: 1 } })`
  is empty (an engine test may import `src/data/`).

```ts
/**
 * Engine test data: a two-port book small enough to reason about by hand.
 * Imported only by engine tests; nothing in the app reads it.
 */
import type { Content } from '../data/types';

export const fixture: Content = {
  roster: [
    { id: 'fish', name: 'Fish', icon: 'fishing-rod' },
    { id: 'salvage', name: 'Salvage', icon: 'recycle' },
    { id: 'rig', name: 'Rig', icon: 'sailboat' },
    { id: 'fight', name: 'Fight', icon: 'sword' },
  ],
  items: {
    fish: { id: 'fish', name: 'fish', kind: 'food', healPerUnit: 4 },
    eel: { id: 'eel', name: 'eel', kind: 'food', healPerUnit: 10 },
    scrap: { id: 'scrap', name: 'scrap', kind: 'material' },
    pass: { id: 'pass', name: 'a pass', kind: 'key' },
  },
  actions: {
    fish: { id: 'fish', verb: 'fish', noun: 'the shallows', expCost: 1, producedItem: 'fish', producedAmount: 1, itemCosts: [], isOneTime: false },
    salvage: { id: 'salvage', verb: 'salvage', noun: 'scrap', expCost: 1, producedItem: 'scrap', producedAmount: 1, itemCosts: [], isOneTime: false },
    hull: { id: 'hull', verb: 'rig', noun: 'the hull', expCost: 8, itemCosts: [{ item: 'scrap', amount: 8 }], isOneTime: true, healthDecayMultiplier: 0.5 },
    satchel: { id: 'satchel', verb: 'rig', noun: 'a satchel', expCost: 2, itemCosts: [{ item: 'scrap', amount: 2 }], isOneTime: true, capacityBonus: 5 },
    gate: { id: 'gate', verb: 'fight', noun: 'the gate', expCost: 1, producedItem: 'pass', producedAmount: 1, itemCosts: [], isOneTime: true },
    raid: { id: 'raid', verb: 'fight', noun: 'the raid', expCost: 30, itemCosts: [], needs: [{ item: 'pass', amount: 1 }], isOneTime: true },
    eels: { id: 'eels', verb: 'fish', noun: 'the eel runs', expCost: 1, producedItem: 'eel', producedAmount: 1, itemCosts: [], isOneTime: false },
    vault: { id: 'vault', verb: 'rig', noun: 'the vault', expCost: 1, itemCosts: [], isOneTime: true },
  },
  chapters: [
    { head: { numeral: 'I', chapter: 'One', story: 'A start.' }, order: ['fish', 'salvage', 'hull', 'satchel', 'gate', 'raid'], event: 'raid' },
    { head: { numeral: 'II', chapter: 'Two', story: 'An end.' }, order: ['eels', 'vault'], event: 'vault' },
  ],
  finish: 'vault',
};
```

Helpers, at the top of each engine test file that needs them:

```ts
/** Ticks to complete `expCost` at multiplier 1. Ten 0.1s are 0.999..., so +1. */
const ticksFor = (expCost: number) => Math.floor(expCost / balance.skills.baseTickExp) + 1;
const live = (s: GameState) => setPaused(s, 'none');
/** Gives rows their chips. Takes the content, so a local variant's rows work too. */
const earned = (c: Content, s: GameState, ...ids: string[]): GameState =>
  ({ ...s, completionCounts: { ...s.completionCounts, ...Object.fromEntries(ids.map((id) => [id, unlockAt(c.actions[id]!)])) } });
/**
 * Steps `c` until the predicate holds (bounded), collecting every event. An
 * idle step returns its input, whose events are the previous tick's, so events
 * are collected only from a step that changed something.
 */
function runUntil(c: Content, state: GameState, done: (s: GameState) => boolean, limit = 10_000): { s: GameState; events: GameEvent[] } {
  let s = state;
  const events: GameEvent[] = [];
  for (let i = 0; i < limit && !done(s); i++) {
    const next = step(s, c);
    if (next !== s) events.push(...next.events);
    s = next;
  }
  return { s, events };
}
```

Each file includes only the helpers it uses (root `tsc` runs with
`noUnusedLocals`).

Tests, each asserting the outcome (not the call):

`queue.test.ts`
- `enqueue`: default is `repeat`, `once: true` is `once`, a one-time is
  always `once`; ids count 0, 1, 2 and `nextEntryId` follows; `front` puts it
  first; refused (same object) for a row not in the chapter, a done one-time,
  a dead state.
- ▶ refusal: `enqueue(s, content, 'hull', { front: true })` on an empty pack
  with Salvage unearned returns the same state; the same call without
  `front` appends; with `by: 'auto'` and `front` it is accepted.
  `startBlock` reads `{ kind: 'short', item: 'scrap', amount: 8, maker: 'salvage', gap: 'unearned' }`,
  `{ kind: 'full', item: 'fish' }` at 5 fish, `{ kind: 'done' }` after the hull,
  `{ kind: 'elsewhere' }` for `vault` in chapter I, and `null` once
  Salvage is earned and set to JIT.
- `removeEntry` removes that id only (a second Salvage entry stays), and the
  hull's `work` is untouched.
- **The spec's walk-through (§2.3), with the hull at 8 scrap and the cap at 5:**
  queue `salvage, hull, salvage, hull` (all `+`), then `runUntil` the queue is
  empty. Assert: the hull is done; the first Salvage stopped at 5 (the
  largest scrap count seen while the first Salvage entry was on top is 5,
  then a `popped`/`full` event); the hull then popped with
  `{ type: 'short', actionId: 'hull', item: 'scrap', amount: 3, maker: 'salvage', gap: 'unearned' }`
  and `work.hull.costsConsumed === 5`; the second Salvage fetched exactly 3
  (scrap peaks at 3 while it is on top, then `popped`/`enough`); scrap ends at 0.
- A single Salvage (`once: true`) yields exactly 1 scrap and leaves.
- A repeat Salvage alone fills to 5 and pops `full`; then the queue is empty,
  and `step` returns the same object (time stopped, decision #41).
- `work` spends ticks and awards XP to both ledgers and `skillStats.ticks`;
  `bestRun` tracks the run level; a gear row multiplies the tick
  (`satchel` stands in: give a fixture row `gear: { skill: 'rig', multiplier: 2 }`
  and assert rig's tick XP doubles once it is done).
- Completion: counts up `completionCounts`; the `unlocked` event fires on the
  completion that reaches `unlockAt`, and not on the next; a one-time lands in
  `completedOneTime` and leaves the queue; a `once` entry leaves; a `repeat`
  consumer stays; the capacity row raises `capOf` to 10 for the rest of the life.

`rows.test.ts`
- `lookAheadTarget`: `[salvage, hull]` → 5 (8 capped); `[salvage, satchel]` → 2;
  `[salvage, hull, salvage, satchel]` → 5 (stops at the second Salvage: 8 capped);
  with `work.hull = { progress: 5, costsConsumed: 5 }`, `[salvage, hull]` → 3;
  `[salvage]` → 5; a `gate` entry (producing `pass`) followed by `raid`
  (needs 1 pass) → 1 for the gate's item; with `satchel` done, `[salvage]` → 10.
- `shortfall`: an unmet need comes before a cost; `amount` is the whole
  remaining cost less nothing on hand; `null` once one unit is on hand.

`automation.test.ts`
- `isUnlocked` false at `unlockAt − 1`, true at `unlockAt`, for a repeatable
  and a one-time (the thresholds read from `balance.automation`, never typed); `modeOf` reads `off` for a row whose automation is
  set but not earned.
- `cycleOf(content, salvage)` is `off jit top high mid low last`;
  `cycleOf(content, vault)` (makes nothing anyone uses) has no `jit`;
  `nextMode` wraps `last → off`.
- `setAutomation` refuses before unlock, refuses `jit` for `vault`, accepts
  otherwise, and returns the same object when the mode is unchanged.
- `makersOf` lists the port's rows that make an item and are not done.
- `supplyVia` (in `queue.test.ts`): `none` for an item nothing here makes;
  `unearned`, then `off` once earned; `ok` with the mode once set; JIT
  preferred over a priority when two makers exist; with two automated makers
  where the JIT one is blocked and the `low` one is free, `ok` names the free
  one; a blocked chain two makers deep names the direct maker as `blocked` and
  the deepest maker, its item and its gap as `cause`; a chain three deep
  (hull ← press, JIT, costing oil ← well, JIT, costing ore ← mine, unearned)
  carries `cause: { item: 'ore', maker: 'mine', gap: 'unearned' }` all the way
  up; in a one-row cycle (press makes scrap and costs scrap, on JIT), asked from
  the consumer's side, the maker is `blocked` with no `cause`.
- `frontBlock`: a repeating Salvage with 5 scrap and nothing below needing
  scrap is `{ kind: 'full', item: 'scrap' }`; with the satchel done (cap 10), 6 scrap and a
  queued row owing 6, it is `{ kind: 'enough', item: 'scrap' }` and ▶ returns
  the same state; with `once` it is `null`.

`resolve.test.ts`
- **JIT supply.** Salvage earned and JIT; queue `hull` by `+`; `runUntil` the
  hull is done. Assert no `short` event; two `automated` events for
  `salvage` with `why: 'supply'`; scrap ends at 0; every Salvage entry had
  `by: 'auto'`.
- **Off and unearned.** Salvage earned and `off`: the hull pops with
  `gap: 'off'`; not earned: `gap: 'unearned'`; a fixture row costing an item
  nothing makes: `gap: 'none', maker: null`.
- **The user's priority example (§3.3).** Fish earned at `high` with 3 fish;
  Salvage earned at `mid`; queue `hull`. The first `automated` event is
  Fish (`supply`), which fills to 5 and pops `full`; the next is Salvage;
  the hull completes. The same with Salvage at `jit`: Salvage goes first.
- **JIT food.** Fish earned and JIT, no fish, pass on hand, queue `raid`
  with `work.raid = { progress: 5, costsConsumed: 0 }` (started, so no
  provisioning): the first step's events start with `automated fish food`
  and Fish is the top with `left: 5`, the raid at index 1 with its `work`
  intact; while that auto Fish entry is queued and fish is still 0, no second
  Fish entry is queued (the queue stays at 2 until the first fish lands);
  Fish leaves inside `work` on its fifth completion (`left`), so when the raid
  is back on top its progress is exactly 5, and one step later 5 plus one tick.
- **A food fill ends even when eating takes fish during it.** A local variant
  whose fish row costs 6 XP (61 ticks, longer than the 50-tick cooldown), with
  health low so fish are eaten as they land: the auto Fish entry makes exactly
  `left` completions (5) and leaves, and the row behind it runs; without
  `left` it would keep going (the executor measured 6 completions).
- **`fillLeft` counts what is on hand.** The provision fill: Fish earned and
  JIT, 2 fish, the raid unstarted on top: Fish is queued with `left: 3`. (A
  JIT food fill proper starts only at zero, where `left` is the cap.)
- **Provisions happen once per departure.** Fish earned and JIT, the raid
  unstarted on top, 2 fish, health low so fish are eaten: one `provision`
  event, then the raid starts even though fish is below the cap. (That
  `provisioned` empties at casting off is Task 4's.)
- **An unsupplied JIT food stays idle.** A local variant with a food row
  `bake` costing scrap, `bake` earned and JIT, Salvage unearned, no bakes:
  `step` returns the same object (the food path goes through startBlock).
- **An auto food entry under a player's ▶ is not doubled.** With an auto Fish
  entry at index 0 and fish at 0, the player ▶s Salvage: after the next step
  there is still exactly one Fish entry.
- **A higher row already queued is not queued again.** Fish on `high` already
  queued below the hull, Salvage on `mid`: supplying the hull queues Salvage,
  not a second Fish.
- **A supply step never takes a one-time.** The gate (a one-time that makes
  something, so only the one-time guard can skip it) earned on `top`, Salvage
  earned on `mid`, the hull queued: the first `automated` event names
  `salvage` with `why: 'supply'`, and no `automated` event names `gate`. (With
  the one-time guard removed from `readyHigher`, the gate would go first: the
  test pins it. A big fight produces nothing, so the producer guard covers it
  too.)
- **Provisions.** Fish earned and JIT, 2 fish, pass on hand, queue `raid`
  (the chapter's event, unstarted): Fish is queued `provision` and fills to
  5, then the raid runs. Give the raid progress, drop fish to 4: no
  provision.
- **Passive fill.** Queue empty, Salvage earned at `low`, Fish earned at
  `high` with 5 fish: Salvage is queued `idle` and fills to 5; then the
  queue empties and `step` returns the same object.
- **Paused.** `step` on a paused state returns it, whatever automation holds.
- **A chain that cannot close.** A local variant of the fixture adds `press`
  (a second scrap maker, JIT and earned, costing 1 `pass`), with Salvage
  unearned and the gate unearned. `startBlock(s, content, 'satchel')` is
  `{ kind: 'short', item: 'scrap', amount: 2, maker: 'press', gap: 'blocked', cause: { item: 'pass', maker: 'gate', gap: 'unearned' } }`;
  ▶ on it returns the same state; queued by +, the first step pops it with one
  `short` event carrying the same `maker`, `gap` and `cause`, and queues no
  `press`; the next `step` returns the
  same object. With satchel on `high` and the queue empty, `step` returns the
  same object at once (the idle fill never queues a blocked row).
- **No duplicate one-times from priority supply.** Hull and satchel earned
  on `high`, Salvage earned on `mid`, queue `hull`: across `runUntil` the hull
  is done, no two queue entries ever share an `actionId`, and no `automated`
  event names `satchel` with `why: 'supply'`.
- **No provisions before the finish.** In chapter II (`chapter: 1`) with `eels`
  earned on JIT and 2 eels, queue `vault` (the finish, unstarted): the first
  step has no `provision` event and works the vault.
- **A content cycle.** Two fixture rows, `a` costing `bItem` and `b` costing
  `aItem`, both earned and JIT: `step` returns without throwing, and the
  queue never exceeds 4 entries over 100 steps.
- `topReady` agrees with `resolve(...).ready` on each fixture above where
  resolve changes nothing, and `resolve(...).passes` is 1 on a ready top with
  nothing to do.

- [ ] **Step 10: The reducer and the screen, minimally.** `useGame.ts`:
  `GameAction` gains `once` on `queue`, `remove` takes `entryId`, and a new
  `automate` calls `setAutomation`; the switch gets a `default` that returns
  the model unchanged (#67, with a test dispatching an unknown type).
  `withLog` drops `popped`, `automated` and repeat `completed`. `narrate`
  gains a case for each new event (plain notes; Task 7 sets the final
  words) and a `default` that renders an unknown event as a plain note (a
  save from a later format must not blank the log). `App`:
  `working = topReady(view, book) ? 0 : -1`. `ActionRow` passes the click's
  `shiftKey` as `once` through `onNow(id, once)` and `onQueue(id, once)`, and
  `ChapterPanel`'s prop types carry the same two-argument signatures.
  `realClick(el, init?: MouseEventInit)` merges `init` into each of its
  events, so a test can Shift+click. `Queue` keys entries by `e.id`, reads the
  bar from `workOf(state, e.actionId)`, shows `repeat` or `once` on each entry,
  replaces `missingInput`/`fullItem` with `shortfall`/`isFull` from `rows.ts`
  and its countdown gate with `topReady`, and removes by entry id on one press
  (the arm goes: nothing is lost now). `ActionRow`'s owed inputs read
  `workOf`. `useGame.test.tsx`'s LOG_LINES test reached the cap through stall
  chatter, which is gone (and `coreLevel` lines cannot reach 100 in a test's
  time): it now presses + on an unsupplied cost row (the fixture's cabin with
  no stone) and ticks, 101 times, each pop logging one `short` line. The queue
  countdown shows on the top entry only, while live and `topReady`. Tests
  follow each change.
- [ ] **Step 11: The play, rewritten for the queue of orders.** The old
  stand-in floods under repeat entries (a repeat per row per tick), and its
  freeze rule reads a queue resolve drained as frozen. In `src/engine/play.ts`:

```ts
export interface PlayRun {
  readonly policy: string;
  readonly outcome: PlayOutcome;
  readonly lives: number;
  readonly ticksPerLife: readonly number[];
  /** The furthest chapter index each life reached (spec 2026-09-23-the-windward-run section 11). */
  readonly chaptersPerLife: readonly number[];
  readonly totalTicks: number;
}

export function play(book: Book, policy: Policy, bounds: PlayBounds = balance.play): PlayRun {
  const interval = Math.round(policy.checkEverySeconds * ticksPerSecond());
  const giveUpAt = declaredTicks({ days: bounds.maxBookDays });
  const ticksPerLife: number[] = [];
  const chaptersPerLife: number[] = [];
  let reached = 0;                  // the furthest chapter this life
  let before = 0;                   // ticks in the lives already ended
  let s = setPaused(newState(book.roster), 'none');
  let sinceDecide = interval;       // ticks since the last ask; decide on the first tick
  let stalled = false;              // the previous step did not advance time
  const end = (outcome: PlayOutcome, last: GameState): PlayRun => {
    const lives = [...ticksPerLife, last.runTicks];
    return { policy: policy.name, outcome, lives: lives.length, ticksPerLife: lives, chaptersPerLife: [...chaptersPerLife, Math.max(reached, last.chapter)], totalTicks: before + last.runTicks };
  };
  for (;;) {
    const decideNow = stalled || sinceDecide >= interval;
    if (decideNow) { s = policy.decide(s, book); sinceDecide = 0; }
    const next = step(s, book);
    reached = Math.max(reached, next.chapter);
    // Task 4 makes the finish end the life (next.finished) and drops the second half.
    if (next.finished || next.completedOneTime.includes(book.finish)) return end('finished', next);
    if (next.dead) {
      ticksPerLife.push(next.runTicks);
      chaptersPerLife.push(reached);
      reached = 0;
      before += next.runTicks;
      s = setPaused(rebirth(next), 'none');
      sinceDecide = interval;
      stalled = false;
      continue;
    }
    const advanced = next.runTicks !== s.runTicks;
    // Frozen: two steps in a row that did not advance, with the policy asked in
    // between (a step that does not advance sets `stalled`, which asks at once).
    // One such step is not a freeze: resolve may have drained the queue on a
    // check-in tick, and the next ask queues again.
    if (!advanced && stalled) return end('frozen', next);
    if (before + next.runTicks > giveUpAt) return end('never-finishes', next);
    s = next;
    stalled = !advanced;
    if (advanced) sinceDecide += 1;
  }
}

/**
 * A person-like player for the queue of orders (spec section 11). Checks in
 * every balance.policy.checkEverySeconds of game time and whenever time stops.
 * It sets foods and makers to JIT as they earn chips and never uses the
 * priorities. Whenever the queue is dry it queues, by hand: food, then the
 * port's first unfinished one-time behind one fill of each maker automation
 * does not supply (the big event is the last one-time, so it comes once the
 * port is built). One fill per ask is enough, since the play asks again the
 * moment the queue drains. With food at zero and no JIT on it, it presses ▶
 * on the food row, or on the maker of what the food lacks when ▶ refuses. It
 * does only what the screen lets a person do. Sane: it eats and walks every row.
 */
export const attentive: Policy = {
  name: 'attentive',
  sane: true,
  checkEverySeconds: balance.policy.checkEverySeconds,
  decide: (state, book) => byHand(jitAsEarned(state, book), book),
};

/** The same player, who never touches automation: the other end of the measured range. */
export const handsOn: Policy = {
  name: 'hands-on',
  sane: true,
  checkEverySeconds: balance.policy.checkEverySeconds,
  decide: (state, book) => byHand(state, book),
};

/**
 * A player who switches on every chip as it arrives, the way section 3 reads:
 * foods and makers to JIT, the port's other one-times to high, its big event
 * to low; by hand, only rows whose chip is still off. Reported, never tuned
 * to (Task 5): it is the player who would lock themselves out if a harvest's
 * chip came later than the one-times it feeds (Revision 3, point 4).
 */
export const prioritized: Policy = {
  name: 'prioritized',
  sane: true,
  checkEverySeconds: balance.policy.checkEverySeconds,
  decide: (state, book) => {
    let s = state;
    const chapter = chapterOf(s, book);
    for (const id of chapter.order) {
      const a = book.actions[id]!;
      if (!isUnlocked(s, a) || (s.automation[id] ?? 'off') !== 'off') continue;
      s = setAutomation(s, book, id, canJit(book, a) ? 'jit' : id === chapter.event ? 'low' : a.isOneTime ? 'high' : 'mid');
    }
    return byHand(s, book, (a) => modeOf(s, a) === 'off');
  },
};

function makesFood(book: Book, a: ActionDefinition): boolean {
  return a.producedItem !== undefined && book.items[a.producedItem]?.kind === 'food';
}

/** Foods and makers (key makers included) to JIT as they earn their chips; nothing else is automated. */
function jitAsEarned(state: GameState, book: Book): GameState {
  let s = state;
  for (const id of chapterOf(s, book).order) {
    const a = book.actions[id]!;
    if (isUnlocked(s, a) && (s.automation[id] ?? 'off') === 'off' && canJit(book, a)) s = setAutomation(s, book, id, 'jit');
  }
  return s;
}

/** Queues `a` behind one fill of each maker of what it costs or needs that automation does not supply (a key's one-time maker once). */
function withMakers(state: GameState, book: Book, rows: readonly ActionDefinition[], a: ActionDefinition): GameState {
  let s = state;
  for (const c of [...(a.needs ?? []), ...a.itemCosts]) {
    const maker = rows.find((m) => m.producedItem === c.item && !isDone(s, m));
    if (maker === undefined || modeOf(s, maker) !== 'off') continue;
    if (maker.isOneTime && s.queue.some((e) => e.actionId === maker.id)) continue;
    s = enqueue(s, book, maker.id);
  }
  return enqueue(s, book, a.id);
}

/**
 * `byHand` for every player: food, then the port's FIRST unfinished one-time
 * (the big event is the last one-time in order, which the validator enforces,
 * so it comes only once the port is built). One at a time: a costly row pops
 * short after one fill, the queue drains, and the play asks again; a second
 * row queued in the same batch (a 600-XP fight) would run instead. `mine`
 * limits which one-times this player queues by hand (the prioritized player
 * leaves chipped ones to automation), and the event waits while automation's
 * idle fill will still take one of the port's one-times.
 */
function byHand(state: GameState, book: Book, mine: (a: ActionDefinition) => boolean = () => true): GameState {
  let s = state;
  const chapter = chapterOf(s, book);
  const rows = chapter.order.map((id) => book.actions[id]!);
  const queued = (id: ActionId) => s.queue.some((e) => e.actionId === id);
  const food = rows.find((a) => makesFood(book, a));
  if (food !== undefined && modeOf(s, food) !== 'jit' && count(s.inventory, food.producedItem!) === 0 && !queued(food.id)) {
    const block = startBlock(s, book, food.id);
    const press = block?.kind === 'short' && block.maker !== null ? block.maker : food.id;
    s = enqueue(s, book, press, { front: true });
  }
  if (s.queue.length > 0) return s;
  if (food !== undefined && modeOf(s, food) !== 'jit') s = withMakers(s, book, rows, food);
  // Withhold the event only while the idle fill will take a one-time of this port; withholding it whenever
  // any one-time is unfinished froze a life, since JIT key makers are pulled only through the event's chain.
  const waiting = rows.some((b) => b.isOneTime && b.id !== chapter.event && !isDone(s, b) && isPriority(modeOf(s, b)) && startBlock(s, book, b.id) === null);
  const next = rows.find((a) => a.isOneTime && !isDone(s, a) && mine(a) && (a.id !== chapter.event || !waiting));
  if (next !== undefined && !queued(next.id)) s = withMakers(s, book, rows, next);
  return s;
}
```

`everyRowInOrder` is deleted; tests that used it use `attentive`, except
where a test's premise needs a particular player. Named rebuilds (taken
from round two's green build, re-measured against this revision's policy):
- the give-up cases (`gives up at the ceiling`, `the ceiling ignores what the
  book claims`, measure's `never-finishes is flagged`) use an unreachable but
  cheap finish, `monumentBook(3, 1e9)`, so no play builds a huge queue;
- the endless-life case keeps a local policy that queues its `balm` (a
  repeatable decay row: invalid for the validator, which `play()` never runs;
  say so in its comment);
- `monumentFirst` queues its reversed order only when the queue is empty,
  stays not sane, and its "never eats" comment is corrected (Forage runs once
  the others pop);
- the off-length and too-short cases pick their tolerance and floor between
  the two runs as measured (round two's build needed `lengthTolerance: 0.01`
  and a 2.2 h floor; round three's floor sat below the shorter run, so pick it
  from this build's readings), with the measured values in the comments;
- the later-life freeze is re-measured (round two's build needed a
  `capacityBonus` of 295) and its rationale rewritten to what now freezes;
- `a policy that checks in every 5 seconds is asked about once per 5 seconds`
  counts only the interval asks: a policy is also asked the moment the queue
  drains, which this revision relies on (one fill per ask);
- Task 2's 8-minute short-life line returns to the default.
`balance.policy` is new:

```ts
  /** The measuring bot's habits (spec 2026-09-23-the-windward-run section 11), apart from the play's bounds. */
  policy: {
    /** UNDERIVED, picked 2026-09-23: the attentive player glances at the queue about twice a minute of game time. */
    checkEverySeconds: 30,
  },
```

It sits outside `balance.play`, so `PlayBounds` keeps meaning the bot's
bounds. `PLAY_VERSION` becomes 2; its lock test in `measure.test.ts` locks it
with `balance.play` and `balance.policy` together. Re-measure every
`monumentBook` characterization in `play.test.ts` and `measure.test.ts` and
update values and comments to what they now read. New `play.test.ts` cases:
- **a queue drained on an asked tick is not a freeze**: `checkEverySeconds`
  0; on the first empty queue the policy queues Mine (it fills to 5 and
  resolve pops it `full` on an asked tick, without time passing); on the
  second, the monument; the run reads `finished`, with exactly two
  empty-queue asks (under the old rule it read `frozen`);
- a dry ask queues food plus at most the port's first unfinished one-time and
  its makers (the monument book: never more than 4 entries), and never the
  event while another one-time of the port is unfinished: with the shelter
  and the monument both unfinished, one ask queues the shelter (behind its
  maker) and no monument entry;
- `prioritized` with the upgrades on `high` (buildable) and the event's chip
  off: a dry ask does not hand-queue the event, and the idle fill builds the
  upgrades first;
- `handsOn` never sets automation (`automation` stays `{}` across a whole
  play), and `attentive` sets only rows `canJit` allows, only to `jit`;
- `chaptersPerLife` has one entry per life (always 0 here; Task 4 tests a
  chapter change).
- [ ] **Step 12: The validator, for what `byHand` relies on.** A chapter's
  event is its last one-time in `order`: `chapter 2's event "x" is not its last
  one-time row` (a test per message; The Windward Run and both test-utils books
  already comply).
- [ ] **Step 12b: Verify** `npm run typecheck && npm run lint && npm test && npm run test:hooks`.
- [ ] **Step 13: Commit** `feat: the queue is a list of orders, and rows earn automation`

---

### Task 4: Ports, hurts, the finish, and what the card says

**Files:** Modify `src/engine/queue.ts`, `src/engine/tick.ts`,
`src/engine/health.ts`, `src/engine/rebirth.ts`, `src/state/useGame.ts`,
`src/ui/App.tsx`, `src/ui/DeathCard.tsx`, and their tests; `src/engine/play.ts`
(finished before dead).

**Interfaces:**
- Consumes: Task 3's `complete`, `chapterOf`, events `castOff`/`finished`.
- Produces: `applyHurts(state, content)`, `hurtsPerSecond(state, content)`,
  `DeathSummary.chapter`, `DeathSummary.finished`, `DeathSummary.finishes`,
  `DeathSummary.during`, and `deathSummary(dead, content)`.

- [ ] **Step 1: Casting off.** In `queue.ts`, `complete` ends with
  `return action.id === chapterOf(s, content).event ? castOff(s, content, events) : s;` and:

```ts
/**
 * Section 4: the port's big event casts off. The next port's rows are the
 * rows; every non-food item is dumped; the queue keeps only orders the new
 * port has. What completed rows did stays for the life (effects.ts). The last
 * port's event is the book's finish (section 9): the life ends there.
 */
function castOff(state: GameState, content: Content, events: GameEvent[]): GameState {
  if (state.chapter >= content.chapters.length - 1) {
    events.push({ type: 'finished', runTicks: state.runTicks });
    return { ...state, dead: true, finished: true, paused: 'system' };
  }
  const chapter = state.chapter + 1;
  const order = content.chapters[chapter]!.order;
  const inventory = Object.fromEntries(Object.entries(state.inventory).filter(([id]) => content.items[id]?.kind === 'food'));
  events.push({ type: 'castOff', chapter });
  return { ...state, chapter, inventory, provisioned: [], queue: state.queue.filter((e) => order.includes(e.actionId)) };
}
```

(`chapterOf` joins the `./rows` import.)

- [ ] **Step 2: Hurts.** In `health.ts`:

```ts
/** Health a hurting top row takes this second (section 6.1). 0 when the top does not hurt. */
export function hurtsPerSecond(state: GameState, content: Content): number {
  const top = state.queue[0];
  return (top === undefined ? undefined : content.actions[top.actionId]?.hurts) ?? 0;
}

/** Applied per tick after decay, only on a tick the top works (step calls it after resolve said ready). */
export function applyHurts(state: GameState, content: Content): GameState {
  const perTick = hurtsPerSecond(state, content) / ticksPerSecond();
  if (perTick === 0) return state;
  const health = state.health - perTick;
  if (health <= 0) return { ...state, health: 0, dead: true, paused: 'system', events: [...state.events, { type: 'died', runTicks: state.runTicks }] };
  return { ...state, health };
}
```

`step` calls `next = applyHurts(next, content)` right after `applyDecay` when
not dead, and returns early on death the same way.

- [ ] **Step 3: The summary.** `DeathSummary` gains `chapter: number` (the
  port the life reached), `finished: boolean`, `finishes: number` (the count
  including this life's finish), and `during: ActionId | null`: the top row
  when the life ended, if that row hurts (spec §6.1: "a life can end
  mid-fight; the death card says so"). The dead state still holds its queue
  (rebirth clears it), so `deathSummary(dead, content)` reads
  `dead.queue[0]` and the row's `hurts`; it gains the `content` parameter and
  its callers (`useGame`, tests) pass the book; the card's `useMemo` in
  `useGame` lists `content` in its dependencies (the react-hooks lint rule).
  `rebirth` already counts `finishes` (Task 3).
- [ ] **Step 4: The play knows a finish.** In `play()`, the finish check
  becomes `if (next.finished) return end('finished', next);`, still before the
  `next.dead` branch (a finished state is also `dead`).
- [ ] **Step 5: The screen, minimally.** `DeathCard`'s `content` prop widens
  to `Pick<Content, 'roster' | 'chapters' | 'actions' | 'finish'>` and it
  gains `book: string` (the finish card's title). `App` passes
  `chapter={chapterOf(view, book)}` to `ChapterPanel`; the card reads
  `finished` for its title (`The Windward Run`, the finish row's beat under
  it) and shows `reached {numeral} · {chapter}`; Task 7 builds the mockup's
  cards. The Begin button reads `Read again` on a finish.
- [ ] **Step 6: Tests** (`queue.test.ts`, `health.test.ts`, `tick.test.ts`,
  `rebirth.test.ts`, `play.test.ts`), against Task 3's fixture:
  - Completing `raid` (pass on hand) casts off: `chapter` is 1; `scrap` and
    `pass` are gone and `fish` (food) kept; queued `salvage` and `fish` entries
    are dropped (chapter II has neither row), so the queue is empty; with the
    satchel and the hull completed beforehand, the cap stays 10 and
    `decayMultiplier` stays 0.5; a Salvage half-worked beforehand (a row not
    done) keeps its `work`; `provisioned` is empty again; the event is
    `{ type: 'castOff', chapter: 1 }`; `eels` can now be queued and `salvage`
    cannot.
  - `chaptersPerLife`: a two-chapter play whose lives cast off to chapter 1
    and die there reads entries of 1, and a finishing life's entry is the
    last chapter's index.
  - Completing `vault` in chapter II finishes: `dead`, `finished`, `paused: 'system'`,
    a `finished` event with the run clock; `step` afterwards returns the same
    object; `rebirth` gives chapter 0, `finishes` 1, life + 1, automation and
    core kept; `deathSummary` reads `finished: true`, `finishes: 1`, `chapter: 1`.
  - Hurts: a fixture row with `hurts: 1` on top loses decay + 0.1 per tick;
    with JIT food on top instead (the row at index 1) it loses decay only;
    the row's `work` survives the interruption; a hurt that takes health to
    0 emits `died` with the run clock, and `deathSummary(dead, content).during`
    names the row (and is `null` for a death to decay with a non-hurting top).
  - The play: a book whose finish is reached reads `finished`, not a death.
- [ ] **Step 7: The whole-book gate.** Before anything is built on the
  engine, play The Windward Run at the starting numbers with `attentive` (a
  temporary `src/zz-probe.test.ts`, outside the purity scan's layers, first
  line `// @ts-nocheck` so the root typecheck ignores its `node:fs` import;
  it writes its readings to a file in the scratchpad, since console output is
  swallowed; deleted before the commit). Read events only from a step that
  returned a new object. The gate, each a pass or a finding to fix in the
  engine or the policy now, not in tuning:
  - the run finishes inside 60 game days, never `frozen` or `never-finishes`;
  - every one-time row of every port completes at least once before the finish;
  - no queue ever holds more than 20 entries, and no step's resolve uses more
    than 16 of its 64 passes (`Resolved.passes`, read through a copy of
    `step`'s first line in the probe);
  - from life 10, every life that casts off from a port completed every
    one-time of that port first, for all three players (`attentive`,
    `handsOn`, `prioritized`);
  - once a life has built the Fortune's capacity row, every later life that
    reaches the Fortune builds it (`attentive` and `handsOn`; `prioritized`
    is reported, since the Fortune never casts off);
  - a life that reaches the Fortune eats (canapés or carried food) there.
  The `prioritized` line may fail at the starting numbers for the reason
  Revision 4 point 5 names (Salvage's chip arrives after the one-times it
  feeds); if it does, it is the one gate line Task 5's content ordering
  closes, and the gate records it as such rather than as an engine defect.
  Record the per-life readings (minutes, `chaptersPerLife`, one-times done)
  for each player at lives 1, 2, 3, 5, 10, 20, 50 and the last under a
  **Task 4 gate** heading in this plan.
**Task 4 gate** (2026-09-23, starting numbers, the committed engine):

```text
player       lives  hours  finished  queue max  passes max  bad cast-offs from L10  trunk after first  Fortune eats
-----------  -----  -----  --------  ---------  ----------  ----------------------  -----------------  ------------
attentive    46     15.69  yes       4          3           0                       every life         every life
handsOn      45     13.97  yes       4          2           0                       every life         every life
prioritized  48     14.87  yes       6          5           78 (hull,net,satchel /  every life         every life
                                                            fittings,chest,cutlass)

life  attentive (min/port/done/Fortune cap)  handsOn                prioritized
----  ---------------------------------------  ---------------------  ---------------------
1     15.89 / I->II / 4 / -                    15.89 / 1 / 4 / -      15.89 / 1 / 4 / -
2     17.05 / 1 / 7 / -                        17.05 / 1 / 7 / -      17.05 / 1 / 7 / -
3     16.72 / 1 / 9 / -                        16.72 / 1 / 9 / -      16.72 / 1 / 9 / -
5     17.24 / 2 / 10 / 15                      16.28 / 1 / 9 / -      17.24 / 2 / 10 / 15
10    18.16 / 2 / 10 / 15                      17.00 / 2 / 11 / 15    16.80 / 2 / 5 / 5
20    21.08 / 2 / 13 / 20                      18.63 / 2 / 13 / 20    18.97 / 2 / 7 / 10
last  L46 21.98 / 2 / 16 / 20                  L45 19.73 / 2 / 16 / 20  L48 19.86 / 2 / 10 / 10
first unlocks: eels 4; fish, hull, net, satchel, pirates 5; wardens, halls 6 (all players)
```

Every line passes for `attentive` and `handsOn`. `prioritized`'s 78 bad
cast-offs are the lock-out Revision 4 point 5 names (Salvage never earns its
chip: its one-times cost 24 scrap a life against a 200 threshold); it is the
one line Task 5's content ordering closes, recorded as such and not as an
engine defect.

- [ ] **Step 8: Verify, commit** `feat: ports cast off, fights hurt, the book ends`

---

### Task 5: The numbers

**Files:** Modify `src/balance.ts` (`content.windward`, and
`automation.unlockRepeatable`/`unlockOneTime` only if target 6 needs them),
`src/balance.test.ts`, `src/engine/measure.test.ts`, and this plan (the Task 5
reading). Create `src/engine/windward.test.ts`. A temporary
`src/zz-probe.test.ts` as in Task 4 Step 7, deleted before the commit.

**Interfaces:**
- Consumes: `attentive`, `play`, `measure`, `PlayRun.chaptersPerLife` (Task 3), the book (Task 2).
- Produces: the tuned `balance.content.windward` and its lock.

- [ ] **Step 1: Tune.** Play The Windward Run with `attentive` and adjust
  numbers until, in priority order:
  1. life 1 lasts 12-15 minutes, and no sane life dies under
     `balance.play.minLifeMinutes`;
  2. late lives run about 20 minutes, never past `maxLifeMinutes`;
  3. every one-time of every port completes at least once before the finish;
  4. port II is first reached around life 5 (3-8);
  5. port III around life 20 (12-30);
  6. the first unlock of any row lands by about life 3 (the user's approval:
     the thresholds are *"kept unless play shows the first unlock later than
     ~life 3"*), and, by content, every harvest that feeds a port's
     one-times earns its chip no later than those one-times do (their costs
     set how much of it a life makes), so `prioritized` never casts off from
     port I or II with an unbuilt one-time from life 10 (asserted; its Fortune
     is reported);
  7. the book finishes measuring 24-36 game hours (declared 30), which at
     these life lengths is roughly life 90-110;
  8. automation is never the slow end: `attentive` finishes within 25% of
     `handsOn` (JIT canapé refills made the automating player 27-39% slower
     in rounds three and four; the lever is the canapé's chip price, and at 1
     chip the two finish level).
  Numbers in `balance.content.windward` move freely (the user's instruction:
  pick, remember, keep tunable). `balance.automation.unlockRepeatable` and
  `unlockOneTime` move only if target 6 cannot be met with content alone; a
  move there is a change to an existing value, called out in the commit and
  in this plan's reading. Target 6 is met by content (round four: pirates
  ×2.4, port I/II material costs ×2 and canapés at 1 chip, at the threshold of
  200, put the Salvage and hull chips both at life 5 and the first unlock at
  Fish, life 3); the automation thresholds stay (Global Constraints), and if
  content cannot meet target 6 that goes to the user, since when automation
  first appears is something a player notices. Nothing else in `balance.ts`
  moves. After tuning, re-run every line of Task 4's gate on the tuned book
  (the eat line included: round four measured `handsOn` skipping Fortune food
  in 14 of 76 lives at pirates ×3). Record the
  final table (every value; the readings at lives 1, 2, 3, 5, 10, 20, 50 and
  the last: minutes, port, one-times done, first unlock per row) under a
  **Task 5 reading** heading in this plan, and lock the final values in
  `balance.test.ts`. Targets 1, 2 and 7 hold for `attentive` and `handsOn`
  alike (the range); the reading records both, and how far the finish moves
  when the two numbers that move it most change by ×2 (the naysayer measured
  `varro` ×2 → 22 h, ×4 → 37.7 h at the starting numbers, and the pirates
  ×3 → 2.4× the hours). It also records, unasserted: `prioritized`'s Fortune,
  a casual player who asks every 300 s (rounds three and four: life 1 at 8.4
  min, port II as late as life 14; the targets assume a glance every 30 s,
  which the handoff says), and when the stack cap first reaches 20.
- [ ] **Step 2: Characterize.** `measure.test.ts`: *The Windward Run v1, end
  to end*: `measure(windwardRun, [attentive, handsOn], 'test')` finishes both
  and raises no flag (so the range lands within ±25% of 30 h, and no life is
  short or long).
  `windward.test.ts`, from one `play(windwardRun, attentive)`: life 1 is
  12-15 minutes; `chaptersPerLife` first reaches 1 between lives 3 and 8 and 2
  between lives 12 and 30 (both ends asserted); the run ends `finished`; and, from a copy of `play`'s loop in the test
  that records completions, every one-time of every port completes at least
  once before the finish. From the same kind of loop with `prioritized`: no
  life from 10 casts off from port I or II with a one-time of that port
  undone. Characterizations: a later tuning change that trips
  them is the play telling the truth.
- [ ] **Step 3: Verify** (with `timeout 120 npm test`, since a broken bound
  hangs the synchronous play), **commit** `feat: The Windward Run's numbers, tuned by the attentive play`

**Task 5 reading** (2026-09-23, the tuned book on the Task 4 engine, 676a7f8;
a temporary probe playing each player through a copy of `play`'s loop,
deleted before the commit). Started from round four's measured point
(pirates ×2.4, port I and II material costs ×2, canapés at 1 chip), then
pirates to 1450 (port II from life 4 to 5, port III from 15 to 20) and
enforcers to 500 (the finish back to about 31 h after pirates raised it;
*superseded, code panel round two:* at 600 the book still reads 32 h, so no
target forces 500 over the first pick of 600, and the user chooses).
The automation thresholds did not move: target 6 is met by content.

```text
row        field            value  was     row        field            value  was
---------  ---------------  -----  ----    ---------  ---------------  -----  ----
fish       expCost          4              fittings   expCost          80
cloudFish  healPerUnit      4              fittings   brass            20     10
salvage    expCost          5              fittings   decayMultiplier  0.8
hull       expCost          60             chest      expCost          70
hull       scrap            16     8       chest      brass            24     12
hull       decayMultiplier  0.8            chest      capacity         5
net        expCost          40             cutlass    expCost          60
net        scrap            12     6       cutlass    brass            16     8
net        fishMultiplier   1.25           cutlass    fightMultiplier  1.25
satchel    expCost          50             compass    expCost          900
satchel    scrap            20     10      compass    hurts            0.6
satchel    capacity         5              dealers    expCost          6
pirates    expCost          1450   480     kitchens   expCost          8
pirates    hurts            0.3            kitchens   chips            1      2
eels       expCost          8              canape     healPerUnit      16
skyEel     healPerUnit      10             door       expCost          120
ruin       expCost          7              door       chips            15
wardens    expCost          200            dock       expCost          100
wardens    hurts            0.5            dock       chips            15
halls      expCost          150            dock       decayMultiplier  0.8
                                           trunk      expCost          90
                                           trunk      chips            20
                                           trunk      capacity         5
                                           enforcers  expCost          500    600
                                           enforcers  hurts            1
                                           salons     expCost          300
                                           varro      expCost          400

life  attentive (min / port / one-times)  handsOn               prioritized
----  ----------------------------------  --------------------  --------------------
1     12.84 / I / 3                       12.84 / I / 3         12.84 / I / 3
2     12.27 / I / 3                       12.27 / I / 3         12.27 / I / 3
3     13.18 / I / 3                       12.25 / I / 3         13.18 / I / 3
5     16.07 / II / 5                      12.09 / I / 3         16.07 / II / 5
10    18.13 / II / 8                      18.13 / II / 8        18.13 / II / 8
20    17.82 / III / 10                    17.50 / II / 9        17.84 / III / 10
50    21.79 / III / 13                    20.82 / III / 13      21.77 / III / 13
last  L90 23.00 / III / 16                L96 21.13 / III / 16  L84 22.93 / III / 16

player         lives  hours  life 1  shortest death  last 10 lives  mean life  port II  port III  cap 20
-------------  -----  -----  ------  --------------  -------------  ---------  -------  --------  ------
attentive      90     30.69  12.84   12.27           22.8-23.0      20.5       5        20        44
handsOn        96     31.45  12.84   12.09           21.1-22.1      19.7       6        21        43
prioritized    84     28.56  12.84   12.27           22.7-22.9      20.4       5        19        37
casual (300 s) 95     30.50   9.53    7.43           22.7-23.0      19.3       12       25        50

first unlock, by life
  attentive    fish 3; salvage, hull, net, satchel 5; eels 8; pirates, wardens 9; halls 10; ruin 11;
               fittings 12; chest 13; cutlass 15; compass 24; dealers 29; kitchens 30; door 37;
               dock 43; trunk 48; enforcers 60; salons 76
  handsOn      fish 3; salvage, hull, net, satchel 5; eels 8; pirates, wardens 10; halls, ruin 11;
               fittings 12; chest 14; cutlass 15; compass 25; dealers 31; kitchens 33; door 37;
               dock 42; trunk 47; enforcers 58; salons 81
  prioritized  fish 3; salvage, hull, net, satchel 5; eels 8; pirates, wardens 9; halls 10; ruin 11;
               fittings 12; chest 13; cutlass 15; compass 23; dealers 28; kitchens 29; door 36;
               dock, trunk 41; enforcers 56; salons 74
```

Target 6's content ordering, measured to the minute (`attentive`; the other
two within 0.1 min): Salvage earns its chip at 0.64 min into life 5, the hull
at 1.34, the net at 2.14, the satchel at 3.40 (48 scrap a life); the ruin in
life 11 before the fittings in 12, the chest in 13, the cutlass in 15 (60
brass a port-II life); the dealers in life 29 (`handsOn` 31, `prioritized`
28) before the door, the dock and the trunk (36-48 across the three).
`prioritized` casts off from ports I and II with every one-time built in
every life, from life 1.

The stack cap first reaches 20 when the trunk is first built: life 44
(`attentive`), 43 (`handsOn`), 37 (`prioritized`), 50 (casual).

**Targets:** 1 holds (life 1 is 12.84 min for all three; the shortest sane
death is `handsOn`'s 12.09); 2 holds at the edge of "about" (late lives run
21-23 min, the longest 23.03, the mean life 19.7-20.5; late lives grow with
the rebirth health bonus, and the content levers barely reach them: canapés
16 → 13 or the high dock 0.8 → 0.9 each took 0.4-0.5 min off a late life and
added 3.6 h to `attentive`'s finish and 0.6-1.5 h to `handsOn`'s, so neither
moved); 3 holds for every player; 4
holds (life 5; `handsOn` 6); 5 holds (life 20; `handsOn` 21); 6 holds (Fish
at life 3; the ordering above; 0 bad cast-offs); 7 holds (30.69 h and 31.45
h, lives 90 and 96, declared 30 h); 8 holds (`attentive` finishes 2.4%
faster than `handsOn`).

**Sensitivity** (hours and lives, `attentive` / `handsOn`; everything else
as tuned):

```text
change               attentive      handsOn        port II / III (attentive)
-------------------  -------------  -------------  -------------------------
as tuned             30.69 h / 90   31.45 h / 96   5 / 20
pirates x2 (2900)    79.44 h / 227  73.31 h / 218  25 / 65
pirates x0.5 (725)   18.21 h / 54   17.70 h / 55   2 / 10
varro x2 (800)       39.64 h / 113  38.07 h / 114  5 / 20
varro x0.5 (200)     27.63 h / 82   26.35 h / 82   5 / 20
enforcers x2 (1000)  41.03 h / 117  37.79 h / 114  5 / 20
```

Pirates is the steep one: doubling it multiplies the finish by 2.6 and 2.3,
since every life pays it before any later port, and at ×2 the first life to
reach the Fortune does not eat there (lives 65 and 72: the eat line fails).
Varro ×2 adds 29% and 21%; enforcers ×2 adds 34% and 20%.

**Check-in cadence** (the attentive player, unasserted): every 30 s, life 1
12.84 min; every 60 s and every 120 s, life 1 11.71 min, the first unlock at
life 4, port II at 5, port III at 20, 30.5 h over 90 lives, and the first
life to reach the Fortune (20) not eating there; every 300 s, life 1 9.53 min,
lives 1-11 under 10 minutes (the shortest 7.43), port II at life 12, port III
at 25, 30.5 h over 95 lives. The targets assume the 30 s glance; the
handoff says so.

**Task 4's gate, re-run on the tuned book:**

```text
player       lives  hours  finished  queue max  passes max  bad cast-offs from L10  trunk after first  Fortune eats
-----------  -----  -----  --------  ---------  ----------  ----------------------  -----------------  ------------
attentive    90     30.69  yes       4          3           0                       every life         every life
handsOn      96     31.45  yes       4          3           0                       every life         every life
prioritized  84     28.56  yes       6          5           0                       every life         every life
```

Every line passes for all three: each run finishes well inside 60 game days,
never `frozen` or `never-finishes`; every one-time of every port completes
at least once before the finish; no queue holds more than 6 entries and no
resolve uses more than 5 of its 64 passes; no life casts off from a port with
one of its one-times undone (from life 10, and before it); every life after
the trunk's first build that reaches the Fortune builds it; every life that
reaches the Fortune eats there. `prioritized`'s Fortune, reported: it builds
the trunk in every Fortune life from its first (life 37) and eats in every
one.

---

### Task 6: Save, the loop, and settings

**Files:** Create `src/state/save.ts`, `src/state/save.test.ts`,
`src/ui/Settings.tsx`, `src/ui/Settings.test.tsx`. Modify
`src/state/useGame.ts` (+ test), `src/state/devHandle.ts`, `src/ui/App.tsx`
(+ test), `src/ui/narrate.ts` (+ test: the `saveAside` note), `src/test-setup.ts`
(clears `localStorage` between tests).

**Interfaces:**
- Consumes: `GameState` (Task 3), `balance.loop.maxCatchUpMinutes` (Task 2).
- Produces: `SAVE_KEY`, `ASIDE_KEY`, `SAVE_FORMAT`, `AUTOSAVE_MS`, `ASIDE_KEEP`,
  `saveText(model, book)`, `loadSave(text, book): LoadResult`, `reconcile(state, book)`,
  `asideText(existing, raw)`; the `LogEvent` variant `saveAside`; `GameAction`
  `{ type: 'load'; model }`; `useGame(book, opts?)`
  with `opts.storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null`;
  `GameAction` gains `{ type: 'tick'; n?: number }` and `{ type: 'reset' }`;
  `useGame` returns `speed` and `setSpeed` (dev), and `erase()`.

- [ ] **Step 1: The save format.** `src/state/save.ts`:

```ts
/**
 * The save (spec 2026-09-23-the-windward-run section 10, #27): one versioned
 * record of the whole run. A format or a book the game does not know is set
 * aside under a second key, never loaded and never silently overwritten.
 */
import type { Book } from '../data/types';
import { NO_STATS } from '../engine/queue';
import { newSkill } from '../engine/skills';
import type { GameState } from '../engine/types';
import type { Model } from './useGame';

export const SAVE_KEY = 'continuum.save';
export const ASIDE_KEY = 'continuum.save.aside';
/** Bumped by hand whenever the saved shape changes. */
export const SAVE_FORMAT = 1;
/**
 * How often the run is written while it plays, on top of every hide and
 * close. Housekeeping, not a gameplay value; kept out of balance.ts on the
 * same reasoning as MS_PER_SECOND in src/engine/time.ts.
 */
export const AUTOSAVE_MS = 5 * 1000;

export function saveText(model: Model, book: Book): string {
  return JSON.stringify({ format: SAVE_FORMAT, bookId: book.id, bookVersion: book.version, model });
}

export type LoadResult =
  | { readonly kind: 'none' }
  | { readonly kind: 'loaded'; readonly model: Model }
  | { readonly kind: 'aside'; readonly why: 'format' | 'book' | 'corrupt' };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** The fields the game reads, checked for shape: enough that a truncated or hand-edited save cannot crash the first render. */
function looksLikeModel(v: unknown): v is Model {
  if (!isRecord(v) || !Array.isArray(v.log) || typeof v.nextSeq !== 'number' || !isRecord(v.state)) return false;
  const s = v.state;
  const numbers = ['runTicks', 'health', 'maxHealth', 'nextEntryId', 'chapter', 'decayMultiplier', 'life', 'finishes', 'rebirthBonus'];
  const records = ['skills', 'skillStats', 'inventory', 'foodCooldowns', 'work', 'completionCounts', 'automation', 'lifeStartCore'];
  const lists = ['acquired', 'queue', 'completedOneTime', 'events', 'provisioned'];
  const ledger = (l: unknown) => isRecord(l) && typeof l.level === 'number' && typeof l.exp === 'number';
  const nums = (r: unknown, keys: readonly string[]) => isRecord(r) && keys.every((k) => typeof r[k] === 'number');
  return numbers.every((k) => typeof s[k] === 'number' && Number.isFinite(s[k]))
    && records.every((k) => isRecord(s[k]))
    && lists.every((k) => Array.isArray(s[k]))
    && typeof s.dead === 'boolean' && typeof s.finished === 'boolean' && typeof s.paused === 'string'
    && Object.values(s.skills as Record<string, unknown>).every((k) => isRecord(k) && ledger(k.core) && ledger(k.run))
    && Object.values(s.work as Record<string, unknown>).every((w) => nums(w, ['progress', 'costsConsumed']))
    && Object.values(s.skillStats as Record<string, unknown>).every((t) => nums(t, ['ticks', 'bestRun']));
}

const isEntry = (e: unknown): boolean =>
  isRecord(e) && typeof e.id === 'number' && typeof e.actionId === 'string' && (e.mode === 'repeat' || e.mode === 'once')
  && (e.by === 'player' || e.by === 'auto') && (e.left === undefined || (Number.isInteger(e.left) && (e.left as number) >= 1));
const isLine = (l: unknown): boolean =>
  isRecord(l) && typeof l.seq === 'number' && typeof l.at === 'number' && isRecord(l.event) && typeof l.event.type === 'string';

/** The model's own lists are checked item by item too: a hand-edited `queue: [null]` must read as corrupt, not throw later. */
function wellFormed(m: Model): boolean {
  return m.state.queue.every(isEntry) && m.log.every(isLine);
}

export function loadSave(text: string | null, book: Book): LoadResult {
  if (text === null) return { kind: 'none' };
  try {
    const file: unknown = JSON.parse(text);
    if (!isRecord(file)) return { kind: 'aside', why: 'corrupt' };
    if (file.format !== SAVE_FORMAT) return { kind: 'aside', why: 'format' };
    if (file.bookId !== book.id) return { kind: 'aside', why: 'book' };
    if (!looksLikeModel(file.model) || !wellFormed(file.model)) return { kind: 'aside', why: 'corrupt' };
    const model = file.model;
    return { kind: 'loaded', model: { ...model, state: reconcile(model.state, book), log: keepLines(model.log, book) } };
  } catch {
    return { kind: 'aside', why: 'corrupt' };
  }
}

/** Log lines naming a row or a skill the book no longer has would throw when narrated; they go. */
function keepLines(log: Model['log'], book: Book): Model['log'] {
  return log.filter((l) => {
    const e = l.event as { readonly type?: unknown; readonly actionId?: unknown; readonly skill?: unknown; readonly chapter?: unknown; readonly item?: unknown; readonly maker?: unknown };
    if (typeof e.actionId === 'string' && !Object.hasOwn(book.actions, e.actionId)) return false;
    if (typeof e.item === 'string' && !Object.hasOwn(book.items, e.item)) return false;
    if (typeof e.maker === 'string' && !Object.hasOwn(book.actions, e.maker)) return false;
    const cause = (l.event as { readonly cause?: unknown }).cause;
    if (isRecord(cause) && typeof cause.maker === 'string' && !Object.hasOwn(book.actions, cause.maker)) return false;
    if (isRecord(cause) && typeof cause.item === 'string' && !Object.hasOwn(book.items, cause.item)) return false;
    if (typeof e.skill === 'string' && !book.roster.some((r) => r.id === e.skill)) return false;
    if (e.type === 'castOff' && (typeof e.chapter !== 'number' || e.chapter >= book.chapters.length)) return false;
    return true;
  });
}

/** How many set-aside saves are kept, newest last. Housekeeping, not tuning. */
export const ASIDE_KEEP = 3;

/** Adds a raw save to the aside list, keeping the newest ASIDE_KEEP. */
export function asideText(existing: string | null, raw: string): string {
  let list: unknown = [];
  try { list = existing === null ? [] : JSON.parse(existing); } catch { list = []; }
  const kept = Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string') : [];
  return JSON.stringify([...kept, raw].slice(-ASIDE_KEEP));
}

function keep<V>(record: Readonly<Record<string, V>>, ok: (key: string) => boolean): Record<string, V> {
  return Object.fromEntries(Object.entries(record).filter(([k]) => ok(k)));
}

/**
 * A save for this book from an older version of it: rows and items the book
 * no longer has are dropped, skills the roster gained start fresh, skills it
 * lost go, and a chapter past the last becomes the last. The tick's stale
 * events go too: the next tick writes its own.
 */
export function reconcile(state: GameState, book: Book): GameState {
  const row = (id: string) => Object.hasOwn(book.actions, id);
  const item = (id: string) => Object.hasOwn(book.items, id);
  const skills = Object.fromEntries(book.roster.map((r) => [r.id, state.skills[r.id] ?? newSkill()]));
  return {
    ...state,
    skills,
    skillStats: Object.fromEntries(book.roster.map((r) => [r.id, state.skillStats[r.id] ?? NO_STATS])),
    lifeStartCore: Object.fromEntries(book.roster.map((r) => [r.id, state.lifeStartCore[r.id] ?? skills[r.id]!.core.level])),
    inventory: keep(state.inventory, item),
    foodCooldowns: keep(state.foodCooldowns, item),
    acquired: state.acquired.filter(item),
    queue: state.queue.filter((e) => row(e.actionId)),
    work: keep(state.work, row),
    completedOneTime: state.completedOneTime.filter(row),
    provisioned: state.provisioned.filter(row),
    completionCounts: keep(state.completionCounts, row),
    automation: keep(state.automation, row),
    chapter: Math.min(Math.max(0, Math.floor(state.chapter)), book.chapters.length - 1),
    events: [],
  };
}
```

`useGame` exports `Model`. `save.ts` imports from `src/engine/`, which
`src/state/` may (decision #4 runs one way).

- [ ] **Step 2: Tests first** (`save.test.ts`, node environment, a fake
  `Storage` object): a round trip `loadSave(saveText(m, b), b)` deep-equals
  `{ ...m, state: { ...m.state, events: [] } }` (reconcile drops the stale
  tick's events) for a mid-run model (queue entries, work, automation) and a
  death-card model; `queue: [null]` and a log line with no `event` read
  `aside/corrupt`, and so do `skills.fish = {}` and a `work` value that is not
  numbers; a log line naming a row the book lacks (in `actionId`, `maker` or a
  `short` line's `cause`), or a `castOff` past the last chapter, is dropped on
  load;
  `asideText` keeps the newest three;
  `format: 99` → `aside/format`; another `bookId` → `aside/book`; `'{'` and
  `'null'` and a model whose `state.queue` is a string → `aside/corrupt`;
  `reconcile` drops a queue entry and a `work` key for an unknown row, keeps
  the rest, adds a missing roster skill at zero, clamps `chapter: 9` to 2.
- [ ] **Step 3: `useGame` loads, saves and catches up.**
  - `initial` reads `storage.getItem(SAVE_KEY)` in try/catch. `loaded` →
    that model. `aside` → write `asideText(storage.getItem(ASIDE_KEY), raw)`
    to `ASIDE_KEY` (so an earlier set-aside save is kept, up to three), start
    fresh, and log a `saveAside` line (a new `LogEvent` variant
    `{ type: 'saveAside'; why }`, narrated as a note). `none` or a throwing
    storage → fresh. `src/test-setup.ts` clears `localStorage` after each test
    behind a `typeof localStorage` guard, so jsdom tests never load each
    other's autosaves.
  - Autosave: an effect writes `saveText` every `AUTOSAVE_MS`, on
    `visibilitychange` to hidden, and on `pagehide`, each in try/catch.
    `useGame` keeps the latest model in a ref for these writers.
  - The loop counts real time. It keeps the last processed instant from
    `performance.now()`; each `tickIntervalMs` interval computes
    `due = floor((now - last) / tickIntervalMs)` and advances
    `last += due * tickIntervalMs`. It dispatches
    `{ type: 'tick', n: Math.min(due * speed, cap) }` when `due > 0`, where
    `cap = maxCatchUpMinutes * ticksPerMinute`; when `due * speed` is over the
    cap, the rest is dropped and `last = now` (a sleeping laptop advances at
    most the cap; at ×100 one interval is 100 ticks, well under it).
  - The reducer's `tick` runs `step` up to `n` times, stopping early when a
    step returns the same object (idle) or the state dies, logging each
    step's events through `withLog`. `tick` with no `n` is one step.
  - `reset` starts a fresh run and a fresh log (`initial` without a save);
    `erase()` calls `storage.removeItem(SAVE_KEY)` and dispatches `reset`.
  - `speed` (1, 10 or 100) is `useState`, dev-only in the UI; the dev handle
    gains `speed(n)`, `save()`, `load()` (re-reads `SAVE_KEY` through
    `loadSave` and dispatches a `{ type: 'load'; model }` action that replaces
    the model) and `erase()`.
- [ ] **Step 4: Tests** (`useGame.test.tsx`, jsdom, fake storage, fake
  timers with `performance.now` stubbed): a stored save opens where it was;
  a corrupt one opens fresh and lands in `ASIDE_KEY`, and a second corrupt
  load does not overwrite that aside; a storage whose `getItem` throws opens
  fresh with no error; hiding the page writes the save; advancing time by 10
  intervals with the clock stubbed 3 s ahead dispatches 30 ticks (the queue
  holding a long row, `runTicks` +30); stubbing 2 hours ahead advances at
  most `maxCatchUpMinutes * ticksPerMinute` ticks; `speed` 10 multiplies
  ticks by 10; an unknown action returns the same model (Task 3's test
  stays); `reset` returns to life 1.
- [ ] **Step 5: Settings.** `Settings.tsx`, from mockup
  `2026-09-23-settings`: the gear is now a `<button aria-expanded>` that opens
  a small panel; **erase save** arms on the first press (`press again to
  erase`, disarming after `ARM_MS = 3000`, a presentation constant) and calls
  `erase()` on the second; under `import.meta.env.DEV`, a segmented
  `speed ×1 ×10 ×100`. Escape and a click outside close it. Component tests:
  opens and closes; one press does not erase; two presses do; the dev
  control sets speed.
- [ ] **Step 6: Verify, commit** `feat: the run saves itself, keeps pace in a hidden tab, and has settings`

---

### Task 7: The screen

**Files:** Modify `src/ui/ActionRow.tsx`, `src/ui/Queue.tsx`, `src/ui/Rates.tsx`,
`src/ui/Food.tsx`, `src/ui/Pack.tsx`, `src/ui/DeathCard.tsx`, `src/ui/narrate.ts`,
`src/ui/ChapterPanel.tsx`, `src/ui/App.tsx`, `src/ui/glyphs.ts`, `src/styles.css`,
and every test beside them. Create `src/ui/FinishCard.tsx` and its test, and
`src/test-utils/book.ts`: `testBook`, a two-port fixture for the rebuilt
components (Task 3's engine fixture as a `Book`, plus a `hurts: 1` on `raid`,
a gear row and a second chapter-II row `salvage2` so the pack has something
there), validated in `fixtures.test.ts`. Component tests move to it as their
components are rebuilt.

**Interfaces:**
- Consumes: `frontBlock`, `startBlock`, `StartBlock`, `SupplyCause`, `topReady`, `workOf`, `lookAheadTarget`,
  `modeOf`, `isUnlocked`, `unlockAt`, `nextMode`, `cycleOf`, `capOf`,
  `foodsByHeal`, `hurtsPerSecond`, `chapterOf`, `DeathSummary` (Tasks 3–4);
  mockups `2026-09-23-queue-orders` and `2026-09-23-finish-card` (Task 1).
- Produces: `ActionRow` props `onNow(id, once)`, `onQueue(id, once)`,
  `onAutomate(id, mode)`; `Rates` prop `hurts: number`; `FinishCard`.

Built from the committed mockups. First, before any component code: add a
frame to `docs/mockups/2026-09-23-queue-orders.html` (and re-render its PNG)
showing a waiting chip: the hull on `high` while Salvage has no chip, the chip
dashed, and the words visible on the row (below). Commit it (decision #31).
Each bullet is a test in the component's test file, driven with `realClick`
where the change is a control:

- [ ] **The words, one function** (`src/ui/words.ts`, tested on its own):
  every refusal, instruction, waiting look and `short` log line comes from
  it, so the row and the log never disagree. It names a maker by its ROW
  (`{Skill} {noun}`: a port can hold four Talk rows) and never prints a key's
  amount. `short`, by gap: `off` → `needs 3 scrap · Salvage drifting scrap
  automation is off`; `unearned` → `… is not yet earned (120/200)`; `none` →
  `nothing here makes scrap`; `blocked` with a `cause` →
  `needs Varro's table · Search the salons can't run: needs chips · Talk to
  the dealers automation is off` (the cause's item and maker, its own gap);
  `blocked` without one → `needs 2 scrap · Salvage a press can't run`; a key →
  `needs the star chart · …`. `full` → `scrap is full`; `enough` → `scrap:
  enough for what is queued`.
- [ ] **ActionRow.** The middle chunk reads, left to right: `needs` chips
  (`needs the star chart`, in hurt text when unmet), inputs owed from
  `workOf` (`3 of 8 scrap` once part is spent, `⚠ … have n` when short),
  `−0.30 hp/s` for a hurting row, `→`, and the output: `+1 scrap` for a
  harvest, the item's name for a made thing, or the effect for a one-time
  (`decay ×0.80`, `stack +5`, `Fish ×1.25`, `casts off` for a chapter event,
  `the end` for the finish). ▶ asks `frontBlock(state, content, id, event.shiftKey)`
  first (only `frontBlock` knows `enough`; a check that missed it would
  dispatch an order `enqueue` then refuses silently): a block flashes
  the row red (a `row--refused` class for one CSS animation, removed on
  `animationend`) and shows the instruction (the words) for
  `INSTRUCTION_MS`, and dispatches nothing. + always dispatches and shows the instruction for a `short` block
  (no flash). Shift+click passes `once: true`; Enter on the focused button
  passes `once: false`. The row's time and `+xp` use
  `tickExp(skill, gearMultiplier(state, content, verb))`, so gear shows. The
  middle chunk stacks (needs chips on their own line above the inputs, one
  input per line, as 09-22 §8.4 allows) so Port Cinder's rows fit the chapter
  column at 1280 and at the 732px floor (the mockup's rows measured 728px
  against a 714px column). The automation chip: a status `37/200` with its
  hairline until `isUnlocked`; then a `<button>` showing the mode word
  (`off`, `JIT`, `top` …), `aria-label="automation: {mode}, press for {next}"`,
  cycling through `cycleOf`, pinned width (it fits `199/200` and `high`). A
  chip that is set (not `off`) on a row whose `startBlock` is a `short` shows
  a waiting look: the same word with a dashed edge (the stall's look from
  09-22 §8.5), and, while the row is neither running nor showing an
  instruction, its middle chunk shows the words on the row itself, in the warn
  token: `waits: Salvage drifting scrap is not yet earned (120/200)` or
  `waits: Salvage drifting scrap automation is off`. The chip's accessible name
  carries the same words. This is how a player sees that an upgrade set to
  `high` cannot run yet, and what would let it (accepted risk 3).
- [ ] **Queue.** One boxed entry per order, keyed by id: icon and name; a
  small `repeat` or `once` tag; an `auto` tag in the automation color when
  `by === 'auto'`; the bar and `a/b` from the row's kept `work`; each cost
  as `spent/amount`; on the top, while live and `topReady`, the countdown at
  the gear-aware rate; for a repeating producer on top, its target as
  `{have}/{target} {item}` from `lookAheadTarget` (`scrap 1/3`: the mockup's
  "fetching 3 of 8" was ambiguous when several rows below need the item).
  Entries below the top show their row's kept progress, still. × removes on
  one press. Entries never change height (the third line is always present),
  so × does not move.
- [ ] **Rates.** A third line, `fight −1.00 hp/s`, only while a hurting row
  is running (`hurtsPerSecond` and live and `topReady`); the food line's
  color judges decay plus hurts.
- [ ] **Food and pack.** Food shows `foodsByHeal` order, each visible while
  it has a count or a row in the current port makes it, with `n/{capOf}`.
  The pack shows non-food items in `state.acquired` order under the same
  visibility rule, keys at `n/1`; a zero count is dimmed, a full one warns.
- [ ] **Cards.** `DeathCard` gains `reached {numeral} · {chapter}` and, when
  `summary.during` is set, `fell during {Skill} {noun}`.
  `FinishCard` (mockup): the book's name, the finish beat in the serif, the
  clock, core gains, max health from → to, `finished {n}×`, **Read again**
  (dispatches `begin`), the quiet line. `App` shows `FinishCard` when
  `card.finished`.
- [ ] **Log words** (`narrate`): `short` → `{Row} stops: ` plus the words
  function's text, row-named, exactly as the row shows it; `castOff` → a note
  `Port II · The Hollow Isle` after the event's own beat (the beat already
  prints on `completed`); `finished` → a note `The book is finished`;
  `unlocked` → `{Row} can now be automated`; `saveAside` → `An old save was
  set aside`. `popped` and `automated` stay out of the log.
- [ ] **Verify, commit** `feat: the screen for orders, automation, ports and the finish`

---

### Task 8: The skill pop-out

**Files:** Create `src/ui/SkillLedger.tsx` and its test. Modify
`src/ui/SkillCell.tsx`, `src/ui/SkillsBand.tsx`, `src/ui/App.tsx`,
`src/styles.css`, and tests.

**Interfaces:**
- Consumes: `gearFor`, `gearMultiplier`, `multiplier`, `expToNextLevel`,
  `tickExp`, `SkillStats`, `workOf`; mockup `2026-09-23-skills-ledger-gear`.
- Produces: `SkillsBand` props `{ content, state, runningSkill }` (the whole
  state, since the ledger reads counters and gear).

- [ ] The cell is focusable (`tabIndex={0}`, `aria-expanded`,
  `aria-haspopup="dialog"`). The ledger opens on mouse enter, focus, click
  and Enter; closes on mouse leave (unless opened by click or keyboard),
  blur, Escape, or a second click.
- [ ] Left column: **core** `permanent · +5% / level`, level, bar,
  `to level 13  14.6/25.9 xp`; **run** `this life · +1% / level`, level,
  bar, `best ever {bestRun}`; **gear**: each piece by its row's noun with
  `×1.25`, or `none`. Right column: `×1.60` over `1 + 12 × 5%`, `×1.05` over
  `1 + 5 × 1%`, the gear product over its factors (or `×1.00`), a heavy rule,
  the total, which equals the cell's `×` (a test asserts the two strings are
  identical).
- [ ] **Right now** (only while the skill runs): the row's noun, `earning
  1.58 xp/s`, `1 {item} / 4.2s` for a producer. **Lifetime · {life} lives**:
  xp (`lifetimeXp` = every level's cost below the core level plus its exp,
  derived, since the core ledger receives every tick's XP), time from
  `skillStats.ticks`, times done (the sum of `completionCounts` over the
  skill's rows).
- [ ] The percentages come from `balance.skills.*.multiplierPerLevel`, never
  typed; the same for the bases.
- [ ] The cell's `×` and its `↑` countdown include gear
  (`multiplier(skill, gearMultiplier(state, content, id))`,
  `tickExp(skill, gearMultiplier(state, content, id))`, where `skill` is the
  cell's `SkillState`), so the cell, the ledger's total and the engine agree.
- [ ] **Verify, commit** `feat: the skill pop-out, a ledger for the multiplier`

---

### Task 9: Docs and the tracker

- [ ] **VISION.md:** the pitch gains the sky world, the ship and the heroes;
  "a run is minutes" reads "tuned for about 20 minutes"; carry-forward adds
  automation earned per row.
- [ ] **MECHANICS.md:** §2 (orders, top only, pop, progress on the row, the
  look-ahead, ▶/+), the tick order with `resolve`, §4 eating smallest first
  and hurts, §5 what resets and persists (the new fields), §6 rewritten (JIT,
  the word priorities, supply, food and provisions, passive fill, the
  cycle), the shared stack cap and effects, chapters and casting off, the
  finish. Constants table: `stackCap`, `maxCatchUpMinutes`.
- [ ] **README.md:** the status paragraph describes the playable build; run
  instructions note the save and the dev speed control.
- [ ] **CLAUDE.md:** decision table unchanged; gotchas: the save key and how
  to clear it; `resolve` is the only place automation acts; `tick` takes
  `n`; a component that reads the queue keys by entry id.
- [ ] Spec status line (panel folded, built), this plan's status line.
- [ ] **Tracker** (user-approved 2026-09-23 for this build; done at merge
  time, so each close names the squashed commit on main): close #47, #7,
  #45, #10, #19, #20, #25, #27, #44, #64, #67 (#42 stays open, code panel
  round one entry 3), each with a comment
  naming the commit and the test. Before closing #47, file its two remaining
  asks from the headless-play panel as their own issues (tell a freeze the
  policy caused from one the book caused; count reactions to a popped queue as
  touches). Comment, leaving open: #54 (the damage field shipped; the derived
  `hurts` rating waits for a shelf), #58 (finish detection and card shipped;
  the shelf remains), #23 (thresholds kept or moved, with Task 5's reading),
  #21 and #22 (content carries the 20-minute life), #43 (refusal flash
  shipped; the rest remains), #53 and #52 (book two deferred by the user).
  File: the sky-world setting as a closed and locked `decision` issue, and
  any follow-up the panels leave open.
- [ ] Commit `docs: the Windward Run in VISION, MECHANICS, README, CLAUDE`

### Task 10: Code panel, then Chrome

Per `build-this-out`: the code panel (engine-reviewer, tuning-guard,
vacuous-test-hunter, a generic plan-vs-diff reviewer, and the naysayer, who
plays the build in Chrome) loops to a clean round; then the lead's own
Chrome pass with `chrome-verify`: a first life from a cleared save, Shift+click
vs click, a refused ▶, earning a chip at ×100 and setting JIT, casting off,
a death, a reload mid-run, the finish at ×100, and a clean console.

---

## Execution Handoff

Code-only project: the split is per task (global rule; presented, not asked).

```text
task  mode                     why
----  -----------------------  -------------------------------------------------------
1     done (e271fcb)           drawn in parallel with the plan panel
2     inline                   foundational: locks the format and the fixtures
3     inline                   foundational: locks the queue's module shape and the play
4     subagent (opus)          engine on Task 3's idioms; ends with the whole-book gate
5     subagent (opus), worktree the tuning loop; touches only balance and engine tests.
                               The worktree links node_modules from the main checkout
                               and adds files by explicit path (never `git add -A`,
                               which would stage the link); it lands by rebase onto the
                               branch after Task 6 commits, all four gates run again on
                               the rebased tip, then fast-forward; the worktree is
                               removed after
6     inline (parallel w/ 5)   state layer, jsdom timers, the dev server; no balance edits
7     subagent (opus)          components from mockups, jsdom tests
8     subagent (opus)          after Task 7: both edit App.tsx and styles.css
9     inline                   docs and gh writes
10    inline                   panels and Chrome
```
