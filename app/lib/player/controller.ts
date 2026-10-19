import { createMemoryStore, createStore } from "../storage";
import { uid } from "../id";
import { notify } from "../alerts";
import type { Adapter, AdapterEvents, AdapterState, SourceKind, Track } from "./types";
import { detectSource, fetchOEmbed, youtubeThumb } from "./detect";
import { YouTubeAdapter, expandYouTubePlaylist } from "./youtube";
import { SoundCloudAdapter } from "./soundcloud";
import { AudioAdapter } from "./audio";

export type Repeat = "off" | "all" | "one";
export type SavedPlaylist = { id: string; name: string; tracks: Track[] };

type PlayerData = {
  queue: Track[];
  index: number;
  volume: number;
  shuffle: boolean;
  repeat: Repeat;
  playlists: SavedPlaylist[];
};

export type PlayerRuntime = {
  status: AdapterState;
  position: number;
  duration: number;
  /** Has the current track been loaded into an adapter this session? */
  loaded: boolean;
  error: string | null;
  adding: boolean;
};

export const playerStore = createStore<PlayerData>("player", {
  queue: [],
  index: 0,
  volume: 0.7,
  shuffle: false,
  repeat: "all",
  playlists: [],
});

export const playerRuntime = createMemoryStore<PlayerRuntime>({
  status: "unstarted",
  position: 0,
  duration: 0,
  loaded: false,
  error: null,
  adding: false,
});

const adapters: Partial<Record<SourceKind, Adapter>> = {};
let activeSource: SourceKind | null = null;
let poll: ReturnType<typeof setInterval> | null = null;
let lastAnnounced: string | null = null;

function setRuntime(patch: Partial<PlayerRuntime>) {
  playerRuntime.set((r) => ({ ...r, ...patch }));
}

function currentTrack(): Track | null {
  const { queue, index } = playerStore.get();
  return queue[index] ?? null;
}

