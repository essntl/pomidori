"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createStore, useStore } from "../lib/storage";
import { logSession } from "../lib/stores/sessions";
import { settingsStore } from "../lib/stores/settings";
import { notify, playSound, systemNotify } from "../lib/alerts";
import { fmtClock } from "../lib/date";

export type Phase = "work" | "short" | "long";
export type TimerStatus = "idle" | "running" | "paused";

export type TimerSettings = {
  work: number;
  short: number;
  long: number;
  longEvery: number;
  autoStartBreaks: boolean;
  autoStartWork: boolean;
};

type TimerRuntime = {
  phase: Phase;
  status: TimerStatus;
  /** Epoch ms when the running phase ends. */
  endsAt: number | null;
  /** Remaining ms while idle or paused. */
  remaining: number;
  /** Total ms of the current phase (grows with +1 min). */
  duration: number;
  /** Work sessions completed in the current cycle. */
  round: number;
  taskId: string | null;
};

export const PHASE_META: Record<Phase, { label: string; short: string; color: string }> = {
  work: { label: "Focus", short: "Focus", color: "var(--accent)" },
  short: { label: "Short break", short: "Break", color: "var(--success)" },
  long: { label: "Long break", short: "Long break", color: "var(--info)" },
};

export const TIMER_PRESETS = [
  { name: "Classic", work: 25, short: 5, long: 15 },
  { name: "Deep", work: 50, short: 10, long: 20 },
  { name: "Flow", work: 90, short: 20, long: 30 },
];

const defaultSettings: TimerSettings = {
  work: 25,
  short: 5,
  long: 15,
  longEvery: 4,
  autoStartBreaks: true,
  autoStartWork: false,
};

export const timerSettingsStore = createStore<TimerSettings>("timer-settings", defaultSettings, {
  migrate: (d) => ({ ...defaultSettings, ...(d as Partial<TimerSettings>) }),
});

const minutes = (m: number) => m * 60_000;

function phaseMs(phase: Phase, s: TimerSettings) {
  return minutes(phase === "work" ? s.work : phase === "short" ? s.short : s.long);
}

export const timerStore = createStore<TimerRuntime>("timer", {
  phase: "work",
  status: "idle",
  endsAt: null,
  remaining: minutes(defaultSettings.work),
  duration: minutes(defaultSettings.work),
  round: 0,
  taskId: null,
});

/* ───────────── actions (plain functions so any component or the command palette can call them) ───────────── */

export const timerActions = {
  start() {
    timerStore.set((t) => (t.status === "running" ? t : { ...t, status: "running", endsAt: Date.now() + t.remaining }));
    playSound("start");
  },
  pause() {
    timerStore.set((t) =>
      t.status !== "running" ? t : { ...t, status: "paused", remaining: Math.max(0, (t.endsAt ?? 0) - Date.now()), endsAt: null },
    );
  },
  toggle() {
    if (timerStore.get().status === "running") timerActions.pause();
    else timerActions.start();
  },
  reset() {
    const s = timerSettingsStore.get();
    timerStore.set((t) => ({ ...t, phase: "work", status: "idle", endsAt: null, remaining: phaseMs("work", s), duration: phaseMs("work", s), round: 0 }));
    playSound("reset");
  },
  /** Jump to the next phase without logging the current one. */
  skip() {
    const s = timerSettingsStore.get();
    timerStore.set((t) => {
      const round = t.phase === "work" ? t.round + 1 : t.round;
      const next: Phase = t.phase === "work" ? (round % s.longEvery === 0 ? "long" : "short") : "work";
      const dur = phaseMs(next, s);
      const running = t.status === "running";
      return {
        ...t,
        phase: next,
        round: next === "work" && t.phase === "long" ? 0 : round,
        duration: dur,
        remaining: dur,
        status: running ? "running" : "idle",
        endsAt: running ? Date.now() + dur : null,
      };
    });
  },
  addMinutes(n: number) {
    timerStore.set((t) => {
      const delta = minutes(n);
      if (t.status === "running") return { ...t, endsAt: (t.endsAt ?? Date.now()) + delta, duration: t.duration + delta };
      return { ...t, remaining: Math.max(60_000, t.remaining + delta), duration: Math.max(60_000, t.duration + delta) };
    });
  },
  setPhase(phase: Phase) {
    const dur = phaseMs(phase, timerSettingsStore.get());
    timerStore.set((t) => ({ ...t, phase, status: "idle", endsAt: null, remaining: dur, duration: dur }));
  },
  setTask(taskId: string | null) {
    timerStore.set((t) => ({ ...t, taskId }));
  },
  updateSettings(patch: Partial<TimerSettings>) {
    timerSettingsStore.set((s) => ({ ...s, ...patch }));
    const s = timerSettingsStore.get();
    // An idle timer immediately reflects new durations.
    timerStore.set((t) => (t.status === "idle" ? { ...t, remaining: phaseMs(t.phase, s), duration: phaseMs(t.phase, s) } : t));
  },
};

