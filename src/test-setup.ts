// Component tests run under jsdom via a `@vitest-environment jsdom` docblock.
// Engine tests run under node, where jest-dom's matchers have nothing to
// attach to, so the import is guarded rather than unconditional.
if (typeof document !== 'undefined') {
  await import('@testing-library/jest-dom/vitest');
}

// The game autosaves to localStorage (src/state/save.ts). jsdom keeps it across the tests in a
// file, so a test could open on the run the test before it saved: clear it after each one. Guarded
// on the document, not on localStorage: under node, merely reading the global prints an
// ExperimentalWarning in every worker.
if (typeof document !== 'undefined') {
  const { afterEach } = await import('vitest');
  afterEach(() => window.localStorage.clear());
}

export {};
