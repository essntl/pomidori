"use client";

import { motion } from "framer-motion";
import { CalendarDays, Check, GripVertical, ListChecks, Timer } from "lucide-react";
import type { Task, TaskList } from "@/app/lib/stores/tasks";
import { toggleTask } from "@/app/lib/stores/tasks";
import { timerActions } from "@/app/context/TimerContext";
import { dayKey, relativeDay } from "@/app/lib/date";
import { playSound } from "@/app/lib/alerts";
import { cn } from "@/app/lib/cn";
import { spring } from "@/app/lib/motion";

export const PRIORITY_COLOR = ["var(--muted)", "var(--info)", "var(--warning)", "var(--danger)"];
export const PRIORITY_LABEL = ["None", "Low", "Medium", "High"];

export function TaskCheck({ task, size = 22 }: { task: Pick<Task, "id" | "done" | "priority">; size?: number }) {
  const color = PRIORITY_COLOR[task.priority];
  return (
    <motion.button
      type="button"
      role="checkbox"
      aria-checked={task.done}
      aria-label={task.done ? "Mark as not done" : "Mark as done"}
      whileTap={{ scale: 0.8 }}
      transition={spring.bouncy}
      onClick={(e) => {
        e.stopPropagation();
        if (!task.done) playSound("toggle");
        toggleTask(task.id);
      }}
      className="grid shrink-0 place-items-center rounded-full border-2 transition-colors duration-200"
      style={{
        width: size,
        height: size,
        borderColor: task.done ? "var(--accent)" : color,
        background: task.done ? "var(--accent)" : `color-mix(in oklab, ${color} 10%, transparent)`,
      }}
    >
      <motion.span initial={false} animate={{ scale: task.done ? 1 : 0, opacity: task.done ? 1 : 0 }} transition={spring.bouncy}>
        <Check className="size-3.5 text-white" strokeWidth={3.5} />
      </motion.span>
    </motion.button>
  );
}

export function TaskRow({
  task,
  list,
  onOpen,
  dragHandle,
  showList,
}: {
  task: Task;
  list?: TaskList;
  onOpen: () => void;
  dragHandle?: React.ReactNode;
  showList?: boolean;
}) {
  const overdue = !task.done && task.due && task.due < dayKey();
  const subDone = task.subtasks.filter((s) => s.done).length;

  return (
    <div
      onClick={onOpen}
      className="group flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors hover:bg-surface-2"
    >
      {dragHandle}
      <TaskCheck task={task} />
      <div className="min-w-0 flex-1">
        <div className={cn("truncate text-[15px] font-semibold transition-colors", task.done ? "text-muted line-through" : "text-fg")}>
          {task.title}
        </div>
        {(task.due || task.subtasks.length > 0 || (showList && list) || task.notes) && (
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] font-semibold text-muted">
            {task.due && (
              <span className={cn("flex items-center gap-1", overdue && "text-danger")}>
                <CalendarDays className="size-3.5" />
                {relativeDay(task.due)}
              </span>
            )}
            {task.subtasks.length > 0 && (
              <span className="flex items-center gap-1">
                <ListChecks className="size-3.5" />
                {subDone}/{task.subtasks.length}
              </span>
            )}
            {showList && list && (
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full" style={{ background: list.color }} />
                {list.name}
              </span>
            )}
            {task.notes && <span className="max-w-60 truncate font-medium">{task.notes}</span>}
          </div>
        )}
      </div>
      {!task.done && (
        <button
          type="button"
          aria-label="Focus on this task"
          title="Focus on this task"
          onClick={(e) => {
            e.stopPropagation();
            timerActions.setTask(task.id);
            timerActions.start();
          }}
          className="grid size-8 shrink-0 place-items-center rounded-lg text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:bg-surface-3 hover:text-accent max-md:hidden"
        >
          <Timer className="size-4" />
        </button>
      )}
    </div>
  );
}

export function DragGrip(props: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      {...props}
      onClick={(e) => e.stopPropagation()}
      className="-mr-1 -ml-1 grid h-8 w-4 shrink-0 cursor-grab touch-none place-items-center text-muted opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing max-md:opacity-60"
    >
      <GripVertical className="size-4" />
    </span>
  );
}
