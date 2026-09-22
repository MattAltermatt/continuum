#!/usr/bin/env bash
# PostToolUse notice: source was edited while on `main`.
#
# CLAUDE.md: "Work on feature/... branches, never directly on main." Nothing else
# enforces it, so a src edit can quietly land on main and only be noticed at
# commit time -- which is exactly what happened on the scaffold commits.
#
# This WARNS, it does not block. The blocking version is one line away: move the
# entry from PostToolUse to PreToolUse in .claude/settings.json and the same
# exit 2 refuses the edit instead of reporting it. Left as a notice on purpose --
# nothing in this repo's tooling stops the user mid-thought.
#
# Scope is src/**.ts and src/**.tsx only. Doc and config commits land on main
# routinely (a doc-refresh pass is mostly that), and guarding every file would
# fire on the normal docs-on-main flow.
set -uo pipefail

input=$(cat)
file=$(printf '%s' "$input" | jq -r '.tool_input.file_path // .tool_input.path // empty' 2>/dev/null)
[ -z "$file" ] && exit 0

# Resolve against the project, so `src/balance.ts` and an absolute path behave
# the same. All the hooks here agree on this; a relative path that only matched
# as text would silently switch the guard off.
root="${CLAUDE_PROJECT_DIR:-$PWD}"
root="${root%/}"
case "$file" in
  /*) abs="$file" ;;
  *)  abs="$root/${file#./}" ;;
esac

case "$abs" in
  *"/../"*) exit 0 ;;
esac
# Source under this project's own src/. A docs/src/ lookalike is not source.
case "$abs" in
  "$root"/src/*.ts | "$root"/src/*.tsx) ;;
  *) exit 0 ;;
esac

# The file may not exist yet -- Write creating a new one -- so walk up to the
# nearest existing ancestor and let `git -C` resolve the repo either way.
dir="$(dirname "$abs")"
while [ -n "$dir" ] && [ "$dir" != "/" ] && [ ! -d "$dir" ]; do
  dir="$(dirname "$dir")"
done

branch="$(git -C "$dir" rev-parse --abbrev-ref HEAD 2>/dev/null || echo)"
[ "$branch" = "main" ] || exit 0

{
  printf 'NOTICE - source edited on `main`: %s\n\n' "$file"
  printf 'CLAUDE.md: all feature work goes on a branch. Move it before committing:\n'
  printf '  git checkout -b feature/<name>\n\n'
  printf 'The edit stands. Docs-only edits on main are fine; this only sees src/.\n'
} >&2
exit 2
