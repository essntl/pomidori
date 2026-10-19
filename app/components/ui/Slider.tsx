"use client";

import { useRef, type ReactNode } from "react";
import { cn } from "@/app/lib/cn";

/**
 * Pointer-driven slider. `orientation="vertical"` renders the tall HyperOS control-centre
 * style (fill rises from the bottom, icon sits inside).
 */
export function Slider({
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.01,
  orientation = "horizontal",
  icon,
  label,
  className,
  disabled,
  tone = "accent",
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  orientation?: "horizontal" | "vertical";
  icon?: ReactNode;
  label: string;
  className?: string;
  disabled?: boolean;
  /** "light" for use on dark glass (island, control centre). */
  tone?: "accent" | "light";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const pct = max === min ? 0 : Math.min(1, Math.max(0, (value - min) / (max - min)));
  const vertical = orientation === "vertical";

  function valueAt(e: React.PointerEvent) {
    const r = ref.current!.getBoundingClientRect();
    const t = vertical ? 1 - (e.clientY - r.top) / r.height : (e.clientX - r.left) / r.width;
    const raw = min + Math.min(1, Math.max(0, t)) * (max - min);
    return Math.round(raw / step) * step;
  }

  function onPointerDown(e: React.PointerEvent) {
    if (disabled) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    onChange(valueAt(e));
  }

  function onPointerMove(e: React.PointerEvent) {
    if (disabled || !(e.buttons & 1)) return;
    onChange(valueAt(e));
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const delta = (max - min) / 20;
    if (e.key === "ArrowUp" || e.key === "ArrowRight") onChange(Math.min(max, value + delta));
    else if (e.key === "ArrowDown" || e.key === "ArrowLeft") onChange(Math.max(min, value - delta));
    else return;
    e.preventDefault();
  }

  if (vertical) {
    return (
      <div
        ref={ref}
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-orientation="vertical"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onKeyDown={onKeyDown}
        className={cn(
          "relative cursor-pointer touch-none overflow-hidden rounded-tile bg-white/12 select-none",
          disabled && "opacity-40",
          className,
        )}
      >
        <div
          className="absolute inset-x-0 bottom-0 bg-white/90 transition-[height] duration-75"
          style={{ height: `${pct * 100}%` }}
        />
        {icon && (
          <div
            className={cn(
              "absolute inset-x-0 bottom-4 flex justify-center transition-colors [&_svg]:size-6",
              pct > 0.12 ? "text-black/70" : "text-white/80",
            )}
          >
            {icon}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onKeyDown={onKeyDown}
      className={cn("group relative flex h-5 cursor-pointer touch-none items-center select-none", disabled && "opacity-40", className)}
    >
      <div className={cn("h-1.5 w-full overflow-hidden rounded-full transition-[height] duration-150 group-hover:h-2", tone === "light" ? "bg-white/15" : "bg-surface-3")}>
        <div className={cn("h-full rounded-full", tone === "light" ? "bg-white" : "bg-accent")} style={{ width: `${pct * 100}%` }} />
      </div>
      <div
        className="absolute size-3.5 -translate-x-1/2 scale-0 rounded-full bg-white shadow-md ring-1 ring-black/10 transition-transform duration-150 group-hover:scale-100"
        style={{ left: `${pct * 100}%` }}
      />
    </div>
  );
}
