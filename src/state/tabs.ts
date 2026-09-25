/**
 * One tab plays (#73, spec 2026-09-24-proving-ground section 3): a named Web
 * Lock per save key, held for the tab's life. The mount request is queued with
 * a short abort rather than asked ifAvailable: an ifAvailable request in the
 * same task as a release is refused, and React's development remount is that
 * task. A second tab's wait runs out and it is answered "held"; Play here
 * steals. The tab that loses sees its request reject (the API rejects a stolen
 * holder's request), which is the whole signal. src/state/ supplies the lock
 * manager; the engine never sees it.
 */
export interface LockManagerLike {
  request(name: string, options: { steal?: boolean; signal?: AbortSignal }, callback: (lock: unknown | null) => Promise<unknown>): Promise<unknown>;
}
export interface Held { readonly release: () => void; readonly lost: Promise<void> }

export function lockName(saveKey: string): string {
  return `continuum.lock.${saveKey}`;
}

/** A queued request; `waitMs` aborts it (null) if it is not granted by then; `steal` takes it from a holder. */
export function acquire(locks: LockManagerLike, name: string, opts: { steal: boolean; waitMs: number }): Promise<Held | null> {
  return new Promise((resolve) => {
    let release: () => void = () => {};
    let released = false;
    let granted = false;
    const until = new Promise<void>((r) => { release = () => { released = true; r(); }; });
    let onLost: () => void = () => {};
    const lost = new Promise<void>((r) => { onLost = r; });
    const controller = new AbortController();
    const timer = opts.steal ? null : setTimeout(() => controller.abort(), opts.waitMs);
    const request = locks.request(name, opts.steal ? { steal: true } : { signal: controller.signal }, () => {
      granted = true;
      if (timer !== null) clearTimeout(timer);
      resolve({ release, lost });
      return until;
    });
    // Released: the request resolves, no loss. Stolen: it rejects after a grant, a loss. The wait ran out: it rejects
    // before any grant, null.
    void request.then(
      () => { if (!released) onLost(); },
      () => { if (granted) { if (!released) onLost(); } else resolve(null); },
    );
  });
}

/** The browser's lock manager, or null where there is none (an old browser, an insecure origin, jsdom). */
export function defaultLocks(): LockManagerLike | null {
  try { return typeof navigator !== 'undefined' && navigator.locks !== undefined ? navigator.locks : null; } catch { return null; }
}
