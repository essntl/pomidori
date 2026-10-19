import type { Adapter, AdapterEvents, Track } from "./types";
import { playerHost } from "./host";

/* Minimal typings for the YouTube IFrame API surface we use. */
type YTPlayer = {
  loadVideoById(id: string): void;
  cueVideoById(id: string): void;
  cuePlaylist(opts: { listType: "playlist"; list: string }): void;
  getPlaylist(): string[] | null;
  playVideo(): void;
  pauseVideo(): void;
  stopVideo(): void;
  seekTo(s: number, allowSeekAhead: boolean): void;
  setVolume(v: number): void;
  getCurrentTime(): number;
  getDuration(): number;
  getVideoData(): { title?: string; author?: string; video_id?: string; isLive?: boolean };
  destroy(): void;
};

type YTNamespace = {
  Player: new (
    el: HTMLElement,
    opts: {
      width?: string | number;
      height?: string | number;
      videoId?: string;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: (e: { target: YTPlayer }) => void;
        onStateChange?: (e: { data: number; target: YTPlayer }) => void;
        onError?: (e: { data: number }) => void;
      };
    },
  ) => YTPlayer;
};

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YTNamespace> | null = null;

function loadApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!apiPromise) {
    apiPromise = new Promise((resolve, reject) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        resolve(window.YT!);
      };
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      s.async = true;
      s.onerror = () => {
        apiPromise = null;
        reject(new Error("YouTube could not be reached"));
      };
      document.head.appendChild(s);
    });
  }
  return apiPromise;
}

function mount() {
  const el = document.createElement("div");
  playerHost().appendChild(el);
  return el;
}

const ERRORS: Record<number, string> = {
  2: "That YouTube link looks invalid.",
  5: "YouTube could not play this video here.",
  100: "This YouTube video was removed or is private.",
  101: "The owner does not allow this video to play outside YouTube.",
  150: "The owner does not allow this video to play outside YouTube.",
};

export class YouTubeAdapter implements Adapter {
  private player: YTPlayer | null = null;
  private ready: Promise<YTPlayer> | null = null;
  private volume = 0.7;

  constructor(private events: AdapterEvents) {}

  private ensure(): Promise<YTPlayer> {
    if (!this.ready) {
      this.ready = loadApi().then(
        (YT) =>
          new Promise<YTPlayer>((resolve) => {
            new YT.Player(mount(), {
              width: 200,
              height: 200,
              playerVars: { playsinline: 1, controls: 0, disablekb: 1, rel: 0, origin: window.location.origin },
              events: {
                onReady: (e) => {
                  this.player = e.target;
                  e.target.setVolume(this.volume * 100);
                  resolve(e.target);
                },
                onStateChange: (e) => this.handleState(e.data),
                onError: (e) => this.events.onError(ERRORS[e.data] ?? "YouTube playback error."),
              },
            });
          }),
      );
      this.ready.catch((err: Error) => {
        this.ready = null;
        this.events.onError(err.message);
      });
    }
    return this.ready;
  }

  private handleState(code: number) {
    // -1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering, 5 cued
    if (code === 1) {
      this.events.onState("playing");
      const data = this.player?.getVideoData();
      if (data?.title) {
        this.events.onMeta({ title: data.title, artist: data.author ?? "", live: !!data.isLive });
      }
    } else if (code === 2 || code === 5) this.events.onState("paused");
    else if (code === 3) this.events.onState("buffering");
    else if (code === 0) this.events.onState("ended");
  }

  load(track: Track, autoplay: boolean) {
    if (this.player) {
      if (autoplay) this.player.loadVideoById(track.ref);
      else this.player.cueVideoById(track.ref);
      return;
    }
    this.events.onState("buffering");
    this.ensure().then((p) => (autoplay ? p.loadVideoById(track.ref) : p.cueVideoById(track.ref)));
  }

  play() {
    this.player?.playVideo();
  }

  pause() {
    this.player?.pauseVideo();
  }

  stop() {
    this.player?.stopVideo();
  }

  seek(seconds: number) {
    this.player?.seekTo(seconds, true);
  }

  setVolume(v: number) {
    this.volume = v;
    this.player?.setVolume(Math.round(v * 100));
  }

  getPosition() {
    return this.player?.getCurrentTime() ?? 0;
  }

  getDuration() {
    return this.player?.getDuration() ?? 0;
  }
}

/** Resolve the video ids of a playlist with a throwaway player. */
export async function expandYouTubePlaylist(listId: string): Promise<string[]> {
  const YT = await loadApi();
  return new Promise((resolve, reject) => {
    const el = mount();
    let player: YTPlayer | null = null;
    const cleanup = () => {
      try {
        player?.destroy();
      } catch {
        /* already gone */
      }
      el.remove();
    };
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("YouTube playlist took too long to load."));
    }, 15000);
    new YT.Player(el, {
      width: 200,
      height: 200,
      playerVars: { listType: "playlist", list: listId, origin: window.location.origin },
      events: {
        onReady: (e) => {
          player = e.target;
          e.target.cuePlaylist({ listType: "playlist", list: listId });
        },
        onStateChange: (e) => {
          if (e.data !== 5) return;
          const ids = e.target.getPlaylist();
          if (ids?.length) {
            clearTimeout(timeout);
            cleanup();
            resolve(ids);
          }
        },
        onError: () => {
          clearTimeout(timeout);
          cleanup();
          reject(new Error("That YouTube playlist is private or unavailable."));
        },
      },
    });
  });
}
