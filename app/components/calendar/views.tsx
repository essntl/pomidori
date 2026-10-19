"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Repeat } from "lucide-react";
import type { Occurrence } from "@/app/lib/stores/events";
import type { Task } from "@/app/lib/stores/tasks";
import type { FocusSession } from "@/app/lib/stores/sessions";
import { addDays, dayKey, fmtTime, isSameDay, isToday, startOfDay, WEEKDAYS_SHORT } from "@/app/lib/date";
import { cn } from "@/app/lib/cn";
import { spring } from "@/app/lib/motion";
import { TaskCheck } from "../tasks/TaskRow";

export type CalendarData = {
  occurrences: Occurrence[];
  tasksByDay: Map<string, Task[]>;
  sessions: FocusSession[];
};

type Handlers = {
  onEvent: (o: Occurrence) => void;
  onCreate: (start: number, end: number, allDay: boolean) => void;
  onDay: (d: Date) => void;
  onTask: (t: Task) => void;
};

function eventsOn(occ: Occurrence[], d: Date) {
  const s = startOfDay(d).getTime();
  const e = s + 86_400_000;
  return occ.filter((o) => o.occurrenceStart < e && (o.allDay ? o.occurrenceEnd >= s : o.occurrenceEnd > s));
}

/* ───────────────────────── Month ───────────────────────── */

export function MonthView({ month, data, ...h }: { month: Date; data: CalendarData } & Handlers) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const gridStart = addDays(first, -((first.getDay() + 6) % 7));
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const minutesByDay = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of data.sessions) m.set(dayKey(s.start), (m.get(dayKey(s.start)) ?? 0) + s.minutes);
    return m;
  }, [data.sessions]);

  return (
    <div>
      <div className="grid grid-cols-7 border-b border-line">
        {WEEKDAYS_SHORT.map((d) => (
          <div key={d} className="py-2 text-center text-[11px] font-bold tracking-wider text-muted uppercase">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 grid-rows-6">
        {days.map((d, i) => {
          const inMonth = d.getMonth() === month.getMonth();
          const evs = eventsOn(data.occurrences, d);
          const tasks = data.tasksByDay.get(dayKey(d)) ?? [];
          const items = [...evs.map((o) => ({ kind: "event" as const, o })), ...tasks.map((t) => ({ kind: "task" as const, t }))];
          const focus = minutesByDay.get(dayKey(d));
          return (
            <div
              key={i}
              onClick={() => {
                const s = new Date(d);
                s.setHours(9, 0, 0, 0);
                h.onCreate(s.getTime(), s.getTime() + 3_600_000, false);
              }}
              className={cn(
                "group min-h-[92px] cursor-pointer border-line p-1 transition-colors hover:bg-surface-2 sm:min-h-[112px] sm:p-1.5",
                i % 7 !== 6 && "border-r",
                i < 35 && "border-b",
                !inMonth && "bg-surface-2/40",
              )}
            >
              <div className="mb-1 flex items-center justify-between">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    h.onDay(d);
                  }}
                  className={cn(
                    "grid size-7 place-items-center rounded-full text-[13px] font-bold transition-colors",
                    isToday(d) ? "bg-accent text-white" : inMonth ? "text-fg hover:bg-surface-3" : "text-muted hover:bg-surface-3",
                  )}
                >
                  {d.getDate()}
                </button>
                {focus ? <span className="text-[10px] font-bold text-muted max-sm:hidden">🍅 {focus}m</span> : null}
              </div>
              <div className="flex flex-col gap-0.5">
                {items.slice(0, 3).map((it) =>
                  it.kind === "event" ? (
                    <button
                      key={`${it.o.id}-${it.o.occurrenceStart}`}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        h.onEvent(it.o);
                      }}
                      className="flex items-center gap-1 truncate rounded-md px-1.5 py-0.5 text-left text-[11px] font-bold"
                      style={{
                        background: it.o.allDay ? it.o.color : `color-mix(in oklab, ${it.o.color} 16%, transparent)`,
                        color: it.o.allDay ? "white" : "var(--fg)",
                      }}
                    >
                      {!it.o.allDay && <span className="size-1.5 shrink-0 rounded-full" style={{ background: it.o.color }} />}
                      <span className="truncate">
                        {!it.o.allDay && <span className="font-semibold text-muted max-sm:hidden">{fmtTime(it.o.occurrenceStart)} </span>}
                        {it.o.title}
                      </span>
                    </button>
                  ) : (
                    <button
                      key={it.t.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        h.onTask(it.t);
                      }}
                      className={cn("flex items-center gap-1 truncate rounded-md px-1.5 py-0.5 text-left text-[11px] font-bold text-fg-2 hover:bg-surface-3", it.t.done && "text-muted line-through")}
                    >
                      <span className={cn("size-2 shrink-0 rounded-[3px] border-[1.5px]", it.t.done ? "border-accent bg-accent" : "border-muted")} />
                      <span className="truncate">{it.t.title}</span>
                    </button>
                  ),
                )}
                {items.length > 3 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      h.onDay(d);
                    }}
                    className="px-1.5 text-left text-[11px] font-bold text-muted hover:text-fg"
                  >
                    +{items.length - 3} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ───────────────────────── Week / Day time grid ───────────────────────── */

const HOUR = 52;
const SNAP = 15;

/** Lay out overlapping timed events into side-by-side columns. */
function layoutDay(evs: Occurrence[], day: Date) {
  const dayStart = startOfDay(day).getTime();
  const items = evs
    .filter((o) => !o.allDay)
    .map((o) => ({
      o,
      top: Math.max(0, (o.occurrenceStart - dayStart) / 60000),
      bottom: Math.min(24 * 60, (o.occurrenceEnd - dayStart) / 60000),
      col: 0,
      cols: 1,
    }))
    .sort((a, b) => a.top - b.top || b.bottom - a.bottom);

  let cluster: typeof items = [];
  let clusterEnd = -1;
  const flush = () => {
    const n = Math.max(...cluster.map((c) => c.col)) + 1;
    cluster.forEach((c) => (c.cols = n));
    cluster = [];
  };
  for (const it of items) {
    if (cluster.length && it.top >= clusterEnd) flush();
    const used = new Set(cluster.filter((c) => c.bottom > it.top).map((c) => c.col));
    let col = 0;
    while (used.has(col)) col++;
    it.col = col;
    cluster.push(it);
    clusterEnd = Math.max(clusterEnd, it.bottom);
  }
  if (cluster.length) flush();
  return items;
}

function NowLine() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);
  if (!now) return null;
  const top = ((now.getHours() * 60 + now.getMinutes()) / 60) * HOUR;
  return (
    <div className="pointer-events-none absolute inset-x-0 z-20" style={{ top }}>
      <div className="relative h-0.5 bg-danger">
        <span className="absolute -top-[5px] -left-[5px] size-3 rounded-full bg-danger" />
      </div>
    </div>
  );
}

