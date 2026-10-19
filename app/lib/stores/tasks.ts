import { createStore } from "../storage";
import { uid } from "../id";
import { addDays, dayKey, weekdayIndex } from "../date";

export type Priority = 0 | 1 | 2 | 3;

export type Subtask = { id: string; title: string; done: boolean };

export type Task = {
  id: string;
  listId: string;
  title: string;
  notes: string;
  done: boolean;
  doneAt: number | null;
  priority: Priority;
  due: string | null;
  subtasks: Subtask[];
  createdAt: number;
};

export type TaskList = { id: string; name: string; color: string };

export type TasksState = { lists: TaskList[]; tasks: Task[] };

export const INBOX_ID = "inbox";

export const LIST_COLORS = ["#ec4899", "#f97316", "#10b981", "#3b82f6", "#8b5cf6", "#64748b"];

export const tasksStore = createStore<TasksState>("tasks", {
  lists: [{ id: INBOX_ID, name: "Inbox", color: "#64748b" }],
  tasks: [],
});

export function addTask(partial: Partial<Task> & { title: string }) {
  const task: Task = {
    id: uid(),
    listId: INBOX_ID,
    notes: "",
    done: false,
    doneAt: null,
    priority: 0,
    due: null,
    subtasks: [],
    createdAt: Date.now(),
    ...partial,
  };
  tasksStore.set((s) => ({ ...s, tasks: [task, ...s.tasks] }));
  return task;
}

export function updateTask(id: string, patch: Partial<Task>) {
  tasksStore.set((s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
}

export function toggleTask(id: string) {
  tasksStore.set((s) => ({
    ...s,
    tasks: s.tasks.map((t) => (t.id === id ? { ...t, done: !t.done, doneAt: t.done ? null : Date.now() } : t)),
  }));
}

export function deleteTask(id: string) {
  tasksStore.set((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== id) }));
}

/** Replace the order of a subset of tasks (those visible in a reorderable view). */
export function reorderTasks(orderedIds: string[]) {
  tasksStore.set((s) => {
    const set = new Set(orderedIds);
    const byId = new Map(s.tasks.map((t) => [t.id, t]));
    const reordered = orderedIds.map((id) => byId.get(id)!).filter(Boolean);
    let k = 0;
    return { ...s, tasks: s.tasks.map((t) => (set.has(t.id) ? reordered[k++] : t)) };
  });
}

export function addList(name: string) {
  const list: TaskList = { id: uid(), name, color: LIST_COLORS[Math.floor(Math.random() * LIST_COLORS.length)] };
  tasksStore.set((s) => ({ ...s, lists: [...s.lists, list] }));
  return list;
}

export function renameList(id: string, name: string) {
  tasksStore.set((s) => ({ ...s, lists: s.lists.map((l) => (l.id === id ? { ...l, name } : l)) }));
}

export function deleteList(id: string) {
  if (id === INBOX_ID) return;
  tasksStore.set((s) => ({
    lists: s.lists.filter((l) => l.id !== id),
    tasks: s.tasks.map((t) => (t.listId === id ? { ...t, listId: INBOX_ID } : t)),
  }));
}

const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

/**
 * Natural-ish quick add: "Write report tomorrow !high #work".
 * Understands today/tomorrow/weekday names, !low/!med/!high (or !1-!3) and #list.
 */
export function parseQuickAdd(input: string, lists: TaskList[]) {
  let title = input;
  let due: string | null = null;
  let priority: Priority = 0;
  let listId: string | undefined;

  title = title.replace(/(^|\s)!(high|h|3|med|medium|m|2|low|l|1)\b/i, (_, pre, p: string) => {
    const v = p.toLowerCase();
    priority = v.startsWith("h") || v === "3" ? 3 : v.startsWith("m") || v === "2" ? 2 : 1;
    return pre;
  });

  title = title.replace(/(^|\s)#(\S+)/, (match, pre, name: string) => {
    const list = lists.find((l) => l.name.toLowerCase() === name.toLowerCase());
    if (!list) return match;
    listId = list.id;
    return pre;
  });

  const today = new Date();
  title = title.replace(/(^|\s)(today|tod|tomorrow|tmr|tom|next week|mon|tue|wed|thu|fri|sat|sun)[a-z]*\b/i, (match, pre, word: string) => {
    const w = word.toLowerCase();
    if (w.startsWith("tod")) due = dayKey(today);
    else if (w.startsWith("tom") || w === "tmr") due = dayKey(addDays(today, 1));
    else if (w === "next week") due = dayKey(addDays(today, 7 - weekdayIndex(today)));
    else {
      const target = WEEKDAYS.indexOf(w.slice(0, 3));
      if (target < 0) return match;
      let diff = target - weekdayIndex(today);
      if (diff <= 0) diff += 7;
      due = dayKey(addDays(today, diff));
    }
    return pre;
  });

  return { title: title.replace(/\s+/g, " ").trim(), due: due as string | null, priority: priority as Priority, listId };
}
