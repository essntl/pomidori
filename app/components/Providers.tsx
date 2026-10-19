"use client";

import { useEffect, type ReactNode } from "react";
import { MotionConfig } from "framer-motion";
import { TimerProvider } from "../context/TimerContext";
import { useStore } from "../lib/storage";
import { settingsStore } from "../lib/stores/settings";
import { ambientStore } from "../lib/player/ambient";
import { playerStore } from "../lib/player/controller";

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

export function Providers({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <TimerProvider>
        <ThemeSync />
        <AudioBoot />
        {children}
      </TimerProvider>
    </MotionConfig>
  );
}
