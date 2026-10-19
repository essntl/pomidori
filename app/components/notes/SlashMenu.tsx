"use client";

import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { SuggestionProps } from "@tiptap/suggestion";
import { cn } from "@/app/lib/cn";
import { spring } from "@/app/lib/motion";
import type { SlashItem } from "./extensions";

export type SlashMenuHandle = { onKeyDown: (e: KeyboardEvent) => boolean };

export const SlashMenu = forwardRef<SlashMenuHandle, SuggestionProps<SlashItem, SlashItem>>(function SlashMenu(props, ref) {
  const [selected, setSelected] = useState(0);
  const [lastQuery, setLastQuery] = useState(props.query);
  const listRef = useRef<HTMLDivElement>(null);

  // Reset highlight when the query changes (derived state, no effect needed).
  if (lastQuery !== props.query) {
    setLastQuery(props.query);
    setSelected(0);
  }

  const pick = (i: number) => {
    const item = props.items[i];
    if (item) props.command(item);
  };

  const move = (delta: number) => {
    const n = props.items.length;
    if (!n) return;
    const next = (selected + delta + n) % n;
    setSelected(next);
    listRef.current?.querySelector(`[data-i="${next}"]`)?.scrollIntoView({ block: "nearest" });
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: (e) => {
      if (e.key === "ArrowDown") {
        move(1);
        return true;
      }
      if (e.key === "ArrowUp") {
        move(-1);
        return true;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        if (!props.items.length) return false;
        pick(selected);
        return true;
      }
      return false;
    },
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: -4, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={spring.snappy}
      style={{ transformOrigin: "top left" }}
      className="w-72 overflow-hidden rounded-2xl border border-line bg-surface-solid shadow-pop"
    >
      <div ref={listRef} className="max-h-80 overflow-y-auto p-1.5">
        {props.items.length === 0 ? (
          <p className="px-3 py-3 text-sm text-muted">No blocks match “{props.query}”</p>
        ) : (
          <>
            <div className="px-2.5 pt-1.5 pb-1 text-[11px] font-bold tracking-wider text-muted uppercase">Blocks</div>
            {props.items.map((item, i) => (
              <button
                key={item.title}
                type="button"
                data-i={i}
                onMouseEnter={() => setSelected(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(i);
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left transition-colors",
                  i === selected ? "bg-surface-2" : "",
                )}
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-[0.6rem] border border-line bg-surface-solid text-[13px] font-bold text-fg-2">
                  {item.icon}
                </span>
                <span className="min-w-0">
                  <span className="block text-[14px] font-semibold text-fg">{item.title}</span>
                  <span className="block truncate text-[12px] text-muted">{item.description}</span>
                </span>
              </button>
            ))}
          </>
        )}
      </div>
    </motion.div>
  );
});
