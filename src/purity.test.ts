/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';

/**
 * The purity wall, second half.
 *
 * `decision #4` and CLAUDE.md: `src/engine/` never imports upward -- not from
 * `src/ui/`, not from `src/state/`, not from the DOM. `tsconfig.engine.json`
 * enforces the *ambient* side of that: with no DOM library and no @types, a bare
 * `performance.now()` or `document` in engine code stops compiling. This file
 * enforces the side a compiler cannot see -- a perfectly type-clean import of
 * something that simply is not part of the simulation. A pure string helper in
 * `src/ui/`, or any typed npm package, compiles fine under that config and is
 * still a breach.
 *
 * `src/engine/` has ZERO external dependencies today. That is not an accident
 * and it is not decoration: it is the property that makes CLAUDE.md's "the
 * simulation must be runnable and testable headless" true rather than a thing we
 * say. It is also what keeps engine tests sub-millisecond. Nothing but this test
 * and that tsconfig defends it.
 *
 * WHY THIS FILE LIVES OUTSIDE `src/engine/`. It imports `vitest` and would
 * otherwise have to exempt itself from its own rule as its opening move -- the
 * exact shape that gets widened later. It would also fall inside
 * `tsconfig.engine.json`'s scope, needing types that config deliberately strips.
 *
 * WHY IT READS SOURCE THROUGH VITE'S GLOB RATHER THAN `node:fs`. There is no
 * `@types/node` in this repo, so `node:fs` fails `npm run typecheck` and
 * `npm run build` outright. Adding the package would put Node globals into the
 * same program that compiles `src/engine/`, which is half of what the wall
 * exists to prevent.
 */

const sources = import.meta.glob(
  ['./engine/**/*.{ts,tsx,mts,cts}', './data/**/*.{ts,tsx,mts,cts}', './balance.ts'],
  { query: '?raw', import: 'default', eager: true },
) as Record<string, string>;

/**
 * Modules outside `src/engine/` that a file under it may import, named by their
 * RESOLVED path from `src/`, never by the specifier as written.
 *
 * This distinction is the whole correctness of the guard. `balance` is reached as
 * `'../balance'` from `engine/time.ts` and as `'../../balance'` from
 * `engine/queue/exec.ts`, and matching the specifier text would accuse the second
 * one the moment the engine grows its first subdirectory -- with a message
 * telling the author to move the rule. Every engine module imports `balance`, so
 * that false accusation would land on the first nested file ever written.
 *
 * `balance` is the shared leaf: every layer reads it and it imports nothing, so
 * it cannot carry a dependency back up. `data/` is content the engine consumes;
 * it is below the engine in the layering, not above it.
 *
 * `vitest` is allowed in a test file ONLY. This is a named allowlist rather than
 * a blanket "test files are exempt" because an exemption is invisible forever
 * once it lands, while adding an entry here is a reviewable act that someone can
 * refuse. The day an engine test wants `node:fs` or a fixture library should be
 * a conversation, not a silent pass.
 */
type Layer = { readonly targets: readonly string[]; readonly prefixes: readonly string[] };

/**
 * The layering, as a table, because all three layers are below the wall and each
 * one may reach strictly less far than the layer above it.
 *
 * `tsconfig.engine.json` only includes `src/engine`, and reaches `data/` and
 * `balance.ts` transitively at best. So for those two layers this file is the
 * ONLY persistent guard -- a pure, DOM-free helper in `src/ui/` imported by
 * `src/data/` compiles cleanly forever otherwise, and the engine then reaches it
 * through an import `data/` is explicitly allowed to make.
 */
const LAYERS: Record<string, Layer> = {
  engine: { targets: ['balance', 'engine'], prefixes: ['engine/', 'data/'] },
  data: { targets: ['balance', 'data'], prefixes: ['data/'] },
  balance: { targets: [], prefixes: [] },
};

/** Which layer a globbed path belongs to. Keys look like `./engine/queue/x.ts`. */
function layerOf(file: string): keyof typeof LAYERS {
  if (file.startsWith('./data/')) return 'data';
  if (file === './balance.ts') return 'balance';
  return 'engine';
}

const TEST_ONLY_ALLOWED = ['vitest'];

/** A test file in any of the scanned layers, in either extension. */
const isTestFile = (file: string): boolean =>
  file.endsWith('.test.ts') || file.endsWith('.test.tsx');

/**
 * Ambient globals the simulation must never reach for. `tsconfig.engine.json`
 * rejects these in engine source; it deliberately excludes engine TEST files, so
 * they are checked here instead and the exclusion stays a delegation, not a hole.
 */
const FORBIDDEN_GLOBALS = [
  'document',
  'window',
  'performance',
  'process',
  'Buffer',
  'requestAnimationFrame',
  'setTimeout',
  'setInterval',
  'localStorage',
  'fetch',
];

