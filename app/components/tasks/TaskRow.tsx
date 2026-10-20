"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, CalendarX, Check, ChevronDown, GripVertical, Inbox, ListChecks, MoreHorizontal, Timer, Trash2 } from "lucide-react";
import type { Task, TaskList } from "@/app/lib/stores/tasks";
import { INBOX_ID, deleteTask, toggleTask, updateTask } from "@/app/lib/stores/tasks";
import { timerActions } from "@/app/context/TimerContext";
import { addDays, dayKey, relativeDay } from "@/app/lib/date";
import { htmlToPlain } from "@/app/lib/text";
import { Menu, type MenuItem } from "../ui/Menu";
import { RichText } from "../ui/RichText";
import { Subtasks } from "./Subtasks";
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
  lists,
  onOpen,
  dragHandle,
  showList,
}: {
  task: Task;
  list?: TaskList;
  /** All lists, for the "Move to" menu. */
  lists?: TaskList[];
  onOpen: () => void;
  dragHandle?: React.ReactNode;
  showList?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const overdue = !task.done && task.due && task.due < dayKey();
  const subDone = task.subtasks.filter((s) => s.done).length;
  const preview = htmlToPlain(task.notes);
  const hasDetails = task.subtasks.length > 0 || !!preview;

  const menuItems: MenuItem[] = [
    ...(lists ?? [])
      .filter((l) => l.id !== task.listId)
      .map((l) => ({
        label: `Move to ${l.name}`,
        icon: l.id === INBOX_ID ? <Inbox /> : <span className="size-2.5 rounded-full" style={{ background: l.color }} />,
        onSelect: () => updateTask(task.id, { listId: l.id }),
      })),
    ...(lists && lists.length > 1 ? (["separator"] as MenuItem[]) : []),
    { label: "Due today", icon: <CalendarDays />, onSelect: () => updateTask(task.id, { due: dayKey() }) },
    { label: "Due tomorrow", icon: <CalendarDays />, onSelect: () => updateTask(task.id, { due: dayKey(addDays(new Date(), 1)) }) },
    ...(task.due ? [{ label: "Clear due date", icon: <CalendarX />, onSelect: () => updateTask(task.id, { due: null }) }] : []),
    "separator",
    { label: "Delete", icon: <Trash2 />, danger: true, onSelect: () => deleteTask(task.id) },
  ];

  return (
    <div className={cn("rounded-2xl transition-colors", expanded ? "bg-surface-2" : "hover:bg-surface-2")}>
      <div onClick={onOpen} className="group flex cursor-pointer items-center gap-3 px-3 py-2">
        {dragHandle}
        <TaskCheck task={task} />
        <div className="min-w-0 flex-1">
          <div className={cn("truncate text-[15px] font-semibold transition-colors", task.done ? "text-muted line-through" : "text-fg")}>
            {task.title}
          </div>
          {(task.due || task.subtasks.length > 0 || (showList && list) || preview) && !expanded && (
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
              {preview && <span className="max-w-60 truncate font-medium">{preview}</span>}
            </div>
          )}
          {expanded && task.due && (
            <div className={cn("mt-0.5 flex items-center gap-1 text-[12px] font-semibold text-muted", overdue && "text-danger")}>
              <CalendarDays className="size-3.5" /> {relativeDay(task.due)}
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center" onClick={(e) => e.stopPropagation()}>
          {!task.done && (
            <button
              type="button"
              aria-label="Focus on this task"
              title="Focus on this task"
              onClick={() => {
                timerActions.setTask(task.id);
                timerActions.start();
              }}
              className="grid size-8 place-items-center rounded-lg text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:bg-surface-3 hover:text-accent max-md:hidden"
            >
              <Timer className="size-4" />
            </button>
          )}
          <Menu
            trigger={(t) => (
              <button
                type="button"
                aria-label="Task options"
                className="grid size-8 place-items-center rounded-lg text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:bg-surface-3 hover:text-fg aria-expanded:opacity-100 max-md:opacity-100"
                {...t}
              >
                <MoreHorizontal className="size-4" />
              </button>
            )}
            items={menuItems}
          />
          <button
            type="button"
            aria-label={expanded ? "Collapse task" : "Expand task"}
            aria-expanded={expanded}
            onClick={() => setExpanded((x) => !x)}
            className={cn(
              "grid size-8 place-items-center rounded-lg transition-[opacity,color] hover:bg-surface-3 hover:text-fg",
              expanded || hasDetails ? "text-muted opacity-100" : "text-muted opacity-0 group-hover:opacity-100 max-md:opacity-100",
            )}
          >
            <ChevronDown className={cn("size-4 transition-transform duration-200", expanded && "rotate-180")} />
          </button>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={spring.smooth}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-3 pr-3 pb-3 pl-12">
              <div>
                <div className="mb-1 text-[11px] font-bold tracking-wider text-muted uppercase">
                  Subtasks {task.subtasks.length > 0 && `· ${subDone}/${task.subtasks.length}`}
                </div>
                <Subtasks task={task} compact />
              </div>
              <div>
                <div className="mb-1 text-[11px] font-bold tracking-wider text-muted uppercase">Notes</div>
                <RichText key={task.id} value={task.notes} onChange={(html) => updateTask(task.id, { notes: html })} className="bg-surface-solid" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
