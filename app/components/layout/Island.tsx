"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Pause, Play, Plus, SkipBack, SkipForward, StepForward, Maximize2 } from "lucide-react";
import { useTimer, PHASE_META } from "@/app/context/TimerContext";
import { usePlayer } from "@/app/context/hooks";
import { dismissAlert, useIslandAlert, type AlertTone } from "@/app/lib/alerts";
import { player } from "@/app/lib/player/controller";
import { fmtClock } from "@/app/lib/date";
import { spring } from "@/app/lib/motion";
import { cn } from "@/app/lib/cn";
import { Equalizer, Ring, Rolling } from "../ui/Rolling";
import { Slider } from "../ui/Slider";
import { Artwork, fmtSeconds } from "../music/Artwork";

const TONE: Record<AlertTone, string> = {
  accent: "var(--accent)",
  success: "var(--success)",
  info: "var(--info)",
  warning: "var(--warning)",
  danger: "var(--danger)",
};

const content = {
  initial: { opacity: 0, scale: 0.92, filter: "blur(6px)" },
  animate: { opacity: 1, scale: 1, filter: "blur(0px)", transition: { ...spring.snappy, delay: 0.05 } },
  exit: { opacity: 0, scale: 0.92, filter: "blur(6px)", transition: { duration: 0.12 } },
};

function IslandButton({ label, onClick, children, big }: { label: string; onClick: () => void; children: React.ReactNode; big?: boolean }) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      title={label}
      whileTap={{ scale: 0.86 }}
      transition={spring.snappy}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "grid shrink-0 place-items-center rounded-full transition-colors",
        big ? "size-10 bg-white text-black hover:bg-white/85 [&_svg]:size-[18px]" : "size-9 bg-white/10 text-white hover:bg-white/20 [&_svg]:size-4",
      )}
    >
      {children}
    </motion.button>
  );
}

/**
 * The Dynamic Island: a black pill at the top centre that morphs between
 * hidden → compact (timer and/or music activity) → expanded controls, and briefly
 * grows to show alerts (the app's toast system).
 */