/** Resolve a relative specifier against the importing file, without `node:path`.
 *  Returns a normalised key in the same shape as the glob's own keys. */
function resolve(fromFile: string, spec: string): string {
  const parts = fromFile.split('/').slice(0, -1).concat(spec.split('/'));
  const out: string[] = [];
  for (const p of parts) {
    if (p === '.' || p === '') continue;
    if (p === '..') out.pop();
    else out.push(p);
  }
  return out.join('/');
}

/**
 * Split source into (a) code with comments removed and string bodies intact, and
 * (b) the same with string bodies blanked out.
 *
 * A regex cannot do this, and the two failures it produces are opposite and both
 * real. A `//` inside a string swallows the rest of the line and can HIDE a real
 * import. A DOM word inside a string -- a test titled "respects the pause
 * window" -- reads as a reach for `window` and ACCUSES a clean file. A guard must
 * never accuse a file that is fine, so the scan gets a proper single pass over
 * the characters instead.
 */
function split(src: string): {
  code: string;
  codeNoStrings: string;
  /** [start, end) spans within `code` covering string BODIES (not their quotes).
   *  A real import's specifier body sits inside one of these, but its `import`
   *  keyword does not -- which is exactly how a string that merely contains the
   *  text of an import is told apart from an import. */
  strings: Array<[number, number]>;
} {
  let code = '';
  let bare = '';
  const strings: Array<[number, number]> = [];
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i]!;
    const next = src[i + 1];
    if (c === '/' && next === '/') {
      while (i < n && src[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && next === '*') {
      i += 2;
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      const quote = c;
      code += c;
      bare += c;
      i++;
      const bodyStart = code.length;
      while (i < n && src[i] !== quote) {
        if (src[i] === '\\') {
          code += src[i]! + (src[i + 1] ?? '');
          i += 2;
          continue;
        }
        code += src[i];
        i++;
      }
      strings.push([bodyStart, code.length]);
      code += src[i] ?? '';
      bare += quote;
      i++;
      continue;
    }
    code += c;
    bare += c;
    i++;
  }
  return { code, codeNoStrings: bare, strings };
}

/** Import specifiers. Covers `import x from 'y'`, bare `import 'y'`,
 *  `import type`, `export … from 'y'`, `export * from 'y'`, and dynamic
 *  `import('y')` -- including the backtick spelling, which is a real hole
 *  otherwise: tsc does not resolve a template literal either, so `import(`…`)`
 *  is the one import shape BOTH guards would miss. */
