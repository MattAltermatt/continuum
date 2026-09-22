#!/usr/bin/env bash
# Stop hook - the Definition-of-Done gates, once per turn.
#
# WHY STOP AND NOT PostToolUse. An earlier version of this ran `tsc` twice and the
# whole vitest suite after EVERY source edit. It was cheap on a 180-line tree and
# it was the wrong moment, for a reason that gets worse rather than better:
# PostToolUse cannot tell "broken" from "halfway through a rename". Change a type
# used by the queue, the reducer and three components, and every intermediate
# edit returns a wall of tsc output describing a state nobody intended to be
# final. A guard that is loudest during ordinary multi-file work is a guard that
# gets commented out, and the person who comments it out will be mid-feature and
# annoyed.
#
# Stop fires once, when the turn is actually finished, which is the first moment
# the tree is meant to be coherent. It keeps the whole point of the edit-time
# version -- a break surfaces on the turn that caused it, not at ship time -- and
# drops the noise. The cost also stops scaling with the number of edits in a turn.
#
# CI runs the same gates on push, and /slice-ship runs them before merge. This is
# the earliest of the three, not the only one.
#
# LOOP SAFETY. Stop supports blocking, so a hook that always exits 2 would hang
# the session. `stop_hook_active` is true when we are already inside a stop-hook
# continuation; blocking again there is how the loop forms, so we go quiet and let
# the turn end. The failure still reached Claude once, which is the job.
#
# A missing toolchain - fresh clone, worktree without an install - means this hook
# has nothing to say rather than something wrong to say.
set -uo pipefail

input=$(cat)
active=$(printf '%s' "$input" | jq -r '.stop_hook_active // false' 2>/dev/null)
[ "$active" = "true" ] && exit 0

root="${CLAUDE_PROJECT_DIR:-$PWD}"
root="${root%/}"
cd "$root" 2>/dev/null || exit 0
[ -f package.json ] || exit 0

tsc="node_modules/.bin/tsc"
vitest="node_modules/.bin/vitest"
[ -x "$tsc" ] || exit 0
[ -x "$vitest" ] || exit 0

# Nothing to check if the turn never touched source. `git diff` covers unstaged
# and staged work; untracked new files are picked up by ls-files.
changed=$(
  {
    git -C "$root" diff --name-only -- 'src/*' 2>/dev/null
    git -C "$root" diff --cached --name-only -- 'src/*' 2>/dev/null
    git -C "$root" ls-files --others --exclude-standard -- 'src/*' 2>/dev/null
  } | sort -u
)
[ -z "$changed" ] && exit 0

if ! out=$("$tsc" --noEmit 2>&1); then
  printf 'TYPECHECK FAILED - the turn is ending with a type error:\n\n%s\n' \
    "$(printf '%s' "$out" | head -40)" >&2
  exit 2
fi

# The engine half of the purity wall. Reported separately because the fix is
# architectural: this config compiles src/engine/ with no DOM library and no
# ambient types, so a failure here is a reach for a host capability that no
# import statement shows, not an ordinary type error.
if [ -f tsconfig.engine.json ] && ! out=$("$tsc" --noEmit -p tsconfig.engine.json 2>&1); then
  cat >&2 <<ENGINE
PURITY WALL - src/engine/ does not compile without the DOM:

$(printf '%s' "$out" | head -40)

This passed the root tsconfig and failed tsconfig.engine.json. That difference is
the point: the failure is an AMBIENT reach -- document, window, performance.now(),
setTimeout, process -- not an ordinary type error.

decision #4: the simulation must be runnable and testable headless. Take the host
capability as a parameter and let src/state/ supply it. Do not widen the config.
ENGINE
  exit 2
fi

if ! out=$("$vitest" run --reporter=default 2>&1); then
  printf 'TESTS FAILED - the turn is ending red:\n\n%s\n' "$(printf '%s' "$out" | tail -60)" >&2
  exit 2
fi
exit 0
