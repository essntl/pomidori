"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { TIMER_PRESETS, timerActions, timerSettingsStore, type TimerSettings } from "@/app/context/TimerContext";
import { useStore } from "@/app/lib/storage";
import { cn } from "@/app/lib/cn";
import { Row } from "../ui/Field";
import { Switch } from "../ui/Switch";
import { IconButton } from "../ui/Button";

const LIMITS: Record<"work" | "short" | "long" | "longEvery", [number, number]> = {
  work: [1, 240],
  short: [1, 60],
  long: [1, 120],
  longEvery: [1, 12],
};

function Stepper({
  value,
  onChange,
  min,
  max,
  suffix,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  suffix?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = (raw: string) => {
    const n = Math.round(Number(raw));
    if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)));
    setDraft(null);
  };
  return (
    <div className="flex items-center gap-1 rounded-control bg-surface-2 p-1">
      <IconButton size="sm" label="Decrease" disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))}>
        <Minus />
      </IconButton>
      <label className="flex w-16 items-baseline justify-center gap-0.5">
        <input
          type="number"
          inputMode="numeric"
          value={draft ?? value}
          min={min}
          max={max}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          className="w-9 bg-transparent text-center text-[15px] font-bold text-fg tabular-nums outline-none"
        />
        {suffix && <span className="text-xs font-semibold text-muted">{suffix}</span>}
      </label>
      <IconButton size="sm" label="Increase" disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))}>
        <Plus />
      </IconButton>
    </div>
  );
}

/** Timer preferences. Changes apply instantly (no save button, no stale copies). */
export function TimerSettingsForm() {
  const s = useStore(timerSettingsStore);
  const set = (patch: Partial<TimerSettings>) => timerActions.updateSettings(patch);
  const activePreset = TIMER_PRESETS.find((p) => p.work === s.work && p.short === s.short && p.long === s.long)?.name;

  return (
    <div>
      <div className="mb-2 grid grid-cols-3 gap-2">
        {TIMER_PRESETS.map((p) => (
          <button
            key={p.name}
            type="button"
            onClick={() => set({ work: p.work, short: p.short, long: p.long })}
            className={cn(
              "rounded-2xl border px-3 py-2.5 text-left transition-colors",
              activePreset === p.name ? "border-accent/50 bg-accent-soft" : "border-line bg-surface-2 hover:bg-surface-3",
            )}
          >
            <div className={cn("text-[13px] font-bold", activePreset === p.name ? "text-accent" : "text-fg")}>{p.name}</div>
            <div className="text-xs text-muted tabular-nums">
              {p.work} / {p.short} / {p.long}
            </div>
          </button>
        ))}
      </div>
      <div className="divide-y divide-line">
        <Row label="Focus">
          <Stepper value={s.work} min={LIMITS.work[0]} max={LIMITS.work[1]} suffix="min" onChange={(v) => set({ work: v })} />
        </Row>
        <Row label="Short break">
          <Stepper value={s.short} min={LIMITS.short[0]} max={LIMITS.short[1]} suffix="min" onChange={(v) => set({ short: v })} />
        </Row>
        <Row label="Long break">
          <Stepper value={s.long} min={LIMITS.long[0]} max={LIMITS.long[1]} suffix="min" onChange={(v) => set({ long: v })} />
        </Row>
        <Row label="Long break every" hint="Focus sessions per cycle">
          <Stepper value={s.longEvery} min={LIMITS.longEvery[0]} max={LIMITS.longEvery[1]} onChange={(v) => set({ longEvery: v })} />
        </Row>
        <Row label="Auto-start breaks">
          <Switch label="Auto-start breaks" checked={s.autoStartBreaks} onChange={(v) => set({ autoStartBreaks: v })} />
        </Row>
        <Row label="Auto-start focus" hint="Start the next session when a break ends">
          <Switch label="Auto-start focus" checked={s.autoStartWork} onChange={(v) => set({ autoStartWork: v })} />
        </Row>
      </div>
    </div>
  );
}
