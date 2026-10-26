import { createMemoryStore } from "../storage";
import { COLLECTIONS, ORDER_ID, snapshot, type Collection } from "./collections";
import {
  decryptJSON,
  deriveKeys,
  encryptJSON,
  itemKey,
  keysFromJSON,
  keysToJSON,
  normalizePassphrase,
  quickHash,
  type SyncKeys,
} from "./crypto";

/**
 * Cross-device sync, opt-in with a passphrase. Without one, nothing here runs and the app
 * stays purely local.
 *
 * How it stays robust with several devices:
 *  - Changes are detected per item by hashing each note/task/habit…, and stamped with the time
 *    of the change (corrected by the server clock), so edits to different items always merge.
 *  - When the same item changed on two devices, the most recent edit wins.
 *  - Deletions leave a small tombstone so a deleted item can't come back from another device.
 *  - Manual order (tasks, habits, folders, playlists) syncs as its own item; nothing is ever
 *    dropped because of an order conflict.
 *  - A sudden mass deletion is held for confirmation instead of being pushed to every device.
 *  - Everything keeps working offline; changes go up the next time the server is reachable.
 */

type Entry = { t: number; h: string; del?: 1; dirty?: 1 };
type Meta = Record<string, Record<string, Entry>>;
type Config = {
  keys: { auth: string; enc: string; mac: string };
  passphrase: string;
  /** Server sequence number we've pulled up to. */
  cursor: number;
  lastSync: number | null;
  /** Server clock minus device clock, in ms. */
  offset: number;
};
type RemoteItem = { k: string; t: number; d: boolean; p: string; s?: number };
type Plain = { c: string; id: string; v?: unknown };

const CONFIG_KEY = "pomidori-sync:config";
const META_KEY = "pomidori-sync:meta";
const BATCH_ITEMS = 200;
const BATCH_BYTES = 1_500_000;

export type SyncPhase = "idle" | "syncing" | "error" | "offline";

export type SyncStatus = {
  connected: boolean;
  phase: SyncPhase;
  lastSync: number | null;
  error: string | null;
  /** Large local deletions waiting for a decision, per collection. */
  held: { collection: string; count: number }[];
};

export const syncStatus = createMemoryStore<SyncStatus>({ connected: false, phase: "idle", lastSync: null, error: null, held: [] });

const setStatus = (patch: Partial<SyncStatus>) => syncStatus.set((s) => ({ ...s, ...patch }));

export class SyncError extends Error {
  constructor(
    message: string,
    public code: string,
    public status = 0,
  ) {
    super(message);
  }
}

/* ───────────── persistence ───────────── */

function readJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn("[pomidori] could not save sync state", err);
  }
}

const readConfig = () => readJSON<Config>(CONFIG_KEY);
const readMeta = () => readJSON<Meta>(META_KEY) ?? {};

export function isConnected() {
  return typeof window !== "undefined" && !!readConfig();
}

export function savedPassphrase() {
  return readConfig()?.passphrase ?? null;
}

/* ───────────── server ───────────── */

let offset = 0;
const now = () => Date.now() + offset;

const MESSAGES: Record<string, string> = {
  signups_closed: "The owner of this server has turned off creating new sync passphrases.",
  not_found: "No synced data uses this passphrase. Check it for typos.",
  rate_limited: "Too many attempts. Wait a few minutes and try again.",
  unauthorized: "This passphrase is no longer valid on this server.",
  disabled: "Sync isn't set up on this server.",
  too_large: "An item is too large to sync.",
  database: "The server's database isn't reachable. Changes are kept here and will sync later.",
};

