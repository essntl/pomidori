import { handler, MAX_BODY_BYTES, MAX_ITEM_BYTES, db, fail, json, requireVault } from "@/app/lib/server/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Item = { k: string; t: number; d: boolean; p: string };

function valid(x: unknown): x is Item {
  const i = x as Item;
  return (
    !!i &&
    typeof i.k === "string" &&
    /^[0-9a-f]{64}$/.test(i.k) &&
    Number.isSafeInteger(i.t) &&
    i.t >= 0 &&
    typeof i.d === "boolean" &&
    typeof i.p === "string" &&
    i.p.length <= MAX_ITEM_BYTES
  );
}

/**
 * Upload changed items. Each one is kept only if it is newer than the server's copy (last
 * write wins per item); otherwise the server's newer copy is returned so the device can adopt it.
 */
export const POST = handler(async (req: Request) => {
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return fail("too_large", 413);
  const vault = await requireVault(req);
  if ("error" in vault) return vault.error;

  const body = (await req.json().catch(() => null)) as { items?: unknown[] } | null;
  if (!body || !Array.isArray(body.items) || body.items.length > 500) return fail("bad_request", 400);
  if (!body.items.every(valid)) return fail("bad_request", 400);
  const items = body.items as Item[];

  const client = await (await db()).connect();
  const accepted: string[] = [];
  const conflicts: (Item & { s: number })[] = [];
  try {
    await client.query("BEGIN");
    // One push per vault at a time, so sequence numbers commit in order and a concurrent
    // pull can never skip past a change that commits later.
    await client.query("SELECT 1 FROM sync_vaults WHERE id = $1 FOR UPDATE", [vault.id]);
    for (const it of items) {
      const res = await client.query(
        `INSERT INTO sync_items (vault_id, k, t, d, p, s) VALUES ($1, $2, $3, $4, $5, nextval('sync_seq'))
         ON CONFLICT (vault_id, k) DO UPDATE SET t = excluded.t, d = excluded.d, p = excluded.p, s = excluded.s
         WHERE sync_items.t < excluded.t
         RETURNING s`,
        [vault.id, it.k, it.t, it.d, it.p],
      );
      if (res.rowCount) {
        accepted.push(it.k);
      } else {
        const cur = await client.query("SELECT k, t, d, p, s FROM sync_items WHERE vault_id = $1 AND k = $2", [vault.id, it.k]);
        const r = cur.rows[0];
        if (r) conflicts.push({ k: r.k, t: Number(r.t), d: r.d, p: r.p, s: Number(r.s) });
      }
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("[pomidori] sync push failed", err);
    return fail("server", 500);
  } finally {
    client.release();
  }
  return json({ accepted, conflicts });
});