export default function Island() {
  const timer = useTimer();
  const p = usePlayer();
  const alert = useIslandAlert();
  const [expanded, setExpanded] = useState(false);
  // Activity restored on page load (a running timer, a queued track) should just be there,
  // not pop in; only animate the island in for activity that starts after load.
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setSettled(true), 800);
    return () => clearTimeout(id);
  }, []);
  const ref = useRef<HTMLDivElement>(null);

  const showTimer = timer.active;
  const showMusic = !!p.track && p.loaded;
  const hasActivity = showTimer || showMusic;
  const mode = alert ? "alert" : expanded && hasActivity ? "expanded" : hasActivity ? "compact" : "hidden";
  const phaseColor = PHASE_META[timer.phase].color;

  useEffect(() => {
    if (!expanded) return;
    function onDown(e: PointerEvent) {
      if (!ref.current?.contains(e.target as Node)) setExpanded(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setExpanded(false);
    }
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [expanded]);

  // Top edge matches the 44px header buttons (header padding + 2px), so the compact pill lines up with them.
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[14px] z-[60] flex justify-center px-3 sm:top-[18px]">
      <AnimatePresence>
        {mode !== "hidden" && (
          <motion.div
            ref={ref}
            layout
            initial={settled ? { opacity: 0, scale: 0.6, y: -10 } : false}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.6, y: -10 }}
            transition={spring.island}
            style={{ borderRadius: mode === "expanded" ? 30 : 24 }}
            onClick={() => mode === "alert" ? dismissAlert() : setExpanded((e) => !e)}
            role="button"
            tabIndex={0}
            aria-expanded={mode === "expanded"}
            aria-label="Activity island"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setExpanded((x) => !x);
              }
            }}
            className="pointer-events-auto max-w-full cursor-pointer overflow-hidden bg-black text-white shadow-[0_12px_40px_-10px_rgb(0_0_0/0.6)] ring-1 ring-white/10 select-none"
          >
            <AnimatePresence mode="popLayout" initial={false}>
              {mode === "alert" && alert && (
                <motion.div key={`alert-${alert.id}`} {...content} className="flex min-w-[260px] max-w-[min(420px,calc(100vw-1.5rem))] items-center gap-3 py-2.5 pr-5 pl-2.5">
                  <span
                    className="grid size-9 shrink-0 place-items-center rounded-full text-lg"
                    style={{ background: `color-mix(in oklab, ${TONE[alert.tone]} 30%, transparent)` }}
                  >
                    {alert.icon ?? "•"}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-[14px] font-bold leading-tight">{alert.title}</div>
                    {alert.body && <div className="truncate text-[12px] leading-tight text-white/60">{alert.body}</div>}
                  </div>
                </motion.div>
              )}

              {mode === "compact" && (
                <motion.div key="compact" {...content} className="flex h-11 items-center gap-2.5 px-3">
                  {showTimer && (
                    <div className="flex items-center gap-2">
                      <Ring progress={timer.progress} size={22} stroke={3} color={phaseColor} />
                      <span className="hidden text-[12px] font-bold text-white/60 sm:inline">{PHASE_META[timer.phase].short}</span>
                      <Rolling value={fmtClock(timer.remaining)} className={cn("text-[14px] font-bold", timer.status === "paused" && "text-white/50")} />
                    </div>
                  )}
                  {showTimer && showMusic && <span className="h-4 w-px bg-white/15" />}
                  {showMusic && (
                    <div className="flex min-w-0 items-center gap-2">
                      <Artwork track={p.track} className="size-7 rounded-lg" />
                      {!showTimer && <span className="max-w-[110px] truncate sm:max-w-[160px] text-[13px] font-semibold">{p.track!.title}</span>}
                      <Equalizer playing={p.status === "playing"} className="text-[var(--accent)]" />
                    </div>
                  )}
                </motion.div>
              )}

              {mode === "expanded" && (
                <motion.div key="expanded" {...content} className="flex w-[min(380px,calc(100vw-1.5rem))] flex-col gap-3 p-3.5">
                  {showTimer && (
                    <div className="flex items-center gap-3">
                      <div className="relative grid place-items-center">
                        <Ring progress={timer.progress} size={46} stroke={4} color={phaseColor} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-bold tracking-wider text-white/50 uppercase">
                          {PHASE_META[timer.phase].label} · {timer.round % timer.settings.longEvery + (timer.phase === "work" ? 1 : 0)}/{timer.settings.longEvery}
                        </div>
                        <Rolling value={fmtClock(timer.remaining)} className="text-[26px] leading-none font-extrabold" />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <IslandButton label="Add a minute" onClick={() => timer.addMinutes(1)}><Plus /></IslandButton>
                        <IslandButton label="Skip phase" onClick={timer.skip}><StepForward /></IslandButton>
                        <IslandButton big label={timer.status === "running" ? "Pause timer" : "Start timer"} onClick={timer.toggle}>
                          {timer.status === "running" ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}
                        </IslandButton>
                      </div>
                    </div>
                  )}
                  {showTimer && showMusic && <div className="h-px bg-white/10" />}
                  {showMusic && p.track && (
                    <div className="flex flex-col gap-2.5">
                      <div className="flex items-center gap-3">
                        <Artwork track={p.track} className="size-11 rounded-xl" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[14px] font-bold">{p.track.title}</div>
                          <div className="truncate text-[12px] text-white/55">{p.track.artist || "—"}</div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <IslandButton label="Previous" onClick={player.prev}><SkipBack fill="currentColor" /></IslandButton>
                          <IslandButton big label={p.playing ? "Pause music" : "Play music"} onClick={player.toggle}>
                            {p.playing ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}
                          </IslandButton>
                          <IslandButton label="Next" onClick={player.next}><SkipForward fill="currentColor" /></IslandButton>
                        </div>
                      </div>
                      {!p.track.live && p.duration > 0 && (
                        <div className="flex items-center gap-2 text-[11px] font-semibold text-white/50 tabular-nums" onClick={(e) => e.stopPropagation()}>
                          <span>{fmtSeconds(p.position)}</span>
                          <div className="flex-1">
                            <Slider tone="light" label="Seek" value={p.position} max={p.duration} step={1} onChange={player.seek} />
                          </div>
                          <span>{fmtSeconds(p.duration)}</span>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex gap-2 text-[12px] font-bold" onClick={(e) => e.stopPropagation()}>
                    {showTimer && (
                      <Link href="/focus" onClick={() => setExpanded(false)} className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-white/10 py-1.5 hover:bg-white/15 [&_svg]:size-3.5">
                        <Maximize2 /> Focus
                      </Link>
                    )}
                    {showMusic && (
                      <Link href="/music" onClick={() => setExpanded(false)} className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-white/10 py-1.5 hover:bg-white/15 [&_svg]:size-3.5">
                        <Maximize2 /> Queue
                      </Link>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
