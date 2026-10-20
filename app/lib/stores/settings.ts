import { createStore } from "../storage";

export type ThemePref = "light" | "dark" | "system";
export type Accent = "pink" | "rose" | "orange" | "green" | "blue" | "violet";
export type Chime = "timer" | "start" | "reset" | "toggle";
export type ArtworkStyle = "square" | "round" | "vinyl";

export type MusicSettings = {
  /** How the now-playing artwork is drawn; "vinyl" spins while music plays. */
  artworkStyle: ArtworkStyle;
  /** Blurred artwork behind the player. */
  blurBackdrop: boolean;
  /** Dynamic Island alert when a new song starts. */
  trackAlerts: boolean;
  /** Animated equaliser bars while playing. */
  equalizer: boolean;
};

export type Settings = {
  theme: ThemePref;
  accent: Accent;
  sounds: boolean;
  soundVolume: number;
  chime: Chime;
  notifications: boolean;
  /** Do not disturb: mutes chimes and system notifications. */
  dnd: boolean;
  titleCountdown: boolean;
  showDock: boolean;
  music: MusicSettings;
};

export const ACCENTS: { id: Accent; color: string }[] = [
  { id: "pink", color: "#ec4899" },
  { id: "rose", color: "#f43f5e" },
  { id: "orange", color: "#f97316" },
  { id: "green", color: "#10b981" },
  { id: "blue", color: "#3b82f6" },
  { id: "violet", color: "#8b5cf6" },
];

const defaults: Settings = {
  theme: "system",
  accent: "pink",
  sounds: true,
  soundVolume: 0.5,
  chime: "timer",
  notifications: true,
  dnd: false,
  titleCountdown: true,
  showDock: true,
  music: { artworkStyle: "square", blurBackdrop: true, trackAlerts: true, equalizer: true },
};

export const settingsStore = createStore<Settings>("settings", defaults, {
  seed: () => {
    // Carry over the old dark-mode preference.
    const legacy = localStorage.getItem("darkMode");
    if (legacy === null) return undefined;
    return { ...defaults, theme: legacy === "true" ? "dark" : "light" };
  },
  // v2 added `music`; merge so older saved settings pick up new defaults.
  version: 2,
  migrate: (data) => {
    const d = (data ?? {}) as Partial<Settings>;
    return { ...defaults, ...d, music: { ...defaults.music, ...(d.music ?? {}) } };
  },
});

export function updateSettings(patch: Partial<Settings>) {
  settingsStore.set((s) => ({ ...s, ...patch }));
}

export function updateMusicSettings(patch: Partial<MusicSettings>) {
  settingsStore.set((s) => ({ ...s, music: { ...s.music, ...patch } }));
}
