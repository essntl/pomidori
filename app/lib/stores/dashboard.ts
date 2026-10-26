import { createStore } from "../storage";

export type WidgetId = "focus" | "today" | "music" | "habits" | "week" | "notes" | "tasks";

/** `w` = columns spanned (1–3), `h` = rows spanned (1–3). Spans are capped by the screen's column count. */
export type WidgetLayout = { id: WidgetId; w: number; h: number; hidden?: boolean };

export const MAX_SPAN = 3;

export const WIDGET_NAMES: Record<WidgetId, string> = {
  focus: "Focus",
  today: "Today",
  music: "Music",
  habits: "Habits",
  week: "This week",
  notes: "Recent notes",
  tasks: "Tasks",
};

export const DEFAULT_LAYOUT: WidgetLayout[] = [
  { id: "focus", w: 1, h: 2 },
  { id: "today", w: 1, h: 2 },
  { id: "music", w: 1, h: 1 },
  { id: "habits", w: 1, h: 1 },
  { id: "week", w: 1, h: 1 },
  { id: "notes", w: 1, h: 1 },
  { id: "tasks", w: 1, h: 1 },
];

const clampSpan = (n: unknown) => Math.min(MAX_SPAN, Math.max(1, Math.round(Number(n) || 1)));

/** Keep saved layouts valid as widgets are added or removed between versions. */
function normalize(saved: unknown): WidgetLayout[] {
  const known = new Set(DEFAULT_LAYOUT.map((w) => w.id));
  const seen = new Set<WidgetId>();
  const out: WidgetLayout[] = [];
  for (const raw of Array.isArray(saved) ? saved : []) {
    const id = (raw as WidgetLayout)?.id;
    if (!known.has(id) || seen.has(id)) continue;
    seen.add(id);
    const r = raw as WidgetLayout;
    out.push({ id, w: clampSpan(r.w), h: clampSpan(r.h), ...(r.hidden ? { hidden: true } : {}) });
  }
  for (const w of DEFAULT_LAYOUT) if (!seen.has(w.id)) out.push({ ...w });
  return out;
}

export const dashboardStore = createStore<WidgetLayout[]>("dashboard", DEFAULT_LAYOUT, {
  version: 1,
  migrate: (data) => normalize(data),
});

/** Read through `normalize` so hand-edited or imported data can't break the grid. */
export function getLayout(layout: WidgetLayout[]) {
  return normalize(layout);
}

export function moveWidget(id: WidgetId, toIndex: number) {
  dashboardStore.set((all) => {
    const from = all.findIndex((w) => w.id === id);
    if (from < 0 || from === toIndex) return all;
    const next = [...all];
    const [item] = next.splice(from, 1);
    next.splice(Math.max(0, Math.min(toIndex, next.length)), 0, item);
    return next;
  });
}

export function resizeWidget(id: WidgetId, w: number, h: number) {
  dashboardStore.set((all) => {
    const cur = all.find((x) => x.id === id);
    if (!cur || (cur.w === clampSpan(w) && cur.h === clampSpan(h))) return all;
    return all.map((x) => (x.id === id ? { ...x, w: clampSpan(w), h: clampSpan(h) } : x));
  });
}

export function setWidgetHidden(id: WidgetId, hidden: boolean) {
  dashboardStore.set((all) => all.map((x) => (x.id === id ? { ...x, hidden } : x)));
}

export function resetLayout() {
  dashboardStore.set(DEFAULT_LAYOUT.map((w) => ({ ...w })));
}
