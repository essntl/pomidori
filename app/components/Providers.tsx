"use client";

import { useEffect, type ReactNode } from "react";
import { MotionConfig } from "framer-motion";
import { TimerProvider } from "../context/TimerContext";
import { useStore } from "../lib/storage";
import { settingsStore } from "../lib/stores/settings";
import { ambientStore } from "../lib/player/ambient";
import { playerStore } from "../lib/player/controller";
import { isApplyingRemote, startSync } from "../lib/sync/engine";
import { notify } from "../lib/alerts";

/** Applies theme + accent to <html> and follows the OS theme when set to "system". */
function ThemeSync() {
  const { theme, accent } = useStore(settingsStore);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.accent = accent;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = theme === "dark" || (theme === "system" && mq.matches);
      root.classList.toggle("dark", dark);
      root.style.colorScheme = dark ? "dark" : "light";
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#09090b" : "#f3f3f6");
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme, accent]);

  return null;
}

/** Audio can't resume without a user gesture, so restored sessions start paused. */
function AudioBoot() {
  useEffect(() => {
    if (ambientStore.get().enabled) ambientStore.set((s) => ({ ...s, enabled: false }));
    // Touch the player store so the queue is hydrated early.
    playerStore.get();
  }, []);
  return null;
}

/**
 * Silence mode can be flipped from settings, the control centre or search; the Dynamic Island
 * confirms it wherever it came from.
 */
function SilenceAlerts() {
  useEffect(() => {
    let prev = settingsStore.get().dnd;
    return settingsStore.subscribe(() => {
      const dnd = settingsStore.get().dnd;
      if (dnd === prev) return;
      prev = dnd;
      if (isApplyingRemote()) return;
      notify(
        dnd
          ? { title: "Silence on", body: "Chimes and notifications are muted", icon: "🔕", tone: "info", duration: 2200 }
          : { title: "Silence off", body: "Chimes and notifications are back", icon: "🔔", tone: "accent", duration: 2200 },
      );
    });
  }, []);
  return null;
}

/**
 * Firefox for Android (bug 1894136 and friends): with the address bar hidden, fixed elements stay
 * laid out as if it were still showing, leaving an uncovered strip at the bottom. Measure that
 * strip with an invisible bottom-pinned probe and expose it as --vv-gap; browsers that place
 * fixed elements correctly measure 0, so nothing changes for them.
 */
function ViewportGap() {
  useEffect(() => {
    const probe = document.createElement("div");
    probe.setAttribute("aria-hidden", "true");
    Object.assign(probe.style, { position: "fixed", left: "0", bottom: "0", width: "1px", height: "1px", visibility: "hidden", pointerEvents: "none" });
    document.body.appendChild(probe);
    const root = document.documentElement;
    let frame = 0;
    let last = -1;
    const measure = () => {
      frame = 0;
      const vv = window.visualViewport;
      // Pinch-zoom and the on-screen keyboard shrink the visual viewport; those never count as a gap.
      if (vv && vv.scale > 1.01) return;
      const screenBottom = vv ? vv.offsetTop + vv.height : window.innerHeight;
      const gap = Math.round(screenBottom - probe.getBoundingClientRect().bottom);
      const value = gap > 0 && gap < 160 ? gap : 0;
      if (value !== last) {
        last = value;
        root.style.setProperty("--vv-gap", `${value}px`);
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    const vv = window.visualViewport;
    vv?.addEventListener("resize", schedule);
    vv?.addEventListener("scroll", schedule);
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      vv?.removeEventListener("resize", schedule);
      vv?.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule);
      probe.remove();
    };
  }, []);
  return null;
}

/** Cross-device sync; does nothing unless a passphrase was set up on this device. */
function SyncBoot() {
  useEffect(() => {
    startSync();
  }, []);
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <TimerProvider>
        <ThemeSync />
        <AudioBoot />
        <SyncBoot />
        <SilenceAlerts />
        <ViewportGap />
        {children}
      </TimerProvider>
    </MotionConfig>
  );
}
