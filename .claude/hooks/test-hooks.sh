#!/usr/bin/env bash
# The hooks' own test suite. Run it:  npm run test:hooks
#
# A guard that has never been watched failing is decoration, and a guard that has
# silently STOPPED firing is worse than none -- it is a wall everyone believes in.
# So every hook here has at least one case that MUST fire and several that MUST
# NOT, and the must-not cases are the point: each one is a lookalike that a hook
# in a sibling project actually got wrong.
#
#   - a docs/src/ path matched as text and got scanned as source (branch-guard
#     still carries this case, and the file it names is really written -- an
#     earlier version asserted silence against a path that did not exist, so the
#     check passed because the hook bailed on a missing file rather than because
#     the path filter worked)
#   - a relative file_path silently switched a guard off, because only absolute
#     paths matched the case pattern
#   - a missing node_modules came back as a purity accusation against clean code
#   - the renderer's opacity values were reported as unauthorised balance numbers
#
# The hardest failures are cases that pass for the WRONG reason. branch-guard is
# therefore tested against throwaway repos whose branch is known, never against
# whatever branch this checkout happens to be on -- deriving the expectation from
# the same `git rev-parse` the hook calls collapses both outcomes into one and
# tests nothing.
#
# Exit codes under test: 0 = silent, 2 = message handed back to Claude.
set -uo pipefail
cd "$(dirname "$0")/../.." || exit 1
ROOT=$PWD
HOOKS="$ROOT/.claude/hooks"

pass=0
fail=0

report() { # want got label
  if [ "$1" = "$2" ]; then
    pass=$((pass + 1))
  else
    fail=$((fail + 1))
    printf '  FAIL  %-62s want=%-3s got=%s\n' "$3" "$1" "$2"
  fi
}

contains() { # haystack needle label
  case "$1" in
    *"$2"*) pass=$((pass + 1)) ;;
    *) fail=$((fail + 1)); printf '  FAIL  %-62s missing=%s\n' "$3" "$2" ;;
  esac
}

run_in() { # projectdir hook payload -> exit code
  local code
  printf '%s' "$3" | CLAUDE_PROJECT_DIR="$1" bash "$HOOKS/$2" >/dev/null 2>&1
  code=$?
  printf '%s' "$code"
}

run() { # hook payload -> exit code
  run_in "$ROOT" "$1" "$2"
}

stderr_in() { # projectdir hook payload -> stderr text
  printf '%s' "$3" | CLAUDE_PROJECT_DIR="$1" bash "$HOOKS/$2" 2>&1 >/dev/null
}

edit() { # path newstring -> payload
  jq -nc --arg p "$1" --arg s "$2" '{tool_name:"Edit",tool_input:{file_path:$p,new_string:$s}}'
}

write() { # path content -> payload
  jq -nc --arg p "$1" --arg c "$2" '{tool_name:"Write",tool_input:{file_path:$p,content:$c}}'
}

# A throwaway project: real git repo on a named branch, with files placed at
# given paths. Nothing here touches the real checkout.
scratch=$(mktemp -d)
trap 'rm -rf "$scratch"' EXIT

make_project() { # name branch -> prints dir
  local d="$scratch/$1"
  mkdir -p "$d/src/engine" "$d/src/ui" "$d/src/state" "$d/docs/src"
  git -C "$d" init -q -b "$2" 2>/dev/null
  git -C "$d" config user.email t@t >/dev/null 2>&1
  git -C "$d" config user.name t >/dev/null 2>&1
  : > "$d/README.md"
  git -C "$d" add -A >/dev/null 2>&1
  git -C "$d" commit -qm init >/dev/null 2>&1
  printf '%s' "$d"
}

echo
echo "branch-guard.sh"
ON_MAIN=$(make_project on-main main)
ON_FEAT=$(make_project on-feat feature/x)
: > "$ON_MAIN/src/engine/a.ts"; : > "$ON_FEAT/src/engine/a.ts"
: > "$ON_MAIN/docs/src/a.ts"

report 2 "$(run_in "$ON_MAIN" branch-guard.sh "$(edit "$ON_MAIN/src/engine/a.ts" x)")" \
  "fires on a src edit while on main"
report 2 "$(run_in "$ON_MAIN" branch-guard.sh "$(edit "src/engine/a.ts" x)")" \
  "fires the same for a RELATIVE path"
report 0 "$(run_in "$ON_FEAT" branch-guard.sh "$(edit "$ON_FEAT/src/engine/a.ts" x)")" \
  "silent on a feature branch"
report 0 "$(run_in "$ON_MAIN" branch-guard.sh "$(edit "$ON_MAIN/README.md" x)")" \
  "silent for a doc edit on main"
report 0 "$(run_in "$ON_MAIN" branch-guard.sh "$(edit "$ON_MAIN/docs/src/a.ts" x)")" \
  "silent for docs/src/ -- a lookalike, not source"
report 0 "$(run_in "$ON_MAIN" branch-guard.sh '{"tool_name":"Edit","tool_input":{}}')" \
  "silent when the payload carries no path"
report 2 "$(run_in "$ON_MAIN" branch-guard.sh "$(edit "$ON_MAIN/src/engine/new.ts" x)")" \
  "fires for a file that does not exist yet -- the Write-a-new-file case"

echo
echo "tuning-literals.sh"
T=$(make_project tuning main)
report 2 "$(run_in "$T" tuning-literals.sh "$(write "$T/src/engine/decay.ts" 'const g = 1.25;')")" \
  "fires: a decimal in engine code"
report 2 "$(run_in "$T" tuning-literals.sh "$(write "$T/src/data/items.ts" 'const c = 9000;')")" \
  "fires: a 4-digit integer in data"
