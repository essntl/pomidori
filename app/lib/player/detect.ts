import type { SourceKind } from "./types";

export type Detected =
  | { kind: "youtube"; videoId: string; listId?: string; url: string }
  | { kind: "youtube-playlist"; listId: string; url: string }
  | { kind: "soundcloud"; url: string }
  | { kind: "audio"; url: string };

const YT_ID = /^[a-zA-Z0-9_-]{11}$/;

/** Work out which platform a pasted link belongs to. Returns null when it is not a usable URL. */
export function detectSource(input: string): Detected | null {
  const raw = input.trim();
  if (!raw) return null;

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www|m)\./, "");

  if (host === "youtu.be") {
    const id = url.pathname.slice(1, 12);
    if (YT_ID.test(id)) return { kind: "youtube", videoId: id, url: url.href };
  }

  if (host === "youtube.com" || host === "music.youtube.com" || host === "youtube-nocookie.com") {
    const v = url.searchParams.get("v");
    const list = url.searchParams.get("list") ?? undefined;
    const path = url.pathname.match(/^\/(?:shorts|embed|live|v)\/([a-zA-Z0-9_-]{11})/);
    const id = v ?? path?.[1];
    // A link to a video inside a playlist queues the whole playlist; mixes (RD…) only queue the video.
    if (list && !list.startsWith("RD") && (url.pathname === "/playlist" || id)) {
      return { kind: "youtube-playlist", listId: list, url: url.href };
    }
    if (id && YT_ID.test(id)) return { kind: "youtube", videoId: id, url: url.href };
    if (list) return { kind: "youtube-playlist", listId: list, url: url.href };
    return null;
  }

  if (host === "soundcloud.com" || host === "on.soundcloud.com" || host === "api.soundcloud.com") {
    if (url.pathname.split("/").filter(Boolean).length >= 1) return { kind: "soundcloud", url: url.href.split("?")[0] };
    return null;
  }

  if (url.protocol === "http:" || url.protocol === "https:") return { kind: "audio", url: url.href };
  return null;
}

export const SOURCE_LABEL: Record<SourceKind, string> = {
  youtube: "YouTube",
  soundcloud: "SoundCloud",
  audio: "Stream",
};

/** Older queue items stored YouTube's letterboxed 4:3 thumbnail; the 16:9 one crops cleanly. */
export function artworkSrc(url: string | null | undefined) {
  return url ? url.replace("/hqdefault.jpg", "/mqdefault.jpg") : null;
}

export function youtubeThumb(id: string) {
  return `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
}

/** Best-effort title lookup via the public oEmbed endpoints (no keys, CORS-enabled). */
export async function fetchOEmbed(kind: "youtube" | "soundcloud", url: string) {
  const endpoint =
    kind === "youtube"
      ? `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`
      : `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(url)}`;
  try {
    const res = await fetch(endpoint);
    if (!res.ok) return null;
    const data = (await res.json()) as { title?: string; author_name?: string; thumbnail_url?: string };
    return { title: data.title ?? null, artist: data.author_name ?? null, artwork: data.thumbnail_url ?? null };
  } catch {
    return null;
  }
}
