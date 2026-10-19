"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { createMemoryStore, useStore } from "../lib/storage";
import { playerRuntime, playerStore } from "../lib/player/controller";
import { ambientStore } from "../lib/player/ambient";
import { settingsStore } from "../lib/stores/settings";

/** Shared UI state: which global overlay is open. */
export const uiStore = createMemoryStore<{ controlCenter: boolean; palette: boolean }>({
  controlCenter: false,
  palette: false,
});

export const ui = {
  openControlCenter: () => uiStore.set({ controlCenter: true, palette: false }),
  closeControlCenter: () => uiStore.set((s) => ({ ...s, controlCenter: false })),
  toggleControlCenter: () => uiStore.set((s) => ({ controlCenter: !s.controlCenter, palette: false })),
  openPalette: () => uiStore.set({ palette: true, controlCenter: false }),
  closePalette: () => uiStore.set((s) => ({ ...s, palette: false })),
};

export function useUI() {
  return useStore(uiStore);
}

export function usePlayer() {
  const data = useStore(playerStore);
  const runtime = useStore(playerRuntime);
  const track = data.queue[data.index] ?? null;
  return { ...data, ...runtime, track, playing: runtime.status === "playing" || runtime.status === "buffering" };
}

export function useAmbient() {
  return useStore(ambientStore);
}

export function useSettings() {
  return useStore(settingsStore);
}

/** Global keyboard shortcut; ignored while typing in a field unless `allowInInputs`. */
export function useHotkey(
  match: (e: KeyboardEvent) => boolean,
  handler: (e: KeyboardEvent) => void,
  { allowInInputs = false, enabled = true } = {},
) {
  const ref = useRef({ match, handler });
  useEffect(() => {
    ref.current = { match, handler };
  });
  useEffect(() => {
    if (!enabled) return;
    function onKey(e: KeyboardEvent) {
      if (!allowInInputs) {
        const t = e.target as HTMLElement | null;
        if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      }
      if (ref.current.match(e)) ref.current.handler(e);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [allowInInputs, enabled]);
}

function subscribeHtmlClass(cb: () => void) {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => obs.disconnect();
}

/** Whether dark mode is currently applied (follows <html class="dark">). */
export function useIsDark() {
  return useSyncExternalStore(
    subscribeHtmlClass,
    () => document.documentElement.classList.contains("dark"),
    () => false,
  );
}