function completePhase(now: number) {
  const s = timerSettingsStore.get();
  const t = timerStore.get();
  if (t.status !== "running" || t.endsAt == null) return;

  let next: Phase;
  let round = t.round;
  if (t.phase === "work") {
    logSession(t.endsAt - t.duration, t.endsAt, t.taskId);
    round += 1;
    next = round % s.longEvery === 0 ? "long" : "short";
    const label = next === "long" ? "Long break" : "Break time";
    const body = `Session complete. Enjoy ${next === "long" ? s.long : s.short} minutes off.`;
    notify({ title: label, body, icon: "☕", tone: "success", duration: 4500 });
    systemNotify(label, body);
  } else {
    next = "work";
    if (t.phase === "long") round = 0;
    notify({ title: "Back to focus", body: `${s.work} minutes on the clock.`, icon: "🎯", tone: "accent", duration: 4500 });
    systemNotify("Back to focus", `${s.work} minutes on the clock.`);
  }
  playSound(settingsStore.get().chime);

  const auto = t.phase === "work" ? s.autoStartBreaks : s.autoStartWork;
  const dur = phaseMs(next, s);
  timerStore.set({
    ...t,
    phase: next,
    round,
    duration: dur,
    remaining: dur,
    status: auto ? "running" : "idle",
    endsAt: auto ? now + dur : null,
  });
}

/* ───────────── provider: drives the clock ───────────── */

const NowContext = createContext<number>(0);

export function TimerProvider({ children }: { children: ReactNode }) {
  const t = useStore(timerStore);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (t.status !== "running") return;
    // Re-render only when the displayed second changes: wake up just after each second
    // boundary of the countdown instead of polling several times a second.
    let id: ReturnType<typeof setTimeout>;
    const tick = () => {
      const n = Date.now();
      setNow(n);
      const cur = timerStore.get();
      if (cur.status !== "running" || cur.endsAt == null) return;
      if (n >= cur.endsAt) {
        completePhase(n);
        return;
      }
      const msIntoSecond = (cur.endsAt - n) % 1000;
      id = setTimeout(tick, (msIntoSecond || 1000) + 15);
    };
    tick();
    return () => clearTimeout(id);
  }, [t.status, t.endsAt]);

  // Countdown in the tab title.
  const titleCountdown = useStore(settingsStore, selectTitleCountdown);
  const remaining = t.status === "running" && t.endsAt ? Math.min(t.duration, t.endsAt - now) : t.remaining;
  const clock = fmtClock(remaining);
  useEffect(() => {
    if (!titleCountdown || t.status === "idle") {
      document.title = "Pomidori";
      return;
    }
    document.title = `${t.status === "paused" ? "⏸ " : ""}${clock} · ${PHASE_META[t.phase].short} — Pomidori`;
  }, [clock, t.status, t.phase, titleCountdown]);

  return <NowContext.Provider value={now}>{children}</NowContext.Provider>;
}

const selectTitleCountdown = (s: { titleCountdown: boolean }) => s.titleCountdown;

export function useTimer() {
  const t = useStore(timerStore);
  const settings = useStore(timerSettingsStore);
  const now = useContext(NowContext);
  const remaining =
    t.status === "running" && t.endsAt != null ? Math.min(t.duration, Math.max(0, t.endsAt - now)) : t.remaining;
  const progress = t.duration > 0 ? 1 - remaining / t.duration : 0;
  const active = t.status !== "idle" || t.round > 0 || t.phase !== "work";

  return useMemo(
    () => ({
      ...t,
      settings,
      remaining,
      progress: Math.min(1, Math.max(0, progress)),
      active,
      ...timerActions,
    }),
    [t, settings, remaining, progress, active],
  );
}
