import { createHash } from "node:crypto";
import { Pool } from "pg";

/**
 * Server half of sync. It stores opaque, end-to-end encrypted items per "vault" (one per
 * passphrase) and never sees passphrases, keys or content. Enabled only when DATABASE_URL is set.
 */

export const syncEnabled = () => !!process.env.DATABASE_URL;

/** Owner switch: can new passphrases (sync spaces) be created on this server? */
export const signupsAllowed = () => !/^(0|false|no|off)$/i.test((process.env.ALLOW_SIGNUPS ?? "true").trim());

const globalForPg = globalThis as unknown as { pomidoriPool?: Pool; pomidoriSchema?: Promise<void> };

function pool() {
  if (!globalForPg.pomidoriPool) {
    globalForPg.pomidoriPool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
    globalForPg.pomidoriPool.on("error", (err) => console.error("[pomidori] database error", err));
  }
  return globalForPg.pomidoriPool;
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS sync_vaults (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE SEQUENCE IF NOT EXISTS sync_seq;
  CREATE TABLE IF NOT EXISTS sync_items (
    vault_id TEXT NOT NULL REFERENCES sync_vaults(id) ON DELETE CASCADE,
    k TEXT NOT NULL,
    t BIGINT NOT NULL,
    d BOOLEAN NOT NULL,
    p TEXT NOT NULL,
    s BIGINT NOT NULL,
    PRIMARY KEY (vault_id, k)
  );
  CREATE INDEX IF NOT EXISTS sync_items_seq ON sync_items (vault_id, s);
`;

/** Create tables on first use; an advisory lock keeps parallel first requests from racing. */
export async function db() {
  const p = pool();
  if (!globalForPg.pomidoriSchema) {
    globalForPg.pomidoriSchema = (async () => {
      const client = await p.connect();
      try {
        await client.query("SELECT pg_advisory_lock(727274)");
        await client.query(SCHEMA);
      } finally {
        await client.query("SELECT pg_advisory_unlock(727274)").catch(() => {});
        client.release();
      }
    })().catch((err) => {
      globalForPg.pomidoriSchema = undefined;
      throw err;
    });
  }
  await globalForPg.pomidoriSchema;
  return p;
}

export function json(body: Record<string, unknown>, status = 200) {
  return Response.json({ ...body, time: Date.now() }, { status, headers: { "cache-control": "no-store" } });
}

export const fail = (error: string, status: number) => json({ error }, status);

/** Plain-language cause for the most common database setup mistakes. */
function hint(err: unknown) {
  const e = err as { code?: string; hostname?: string };
  if (e.code === "ENOTFOUND")
    return `can't find a database host called "${e.hostname}". Check the host in DATABASE_URL (in the ready-made stacks it's "pomidori-db") and that both containers are on the same Docker network.`;
  if (e.code === "ECONNREFUSED") return "the database refused the connection. Is it running, and is the port in DATABASE_URL right?";
  if (e.code === "28P01") return "wrong database user or password in DATABASE_URL (special characters like : @ / # in the password must be percent-encoded).";
  if (e.code === "3D000") return "the database named in DATABASE_URL doesn't exist.";
  return "unexpected database error.";
}

/** Wrap a route so a database outage answers with a clear error instead of a crash page. */
export function handler(fn: (req: Request) => Promise<Response>) {
  return async (req: Request) => {
    try {
      return await fn(req);
    } catch (err) {
      console.error(`[pomidori] sync request failed: ${hint(err)}`, err);
      return fail("database", 503);
    }
  };
}

/** The bearer token is a 256-bit key derived from the passphrase; the vault id is its hash. */
export function vaultIdFrom(req: Request) {
  const m = /^Bearer ([0-9a-f]{64})$/i.exec(req.headers.get("authorization") ?? "");
  return m ? createHash("sha256").update(Buffer.from(m[1], "hex")).digest("hex") : null;
}

/** Resolve the request's vault, or an error response. */
export async function requireVault(req: Request): Promise<{ id: string } | { error: Response }> {
  if (!syncEnabled()) return { error: fail("disabled", 404) };
  const id = vaultIdFrom(req);
  if (!id) return { error: fail("unauthorized", 401) };
  const { rowCount } = await (await db()).query("UPDATE sync_vaults SET seen_at = now() WHERE id = $1", [id]);
  if (!rowCount) return { error: fail("unauthorized", 401) };
  return { id };
}

/* Simple in-memory limiter for passphrase lookups, so a server can't be used to guess them. */
const attempts = new Map<string, { n: number; reset: number }>();
const WINDOW_MS = 15 * 60_000;
const MAX_ATTEMPTS = 20;

export function clientIp(req: Request) {
  return (req.headers.get("x-forwarded-for")?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "local").trim();
}

function entry(ip: string) {
  const nowMs = Date.now();
  let a = attempts.get(ip);
  if (!a || a.reset < nowMs) {
    if (attempts.size > 10_000) for (const [k, v] of attempts) if (v.reset < nowMs) attempts.delete(k);
    a = { n: 0, reset: nowMs + WINDOW_MS };
    attempts.set(ip, a);
  }
  return a;
}

/** Too many unknown passphrases or sign-ups from this address lately? */
export const rateLimited = (ip: string) => entry(ip).n >= MAX_ATTEMPTS;
export const recordAttempt = (ip: string) => void entry(ip).n++;

/** Largest single encrypted item accepted (a long note with images pasted as data is the worst case). */
export const MAX_ITEM_BYTES = 4 * 1024 * 1024;
export const MAX_BODY_BYTES = 12 * 1024 * 1024;
