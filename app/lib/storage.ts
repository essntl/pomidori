import { useCallback, useSyncExternalStore } from "react";

/**
 * Tiny browser-only persistence layer. Every store is one localStorage key
 * (`pomidori:<name>`), written debounced, synced across tabs via the `storage` event.
 * No databases, no external storage libraries.
 */

export const STORAGE_PREFIX = "pomidori:";

type Envelope<T> = { v: number; data: T };

export type Store<T> = {
  key: string;
  get: () => T;
  set: (next: T | ((prev: T) => T)) => void;
  subscribe: (listener: () => void) => () => void;
  getServerSnapshot: () => T;
  reload: () => void;
};

type StoreOptions<T> = {
  version?: number;
  /** Upgrade data written by an older version. */
  migrate?: (data: unknown, fromVersion: number) => T;
  /** Called when nothing is stored yet; return a value to seed the store (e.g. legacy data). */
  seed?: () => T | undefined;
};

const allStores = new Set<Store<unknown>>();
const pendingWrites = new Map<string, () => void>();

function flushAll() {
  const writes = [...pendingWrites.values()];
  pendingWrites.clear();
  writes.forEach((write) => write());
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", flushAll);
  window.addEventListener("beforeunload", flushAll);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushAll();
  });
}

export function createStore<T>(name: string, initial: T, options: StoreOptions<T> = {}): Store<T> {
  const key = STORAGE_PREFIX + name;
  const version = options.version ?? 1;
  let state = initial;
  let hydrated = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const listeners = new Set<() => void>();

  function read(): T {
    try {
      const raw = localStorage.getItem(key);
      if (raw == null) {
        const seeded = options.seed?.();
        if (seeded !== undefined) {
          scheduleWrite(seeded);
          return seeded;
        }
        return initial;
      }
      const parsed = JSON.parse(raw) as Envelope<unknown>;
      if (parsed && typeof parsed === "object" && "v" in parsed && "data" in parsed) {
        if (parsed.v === version) return parsed.data as T;
        if (options.migrate) return options.migrate(parsed.data, parsed.v);
      }
      return initial;
    } catch {
      return initial;
    }
  }

  function hydrate() {
    if (hydrated || typeof window === "undefined") return;
    hydrated = true;
    state = read();
  }

  function write(value: T) {
    try {
      localStorage.setItem(key, JSON.stringify({ v: version, data: value } satisfies Envelope<T>));
    } catch (err) {
      console.warn(`[pomidori] could not save ${key}`, err);
    }
  }

  function scheduleWrite(value: T) {
    if (timer) clearTimeout(timer);
    const run = () => {
      if (timer) clearTimeout(timer);
      timer = null;
      pendingWrites.delete(key);
      write(value);
    };
    pendingWrites.set(key, run);
    timer = setTimeout(run, 200);
  }

  function emit() {
    listeners.forEach((l) => l());
  }

  const store: Store<T> = {
    key,
    get() {
      hydrate();
      return state;
    },
    set(next) {
      hydrate();
      const value = typeof next === "function" ? (next as (prev: T) => T)(state) : next;
      if (Object.is(value, state)) return;
      state = value;
      scheduleWrite(value);
      emit();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getServerSnapshot() {
      return initial;
    },
    reload() {
      if (timer) clearTimeout(timer);
      timer = null;
      pendingWrites.delete(key);
      hydrated = false;
      hydrate();
      emit();
    },
  };

  if (typeof window !== "undefined") {
    window.addEventListener("storage", (e) => {
      if (e.key === key || e.key === null) store.reload();
    });
  }

  allStores.add(store as Store<unknown>);
  return store;
}

/** Same interface as a persisted store, but lives only in memory (runtime state). */
export function createMemoryStore<T>(initial: T): Store<T> {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    key: "",
    get: () => state,
    set(next) {
      const value = typeof next === "function" ? (next as (prev: T) => T)(state) : next;
      if (Object.is(value, state)) return;
      state = value;
      listeners.forEach((l) => l());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getServerSnapshot: () => initial,
    reload() {},
  };
}

/** Subscribe a component to a store. Pass a stable (module-level or memoized) selector. */
export function useStore<T>(store: Store<T>): T;
export function useStore<T, S>(store: Store<T>, selector: (state: T) => S): S;
export function useStore<T, S>(store: Store<T>, selector?: (state: T) => S) {
  const getSnapshot = useCallback(
    () => (selector ? selector(store.get()) : store.get()),
    [store, selector],
  );
  const getServer = useCallback(
    () => (selector ? selector(store.getServerSnapshot()) : store.getServerSnapshot()),
    [store, selector],
  );
  return useSyncExternalStore(store.subscribe, getSnapshot, getServer);
}

const noopSubscribe = () => () => {};

/** True once running in the browser after hydration. */
export function useHydrated() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

/** Re-read every store from localStorage (after an import or reset). */
export function reloadAllStores() {
  allStores.forEach((s) => s.reload());
}

export function flushStores() {
  flushAll();
}
