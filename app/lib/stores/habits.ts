import { createStore } from "../storage";
import { uid } from "../id";
import { deletedNotice, pushUndo, reinsert, removedItems } from "../undo";
import { addDays, dayKey, fromDayKey, weekdayIndex } from "../date";

export type Habit = {
  id: string;
  name: string;
  icon: string;
  color: string;
  /** Monday-first weekday indexes the habit is scheduled on. */
  days: number[];
  log: Record<string, true>;
  createdAt: number;
};

export const habitsStore = createStore<Habit[]>("habits", []);

export function addHabit(h: Pick<Habit, "name" | "icon" | "color" | "days">) {
  habitsStore.set((all) => [...all, { ...h, id: uid(), log: {}, createdAt: Date.now() }]);
}

export function updateHabit(id: string, patch: Partial<Habit>) {
  habitsStore.set((all) => all.map((h) => (h.id === id ? { ...h, ...patch } : h)));
}

export function deleteHabit(id: string) {
  habitsStore.set((all) => all.filter((h) => h.id !== id));
}

export function toggleHabitDay(id: string, key = dayKey()) {
  habitsStore.set((all) =>
    all.map((h) => {
      if (h.id !== id) return h;
      const log = { ...h.log };
      if (log[key]) delete log[key];
      else log[key] = true;
      return { ...h, log };
    }),
  );
}

export function isScheduled(h: Habit, d: Date) {
  return h.days.includes(weekdayIndex(d));
}

/** Consecutive scheduled days completed, counting back from today (today may still be open). */
export function currentStreak(h: Habit) {
  let streak = 0;
  let d = new Date();
  if (isScheduled(h, d) && !h.log[dayKey(d)]) d = addDays(d, -1);
  for (let i = 0; i < 730; i++) {
    if (isScheduled(h, d)) {
      if (h.log[dayKey(d)]) streak++;
      else break;
    }
    d = addDays(d, -1);
  }
  return streak;
}

export function bestStreak(h: Habit) {
  const keys = Object.keys(h.log).sort();
  if (!keys.length) return 0;
  let best = 0;
  let run = 0;
  let d = fromDayKey(keys[0]);
  const end = new Date();
  while (d <= end) {
    if (isScheduled(h, d)) {
      if (h.log[dayKey(d)]) best = Math.max(best, ++run);
      else run = 0;
    }
    d = addDays(d, 1);
  }
  return best;
}

/** Delete without confirmation; Ctrl/⌘ Z restores the habit with its history. */
export function quickDeleteHabit(id: string) {
  const before = habitsStore.get();
  const habit = before.find((h) => h.id === id);
  if (!habit) return;
  deleteHabit(id);
  const removed = removedItems(before, habitsStore.get());
  pushUndo(habit.name, () => habitsStore.set((all) => reinsert(all, removed)));
  deletedNotice(habit.name);
}
