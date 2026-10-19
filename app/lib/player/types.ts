export type SourceKind = "youtube" | "soundcloud" | "audio";

export type Track = {
  id: string;
  source: SourceKind;
  /** YouTube video id, or the full URL for SoundCloud / audio. */
  ref: string;
  url: string;
  title: string;
  artist: string;
  artwork: string | null;
  /** Live stream (radio): no duration, no seeking. */
  live?: boolean;
};

export type AdapterState = "unstarted" | "playing" | "paused" | "buffering" | "ended";

export type AdapterEvents = {
  onState: (state: AdapterState) => void;
  onMeta: (meta: Partial<Pick<Track, "title" | "artist" | "artwork" | "live">>) => void;
  onError: (message: string) => void;
};

export interface Adapter {
  load(track: Track, autoplay: boolean): void;
  play(): void;
  pause(): void;
  stop(): void;
  seek(seconds: number): void;
  setVolume(v: number): void;
  getPosition(): number;
  getDuration(): number;
  /** For sources that contain several tracks (SoundCloud sets). Return true if handled internally. */
  next?(): boolean;
  prev?(): boolean;
}
