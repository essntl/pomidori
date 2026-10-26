"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/app/lib/cn";
import { ease, spring } from "@/app/lib/motion";
import { useHydrated } from "@/app/lib/storage";
import { IconButton } from "./Button";

let openCount = 0;

/** Locks page scroll and wires Escape + focus handling for an open overlay. */
export function useOverlayBehavior(open: boolean, onClose: () => void, panel: React.RefObject<HTMLElement | null>) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    openCount++;
    document.body.style.overflow = "hidden";

    const focusTimer = setTimeout(() => {
      const el = panel.current;
      if (!el || el.contains(document.activeElement)) return;
      const target = el.querySelector<HTMLElement>("[data-autofocus]") ?? el.querySelector<HTMLElement>("input, textarea, button");
      (target ?? el).focus({ preventScroll: true });
    }, 30);

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
      } else if (e.key === "Tab" && panel.current) {
        const focusables = panel.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])',
        );
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          last.focus();
          e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === last) {
          first.focus();
          e.preventDefault();
        }
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKey, true);
      openCount--;
      if (openCount === 0) document.body.style.overflow = "";
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, [open, panel]);
}

export function Portal({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();
  return hydrated ? createPortal(children, document.body) : null;
}

/**
 * The single dialog implementation: centred card on desktop, bottom sheet on mobile.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  className,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const panel = useRef<HTMLDivElement>(null);
  useOverlayBehavior(open, onClose, panel);

  // Keep the last open content on screen while the exit animation runs.
  const [kept, setKept] = useState({ title, children, footer });
  if (open && (kept.title !== title || kept.children !== children || kept.footer !== footer)) {
    setKept({ title, children, footer });
  }
  const view = open ? { title, children, footer } : kept;

  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <div className="reach-bottom fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6">
            <motion.div
              className="absolute inset-0 bg-[var(--backdrop)] backdrop-blur-[3px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: ease.out }}
              onClick={onClose}
            />
            <motion.div
              ref={panel}
              role="dialog"
              aria-modal="true"
              tabIndex={-1}
              initial={{ opacity: 0, y: 40, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98, transition: { duration: 0.15, ease: ease.out } }}
              transition={spring.smooth}
              className={cn(
                "relative flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-[1.75rem] border border-line bg-surface-solid shadow-pop outline-none sm:rounded-tile",
                size === "sm" && "sm:max-w-sm",
                size === "md" && "sm:max-w-lg",
                size === "lg" && "sm:max-w-2xl",
                className,
              )}
            >
              <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-surface-3 sm:hidden" />
              {view.title && (
                <div className="flex items-center justify-between gap-3 px-6 pt-4 pb-1 sm:pt-5">
                  <h2 className="text-lg font-extrabold tracking-tight text-fg">{view.title}</h2>
                  <IconButton label="Close" size="sm" onClick={onClose} className="-mr-2">
                    <X />
                  </IconButton>
                </div>
              )}
              <div className="flex-1 overflow-y-auto px-6 py-4">{view.children}</div>
              {view.footer && <div className="flex justify-end gap-2 border-t border-line px-6 py-4">{view.footer}</div>}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
