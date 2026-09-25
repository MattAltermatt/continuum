/**
 * The save (spec 2026-09-23-the-windward-run section 10, #27): one versioned
 * record of the whole run. A format or a book the game does not know is set
 * aside under a second key, never loaded and never silently overwritten.
 */
import type { Book } from '../data/types';
import { windwardRun } from '../data/windward-run';
import { cycleOf, withoutOrphans } from '../engine/automation';
import { NO_STATS } from '../engine/queue';
import { here } from '../engine/rows';
import { newSkill } from '../engine/skills';
import type { GameState } from '../engine/types';
import type { Model } from './useGame';

export const SAVE_KEY = 'continuum.save';
/**
 * The Windward Run keeps the bare key, so every save written before books had
 * keys still loads; any other book has its own. (A book id of "aside" would
 * collide with ASIDE_KEY; no book is called that.)
 */
export function saveKey(book: Pick<Book, 'id'>): string {
  return book.id === windwardRun.id ? SAVE_KEY : `${SAVE_KEY}.${book.id}`;
}
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
  && (e.by === 'player' || e.by === 'auto') && (e.left === undefined || (Number.isInteger(e.left) && (e.left as number) >= 1))
  && (e.for === undefined || typeof e.for === 'number') && (e.forced === undefined || e.forced === true);
const isIndex = (n: unknown): boolean => typeof n === 'number' && Number.isInteger(n) && n >= 0;
/** The page events (#78) carry fields narration reads without a guard: a page turn's indices, a page pop's waits. */
const isPageEvent = (e: Record<string, unknown>): boolean =>
  (e.type !== 'pageTurn' || (isIndex(e.chapter) && isIndex(e.page)))
  && (e.type !== 'popped' || e.reason !== 'page' || (Array.isArray(e.waits) && e.waits.every((w) => typeof w === 'string')));
const isLine = (l: unknown): boolean =>
  isRecord(l) && typeof l.seq === 'number' && typeof l.at === 'number' && isRecord(l.event) && typeof l.event.type === 'string'
  && isPageEvent(l.event);

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
    if (e.type === 'castOff' && !(typeof e.chapter === 'number' && Number.isInteger(e.chapter) && e.chapter >= 0 && e.chapter < book.chapters.length)) return false;
    // A page turn's shape is checked as the save loads; one past the pages this version of the book has goes, as a castOff does.
    if (e.type === 'pageTurn' && !((e.chapter as number) < book.chapters.length && (l.event as { readonly page: number }).page < book.chapters[e.chapter as number]!.pages.length)) return false;
    const waits = (l.event as { readonly waits?: unknown }).waits;
    if (Array.isArray(waits) && !waits.every((w) => typeof w === 'string' && Object.hasOwn(book.actions, w))) return false;
    return true;
  });
}

/** How many set-aside saves are kept, newest last. Housekeeping, not tuning. */
export const ASIDE_KEEP = 3;

/**
 * Adds a raw save to the aside list, keeping the newest ASIDE_KEEP. Adding the
 * same text twice in a row keeps one copy: React runs a mount effect twice in
 * development, and a save set aside twice is still one save.
 */
export function asideText(existing: string | null, raw: string): string {
  let list: unknown = [];
  try { list = existing === null ? [] : JSON.parse(existing); } catch { list = []; }
  const kept = Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string') : [];
  return JSON.stringify((kept[kept.length - 1] === raw ? kept : [...kept, raw]).slice(-ASIDE_KEEP));
}

function keep<V>(record: Readonly<Record<string, V>>, ok: (key: string) => boolean): Record<string, V> {
  return Object.fromEntries(Object.entries(record).filter(([k]) => ok(k)));
}

/**
 * A save for this book from an older version of it: rows and items the book
 * no longer has are dropped, skills the roster gained start fresh, skills it
 * lost go, and a chapter past the last becomes the last. Orders for rows
 * off the loaded page go, and a mode a row's cycle no longer offers reads off
 * (#78). The tick's stale events go too: the next tick writes its own.
 */
export function reconcile(state: GameState, book: Book): GameState {
  const row = (id: string) => Object.hasOwn(book.actions, id);
  const item = (id: string) => Object.hasOwn(book.items, id);
  const skills = Object.fromEntries(book.roster.map((r) => [r.id, state.skills[r.id] ?? newSkill()]));
  const kept: GameState = {
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
    // A save from before #77 has no turn to keep: food goes first.
    idleFed: state.idleFed === true,
    completionCounts: keep(state.completionCounts, row),
    automation: keep(state.automation, row),
    chapter: Math.min(Math.max(0, Math.floor(state.chapter)), book.chapters.length - 1),
    events: [],
  };
  // The page is derived from what is done, so it is read off the kept state. An order for a row the book no longer
  // has, or that this page does not list, goes as a page turn would take it, and a supply whose order went leaves
  // with it, as it would have on an x. A mode the row's cycle no longer offers (JIT on a row only a later page
  // needs, #78) reads off.
  return {
    ...kept,
    queue: withoutOrphans(kept.queue.filter((e) => here(kept, book, e.actionId))),
    automation: keep(kept.automation, (id) => cycleOf(book, book.actions[id]!).includes(kept.automation[id]!)),
  };
}
