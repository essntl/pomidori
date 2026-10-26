"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowUpRight, CalendarDays, ChartColumn, Check, Flame, LayoutGrid, Music, NotebookPen, Pause, Play, Plus, RotateCcw, SkipBack, SkipForward, SquareCheckBig, Timer } from "lucide-react";
import { useHydrated, useStore } from "@/app/lib/storage";
import { tasksStore, addTask, parseQuickAdd, quickDeleteTask } from "@/app/lib/stores/tasks";
import { eventsStore, occurrencesInRange } from "@/app/lib/stores/events";
import { habitsStore, isScheduled, toggleHabitDay } from "@/app/lib/stores/habits";
import { notesStore, createPage } from "@/app/lib/stores/notes";
import { sessionsStore } from "@/app/lib/stores/sessions";
import { notesUIStore } from "@/app/lib/intents";
import { player } from "@/app/lib/player/controller";
import { useHotkey, usePlayer } from "@/app/context/hooks";
import { dashboardStore, getLayout, resetLayout, type WidgetLayout } from "@/app/lib/stores/dashboard";
import { addDays, dayKey, fmtDuration, fmtTime, relativeDay, startOfDay } from "@/app/lib/date";
import { lastNDays, minutesByDay } from "@/app/lib/stats";
import { spring } from "@/app/lib/motion";
import { cn } from "@/app/lib/cn";
import { CardHeader, Kbd } from "@/app/components/ui/Card";
import { Button, IconButton } from "@/app/components/ui/Button";
import { QuickDelete } from "@/app/components/ui/QuickDelete";
import { WidgetGrid } from "@/app/components/dashboard/WidgetGrid";
import { TimerDial } from "@/app/components/timer/TimerDial";
import { TaskCheck } from "@/app/components/tasks/TaskRow";
import { Artwork, fmtSeconds } from "@/app/components/music/Artwork";
import { Slider } from "@/app/components/ui/Slider";
import { BarChart } from "@/app/components/stats/charts";

function MoreLink({ href }: { href: string }) {
  return (
    <Link href={href} aria-label="Open" className="grid size-8 place-items-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-fg">
      <ArrowUpRight className="size-4" />
    </Link>
  );
}

