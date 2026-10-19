"use client";

import { motion } from "framer-motion";
import { cn } from "@/app/lib/cn";
import { spring } from "@/app/lib/motion";

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200",
        checked ? "justify-end bg-accent" : "justify-start bg-surface-3",
      )}
    >
      <motion.span layout transition={spring.snappy} className="block size-6 rounded-full bg-white shadow-md" />
    </button>
  );
}