function patchTrack(id: string, patch: Partial<Track>) {
  playerStore.set((p) => ({ ...p, queue: p.queue.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
}

function eventsFor(source: SourceKind): AdapterEvents {
  return {
    onState(state) {
      if (activeSource !== source) return;
      setRuntime({ status: state, error: state === "playing" ? null : playerRuntime.get().error });
      if (state === "playing") {
        startPolling();
        const t = currentTrack();
        if (t && lastAnnounced !== t.id) {
          lastAnnounced = t.id;
          notify({ title: t.title, body: t.artist || undefined, icon: "🎵", tone: "info", duration: 2400 });
        }
      } else if (state === "ended") {
        stopPolling();
        handleEnded();
      } else if (state === "paused") {
        sample();
      }
      updateMediaSession();
    },
    onMeta(meta) {
      if (activeSource !== source) return;
      const t = currentTrack();
      if (!t) return;
      const patch: Partial<Track> = {};
      // Keep user-visible metadata from oEmbed unless the player knows better.
      if (meta.title && (t.title === placeholderTitle(t) || source === "soundcloud")) patch.title = meta.title;
      if (meta.artist && (!t.artist || source === "soundcloud")) patch.artist = meta.artist;
      if (meta.artwork && source === "soundcloud") patch.artwork = meta.artwork;
      if (meta.live !== undefined && meta.live !== t.live) patch.live = meta.live;
      if (Object.keys(patch).length) patchTrack(t.id, patch);
      updateMediaSession();
    },
    onError(message) {
      if (activeSource !== source) return;
      setRuntime({ error: message, status: "paused" });
      notify({ title: "Can't play this", body: message, icon: "⚠️", tone: "danger", duration: 4000 });
    },
  };
}

function adapterFor(source: SourceKind): Adapter {
  let a = adapters[source];
  if (!a) {
    const ev = eventsFor(source);
    a = source === "youtube" ? new YouTubeAdapter(ev) : source === "soundcloud" ? new SoundCloudAdapter(ev) : new AudioAdapter(ev);
    a.setVolume(playerStore.get().volume);
    adapters[source] = a;
  }
  return a;
}

function sample() {
  const a = activeSource ? adapters[activeSource] : null;
  if (!a) return;
  setRuntime({ position: a.getPosition(), duration: a.getDuration() });
}

function startPolling() {
  if (poll) return;
  poll = setInterval(sample, 500);
}

function stopPolling() {
  if (poll) clearInterval(poll);
  poll = null;
}

function placeholderTitle(t: Pick<Track, "source">) {
  return t.source === "youtube" ? "YouTube video" : t.source === "soundcloud" ? "SoundCloud track" : "Audio stream";
}

function loadIndex(index: number, autoplay: boolean) {
  const { queue } = playerStore.get();
  const track = queue[index];
  if (!track) return;
  playerStore.set((p) => ({ ...p, index }));
  if (activeSource && activeSource !== track.source) adapters[activeSource]?.stop();
  activeSource = track.source;
  setRuntime({ position: 0, duration: 0, loaded: true, error: null, status: autoplay ? "buffering" : "paused" });
  adapterFor(track.source).load(track, autoplay);
  updateMediaSession();
}

function nextIndex(direction: 1 | -1): number | null {
  const { queue, index, shuffle, repeat } = playerStore.get();
  if (!queue.length) return null;
  if (shuffle && queue.length > 1 && direction === 1) {
    let n = index;
    while (n === index) n = Math.floor(Math.random() * queue.length);
    return n;
  }
  const n = index + direction;
  if (n >= 0 && n < queue.length) return n;
  if (repeat === "all") return (n + queue.length) % queue.length;
  return null;
}

function handleEnded() {
  const { repeat } = playerStore.get();
  if (repeat === "one") {
    const a = activeSource ? adapters[activeSource] : null;
    a?.seek(0);
    a?.play();
    return;
  }
  const n = nextIndex(1);
  if (n === null) {
    setRuntime({ status: "paused", position: 0 });
    return;
  }
  loadIndex(n, true);
}

/* ───────────── Media Session (OS media keys, lock screen) ───────────── */

function updateMediaSession() {
  if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
  const t = currentTrack();
  const { status } = playerRuntime.get();
  if (!t) {
    navigator.mediaSession.metadata = null;
    return;
  }
  navigator.mediaSession.metadata = new MediaMetadata({
    title: t.title,
    artist: t.artist,
    album: "Pomidori",
    artwork: t.artwork ? [{ src: t.artwork, sizes: "480x360" }] : [],
  });
  navigator.mediaSession.playbackState = status === "playing" ? "playing" : "paused";
}

let mediaSessionBound = false;
function bindMediaSession() {
  if (mediaSessionBound || typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
  mediaSessionBound = true;
  const ms = navigator.mediaSession;
  ms.setActionHandler("play", () => player.play());
  ms.setActionHandler("pause", () => player.pause());
  ms.setActionHandler("nexttrack", () => player.next());
  ms.setActionHandler("previoustrack", () => player.prev());
  try {
    ms.setActionHandler("seekto", (d) => d.seekTime != null && player.seek(d.seekTime));
  } catch {
    /* unsupported */
  }
}

/* ───────────── public API ───────────── */

async function buildTracks(input: string): Promise<Track[]> {
  const detected = detectSource(input);
  if (!detected) throw new Error("Paste a YouTube, SoundCloud or direct audio link.");

  if (detected.kind === "youtube") {
    const track: Track = {
      id: uid(),
      source: "youtube",
      ref: detected.videoId,
      url: `https://www.youtube.com/watch?v=${detected.videoId}`,
      title: "YouTube video",
      artist: "",
      artwork: youtubeThumb(detected.videoId),
    };
    const meta = await fetchOEmbed("youtube", track.url);
    if (meta?.title) track.title = meta.title;
    if (meta?.artist) track.artist = meta.artist;
    return [track];
  }

  if (detected.kind === "youtube-playlist") {
    const ids = await expandYouTubePlaylist(detected.listId);
    return ids.map((id) => ({
      id: uid(),
      source: "youtube" as const,
      ref: id,
      url: `https://www.youtube.com/watch?v=${id}`,
      title: "YouTube video",
      artist: "",
      artwork: youtubeThumb(id),
    }));
  }

  if (detected.kind === "soundcloud") {
    const meta = await fetchOEmbed("soundcloud", detected.url);
    if (!meta) throw new Error("SoundCloud didn't recognise that link (is it private?).");
    return [
      {
        id: uid(),
        source: "soundcloud",
        ref: detected.url,
        url: detected.url,
        title: meta.title ?? "SoundCloud track",
        artist: meta.artist ?? "",
        artwork: meta.artwork,
      },
    ];
  }

  const url = new URL(detected.url);
  const file = decodeURIComponent(url.pathname.split("/").pop() ?? "");
  return [
    {
      id: uid(),
      source: "audio",
      ref: detected.url,
      url: detected.url,
      title: file && /\.[a-z0-9]{2,4}$/i.test(file) ? file.replace(/\.[a-z0-9]{2,4}$/i, "") : url.hostname,
      artist: url.hostname,
      artwork: null,
    },
  ];
}

/** Fill in titles for playlist items lazily, a few at a time. */
async function hydrateTitles(tracks: Track[]) {
  const pending = tracks.filter((t) => t.source === "youtube" && t.title === "YouTube video").slice(0, 100);
  for (let i = 0; i < pending.length; i += 6) {
    await Promise.all(
      pending.slice(i, i + 6).map(async (t) => {
        const meta = await fetchOEmbed("youtube", t.url);
        if (meta?.title) patchTrack(t.id, { title: meta.title, artist: meta.artist ?? "" });
      }),
    );
  }
}

export const player = {
  async add(input: string, opts: { playNow?: boolean } = {}) {
    bindMediaSession();
    setRuntime({ adding: true, error: null });
    try {
      const tracks = await buildTracks(input);
      const wasEmpty = playerStore.get().queue.length === 0;
      const startAt = playerStore.get().queue.length;
      playerStore.set((p) => ({ ...p, queue: [...p.queue, ...tracks] }));
      notify({
        title: tracks.length > 1 ? `Added ${tracks.length} tracks` : "Added to queue",
        body: tracks.length === 1 ? tracks[0].title : undefined,
        icon: "➕",
        tone: "info",
        duration: 2200,
      });
      const idle = !playerRuntime.get().loaded;
      if (opts.playNow || wasEmpty || idle) loadIndex(startAt, true);
      hydrateTitles(tracks);
      return tracks;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Couldn't add that link.";
      setRuntime({ error: message });
      throw new Error(message);
    } finally {
      setRuntime({ adding: false });
    }
  },
  playIndex(index: number) {
    bindMediaSession();
    loadIndex(index, true);
  },
  play() {
    bindMediaSession();
    const t = currentTrack();
    if (!t) return;
    if (!playerRuntime.get().loaded || activeSource !== t.source) {
      loadIndex(playerStore.get().index, true);
      return;
    }
    adapterFor(t.source).play();
  },
  pause() {
    if (activeSource) adapters[activeSource]?.pause();
  },
  toggle() {
    const s = playerRuntime.get().status;
    if (s === "playing" || s === "buffering") player.pause();
    else player.play();
  },
  next() {
    const a = activeSource ? adapters[activeSource] : null;
    if (a?.next?.()) return;
    const n = nextIndex(1);
    if (n !== null) loadIndex(n, true);
  },
  prev() {
    const a = activeSource ? adapters[activeSource] : null;
    if (a && a.getPosition() > 4) {
      a.seek(0);
      return;
    }
    if (a?.prev?.()) return;
    const n = nextIndex(-1);
    if (n !== null) loadIndex(n, true);
  },
  seek(seconds: number) {
    const a = activeSource ? adapters[activeSource] : null;
    a?.seek(seconds);
    setRuntime({ position: seconds });
  },
  setVolume(volume: number) {
    playerStore.set((p) => ({ ...p, volume }));
    Object.values(adapters).forEach((a) => a?.setVolume(volume));
  },
  toggleShuffle() {
    playerStore.set((p) => ({ ...p, shuffle: !p.shuffle }));
  },
  cycleRepeat() {
    playerStore.set((p) => ({ ...p, repeat: p.repeat === "off" ? "all" : p.repeat === "all" ? "one" : "off" }));
  },
  remove(id: string) {
    const { queue, index } = playerStore.get();
    const i = queue.findIndex((t) => t.id === id);
    if (i < 0) return;
    const removingCurrent = i === index;
    const queueNext = queue.filter((t) => t.id !== id);
    const newIndex = i < index ? index - 1 : Math.min(index, Math.max(0, queueNext.length - 1));
    playerStore.set((p) => ({ ...p, queue: queueNext, index: newIndex }));
    if (removingCurrent) {
      const wasPlaying = playerRuntime.get().status === "playing";
      if (queueNext.length && wasPlaying) loadIndex(newIndex, true);
      else {
        if (activeSource) adapters[activeSource]?.stop();
        setRuntime({ status: "unstarted", loaded: false, position: 0, duration: 0 });
      }
    }
  },
  reorder(ids: string[]) {
    playerStore.set((p) => {
      const current = p.queue[p.index]?.id;
      const byId = new Map(p.queue.map((t) => [t.id, t]));
      const queue = ids.map((id) => byId.get(id)!).filter(Boolean);
      return { ...p, queue, index: Math.max(0, queue.findIndex((t) => t.id === current)) };
    });
  },
  clear() {
    if (activeSource) adapters[activeSource]?.stop();
    playerStore.set((p) => ({ ...p, queue: [], index: 0 }));
    setRuntime({ status: "unstarted", loaded: false, position: 0, duration: 0, error: null });
    lastAnnounced = null;
    updateMediaSession();
  },
  savePlaylist(name: string) {
    const tracks = playerStore.get().queue;
    if (!tracks.length) return;
    playerStore.set((p) => ({ ...p, playlists: [...p.playlists, { id: uid(), name, tracks }] }));
  },
  loadPlaylist(id: string) {
    const pl = playerStore.get().playlists.find((p) => p.id === id);
    if (!pl) return;
    if (activeSource) adapters[activeSource]?.stop();
    playerStore.set((p) => ({ ...p, queue: pl.tracks.map((t) => ({ ...t, id: uid() })), index: 0 }));
    loadIndex(0, true);
  },
  deletePlaylist(id: string) {
    playerStore.set((p) => ({ ...p, playlists: p.playlists.filter((pl) => pl.id !== id) }));
  },
};
