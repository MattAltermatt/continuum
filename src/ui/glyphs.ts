/**
 * The spec's control and warning glyphs, written as escapes. CLAUDE.md forbids
 * emoji in code, and U+26A0 and U+25B6 carry the Unicode Emoji property even
 * though they render as text here. Named once so no component types them.
 */
export const WARN = '\u26A0';
export const PLAY = '\u25B6';
export const PAUSE = '\u275A\u275A';
/** Decay accelerates (spec 8.6). None of these three carries the Emoji property; escapes for the file's convention. */
export const RISING = '\u25B2';
export const ARROW = '\u2192';
export const MINUS = '\u2212';
/** A split that matched last life's to the second (spec 2026-09-25-log-delta section 2). */
export const PLUS_MINUS = '\u00B1';
