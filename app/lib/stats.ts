import type { FocusSession } from "./stores/sessions";
import { addDays, dayKey, startOfDay, startOfWeek } from "./date";

export function minutesByDay(sessions: FocusSession[]) {
  const map = new Map<string, number>();
  for (const s of sessions) map.set(dayKey(s.start), (map.get(dayKey(s.start)) ?? 0) + s.minutes);
  return map;
}

/** Consecutive days (ending today, or yesterday if today is still empty) with at least one session. */
export function focusStreak(byDay: Map<string, number>) {
  let d = startOfDay(new Date());
  if (!byDay.get(dayKey(d))) d = addDays(d, -1);
  let n = 0;
  while (byDay.get(dayKey(d))) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

export function lastNDays(byDay: Map<string, number>, n: number) {
  const today = startOfDay(new Date());
  return Array.from({ length: n }, (_, i) => {
    const d = addDays(today, i - n + 1);
    const key = dayKey(d);
    return {
      key,
      label: d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }),
      short: n > 7 ? String(d.getDate()) : d.toLocaleDateString([], { weekday: "narrow" }),
      value: byDay.get(key) ?? 0,
      highlight: i === n - 1,
    };
  });
}

export function heatmapWeeks(byDay: Map<string, number>, weeks: number) {
  const today = startOfDay(new Date());
  const first = addDays(startOfWeek(today), -(weeks - 1) * 7);
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const date = addDays(first, w * 7 + d);
      const key = dayKey(date);
      return {
        key,
        label: date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }),
        value: byDay.get(key) ?? 0,
        future: date > today,
      };
    }),
  );
}
