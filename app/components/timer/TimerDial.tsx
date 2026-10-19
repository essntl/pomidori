"use client";

import { motion } from "framer-motion";
import { Pause, Play, RotateCcw, StepForward } from "lucide-react";
import { useTimer, PHASE_META, type Phase } from "@/app/context/TimerContext";
import { fmtClock } from "@/app/lib/date";
import { spring } from "@/app/lib/motion";
import { cn } from "@/app/lib/cn";
import { Rolling } from "../ui/Rolling";
import { Segmented } from "../ui/Segmented";
import { IconButton } from "../ui/Button";

/** The large timer: phase switcher, progress ring, clock, controls and cycle dots. */
export function TimerDial({ compact = false }: { compact?: boolean }) {
  const t = useTimer();
  const size = compact ? 176 : 300;
  const stroke = compact ? 9 : 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color = PHASE_META[t.phase].color;
  const running = t.status === "running";
  const cycleIndex = t.round % t.settings.longEvery;

  return (
    <div className="flex flex-col items-center">
      {!compact && (
        <Segmented<Phase>
          value={t.phase}
          onChange={(p) => p !== t.phase && t.setPhase(p)}
          options={[
            { value: "work", label: "Focus" },
            { value: "short", label: "Short break" },
            { value: "long", label: "Long break" },
          ]}
          className="mb-6"
        />
      )}

      <div className="relative" style={{ width: size, height: size }}>
        <motion.div
          className="absolute inset-[12%] rounded-full blur-3xl"
          style={{ background: color }}
          animate={{ opacity: running ? [0.16, 0.28, 0.16] : 0.08 }}
          transition={running ? { duration: 4, repeat: Infinity, ease: "easeInOut" } : spring.smooth}
        />
        <svg width={size} height={size} className="relative -rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - t.progress)}
            style={{ transition: "stroke-dashoffset 0.35s linear, stroke 0.4s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="mb-1 text-[12px] font-bold tracking-[0.16em] uppercase" style={{ color }}>
            {t.status === "paused" ? "Paused" : PHASE_META[t.phase].label}
          </span>
          <Rolling
            value={fmtClock(t.remaining)}
            className={cn("leading-none font-extrabold tracking-tight text-fg", compact ? "text-[38px]" : "text-[68px]")}
          />
          <div className="mt-3 flex gap-1.5" aria-label={`Session ${cycleIndex + 1} of ${t.settings.longEvery}`}>
            {Array.from({ length: t.settings.longEvery }).map((_, i) => (
              <motion.span
                key={i}
                layout
                transition={spring.snappy}
                className="h-1.5 rounded-full"
                style={{
                  width: i === cycleIndex && t.phase === "work" ? 18 : 6,
                  background: i < cycleIndex || (i === cycleIndex && t.phase !== "work") ? color : i === cycleIndex ? color : "var(--surface-3)",
                  opacity: i === cycleIndex && t.phase === "work" ? 1 : i < cycleIndex || (i === cycleIndex && t.phase !== "work") ? 0.6 : 1,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className={cn("flex items-center gap-4", compact ? "mt-3" : "mt-7")}>
        <IconButton label="Reset" variant="secondary" size={compact ? "md" : "lg"} onClick={t.reset} className="rounded-full">
          <RotateCcw />
        </IconButton>
        <motion.button
          type="button"
          onClick={t.toggle}
          whileTap={{ scale: 0.92 }}
          transition={spring.snappy}
          aria-label={running ? "Pause" : "Start"}
          className={cn(
            "grid place-items-center rounded-full text-white shadow-[0_12px_30px_-10px_var(--glow)]",
            compact ? "size-[52px] [&_svg]:size-6" : "size-[72px] [&_svg]:size-7",
          )}
          style={{ background: color, ["--glow" as string]: color }}
        >
          <motion.span key={running ? "pause" : "play"} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={spring.bouncy}>
            {running ? <Pause fill="currentColor" /> : <Play fill="currentColor" className="translate-x-0.5" />}
          </motion.span>
        </motion.button>
        <IconButton label="Skip phase" variant="secondary" size={compact ? "md" : "lg"} onClick={t.skip} className="rounded-full">
          <StepForward />
        </IconButton>
      </div>
    </div>
  );
}