function specifiersOf(src: string): string[] {
  const { code, strings } = split(src);
  /** Does any string body overlap [from, to)? */
  const crossesString = (from: number, to: number): boolean =>
    strings.some(([a, b]) => a < to && b > from);
  const out: string[] = [];
  const patterns = [
    /\bimport\s+(?:[\s\S]*?\sfrom\s+)?['"]([^'"]+)['"]/g,
    /\bexport\s+[\s\S]*?\sfrom\s+['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    // Backtick, but only with no interpolation -- `${x}` is not a static
    // specifier and tsc does catch the variable form.
    /\bimport\s*\(\s*`([^`$]+)`\s*\)/g,
    // CommonJS. Neither config nor any other guard reliably sees this: `require`
    // currently fails to compile only because `@types/node` is absent, and tsc's
    // error for it actively recommends installing the package that would make
    // `require('../ui/App')` type-clean and invisible.
    /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];
  for (const re of patterns) {
    for (const m of code.matchAll(re)) {
      if (!m[1]) continue;
      // Everything from the keyword to the specifier's opening quote must be
      // real code. Checking only the keyword is not enough: in
      //   export const s = "import x from '../ui/y'";
      // the `export` IS real code and the lazy match then reaches forward into
      // the string for its specifier. Reporting that is a false accusation.
      const specStart = m.index + m[0].lastIndexOf(m[1]);
      if (crossesString(m.index, specStart)) continue;
      out.push(m[1]);
    }
  }
  // Deduped: the patterns overlap on a plain `import x from 'y'`, and a doubled
  // line in the failure report reads as two breaches instead of one.
  return [...new Set(out)];
}

describe('the purity wall', () => {
  it('is actually reading the engine', () => {
    // A glob that silently matches nothing would make every assertion below
    // vacuously true. That is the failure this kind of test most often has, and
    // it is invisible: the suite stays green while defending nothing. Fail loudly
    // instead, and raise this floor as the engine grows.
    // Deliberately NOT pinned to a named file. A guard that hard-asserts
    // `time.ts` exists fails with a missing-file error the day that module is
    // renamed or absorbed -- an error about purity that has nothing to do with
    // purity. What must be true is that the glob found engine SOURCE, not only
    // tests, since source is what the other two cases scan.
    const files = Object.keys(sources);
    const sourceFiles = files.filter((f) => !f.endsWith('.test.ts'));
    expect(files.length, 'the glob matched no engine files at all').toBeGreaterThan(0);
    expect(sourceFiles.length, 'the glob matched only tests, so the wall scans nothing').toBeGreaterThan(0);
  });

  it('allows a NESTED engine module to reach the shared leaf', () => {
    // A regression test for the guard itself. `engine/queue/exec.ts` reaches
    // balance as '../../balance'; an earlier version of this file matched the
    // specifier text against '../balance' and reported the deeper spelling as a
    // breach. Every engine module imports balance, so that bug would have fired
    // on the first nested file ever written.
    const from = './engine/queue/exec.ts';
    expect(resolve(from, '../../balance')).toBe('balance');
    expect(resolve(from, '../../data/actions')).toBe('data/actions');
    expect(resolve(from, '../time')).toBe('engine/time');
    // And the wall still holds at depth.
    expect(resolve(from, '../../ui/Row')).toBe('ui/Row');
  });

  it('never imports upward, in any of the three layers below the wall', () => {
    const breaches: string[] = [];
    for (const [file, src] of Object.entries(sources)) {
      const layer = LAYERS[layerOf(file)]!;
      const isTest = isTestFile(file);
      for (const spec of specifiersOf(src)) {
        if (isTest && TEST_ONLY_ALLOWED.includes(spec)) continue;
        if (!spec.startsWith('.')) {
          breaches.push(`${file} -> ${spec}   (external package)`);
          continue;
        }
        // Resolve FIRST, then judge the target. Judging the specifier text is
        // how a guard ends up accusing `'../../balance'` while allowing
        // `'../balance'` -- the same module, two depths.
        const target = resolve(file, spec);
        if (layer.targets.includes(target)) continue;
        if (layer.prefixes.some((prefix) => target.startsWith(prefix))) continue;
        breaches.push(`${file} -> ${spec}   (resolves to ${target})`);
      }
    }
    expect(
      breaches,
      'The dependency runs one way. src/engine/ may import its own siblings,\n' +
        'balance and data/; src/data/ may import its own siblings and balance;\n' +
        'src/balance.ts may import nothing. src/ui/ and src/state/ may import\n' +
        'downward, never the reverse. Move the rule -- do not widen this guard.\n\n' +
        breaches.join('\n'),
    ).toEqual([]);
  });

  it('never reaches for a DOM or host global, tests included', () => {
    // tsconfig.engine.json covers engine SOURCE for this and excludes engine TEST
    // files, because vitest's own types can drag DOM references in and a false
    // accusation against clean code trains you to ignore a true one. This closes
    // that gap without reintroducing the fragility.
    const breaches: string[] = [];
    for (const [file, src] of Object.entries(sources)) {
      if (!isTestFile(file)) continue;
      const { code, codeNoStrings } = split(src);
      for (const g of FORBIDDEN_GLOBALS) {
        // Identifier position only. Not after a dot (`w.process`), not before a
        // colon (`{ process: 1 }`) -- both are ordinary names that happen to
        // collide, and flagging them is the false accusation this guard must
        // never make. Strings are already blanked by split().
        const bare = new RegExp(`(?<![.\\w$])${g}\\b(?!\\s*:)`);
        // ...which is exactly why the prefixed spellings need their own pattern.
        // `globalThis.performance.now()` is the same reach wearing a prefix the
        // lookbehind above was written to forgive, and it is what someone reaches
        // for once the bare spelling has been flagged. `?.` and the bracket form
        // are the same reach again; covering only the dot is covering one of four.
        // Four spellings, two shapes. `?.` has to be handled inside EACH shape
        // rather than factored out in front: in `globalThis?.performance` the
        // `?.` supplies the dot, and in `globalThis?.['fetch']` it precedes a
        // bracket. A single optional `\\??` in front serves one and breaks the
        // other, which is how `?.['fetch']` survived the first attempt.
        const viaHost = new RegExp(
          `(?:globalThis|window)\\s*(?:(?:\\?\\.|\\.)\\s*${g}\\b` +
            `|(?:\\?\\.)?\\s*\\[\\s*['"\`]${g}['"\`]\\s*\\])`,
        );
        // NOTE the different inputs, and they are not interchangeable. The bare
        // pattern runs on string-blanked text so a test *titled* "respects the
        // pause window" is not accused. The prefixed pattern must run on text
        // with string bodies INTACT, because the bracket form puts the global's
        // name inside a string -- blanking it made this branch unmatchable, which
        // is how it sat here as dead code. A literal `globalThis[` inside a
        // string is rare enough to accept; a bare `window` in prose is not.
        if (bare.test(codeNoStrings) || viaHost.test(code)) {
          breaches.push(`${file} -> ${g}`);
        }
      }
    }
    expect(breaches, `An engine test reached for a host global:\n${breaches.join('\n')}`).toEqual(
      [],
    );
  });
});
