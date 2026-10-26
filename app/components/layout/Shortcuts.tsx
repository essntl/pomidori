"use client";

import { useState } from "react";
import { useHotkey } from "@/app/context/hooks";
import { undoLast } from "@/app/lib/undo";
import { Kbd } from "../ui/Card";
import { Modal } from "../ui/Modal";

const GROUPS: { title: string; items: { keys: string[]; label: string }[] }[] = [
  {
    title: "Everywhere",
    items: [
      { keys: ["Ctrl", "K"], label: "Command palette" },
      { keys: ["Shift"], label: "Hold to show quick-delete buttons on notes, tasks, habits and songs" },
      { keys: ["Ctrl", "Z"], label: "Undo the last quick delete" },
      { keys: ["?"], label: "Show this list" },
    ],
  },
  {
    title: "Home",
    items: [
      { keys: ["E"], label: "Edit layout: drag widgets to move them, drag the corner to resize" },
      { keys: ["Esc"], label: "Finish editing" },
    ],
  },
  {
    title: "Focus",
    items: [
      { keys: ["Space"], label: "Start / pause" },
      { keys: ["R"], label: "Reset" },
      { keys: ["S"], label: "Skip" },
      { keys: ["+"], label: "Add a minute" },
    ],
  },
];

/** App-wide shortcuts that don't belong to one page: undo and the shortcut sheet. */
export default function Shortcuts() {
  const [open, setOpen] = useState(false);

  useHotkey(
    (e) => (e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "z",
    (e) => {
      if (undoLast()) e.preventDefault();
    },
  );
  useHotkey(
    (e) => e.key === "?" && !e.ctrlKey && !e.metaKey,
    () => setOpen((o) => !o),
  );

  return (
    <Modal open={open} onClose={() => setOpen(false)} title="Keyboard shortcuts" size="sm">
      <div className="flex flex-col gap-4">
        {GROUPS.map((g) => (
          <div key={g.title}>
            <div className="mb-1.5 text-[11px] font-bold tracking-wider text-muted uppercase">{g.title}</div>
            <ul className="flex flex-col gap-1.5">
              {g.items.map((it) => (
                <li key={it.label} className="flex items-start justify-between gap-4 text-[13px] text-fg-2">
                  <span>{it.label}</span>
                  <span className="flex shrink-0 gap-1">
                    {it.keys.map((k) => (
                      <Kbd key={k}>{k}</Kbd>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Modal>
  );
}
