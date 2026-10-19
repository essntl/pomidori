"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { autoUpdate, computePosition, flip, offset, shift } from "@floating-ui/dom";
import { cn } from "@/app/lib/cn";
import { pop } from "@/app/lib/motion";
import { Portal } from "./Modal";

export type MenuItem =
  | { label: string; icon?: ReactNode; onSelect: () => void; danger?: boolean; hint?: string }
  | "separator";

/**
 * Small anchored dropdown. Rendered in a portal with fixed positioning so scrolling or
 * clipped containers (sidebars, cards) never hide it. Closes on outside click, Escape, or selection.
 */
export function Menu({
  trigger,
  items,
  align = "end",
  className,
}: {
  trigger: (props: { onClick: () => void; "aria-expanded": boolean }) => ReactNode;
  items: MenuItem[];
  align?: "start" | "end";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<string>("bottom");
  const anchorRef = useRef<HTMLSpanElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: PointerEvent) {
      const t = e.target as Node;
      if (!anchorRef.current?.contains(t) && !panelRef.current?.contains(t)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Keep the panel attached to its trigger while open (scroll, resize).
  useEffect(() => {
    if (!open) return;
    const anchor = anchorRef.current;
    const panel = panelRef.current;
    if (!anchor || !panel) return;
    return autoUpdate(anchor, panel, () => {
      computePosition(anchor, panel, {
        strategy: "fixed",
        placement: align === "end" ? "bottom-end" : "bottom-start",
        middleware: [offset(6), flip({ padding: 12 }), shift({ padding: 12 })],
      }).then(({ x, y, placement: p }) => {
        Object.assign(panel.style, { left: `${x}px`, top: `${y}px` });
        setPlacement(p);
      });
    });
  }, [open, align]);

  const origin = `${placement.startsWith("top") ? "bottom" : "top"} ${placement.endsWith("start") ? "left" : "right"}`;

  return (
    <span ref={anchorRef} className={cn("relative inline-flex", className)}>
      {trigger({ onClick: () => setOpen((o) => !o), "aria-expanded": open })}
      <Portal>
        <AnimatePresence>
          {open && (
            <motion.div
              ref={panelRef}
              role="menu"
              variants={pop}
              initial="hidden"
              animate="visible"
              exit="exit"
              style={{ transformOrigin: origin, position: "fixed", left: 0, top: 0 }}
              className="z-[90] min-w-48 rounded-2xl border border-line bg-surface-solid p-1.5 shadow-pop"
            >
              {items.map((item, i) =>
                item === "separator" ? (
                  <div key={i} className="my-1 h-px bg-line" />
                ) : (
                  <button
                    key={i}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setOpen(false);
                      item.onSelect();
                    }}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm font-semibold whitespace-nowrap transition-colors [&_svg]:size-4",
                      item.danger ? "text-danger hover:bg-danger/10" : "text-fg-2 hover:bg-surface-2 hover:text-fg",
                    )}
                  >
                    {item.icon}
                    <span className="flex-1">{item.label}</span>
                    {item.hint && <span className="text-xs text-muted">{item.hint}</span>}
                  </button>
                ),
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </Portal>
    </span>
  );
}