export function TimeGrid({ days, data, ...h }: { days: Date[]; data: CalendarData } & Handlers) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ day: number; from: number; to: number } | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = HOUR * 7.5;
  }, []);

  const minuteAt = (e: React.PointerEvent, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    const m = ((e.clientY - r.top) / HOUR) * 60;
    return Math.max(0, Math.min(24 * 60, Math.floor(m / SNAP) * SNAP));
  };

  function finishDrag() {
    if (!drag) return;
    const d = days[drag.day];
    const from = Math.min(drag.from, drag.to);
    const to = Math.max(drag.from, drag.to) + SNAP;
    const base = startOfDay(d).getTime();
    const len = to - from < 30 ? 60 : to - from;
    setDrag(null);
    h.onCreate(base + from * 60000, base + (from + len) * 60000, false);
  }

  const gridCols = { gridTemplateColumns: `52px repeat(${days.length}, minmax(0, 1fr))` };

  return (
    <div className="overflow-x-auto">
    <div className={cn("flex flex-col", days.length > 1 && "min-w-[640px]")}>
      {/* Header + all-day row */}
      <div className="grid border-b border-line" style={gridCols}>
        <div />
        {days.map((d) => (
          <button
            key={dayKey(d)}
            type="button"
            onClick={() => h.onDay(d)}
            className="flex flex-col items-center gap-0.5 py-2 transition-colors hover:bg-surface-2"
          >
            <span className={cn("text-[11px] font-bold tracking-wider uppercase", isToday(d) ? "text-accent" : "text-muted")}>
              {WEEKDAYS_SHORT[(d.getDay() + 6) % 7]}
            </span>
            <span className={cn("grid size-8 place-items-center rounded-full text-[15px] font-extrabold", isToday(d) ? "bg-accent text-white" : "text-fg")}>
              {d.getDate()}
            </span>
          </button>
        ))}
      </div>
      <div className="grid border-b border-line" style={gridCols}>
        <div className="py-1.5 pr-2 text-right text-[10px] font-bold text-muted uppercase">All day</div>
        {days.map((d) => {
          const all = eventsOn(data.occurrences, d).filter((o) => o.allDay);
          const tasks = data.tasksByDay.get(dayKey(d)) ?? [];
          return (
            <div key={dayKey(d)} className="flex min-h-9 flex-col gap-0.5 border-l border-line p-1">
              {all.map((o) => (
                <button
                  key={`${o.id}-${o.occurrenceStart}`}
                  type="button"
                  onClick={() => h.onEvent(o)}
                  className="truncate rounded-md px-1.5 py-0.5 text-left text-[11px] font-bold text-white"
                  style={{ background: o.color }}
                >
                  {o.title}
                </button>
              ))}
              {tasks.map((t) => (
                <div key={t.id} className="flex items-center gap-1.5 rounded-md px-1 py-0.5 text-[11px] font-bold text-fg-2 hover:bg-surface-2">
                  <TaskCheck task={t} size={14} />
                  <button type="button" onClick={() => h.onTask(t)} className={cn("truncate text-left", t.done && "text-muted line-through")}>
                    {t.title}
                  </button>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Hours */}
      <div ref={scrollRef} className="max-h-[calc(100dvh-20rem)] min-h-[420px] overflow-y-auto">
        <div className="relative grid" style={{ ...gridCols, height: HOUR * 24 }}>
          <div className="relative">
            {Array.from({ length: 24 }, (_, i) => (
              <div key={i} className="absolute right-2 -translate-y-1/2 text-[10.5px] font-semibold text-muted tabular-nums" style={{ top: i * HOUR }}>
                {i === 0 ? "" : `${String(i).padStart(2, "0")}:00`}
              </div>
            ))}
          </div>
          {days.map((d, di) => {
            const laid = layoutDay(eventsOn(data.occurrences, d), d);
            const dayStart = startOfDay(d).getTime();
            const sessions = data.sessions.filter((s) => isSameDay(new Date(s.start), d));
            return (
              <div
                key={dayKey(d)}
                className="relative touch-none border-l border-line select-none"
                onPointerDown={(e) => {
                  if (e.button !== 0 || (e.target as HTMLElement).closest("[data-event]")) return;
                  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                  const m = minuteAt(e, e.currentTarget);
                  setDrag({ day: di, from: m, to: m });
                }}
                onPointerMove={(e) => {
                  if (!drag || drag.day !== di) return;
                  setDrag({ ...drag, to: minuteAt(e, e.currentTarget) });
                }}
                onPointerUp={finishDrag}
                onPointerCancel={() => setDrag(null)}
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <div key={i} className="pointer-events-none absolute inset-x-0 border-t border-line" style={{ top: i * HOUR }} />
                ))}
                {sessions.map((s) => (
                  <div
                    key={s.id}
                    title={`Focus · ${s.minutes} min`}
                    className="pointer-events-none absolute left-0 w-1 rounded-full bg-accent/60"
                    style={{ top: ((s.start - dayStart) / 3_600_000) * HOUR, height: Math.max(4, (s.minutes / 60) * HOUR) }}
                  />
                ))}
                {isToday(d) && <NowLine />}
                {laid.map(({ o, top, bottom, col, cols }) => (
                  <motion.button
                    key={`${o.id}-${o.occurrenceStart}`}
                    data-event
                    type="button"
                    layout
                    transition={spring.smooth}
                    onClick={() => h.onEvent(o)}
                    className="absolute z-10 overflow-hidden rounded-lg border-l-[3px] px-1.5 py-1 text-left text-[11.5px] leading-tight shadow-sm transition-[filter] hover:brightness-95"
                    style={{
                      top: (top / 60) * HOUR + 1,
                      height: Math.max(20, ((bottom - top) / 60) * HOUR - 2),
                      left: `calc(${(col / cols) * 100}% + 3px)`,
                      width: `calc(${100 / cols}% - 6px)`,
                      borderColor: o.color,
                      background: `color-mix(in oklab, ${o.color} 18%, var(--surface-solid))`,
                    }}
                  >
                    <div className="flex items-center gap-1 truncate font-bold text-fg">
                      {o.recurrence !== "none" && <Repeat className="size-3 shrink-0 text-muted" />}
                      <span className="truncate">{o.title}</span>
                    </div>
                    {bottom - top >= 45 && (
                      <div className="truncate font-semibold text-muted">
                        {fmtTime(o.occurrenceStart)} – {fmtTime(o.occurrenceEnd)}
                      </div>
                    )}
                  </motion.button>
                ))}
                {drag && drag.day === di && (
                  <div
                    className="pointer-events-none absolute inset-x-1 z-10 rounded-lg border-2 border-dashed border-accent bg-accent-soft"
                    style={{
                      top: (Math.min(drag.from, drag.to) / 60) * HOUR,
                      height: ((Math.abs(drag.to - drag.from) + SNAP) / 60) * HOUR,
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
    </div>
  );
}
