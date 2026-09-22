#!/usr/bin/env bash
# PostToolUse notice: authored numbers belong in src/balance.ts.
#
# CLAUDE.md, twice:
#   "Every tuning number lives in src/balance.ts. No magic numbers in engine or
#    component files. If you would write `if (hp <= 3)`, write
#    `if (hp <= balance.someThing)` instead."
# and it is `decision #3`, closed and locked.
#
# This WARNS. It never blocks and it never asks. The edit has already landed by
# PostToolUse, and a version that stopped to ask permission would be intolerable.
# It is also NOT the sacrosanct-tuning gate: CHANGING a number the user owns is
# still a STOP-and-ask, and the tuning-guard agent audits that before merge. This
# only notices a number that was typed somewhere it does not belong.
#
# SCOPE IS THE SIMULATION SIDE ONLY -- src/engine/, src/data/, src/state/.
# Deliberately excluded:
#
#   src/balance.ts   the destination; numbers live here by definition
#   src/ui/**        presentation. A sibling project scanned its renderer and got
#   src/main.tsx     ten structural hits on one edit -- opacity, stroke widths,
#                    180/Math.PI -- and not one true positive. That is how a guard
#                    becomes noise and gets switched off.
#   *.test.ts(x)     a test may hold expected values; balance.test.ts is nothing
#                    BUT expected values, and is the whole point of the lock.
#
# Today that scope matches nothing: no engine directory exists yet. It goes live
# with the first one, which is the point.
#
# Exit 2 surfaces stderr to Claude as feedback without undoing anything.
set -uo pipefail
payload=$(cat)

path=$(printf '%s' "$payload" | jq -r '.tool_input.file_path // .tool_input.path // empty' 2>/dev/null)
tool=$(printf '%s' "$payload" | jq -r '.tool_name // empty' 2>/dev/null)
[ -z "$path" ] && exit 0

root="${CLAUDE_PROJECT_DIR:-$PWD}"
root="${root%/}"
case "$path" in
  /*) abs="$path" ;;
  *)  abs="$root/${path#./}" ;;
esac

case "$abs" in
  *"/../"*) exit 0 ;;
esac
case "$abs" in
  "$root"/src/engine/*.ts | "$root"/src/data/*.ts | "$root"/src/state/*.ts) ;;
  *) exit 0 ;;
esac
case "$abs" in
  *.test.ts | *.test.tsx | *.d.ts) exit 0 ;;
esac

case "$tool" in
  Write)     added=$(printf '%s' "$payload" | jq -r '.tool_input.content // empty') ;;
  Edit)      added=$(printf '%s' "$payload" | jq -r '.tool_input.new_string // empty') ;;
  MultiEdit) added=$(printf '%s' "$payload" | jq -r '[.tool_input.edits[]?.new_string] | join("\n")') ;;
  *) exit 0 ;;
esac
[ -z "$added" ] && exit 0

# Slurped, so a multi-line /* */ block strips whole. A `//` preceded by `:` is
# left alone so a URL inside a string does not swallow the rest of the line.
code=$(printf '%s\n' "$added" | perl -0777 -pe 's{/\*.*?\*/}{}gs; s{(?<!:)//[^\n]*}{}g' 2>/dev/null) || code="$added"

# What looks authored: a decimal with a fractional part that is not .5, or an
# integer of three or more digits. The leading character class keeps 0x1e1b2b and
# identifiers like vec3 out. Two-digit integers stay silent -- too many of them
# are indices, and a real balance value that small is usually derived anyway.
hits=$(printf '%s\n' "$code" \
  | grep -oE '(^|[^A-Za-z0-9_.$])[0-9]+\.[0-9]+|(^|[^A-Za-z0-9_.$])[0-9_]{3,}' \
  | tr -d ' ' | sed -E 's/^[^0-9]//' \
  | grep -vE '\.5$|^[0-9]+e' \
  | grep -vxE '100|180|255|360|1000' \
  | sort -u | tr '\n' ' ')

[ -z "${hits// /}" ] && exit 0

cat >&2 <<TUNING_NOTICE
NOTICE - numeric literal(s) added in simulation code: $hits

$path

CLAUDE.md and \`decision #3\` forbid magic numbers outside src/balance.ts:

  if (hp <= 3)        ->   if (hp <= balance.someThing)

Anything derivable from something more fundamental should be derived rather than
typed in -- MECHANICS.md marks the values that are genuine starting points with a
dial, and everything else follows from them.

If these are all structural -- indices, epsilons, unit conversions -- ignore this
notice. The check is intentionally over-eager rather than silent.

It does not block, and it is not asking. Balance is the user's call either way: a
NEW field in balance.ts still needs its default agreed, and CHANGING an existing
one is a STOP-and-ask under the sacrosanct-tuning rule.
TUNING_NOTICE
exit 2
