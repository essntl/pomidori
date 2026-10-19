"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Download, MoreHorizontal, Plus, Upload } from "lucide-react";
import { useStore } from "@/app/lib/storage";
import { EVENT_COLORS, eventsStore, occurrencesInRange, type Occurrence } from "@/app/lib/stores/events";
import { tasksStore, type Task } from "@/app/lib/stores/tasks";
import { sessionsStore } from "@/app/lib/stores/sessions";
import { useIntent } from "@/app/lib/intents";
import { eventsToIcs, icsToEvents } from "@/app/lib/ics";
import { downloadText, pickTextFile } from "@/app/lib/backup";
import { notify } from "@/app/lib/alerts";
import { addDays, addMonths, startOfDay, startOfMonth, startOfWeek } from "@/app/lib/date";
import { ease } from "@/app/lib/motion";
import { Card } from "@/app/components/ui/Card";
import { Button, IconButton } from "@/app/components/ui/Button";
import { Segmented } from "@/app/components/ui/Segmented";
import { Menu } from "@/app/components/ui/Menu";
import { EventEditor, type EventDraft } from "@/app/components/calendar/EventEditor";
import { MonthView, TimeGrid, type CalendarData } from "@/app/components/calendar/views";
import { TaskDetail } from "@/app/components/tasks/TaskDetail";

type ViewMode = "month" | "week" | "day";

export default function CalendarPage() {
  const events = useStore(eventsStore);
  const { tasks, lists } = useStore(tasksStore);
  const sessions = useStore(sessionsStore);
  const [mode, setMode] = useState<ViewMode>("month");
  const [cursor, setCursor] = useState(() => startOfDay(new Date()));
  const [dir, setDir] = useState(0);
  const [draft, setDraft] = useState<EventDraft | null>(null);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);

  const newDraft = (start: number, end: number, allDay: boolean): EventDraft => ({
    title: "",
    start,
    end,
    allDay,
    color: EVENT_COLORS[0],
    notes: "",
    recurrence: "none",
  });

  const createNow = () => {
    const s = new Date();
    s.setMinutes(0, 0, 0);
    s.setHours(s.getHours() + 1);
    setDraft(newDraft(s.getTime(), s.getTime() + 3_600_000, false));
  };
  useIntent("newEvent", createNow);

  const range = useMemo(() => {
    if (mode === "month") {
      const first = startOfMonth(cursor);
      const gridStart = addDays(first, -((first.getDay() + 6) % 7));
      return { from: gridStart, to: addDays(gridStart, 42), days: [] as Date[] };
    }
    const from = mode === "week" ? startOfWeek(cursor) : startOfDay(cursor);
    const n = mode === "week" ? 7 : 1;
    return { from, to: addDays(from, n), days: Array.from({ length: n }, (_, i) => addDays(from, i)) };
  }, [mode, cursor]);

  const data: CalendarData = useMemo(() => {
    const tasksByDay = new Map<string, Task[]>();
    for (const t of tasks) if (t.due) tasksByDay.set(t.due, [...(tasksByDay.get(t.due) ?? []), t]);
    return {
      occurrences: occurrencesInRange(events, range.from, range.to),
      tasksByDay,
      sessions: sessions.filter((s) => s.start >= range.from.getTime() && s.start < range.to.getTime()),
    };
  }, [events, tasks, sessions, range]);

  function step(delta: number) {
    setDir(delta);
    setCursor((c) => (mode === "month" ? addMonths(startOfMonth(c), delta) : addDays(c, delta * (mode === "week" ? 7 : 1))));
  }

  const title =
    mode === "month"
      ? cursor.toLocaleDateString([], { month: "long", year: "numeric" })
      : mode === "week"
        ? `${range.from.toLocaleDateString([], { month: "short", day: "numeric" })} – ${addDays(range.to, -1).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}`
        : cursor.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });

  const handlers = {
    onEvent: (o: Occurrence) =>
      setDraft({
        id: o.id,
        title: o.title,
        start: o.start,
        end: o.end,
        allDay: o.allDay,
        color: o.color,
        notes: o.notes,
        recurrence: o.recurrence,
      }),
    onCreate: (start: number, end: number, allDay: boolean) => setDraft(newDraft(start, end, allDay)),
    onDay: (d: Date) => {
      setDir(0);
      setCursor(startOfDay(d));
      setMode("day");
    },
    onTask: (t: Task) => setOpenTaskId(t.id),
  };

  async function importIcs() {
    const file = await pickTextFile(".ics,text/calendar");
    if (!file) return;
    const imported = icsToEvents(file.text);
    if (!imported.length) {
      notify({ title: "No events found", body: file.name, icon: "📭", tone: "warning" });
      return;
    }
    eventsStore.set((all) => [...all, ...imported]);
    notify({ title: `Imported ${imported.length} event${imported.length === 1 ? "" : "s"}`, icon: "📅", tone: "success" });
  }

  const viewKey = `${mode}-${range.from.getTime()}`;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="min-w-0 text-[26px] leading-tight font-extrabold tracking-tight text-fg sm:text-[32px]">{title}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented<ViewMode>
            value={mode}
            onChange={(m) => {
              setDir(0);
              setMode(m);
            }}
            options={[
              { value: "month", label: "Month" },
              { value: "week", label: "Week" },
              { value: "day", label: "Day" },
            ]}
          />
          <div className="flex items-center gap-1 rounded-control bg-surface-2 p-1">
            <IconButton size="sm" label="Previous" onClick={() => step(-1)}>
              <ChevronLeft />
            </IconButton>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setDir(0);
                setCursor(startOfDay(new Date()));
              }}
            >
              Today
            </Button>
            <IconButton size="sm" label="Next" onClick={() => step(1)}>
              <ChevronRight />
            </IconButton>
          </div>
          <Button variant="primary" onClick={createNow}>
            <Plus className="size-4" /> Event
          </Button>
          <Menu
            trigger={(t) => (
              <IconButton label="Calendar options" variant="secondary" {...t}>
                <MoreHorizontal />
              </IconButton>
            )}
            items={[
              { label: "Import .ics", icon: <Upload />, onSelect: importIcs },
              {
                label: "Export .ics",
                icon: <Download />,
                onSelect: () => downloadText("pomidori-calendar.ics", eventsToIcs(eventsStore.get()), "text/calendar"),
              },
            ]}
          />
        </div>
      </div>

      <Card className="overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false} custom={dir}>
          <motion.div
            key={viewKey}
            custom={dir}
            initial={{ opacity: 0, x: dir * 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -24 }}
            transition={{ duration: 0.22, ease: ease.out }}
          >
            {mode === "month" ? (
              <MonthView month={startOfMonth(cursor)} data={data} {...handlers} />
            ) : (
              <TimeGrid days={range.days} data={data} {...handlers} />
            )}
          </motion.div>
        </AnimatePresence>
      </Card>

      <p className="mt-3 px-1 text-xs text-muted">
        Click a day to add an event{mode !== "month" ? ", or drag across hours" : ""}. Tasks with due dates and finished focus sessions show up here too.
      </p>

      <EventEditor draft={draft} onClose={() => setDraft(null)} />
      <TaskDetail task={tasks.find((t) => t.id === openTaskId) ?? null} lists={lists} onClose={() => setOpenTaskId(null)} />
    </div>
  );
}
