import { handler, clientIp, db, fail, json, rateLimited, recordAttempt, requireVault, signupsAllowed, syncEnabled, vaultIdFrom } from "@/app/lib/server/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Join an existing sync space, or create one (when the owner allows sign-ups). */
export const POST = handler(async (req: Request) => {
  if (!syncEnabled()) return fail("disabled", 404);
  const id = vaultIdFrom(req);
  if (!id) return fail("unauthorized", 401);
  const ip = clientIp(req);
  if (rateLimited(ip)) return fail("rate_limited", 429);

  const body = (await req.json().catch(() => ({}))) as { create?: boolean };
  const pg = await db();
  const { rowCount } = await pg.query("UPDATE sync_vaults SET seen_at = now() WHERE id = $1", [id]);
  if (rowCount) return json({ exists: true, created: false });

  recordAttempt(ip);
  if (!body.create) return fail("not_found", 404);
  if (!signupsAllowed()) return fail("signups_closed", 403);
  await pg.query("INSERT INTO sync_vaults (id) VALUES ($1) ON CONFLICT (id) DO NOTHING", [id]);
  return json({ exists: false, created: true });
});

/** Delete a sync space and everything in it. */
export const DELETE = handler(async (req: Request) => {
  const vault = await requireVault(req);
  if ("error" in vault) return vault.error;
  await (await db()).query("DELETE FROM sync_vaults WHERE id = $1", [vault.id]);
  return json({ deleted: true });
});
