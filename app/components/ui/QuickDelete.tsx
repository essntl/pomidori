"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Trash2 } from "lucide-react";
import { useShiftHeld } from "@/app/context/hooks";
import { cn } from "@/app/lib/cn";
import { spring } from "@/app/lib/motion";

/** A delete button that appears only while Shift is held. Deletes immediately (pair it with `pushUndo`). */
export function QuickDelete({ label, onDelete, className, size = "md" }: { label: string; onDelete: () => void; className?: string; size?: "sm" | "md" }) {
  const shift = useShiftHeld();
  return (
    <AnimatePresence initial={false}>
      {shift && (
        <motion.button
          type="button"
          aria-label={label}
          title={`${label} (Shift)`}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.6, transition: { duration: 0.1 } }}
          transition={spring.bouncy}
          whileTap={{ scale: 0.85 }}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className={cn(
            "grid shrink-0 place-items-center rounded-lg bg-danger/10 text-danger transition-colors hover:bg-danger hover:text-white",
            size === "sm" ? "size-6 [&_svg]:size-3.5" : "size-8 [&_svg]:size-4",
            className,
          )}
        >
          <Trash2 />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