function greeting(h: number) {
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function Dashboard() {
  const hydrated = useHydrated();
  const router = useRouter();
  const { tasks, lists } = useStore(tasksStore);
  const events = useStore(eventsStore);
  const habits = useStore(habitsStore);
  const notes = useStore(notesStore);
  const sessions = useStore(sessionsStore);
  const p = usePlayer();
  const [input, setInput] = useState("");
  const [editing, setEditing] = useState(false);
  const savedLayout = useStore(dashboardStore);
  const layout = useMemo(() => getLayout(savedLayout), [savedLayout]);

  useHotkey((e) => e.key.toLowerCase() === "e" && !e.ctrlKey && !e.metaKey && !e.altKey, () => setEditing((x) => !x));
  useHotkey((e) => e.key === "Escape", () => setEditing(false), { enabled: editing });

  const now = hydrated ? new Date() : null;
  const today = dayKey();
  const todayStart = startOfDay(new Date());
  const todayEvents = occurrencesInRange(events, todayStart, addDays(todayStart, 1));
  const dueTasks = tasks.filter((t) => !t.done && t.due && t.due <= today).sort((a, b) => b.priority - a.priority);
  const doneToday = tasks.filter((t) => t.done && t.doneAt && t.doneAt >= todayStart.getTime());
  const openTasks = tasks.filter((t) => !t.done);
  // Open tasks not already listed under Today: soonest first, undated last.
  const upcoming = openTasks
    .filter((t) => !t.due || t.due > today)
    .sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999") || b.priority - a.priority);
  const nextIndex = p.queue.length > 1 ? (p.index + 1 < p.queue.length ? p.index + 1 : p.repeat === "all" ? 0 : -1) : -1;
  const upNext = nextIndex >= 0 && !p.shuffle ? { index: nextIndex, track: p.queue[nextIndex] } : null;
  const todaysHabits = habits.filter((h) => isScheduled(h, new Date()));
  const habitsDone = todaysHabits.filter((h) => h.log[today]).length;
  const sortedNotes = useMemo(() => [...notes].sort((a, b) => b.updatedAt - a.updatedAt), [notes]);
  const byDay = useMemo(() => minutesByDay(sessions), [sessions]);
  const week = useMemo(() => lastNDays(byDay, 7), [byDay]);
  const focusToday = byDay.get(today) ?? 0;

  function renderWidget({ id, h }: WidgetLayout) {
    // Taller widgets show more rows.
    const rows = [0, 3, 8, 13][h] ?? 3;
    switch (id) {
      case "focus":
        return (
          <>
            <CardHeader title="Focus" icon={<Timer />} action={<MoreLink href="/focus" />} />
            <div className="flex flex-1 flex-col items-center justify-center px-4 pb-5">
              <TimerDial compact />
              <p className="mt-3 text-sm text-muted">
                <span className="font-bold text-fg">{fmtDuration(focusToday)}</span> focused today
              </p>
            </div>
          </>
        );
      case "today":
        return (
          <>
            <CardHeader title="Today" icon={<CalendarDays />} action={<MoreLink href="/calendar" />} />
            <div className="px-3 pb-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const parsed = parseQuickAdd(input, lists);
                  if (!parsed.title) return;
                  addTask({ title: parsed.title, priority: parsed.priority, due: parsed.due ?? today, ...(parsed.listId ? { listId: parsed.listId } : {}) });
                  setInput("");
                }}
                className="mb-2 flex items-center gap-2 rounded-xl bg-surface-2 px-3"
              >
                <Plus className="size-4 shrink-0 text-muted" />
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Add a task for today"
                  className="h-10 min-w-0 flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-muted"
                />
              </form>
              {hydrated && todayEvents.length === 0 && dueTasks.length === 0 && (
                <p className="px-2 py-6 text-center text-sm text-muted">
                  {doneToday.length ? `All clear — ${doneToday.length} done today. 🎉` : "Nothing scheduled. A clear day for deep work."}
                </p>
              )}
              <ul className="flex flex-col">
                {todayEvents.map((o) => (
                  <li key={`${o.id}-${o.occurrenceStart}`} className="flex items-center gap-3 rounded-xl px-2 py-2">
                    <span className="h-8 w-1 shrink-0 rounded-full" style={{ background: o.color }} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold text-fg">{o.title}</div>
                      <div className="text-xs text-muted">{o.allDay ? "All day" : `${fmtTime(o.occurrenceStart)} – ${fmtTime(o.occurrenceEnd)}`}</div>
                    </div>
                  </li>
                ))}
                {dueTasks.slice(0, rows).map((t) => (
                  <motion.li layout transition={spring.smooth} key={t.id} className="flex items-center gap-3 rounded-xl px-2 py-2">
                    <TaskCheck task={t} size={20} />
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-fg">{t.title}</span>
                    {t.due! < today && <span className="text-[11px] font-bold text-danger">Overdue</span>}
                    <QuickDelete size="sm" label="Delete task" onDelete={() => quickDeleteTask(t.id)} />
                  </motion.li>
                ))}
              </ul>
              {dueTasks.length > rows && (
                <Link href="/tasks" className="block px-2 pt-1 text-sm font-semibold text-accent">
                  +{dueTasks.length - rows} more
                </Link>
              )}
            </div>
          </>
        );
      case "music":
        return (
          <>
            <CardHeader title="Music" icon={<Music />} action={<MoreLink href="/music" />} />
            <div className="flex flex-1 flex-col justify-between gap-3 px-4 pb-4">
              <div className="flex items-center gap-3">
                <Artwork track={p.track} className="size-14 rounded-2xl" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold text-fg">{p.track?.title ?? "Nothing queued"}</div>
                  <div className="truncate text-xs text-muted">{p.track ? p.track.artist || "—" : "YouTube, SoundCloud or radio links"}</div>
                </div>
                {p.track ? (
                  <div className="flex items-center gap-0.5">
                    <IconButton label="Previous" size="sm" onClick={player.prev}>
                      <SkipBack fill="currentColor" />
                    </IconButton>
                    <IconButton label={p.playing ? "Pause" : "Play"} variant="primary" className="rounded-full" onClick={player.toggle}>
                      {p.playing ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}
                    </IconButton>
                    <IconButton label="Next" size="sm" onClick={player.next}>
                      <SkipForward fill="currentColor" />
                    </IconButton>
                  </div>
                ) : (
                  <IconButton label="Add music" variant="soft" className="rounded-full" onClick={() => router.push("/music")}>
                    <Plus />
                  </IconButton>
                )}
              </div>
              {p.track && (
                <div className="flex flex-col gap-2">
                  {p.track.live ? (
                    <span className="flex items-center gap-1.5 self-start rounded-full bg-danger/15 px-2 py-0.5 text-[10px] font-extrabold tracking-wider text-danger">
                      <span className="size-1.5 animate-pulse rounded-full bg-danger" /> LIVE
                    </span>
                  ) : (
                    <div className="flex items-center gap-2.5 text-[11px] font-semibold text-muted tabular-nums">
                      <span className="w-8">{fmtSeconds(p.position)}</span>
                      <Slider label="Seek" value={p.position} max={Math.max(1, p.duration)} step={1} onChange={player.seek} disabled={!p.duration} className="flex-1" />
                      <span className="w-8 text-right">{fmtSeconds(p.duration)}</span>
                    </div>
                  )}
                  {upNext && (
                    <button
                      type="button"
                      onClick={() => player.playIndex(upNext.index)}
                      className="flex items-center gap-2.5 rounded-xl bg-surface-2 px-2.5 py-1.5 text-left transition-colors hover:bg-surface-3"
                    >
                      <Artwork track={upNext.track} className="size-7 rounded-lg" />
                      <span className="shrink-0 text-[11px] font-bold tracking-wide text-muted uppercase">Up next</span>
                      <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-fg">{upNext.track.title}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </>
        );
      case "habits":
        return (
          <>
            <CardHeader
              title="Habits"
              icon={<Flame />}
              action={
                <div className="flex items-center gap-3">
                  {todaysHabits.length > 0 && (
                    <span className="text-[12px] font-semibold text-muted tabular-nums">
                      <span className="font-bold text-fg">{habitsDone}</span>/{todaysHabits.length} today
                    </span>
                  )}
                  <MoreLink href="/habits" />
                </div>
              }
            />
            {todaysHabits.length > 0 && (
              <div className="mx-4 mb-2.5 h-1.5 overflow-hidden rounded-full bg-surface-3">
                <motion.div
                  className="h-full rounded-full bg-accent"
                  initial={false}
                  animate={{ width: `${(habitsDone / todaysHabits.length) * 100}%` }}
                  transition={spring.smooth}
                />
              </div>
            )}
            <div className="flex flex-wrap content-start gap-2 px-4 pb-4">
              {hydrated && todaysHabits.length === 0 && (
                <Link href="/habits" className="text-sm text-muted">
                  No habits for today. <span className="font-semibold text-accent">Create one</span>
                </Link>
              )}
              {todaysHabits.map((h) => {
                const done = !!h.log[today];
                return (
                  <motion.button
                    key={h.id}
                    type="button"
                    whileTap={{ scale: 0.92 }}
                    transition={spring.bouncy}
                    onClick={() => toggleHabitDay(h.id)}
                    className={cn("flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] font-bold transition-colors", done ? "border-transparent text-white" : "border-line bg-surface-2 text-fg-2 hover:bg-surface-3")}
                    style={done ? { background: h.color } : undefined}
                  >
                    <span>{h.icon}</span>
                    {h.name}
                  </motion.button>
                );
              })}
            </div>
          </>
        );
      case "week":
        return (
          <>
            <CardHeader title="This week" icon={<ChartColumn />} action={<MoreLink href="/stats" />} />
            <div className="px-4 pt-3 pb-4">
              <BarChart data={week} height={h === 1 ? 84 : h === 2 ? 240 : 400} />
            </div>
          </>
        );
      case "notes":
        return (
          <>
            <CardHeader
              title="Recent notes"
              icon={<NotebookPen />}
              action={
                <IconButton
                  size="sm"
                  label="New note"
                  onClick={() => {
                    const page = createPage();
                    notesUIStore.set((s) => ({ ...s, selectedId: page.id }));
                    router.push("/notes");
                  }}
                >
                  <Plus />
                </IconButton>
              }
            />
            <div className="px-3 pb-4">
              {hydrated && sortedNotes.length === 0 && <p className="px-2 py-2 text-sm text-muted">No notes yet.</p>}
              {sortedNotes.slice(0, rows).map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => {
                    notesUIStore.set((s) => ({ ...s, selectedId: n.id }));
                    router.push("/notes");
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-surface-2"
                >
                  <span className="text-lg">{n.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-fg">{n.title || "Untitled"}</span>
                    <span className="block truncate text-xs text-muted">{n.text.trim() || "Empty page"}</span>
                  </span>
                </button>
              ))}
            </div>
          </>
        );
      case "tasks":
        return (
          <>
            <CardHeader
              title="Tasks"
              icon={<SquareCheckBig />}
              action={
                <div className="flex items-center gap-3">
                  <span className="text-[12px] font-semibold text-muted tabular-nums">
                    {hydrated ? (
                      <>
                        <span className="font-bold text-fg">{doneToday.length}</span> done ·{" "}
                        <span className="font-bold text-fg">{openTasks.length}</span> open
                      </>
                    ) : null}
                  </span>
                  <MoreLink href="/tasks" />
                </div>
              }
            />
            <div className="flex flex-1 flex-col px-3 pb-4">
              {hydrated && upcoming.length === 0 && (
                <p className="px-2 py-2 text-sm text-muted">{openTasks.length ? "Everything open is due today." : "No open tasks. Add one above or press Ctrl K."}</p>
              )}
              <ul className="flex flex-col">
                {upcoming.slice(0, rows).map((t) => (
                  <motion.li layout transition={spring.smooth} key={t.id} className="flex items-center gap-3 rounded-xl px-2 py-1.5">
                    <TaskCheck task={t} size={18} />
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-fg">{t.title}</span>
                    <span className="shrink-0 text-[11px] font-bold text-muted">{t.due ? relativeDay(t.due) : "Someday"}</span>
                    <QuickDelete size="sm" label="Delete task" onDelete={() => quickDeleteTask(t.id)} />
                  </motion.li>
                ))}
              </ul>
              {upcoming.length > rows && (
                <Link href="/tasks" className="mt-auto px-2 pt-1 text-[13px] font-semibold text-accent">
                  +{upcoming.length - rows} more
                </Link>
              )}
            </div>
          </>
        );
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3 gap-y-0.5">
          <h1 className="text-[26px] leading-tight font-extrabold tracking-tight text-fg sm:text-[30px]">
            {now ? greeting(now.getHours()) : "Welcome"}
            <span className="text-accent">.</span>
          </h1>
          <p className="text-sm font-semibold text-muted">
            {now ? now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" }) : " "}
          </p>
        </div>
        {editing ? (
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="ghost" onClick={resetLayout}>
              <RotateCcw className="size-3.5" /> Reset
            </Button>
            <Button size="sm" variant="primary" onClick={() => setEditing(false)}>
              <Check className="size-4" /> Done
            </Button>
          </div>
        ) : (
          <IconButton size="sm" label="Edit layout (E)" onClick={() => setEditing(true)}>
            <LayoutGrid />
          </IconButton>
        )}
      </div>

      {editing && (
        <p className="mb-3 text-[13px] text-muted">
          Drag a widget to move it and drag its corner to resize. With the keyboard, focus a widget and use the arrows to move it, <Kbd>Shift</Kbd> + arrows to resize.
        </p>
      )}

      <WidgetGrid layout={layout} editing={editing} render={renderWidget} />
    </div>
  );
}
