import type { LockManagerLike } from '../state/tabs';

interface Holder { readonly reject: (e: Error) => void }
type Run = () => void;

/** navigator.locks in miniature: FIFO per name, one grant per microtask; steal rejects the holder's request; a signal aborts a queued request. */
export function fakeLocks(): LockManagerLike & { readonly heldNames: () => readonly string[] } {
  const held = new Map<string, Holder>();
  const queues = new Map<string, Run[]>();
  const pending = new Set<string>();
  const pump = (name: string): void => {
    if (held.has(name) || pending.has(name)) return;
    const run = queues.get(name)?.shift();
    if (run === undefined) return;
    pending.add(name);
    queueMicrotask(() => { pending.delete(name); run(); });
  };
  const grant = (name: string, callback: (lock: unknown) => Promise<unknown>, resolve: (v: unknown) => void, reject: (e: Error) => void): void => {
    // The real manager never holds a name twice; a fake that did would let a consumer's test pass by accident.
    if (held.has(name)) throw new Error(`double grant on ${name}`);
    const holder: Holder = { reject };
    held.set(name, holder);
    void Promise.resolve(callback({})).then((v) => {
      if (held.get(name) === holder) { held.delete(name); pump(name); }
      resolve(v);
    });
  };
  return {
    heldNames: () => [...held.keys()],
    request(name, options, callback) {
      return new Promise<unknown>((resolve, reject) => {
        if (options.steal === true) {
          const current = held.get(name);
          if (current !== undefined) { held.delete(name); current.reject(new Error('AbortError')); }
          grant(name, callback, resolve, reject);
          return;
        }
        const run: Run = () => {
          if (options.signal?.aborted === true) { reject(new Error('AbortError')); pump(name); return; }
          grant(name, callback, resolve, reject);
        };
        const queue = queues.get(name) ?? [];
        queues.set(name, queue);
        queue.push(run);
        options.signal?.addEventListener('abort', () => {
          const i = queue.indexOf(run);
          if (i >= 0) { queue.splice(i, 1); reject(new Error('AbortError')); }
        });
        pump(name);
      });
    },
  };
}
