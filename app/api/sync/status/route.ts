import { json, signupsAllowed, syncEnabled } from "@/app/lib/server/sync";

export const dynamic = "force-dynamic";

/** Lets the app know whether this server offers sync and whether new passphrases may be created. */
export function GET() {
  return json({ enabled: syncEnabled(), signups: syncEnabled() && signupsAllowed() });
}
