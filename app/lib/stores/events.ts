import { createStore } from "../storage";
import { uid } from "../id";
import { addDays, addMonths, startOfDay } from "../date";

export type Recurrence = "none" | "daily" | "weekly" | "monthly";

export type CalEvent = {
  id: string;
  title: string;
  start: number;
  end: number;
  allDay: boolean;
  color: string;
  notes: string;
  recurrence: Recurrence;
};

/** A concrete occurrence of an event within a visible range. */
export type Occurrence = CalEvent & { occurrenceStart: number; occurrenceEnd: number };

export const EVENT_COLORS = ["#ec4899", "#f97316", "#10b981", "#3b82f6", "#8b5cf6", "#64748b"];

export const eventsStore = createStore<CalEvent[]>("events", []);

export function saveEvent(event: Omit<CalEvent, "id"> & { id?: string }) {
  const withId: CalEvent = { ...event, id: event.id ?? uid() };
  eventsStore.set((all) =>
    all.some((e) => e.id === withId.id) ? all.map((e) => (e.id === withId.id ? withId : e)) : [...all, withId],
  );
  return withId;
}

export function deleteEvent(id: string) {
  eventsStore.set((all) => all.filter((e) => e.id !== id));
}

export function occurrencesInRange(events: CalEvent[], from: Date, to: Date): Occurrence[] {
  const out: Occurrence[] = [];
  const fromMs = from.getTime();
  const toMs = to.getTime();
  for (const e of events) {
    const len = e.end - e.start;
    if (e.recurrence === "none") {
      if (e.end >= fromMs && e.start < toMs) out.push({ ...e, occurrenceStart: e.start, occurrenceEnd: e.end });
      continue;
    }
    let cursor = new Date(e.start);
    // Jump close to the range for daily/weekly recurrences.
    if (cursor.getTime() < fromMs && e.recurrence !== "monthly") {
      const step = e.recurrence === "daily" ? 1 : 7;
      const days = Math.floor((startOfDay(from).getTime() - startOfDay(cursor).getTime()) / 86_400_000);
      const jumps = Math.max(0, Math.floor(days / step) - 1);
      cursor = addDays(cursor, jumps * step);
    }
    let guard = 0;
    while (cursor.getTime() < toMs && guard++ < 1000) {
      const s = cursor.getTime();
      if (s + len >= fromMs) out.push({ ...e, occurrenceStart: s, occurrenceEnd: s + len });
      cursor =
        e.recurrence === "daily" ? addDays(cursor, 1) : e.recurrence === "weekly" ? addDays(cursor, 7) : addMonths(cursor, 1);
    }
  }
  return out.sort((a, b) => a.occurrenceStart - b.occurrenceStart);
}
