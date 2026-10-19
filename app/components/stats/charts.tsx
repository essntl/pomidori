"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/app/lib/cn";
import { spring } from "@/app/lib/motion";
import { fmtDuration } from "@/app/lib/date";

export function StatTile({ label, value, sub, className }: { label: string; value: string; sub?: string; className?: string }) {
  return (
    <div className={cn("rounded-card border border-line bg-surface p-4 shadow-card backdrop-blur-xl", className)}>
      <div className="text-[12px] font-bold tracking-wider text-muted uppercase">{label}</div>
      <div className="mt-1 text-[28px] leading-tight font-extrabold tracking-tight text-fg tabular-nums">{value}</div>
      {sub && <div className="text-[13px] text-muted">{sub}</div>}
    </div>
  );
}

/** Single-series bar chart of minutes per bucket. Accent hue, rounded data-ends, hover tooltip. */
export function BarChart({
  data,
  height = 180,
}: {
  data: { key: string; label: string; short: string; value: number; highlight?: boolean }[];
  height?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(30, ...data.map((d) => d.value));
  const nice = Math.ceil(max / 30) * 30;
  const ticks = [0, nice / 2, nice];

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="relative w-8 shrink-0 text-right text-[11px] text-muted tabular-nums" style={{ height }}>
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: `${(1 - t / nice) * 100}%` }}>
              {t >= 60 ? `${Math.round(t / 60)}h` : `${t}m`}
            </span>
          ))}
        </div>
        <div className="relative flex-1" style={{ height }}>
          {ticks.map((t) => (
            <div key={t} className="absolute inset-x-0 border-t border-line" style={{ top: `${(1 - t / nice) * 100}%` }} />
          ))}
          <div className="absolute inset-0 flex items-end gap-[2px]" onMouseLeave={() => setHover(null)}>
            {data.map((d, i) => (
              <div
                key={d.key}
                className="relative flex h-full flex-1 cursor-default items-end justify-center"
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                tabIndex={0}
                aria-label={`${d.label}: ${fmtDuration(d.value)}`}
              >
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${(d.value / nice) * 100}%` }}
                  transition={{ ...spring.smooth, delay: i * 0.012 }}
                  className={cn(
                    "w-full max-w-7 rounded-t-[4px] transition-opacity",
                    hover !== null && hover !== i && "opacity-45",
                  )}
                  style={{ background: d.highlight ? "var(--accent)" : "color-mix(in oklab, var(--accent) 62%, var(--surface-solid))", minHeight: d.value > 0 ? 3 : 0 }}
                />
              </div>
            ))}
          </div>
          <AnimatePresence>
            {hover !== null && (
              <motion.div
                key="tip"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full rounded-xl border border-line bg-surface-solid px-3 py-1.5 text-center shadow-pop"
                style={{ left: `${((hover + 0.5) / data.length) * 100}%` }}
              >
                <div className="text-[11px] font-semibold whitespace-nowrap text-muted">{data[hover].label}</div>
                <div className="text-sm font-bold text-fg tabular-nums">{fmtDuration(data[hover].value)}</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <div className="mt-2 ml-10 flex gap-[2px]">
        {data.map((d, i) => (
          <span key={d.key} className="flex-1 text-center text-[10.5px] font-semibold text-muted">
            {data.length > 16 && i % 2 === 1 ? "" : d.short}
          </span>
        ))}
      </div>
    </div>
  );
}

/** GitHub-style heatmap: one column per week, Monday at top, 5 sequential steps of the accent hue. */
export function Heatmap({ weeks }: { weeks: { key: string; label: string; value: number; future: boolean }[][] }) {
  const [hover, setHover] = useState<{ label: string; value: number } | null>(null);
  const level = (v: number) => (v === 0 ? 0 : v < 25 ? 1 : v < 60 ? 2 : v < 120 ? 3 : 4);
  const fills = [
    "var(--surface-3)",
    "color-mix(in oklab, var(--accent) 28%, var(--surface-solid))",
    "color-mix(in oklab, var(--accent) 50%, var(--surface-solid))",
    "color-mix(in oklab, var(--accent) 75%, var(--surface-solid))",
    "var(--accent)",
  ];
  return (
    <div>
      <div className="overflow-x-auto pb-1">
        <div className="flex w-max gap-[3px]" onMouseLeave={() => setHover(null)}>
          {weeks.map((week, w) => (
            <div key={w} className="flex flex-col gap-[3px]">
              {week.map((d) => (
                <div
                  key={d.key}
                  onMouseEnter={() => setHover({ label: d.label, value: d.value })}
                  className="size-3.5 rounded-[4px]"
                  style={{ background: d.future ? "transparent" : fills[level(d.value)] }}
                  aria-label={`${d.label}: ${fmtDuration(d.value)}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[12px] text-muted">
        <span className="min-h-4 font-semibold text-fg-2 tabular-nums">
          {hover ? `${hover.label} · ${hover.value ? fmtDuration(hover.value) : "no focus"}` : "Hover a day for details"}
        </span>
        <span className="flex items-center gap-1">
          Less
          {fills.map((f, i) => (
            <span key={i} className="size-3 rounded-[3px]" style={{ background: f }} />
          ))}
          More
        </span>
      </div>
    </div>
  );
}
