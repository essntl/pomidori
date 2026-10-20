import { useSyncExternalStore } from "react";
import { settingsStore, type Chime } from "./stores/settings";
import { uid } from "./id";

/**
 * In-app alerts are shown by the Dynamic Island (it is the app's toast system).
 * They are transient and never persisted.
 */

export type AlertTone = "accent" | "success" | "info" | "warning" | "danger";
/** `image` (e.g. album artwork) is shown instead of the emoji `icon` when it loads. */
export type IslandAlert = { id: string; title: string; body?: string; icon?: string; image?: string | null; tone: AlertTone; duration: number };

let current: IslandAlert | null = null;
const queue: IslandAlert[] = [];
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | null = null;

function emit() {
  listeners.forEach((l) => l());
}

function showNext() {
  current = queue.shift() ?? null;
  emit();
  if (current) {
    timer = setTimeout(() => {
      timer = null;
      showNext();
    }, current.duration);
  }
}

export function notify(alert: { title: string; body?: string; icon?: string; image?: string | null; tone?: AlertTone; duration?: number }) {
  queue.push({ id: uid(), tone: "accent", duration: 3200, ...alert });
  if (!current && !timer) showNext();
}

export function dismissAlert() {
  if (timer) clearTimeout(timer);
  timer = null;
  showNext();
}

export function useIslandAlert() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    () => current,
    () => null,
  );
}

const SOUND_FILES: Record<Chime | "toggle", string> = {
  timer: "/sounds/timer.mp3",
  start: "/sounds/start.mp3",
  reset: "/sounds/reset.mp3",
  toggle: "/sounds/toggle.mp3",
};

export function playSound(name: Chime | "toggle", force = false) {
  const s = settingsStore.get();
  if (!force && (!s.sounds || s.dnd)) return;
  try {
    const audio = new Audio(SOUND_FILES[name]);
    audio.volume = Math.min(1, Math.max(0, s.soundVolume));
    audio.play().catch(() => {});
  } catch {
    /* audio unavailable */
  }
}

/** System notification, only when the tab is hidden and the user allowed it. */
export function systemNotify(title: string, body?: string) {
  const s = settingsStore.get();
  if (!s.notifications || s.dnd) return;
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  if (document.visibilityState === "visible") return;
  try {
    new Notification(title, { body, icon: "/images/logo.png", silent: true });
  } catch {
    /* some platforms only allow notifications from a service worker */
  }
}

export async function requestNotificationPermission() {
  if (typeof Notification === "undefined") return "unsupported" as const;
  if (Notification.permission === "default") return Notification.requestPermission();
  return Notification.permission;
}
