/** Date helpers. Day keys are local "YYYY-MM-DD" strings. */

export const DAY_MS = 86_400_000;

export function dayKey(d: Date | number = new Date()) {
  const date = typeof d === "number" ? new Date(d) : d;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromDayKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function addMonths(d: Date, n: number) {
  const r = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const last = new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate();
  r.setDate(Math.min(d.getDate(), last));
  return r;
}

/** Weeks start on Monday. */
export function startOfWeek(d: Date) {
  const s = startOfDay(d);
  const dow = (s.getDay() + 6) % 7;
  return addDays(s, -dow);
}

export function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function isToday(d: Date) {
  return isSameDay(d, new Date());
}

/** Monday-first weekday index (0 = Mon … 6 = Sun). */
export function weekdayIndex(d: Date) {
  return (d.getDay() + 6) % 7;
}

export const WEEKDAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function fmtTime(d: Date | number) {
  return new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function fmtDate(d: Date | number, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }) {
  return new Date(d).toLocaleDateString([], opts);
}

export function relativeDay(key: string) {
  const today = startOfDay(new Date());
  const diff = Math.round((fromDayKey(key).getTime() - today.getTime()) / DAY_MS);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff > 1 && diff < 7) return fromDayKey(key).toLocaleDateString([], { weekday: "long" });
  return fmtDate(fromDayKey(key));
}

export function toTimeInput(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function fmtDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function fmtClock(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
