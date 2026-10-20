"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Plus, X } from "lucide-react";
import { updateTask, type Task } from "@/app/lib/stores/tasks";
import { uid } from "@/app/lib/id";
import { cn } from "@/app/lib/cn";
import { spring } from "@/app/lib/motion";

/** Editable checklist of a task's subtasks (used in the task sheet and in expanded rows). */
export function Subtasks({ task, compact = false }: { task: Task; compact?: boolean }) {
  const [draft, setDraft] = useState("");
  const set = (subtasks: Task["subtasks"]) => updateTask(task.id, { subtasks });

  return (
    <div className="flex flex-col">
      <AnimatePresence initial={false}>
        {task.subtasks.map((s) => (
          <motion.div
            key={s.id}
            layout
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={spring.smooth}
            className="group flex items-center gap-2.5 overflow-hidden rounded-lg px-1 py-1"
          >
            <button
              type="button"
              role="checkbox"
              aria-checked={s.done}
              aria-label={s.done ? "Mark subtask as not done" : "Mark subtask as done"}
              onClick={() => set(task.subtasks.map((x) => (x.id === s.id ? { ...x, done: !x.done } : x)))}
              className={cn(
                "grid size-[18px] shrink-0 place-items-center rounded-[6px] border-[1.5px] transition-colors",
                s.done ? "border-accent bg-accent text-white" : "border-muted hover:border-accent",
              )}
            >
              {s.done && <Check className="size-3" strokeWidth={3.5} />}
            </button>
            <input
              value={s.title}
              onChange={(e) => set(task.subtasks.map((x) => (x.id === s.id ? { ...x, title: e.target.value } : x)))}
              className={cn(
                "min-w-0 flex-1 bg-transparent outline-none",
                compact ? "text-[13.5px]" : "text-sm",
                s.done ? "text-muted line-through" : "text-fg",
              )}
              aria-label="Subtask"
            />
            <button
              type="button"
              aria-label="Remove subtask"
              onClick={() => set(task.subtasks.filter((x) => x.id !== s.id))}
              className="grid size-6 place-items-center rounded-md text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:text-fg max-md:opacity-100"
            >
              <X className="size-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
      <form
        className="flex items-center gap-2.5 px-1"
        onSubmit={(e) => {
          e.preventDefault();
          if (!draft.trim()) return;
          set([...task.subtasks, { id: uid(), title: draft.trim(), done: false }]);
          setDraft("");
        }}
      >
        <Plus className="size-[18px] shrink-0 text-muted" />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a subtask"
          className={cn("h-8 min-w-0 flex-1 bg-transparent text-fg outline-none placeholder:text-muted", compact ? "text-[13.5px]" : "text-sm")}
        />
      </form>
    </div>
  );
}
