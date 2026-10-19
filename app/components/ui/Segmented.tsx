"use client";

import { useId, type ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/app/lib/cn";
import { spring } from "@/app/lib/motion";

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  size = "md",
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode }[];
  className?: string;
  size?: "sm" | "md";
}) {
  const id = useId();
  return (
    <div className={cn("inline-flex rounded-control bg-surface-2 p-1", className)} role="tablist">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap font-semibold transition-colors duration-150 [&_svg]:size-4",
              size === "sm" ? "h-7 px-2.5 text-[12px]" : "h-8 px-3.5 text-[13px]",
              active ? "text-fg" : "text-muted hover:text-fg-2",
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                transition={spring.snappy}
                className="absolute inset-0 rounded-[0.6rem] bg-surface-solid shadow-sm"
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
