// Component tests run under jsdom via a `@vitest-environment jsdom` docblock.
// Engine tests run under node, where jest-dom's matchers have nothing to
// attach to, so the import is guarded rather than unconditional.
if (typeof document !== 'undefined') {
  await import('@testing-library/jest-dom/vitest');
}

export {};
