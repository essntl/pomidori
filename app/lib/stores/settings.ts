import { createStore } from "../storage";

export type ThemePref = "light" | "dark" | "system";
export type Accent = "pink" | "rose" | "orange" | "green" | "blue" | "violet";
export type Chime = "timer" | "start" | "reset" | "toggle";

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
};

export const settingsStore = createStore<Settings>("settings", defaults, {
  seed: () => {
    // Carry over the old dark-mode preference.
    const legacy = localStorage.getItem("darkMode");
    if (legacy === null) return undefined;
    return { ...defaults, theme: legacy === "true" ? "dark" : "light" };
  },
  migrate: (data) => ({ ...defaults, ...(data as Partial<Settings>) }),
});

export function updateSettings(patch: Partial<Settings>) {
  settingsStore.set((s) => ({ ...s, ...patch }));
}