report 0 "$(run_in "$T" tuning-literals.sh "$(write "$T/src/balance.ts" 'const g = 1.25;')")" \
  "silent: balance.ts IS the destination"
report 0 "$(run_in "$T" tuning-literals.sh "$(write "$T/src/ui/Bar.tsx" 'const o = 0.35;')")" \
  "silent: src/ui/ is presentation, where a sibling guard drowned in false hits"
report 0 "$(run_in "$T" tuning-literals.sh "$(write "$T/src/engine/decay.test.ts" 'expect(x).toBe(1.25);')")" \
  "silent: a test may hold expected values"
report 0 "$(run_in "$T" tuning-literals.sh "$(write "$T/src/engine/a.ts" 'const a = 100, b = 360, c = 1000;')")" \
  "silent: structural constants on the allowlist"
report 0 "$(run_in "$T" tuning-literals.sh "$(write "$T/src/engine/a.ts" 'const half = x * 0.5;')")" \
  "silent: .5 is a half, not a tuning value"
report 0 "$(run_in "$T" tuning-literals.sh "$(write "$T/src/engine/a.ts" '// decay was 1.25 before')")" \
  "silent: a number inside a COMMENT is not authored code"
report 0 "$(run_in "$T" tuning-literals.sh "$(write "$T/src/engine/a.ts" 'const c = 0x1e1b2b;')")" \
  "silent: a hex literal is not a decimal"

echo
echo "gates-on-stop.sh"
# A Stop hook that only ever exits 0 would be indistinguishable from a working
# one, which is the exact defect an earlier version of this suite shipped: every
# check for the expensive hooks was a `report 0`, so stubbing either hook body to
# `exit 0` left all 32 checks passing. These use STUB TOOLCHAINS so the firing
# path is actually walked -- real tsc and vitest are far too slow to run four
# times inside a guard suite, and stubbing is what makes a must-fire case cheap
# enough to keep.
stub_project() { # name tsc_behaviour vitest_behaviour -> prints dir
  local d="$scratch/$1"
  mkdir -p "$d/src/engine" "$d/node_modules/.bin"
  printf '{"name":"stub"}' > "$d/package.json"
  : > "$d/tsconfig.engine.json"
  git -C "$d" init -q -b main 2>/dev/null
  git -C "$d" config user.email t@t >/dev/null 2>&1
  git -C "$d" config user.name t >/dev/null 2>&1
  printf 'export const x = 1;\n' > "$d/src/engine/a.ts"   # untracked => a src change
  printf '#!/usr/bin/env bash\n%s\n' "$2" > "$d/node_modules/.bin/tsc"
  printf '#!/usr/bin/env bash\n%s\n' "$3" > "$d/node_modules/.bin/vitest"
  chmod +x "$d/node_modules/.bin/tsc" "$d/node_modules/.bin/vitest"
  printf '%s' "$d"
}

STOP='{"stop_hook_active":false}'

# Root tsconfig fails: an ordinary type error.
G1=$(stub_project g-type 'echo "src/engine/a.ts(1,1): error TS2304: Cannot find name \x27q\x27."; exit 1' 'exit 0')
report 2 "$(run_in "$G1" gates-on-stop.sh "$STOP")" "FIRES when typecheck fails"
contains "$(stderr_in "$G1" gates-on-stop.sh "$STOP")" "TYPECHECK FAILED" \
  "names the failure TYPECHECK FAILED"

# Root tsconfig passes, the engine program fails: an ambient reach. The stub
# fails only when invoked with -p, which is how the two calls are told apart.
G2=$(stub_project g-purity 'for a in "$@"; do [ "$a" = "-p" ] && { echo "src/engine/a.ts(1,1): error TS2304: Cannot find name \x27performance\x27."; exit 1; }; done; exit 0' 'exit 0')
report 2 "$(run_in "$G2" gates-on-stop.sh "$STOP")" "FIRES when the engine program fails"
contains "$(stderr_in "$G2" gates-on-stop.sh "$STOP")" "PURITY WALL" \
  "reports an ambient reach as PURITY WALL, not as a type error"

# Both typechecks pass, the suite is red.
G3=$(stub_project g-test 'exit 0' 'echo "FAIL src/engine/a.test.ts"; exit 1')
report 2 "$(run_in "$G3" gates-on-stop.sh "$STOP")" "FIRES when the suite is red"
contains "$(stderr_in "$G3" gates-on-stop.sh "$STOP")" "TESTS FAILED" \
  "names the failure TESTS FAILED"

# Everything green.
G4=$(stub_project g-green 'exit 0' 'exit 0')
report 0 "$(run_in "$G4" gates-on-stop.sh "$STOP")" "silent when every gate passes"

# Loop safety. Same broken project as G1, but already inside a stop continuation:
# blocking again is how a Stop hook hangs a session.
report 0 "$(run_in "$G1" gates-on-stop.sh '{"stop_hook_active":true}')" \
  "silent when already inside a stop-hook continuation -- loop safety"

# A turn that touched no source has nothing to gate. Same failing stubs.
G5=$(stub_project g-nosrc 'echo "boom"; exit 1' 'exit 0')
rm -f "$G5/src/engine/a.ts"
report 0 "$(run_in "$G5" gates-on-stop.sh "$STOP")" "silent when the turn touched no src/ file"

# No toolchain: nothing to say, rather than something wrong to say.
N=$(make_project no-toolchain main)
report 0 "$(run_in "$N" gates-on-stop.sh "$STOP")" "silent with no package.json"

echo
if [ "$fail" -eq 0 ]; then
  printf '  %s checks passed.\n\n' "$pass"
  exit 0
fi
printf '\n  %s passed, %s FAILED.\n\n' "$pass" "$fail"
exit 1
