import { handler, db, fail, json, requireVault } from "@/app/lib/server/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE = 500;

/** Everything that changed since the device's cursor, oldest first, in pages. */
export const GET = handler(async (req: Request) => {
  const vault = await requireVault(req);
  if ("error" in vault) return vault.error;
  const since = Number(new URL(req.url).searchParams.get("since") ?? 0);
  if (!Number.isSafeInteger(since) || since < 0) return fail("bad_request", 400);

  const { rows } = await (await db()).query(
    "SELECT k, t, d, p, s FROM sync_items WHERE vault_id = $1 AND s > $2 ORDER BY s LIMIT $3",
    [vault.id, since, PAGE + 1],
  );
  const more = rows.length > PAGE;
  const items = rows.slice(0, PAGE).map((r) => ({ k: r.k, t: Number(r.t), d: r.d, p: r.p, s: Number(r.s) }));
  return json({ items, cursor: items.length ? items[items.length - 1].s : since, more });
});
