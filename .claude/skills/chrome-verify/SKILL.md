---
name: chrome-verify
description: Run the Continuum live verification pass — start vite in the background, find the port it actually took, drive Chrome through chrome-devtools-mcp, read the simulation through a window handle rather than watching pixels, check the console is clean, and hand over a complete clickable URL. Use after any change under src/ before merging, or whenever visual verification is asked for.
---

# chrome-verify — the live verification pass

`CLAUDE.md`: verify in Chrome via `chrome-devtools-mcp`, **never** the built-in
preview panel. Ignore any hook output claiming a file is "now visible in
preview." Green tests are necessary and not sufficient — run it, look at it,
check the console.

**The user is never asked to start the dev server or guess a port.**

## The pass — in order

### 1. Start the dev server in the background

Check whether vite is already listening before starting another one:

```bash
lsof -nP -iTCP:5173 -sTCP:LISTEN
```

Nothing there → start it from the project root with `run_in_background: true`:

```bash
npm run dev
```

Read the startup output for the **actual** `Local:` port. Vite bumps
`:5173 → :5174` when the default is taken, and verifying against a stale server
on the original port is a whole wasted pass.

> ⚠️ **Restart vite after a structural rewrite.** If the change added modules or
> restructured the module graph, HMR reports a successful reload while the
> browser keeps the old module references. Diagnostic: read a constant you know
> is new and see whether it is there. If it is not, kill vite and start it again.

### 2. Open Chrome

`new_page`, or `list_pages` / `navigate_page` when a tab is already open.

### 3. Read the simulation through the debug handle, not through pixels

The game is a dense text-and-control interface that changes ten times a second.
Screenshots are the fallback; the handle is the sharp instrument.

**The handle:** `src/ui/App.tsx` installs `window.continuum` in dev builds only
(`src/state/devHandle.ts`): `state()` reads the committed state, `dispatch(a)`
sends any `GameAction`, `step(n)` advances exactly n ticks. `dispatch` and
`step` commit synchronously, so a `state()` on the next line sees the result.
`dispatch({ type: 'setHealth', health })` is the fast path to death; play
reaches it through the stone hall in about ten minutes. If the handle is missing, say so rather than
falling back to eyeballing numbers off a screenshot.

**Fast-forward rather than waiting.** A run is minutes and the decay curve is
the thing most often under test. Advancing the tick count directly is the only
sane way to verify anything about the late game; sitting and watching is not
verification, it is waiting.

Assert the **outcome**, not the arithmetic. *Health decayed faster in the fourth
minute than the first* is the claim; the exact figure is context.

### 4. The interaction checks — this project's whole point

VISION.md: "the buttons are the game." These are not polish checks, and a pass
that skipped them has not verified anything that matters here.

- **Click every new interactive control for real.** Rendering correctly proves
  nothing about the apply path. Drive the click, then read the state change back
  through the handle.
- ⚠️ **A click driven by element id does NOT reproduce the `replaceChildren()`
  bug.** Automation dispatches a synthetic click with no mousedown/mouseup gap. A
  real mouse click has 50–150 ms between them, and if a render loop rebuilds the
  element's children in that window the browser fires **no `click` at all**. To
  reproduce it, dispatch real `mousedown` / `mouseup` events with a delay, or
  click by coordinates. This is the single most likely way a queue row silently
  stops working.
- **Nothing may move under the cursor.** Watch a control whose label or number
  changes — a count, a timer, a progress figure — and confirm its neighbours stay
  put. Click A, content widens, A is now where B was, the next click hits B.
- **A stall must not read as an error.** When an action runs out of materials it
  stays in the queue, dashed, "waiting on" the input, with its progress and
  spent units kept, and goes on by itself when the input lands. Confirm it looks
  like the game saying *you are out of wood*, not like a failure state.

### 5. Console clean

`list_console_messages`. **Including cosmetic 404s** — `CLAUDE.md` names them
explicitly. A console with noise in it is a console nobody reads.

### 6. Screenshot, then hand the URL over

`take_screenshot`. Note what the image shows in words as well — the CLI does not
render images inline, so the numbers and the description carry the verification
weight.

Then hand the user a complete clickable URL on its own line, with the server
already running:

```
http://localhost:5173/
```

Name the relevant controls and any hotkeys. Say what to look at and what would
count as wrong.