async function api<T>(path: string, keys: SyncKeys | null, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/sync/${path}`, {
      ...init,
      cache: "no-store",
      headers: { "content-type": "application/json", ...(keys ? { authorization: `Bearer ${keys.auth}` } : {}) },
    });
  } catch {
    throw new SyncError("Can't reach the server.", "offline");
  }
  const body = (await res.json().catch(() => ({}))) as { error?: string; time?: number } & T;
  if (!res.ok) {
    const code = body.error ?? (res.status === 404 ? "disabled" : "server");
    throw new SyncError(MESSAGES[code] ?? `Server error (${res.status}).`, code, res.status);
  }
  if (typeof body.time === "number") offset = body.time - Date.now();
  return body;
}

export type ServerInfo = { enabled: boolean; signups: boolean };

export async function fetchServerInfo(): Promise<ServerInfo> {
  try {
    return await api<ServerInfo>("status", null);
  } catch {
    return { enabled: false, signups: false };
  }
}

/* ───────────── change detection ───────────── */

/** Collections whose large deletion the user confirmed for the next sync. */
const confirmedDeletes = new Set<string>();

function scan(c: Collection, meta: Meta, t: number, held: SyncStatus["held"]) {
  const snap = snapshot(c);
  const m = (meta[c.name] ??= {});
  for (const [id, value] of snap) {
    const h = quickHash(JSON.stringify(value));
    const e = m[id];
    if (!e || e.del || e.h !== h) m[id] = { t, h, dirty: 1 };
  }
  const gone = Object.keys(m).filter((id) => !m[id].del && !snap.has(id));
  const live = Object.values(m).filter((e) => !e.del).length;
  // A store that failed to load looks like "everything was deleted". Never push that blindly.
  if (gone.length >= 5 && gone.length >= live * 0.5 && !confirmedDeletes.has(c.name)) {
    held.push({ collection: c.name, count: gone.length });
  } else {
    for (const id of gone) m[id] = { t, h: "", del: 1, dirty: 1 };
  }
  return snap;
}

/* ───────────── applying remote changes ───────────── */

let applying = false;

function applyToStore(c: Collection, changes: Map<string, { del: boolean; v?: unknown }>) {
  const state = c.store.get();
  const items = c.read(state);
  const values = new Map(items.map((i) => [i.id, i.value]));
  const order = items.map((i) => i.id);
  let remoteOrder: string[] | null = null;

  for (const [id, ch] of changes) {
    if (id === ORDER_ID) {
      if (!ch.del && Array.isArray(ch.v)) remoteOrder = ch.v as string[];
      continue;
    }
    if (ch.del) values.delete(id);
    else {
      if (!values.has(id)) order.push(id);
      values.set(id, ch.v);
    }
  }

  let ids = order.filter((id) => values.has(id));
  if (remoteOrder) {
    const inRemote = new Set(remoteOrder);
    // Remote order first; anything it doesn't know yet (made on this device) keeps its place after.
    ids = [...remoteOrder.filter((id) => values.has(id)), ...ids.filter((id) => !inRemote.has(id))];
    ids = [...new Set(ids)];
  }

  applying = true;
  try {
    c.store.set(c.write(state, ids.map((id) => ({ id, value: values.get(id) }))));
  } finally {
    applying = false;
  }
}

function applyRemote(keys: SyncKeys, meta: Meta, items: RemoteItem[]) {
  const byName = new Map(COLLECTIONS.map((c) => [c.name, c]));
  const changes = new Map<string, Map<string, { del: boolean; v?: unknown }>>();

  for (const it of items) {
    let data: Plain;
    try {
      data = decryptJSON<Plain>(keys, it.p);
    } catch {
      continue; // corrupted or from an incompatible version
    }
    const c = byName.get(data.c);
    if (!c || typeof data.id !== "string") continue;
    const m = (meta[c.name] ??= {});
    const e = m[data.id];
    const h = it.d ? "" : quickHash(JSON.stringify(data.v));
    if (e) {
      if (it.t < e.t) continue; // our edit is newer and goes up on this or the next push
      if (it.t === e.t && h === e.h && !!e.del === it.d) {
        delete e.dirty; // already identical
        continue;
      }
    }
    m[data.id] = it.d ? { t: it.t, h: "", del: 1 } : { t: it.t, h };
    let ch = changes.get(c.name);
    if (!ch) changes.set(c.name, (ch = new Map()));
    ch.set(data.id, { del: it.d, v: data.v });
  }

  for (const [name, ch] of changes) applyToStore(byName.get(name)!, ch);
}

/* ───────────── one sync round ───────────── */

let generation = 0;

async function push(keys: SyncKeys, meta: Meta, snaps: Map<string, Map<string, unknown>>) {
  type Pending = { item: RemoteItem; c: string; id: string };
  const pending: Pending[] = [];
  for (const c of COLLECTIONS) {
    const snap = snaps.get(c.name)!;
    for (const [id, e] of Object.entries(meta[c.name] ?? {})) {
      if (!e.dirty) continue;
      if (!e.del && !snap.has(id)) continue; // deletion on hold
      const plain: Plain = e.del ? { c: c.name, id } : { c: c.name, id, v: snap.get(id) };
      pending.push({ c: c.name, id, item: { k: itemKey(keys, c.name, id), t: e.t, d: !!e.del, p: encryptJSON(keys, plain) } });
    }
  }

  for (let i = 0; i < pending.length; ) {
    const batch: Pending[] = [];
    let bytes = 0;
    while (i < pending.length && batch.length < BATCH_ITEMS && (batch.length === 0 || bytes + pending[i].item.p.length < BATCH_BYTES)) {
      bytes += pending[i].item.p.length;
      batch.push(pending[i++]);
    }
    const res = await api<{ conflicts: RemoteItem[] }>("push", keys, {
      method: "POST",
      body: JSON.stringify({ items: batch.map((b) => b.item) }),
    });
    // The server either took our version or kept a newer one, which comes back as a conflict.
    for (const b of batch) {
      const e = meta[b.c]?.[b.id];
      if (e && e.t === b.item.t) delete e.dirty;
    }
    if (res.conflicts.length) applyRemote(keys, meta, res.conflicts);
  }
}

async function pull(keys: SyncKeys, meta: Meta, config: Config) {
  for (;;) {
    const res = await api<{ items: RemoteItem[]; cursor: number; more: boolean }>(`pull?since=${config.cursor}`, keys);
    applyRemote(keys, meta, res.items);
    config.cursor = res.cursor;
    if (!res.more) break;
  }
}

async function cycle() {
  const gen = generation;
  const config = readConfig();
  if (!config) return;
  const keys = keysFromJSON(config.keys);
  offset = config.offset ?? 0;
  const meta = readMeta();
  setStatus({ connected: true, phase: "syncing" });

  try {
    const held: SyncStatus["held"] = [];
    const snaps = new Map(COLLECTIONS.map((c) => [c.name, scan(c, meta, now(), held)]));
    confirmedDeletes.clear();
    if (gen !== generation) return;
    writeJSON(META_KEY, meta);

    await push(keys, meta, snaps);
    await pull(keys, meta, config);
    if (gen !== generation) return; // disconnected meanwhile

    config.lastSync = Date.now();
    config.offset = offset;
    writeJSON(CONFIG_KEY, config);
    writeJSON(META_KEY, meta);
    setStatus({ phase: "idle", lastSync: config.lastSync, error: null, held });
  } catch (err) {
    if (gen !== generation) return;
    writeJSON(META_KEY, meta);
    writeJSON(CONFIG_KEY, { ...config, offset });
    const e = err as SyncError;
    setStatus({ phase: e.code === "offline" ? "offline" : "error", error: e.message ?? String(err) });
  }
}

/** One round at a time per device: across tabs via the Web Locks API where the browser allows it. */
function withLock(fn: () => Promise<void>) {
  const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
  return locks ? locks.request("pomidori-sync", fn) : fn();
}

let running: Promise<void> | null = null;
let again = false;

export function syncNow(): Promise<void> {
  if (!isConnected()) return Promise.resolve();
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    do {
      again = false;
      await withLock(cycle);
    } while (again);
  })().finally(() => {
    running = null;
  });
  return running;
}

let timer: ReturnType<typeof setTimeout> | null = null;

function schedule(delay = 1500) {
  if (applying || !isConnected()) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void syncNow();
  }, delay);
}

/* ───────────── public actions ───────────── */

export type ConnectMode = "create" | "join";

/**
 * Start syncing this device. "create" starts a new sync space from this device's data;
 * "join" pulls an existing one and merges this device's data into it (the synced copy wins
 * wherever both have the same item, e.g. settings).
 */
export async function connect(passphrase: string, mode: ConnectMode) {
  const phrase = normalizePassphrase(passphrase);
  const keys = await deriveKeys(phrase);
  const res = await api<{ created: boolean; exists: boolean }>("vault", keys, {
    method: "POST",
    body: JSON.stringify({ create: mode === "create" }),
  });

  generation++;
  const baseline = res.created ? now() : 1;
  const meta: Meta = {};
  for (const c of COLLECTIONS) {
    const m = (meta[c.name] = {} as Record<string, Entry>);
    for (const [id, value] of snapshot(c)) m[id] = { t: baseline, h: quickHash(JSON.stringify(value)), dirty: 1 };
  }
  writeJSON(META_KEY, meta);
  writeJSON(CONFIG_KEY, { keys: keysToJSON(keys), passphrase: phrase, cursor: 0, lastSync: null, offset } satisfies Config);
  setStatus({ connected: true, phase: "idle", error: null, held: [], lastSync: null });
  await syncNow();
  return { joinedExisting: !res.created };
}

/** Stop syncing on this device. Local data stays; synced data on the server stays. */
export function disconnect() {
  generation++;
  if (timer) clearTimeout(timer);
  localStorage.removeItem(CONFIG_KEY);
  localStorage.removeItem(META_KEY);
  confirmedDeletes.clear();
  setStatus({ connected: false, phase: "idle", lastSync: null, error: null, held: [] });
}

/** Delete the synced copy from the server for every device, then disconnect this one. */
export async function deleteRemote() {
  const config = readConfig();
  if (config) await api("vault", keysFromJSON(config.keys), { method: "DELETE" });
  disconnect();
}

/** The user confirmed a held mass deletion: send it to the other devices. */
export function confirmDeletion(collection: string) {
  confirmedDeletes.add(collection);
  return syncNow();
}

/** The user rejected a held mass deletion: bring the missing items back from the server. */
export function restoreDeletion(collection: string) {
  const config = readConfig();
  if (!config) return Promise.resolve();
  const meta = readMeta();
  const c = COLLECTIONS.find((x) => x.name === collection);
  if (c) {
    const present = snapshot(c);
    // A tombstone at time 0 loses to any server copy, so the next pull brings the items back.
    for (const [id, e] of Object.entries(meta[collection] ?? {})) if (!e.del && !present.has(id)) meta[collection][id] = { t: 0, h: "", del: 1 };
  }
  writeJSON(META_KEY, meta);
  writeJSON(CONFIG_KEY, { ...config, cursor: 0 });
  return syncNow();
}

let started = false;

/** Wire sync into the app (idempotent). Runs only while a passphrase is set on this device. */
export function startSync() {
  if (started || typeof window === "undefined") return;
  started = true;

  const config = readConfig();
  setStatus({ connected: !!config, lastSync: config?.lastSync ?? null });

  const stores = new Set(COLLECTIONS.map((c) => c.store));
  stores.forEach((s) => s.subscribe(() => schedule()));

  window.addEventListener("online", () => schedule(0));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") schedule(0);
  });
  // Connected or disconnected in another tab.
  window.addEventListener("storage", (e) => {
    if (e.key !== CONFIG_KEY) return;
    const c = readConfig();
    setStatus({ connected: !!c, lastSync: c?.lastSync ?? null });
  });
  setInterval(() => {
    if (document.visibilityState === "visible") schedule(0);
  }, 45_000);

  if (config) void syncNow();
}
