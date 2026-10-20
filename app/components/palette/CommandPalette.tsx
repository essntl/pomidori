"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  CalendarPlus,
  CornerDownLeft,
  FilePlus,
  FileText,
  Flame,
  ListMusic,
  ListPlus,
  Moon,
  Pause,
  Play,
  RotateCcw,
  Search,
  SkipForward,
  SquareCheckBig,
  StepForward,
  Waves,
  CalendarDays,
} from "lucide-react";
import { ui, useHotkey, useUI } from "@/app/context/hooks";
import { timerActions, timerStore } from "@/app/context/TimerContext";
import { NAV } from "@/app/lib/nav";
import { useStore } from "@/app/lib/storage";
import { notesStore, createPage } from "@/app/lib/stores/notes";
import { INBOX_ID, addTask, parseQuickAdd } from "@/app/lib/stores/tasks";
import { tasksStore } from "@/app/lib/stores/tasks";
import { eventsStore } from "@/app/lib/stores/events";
import { habitsStore } from "@/app/lib/stores/habits";
import { settingsStore, updateSettings } from "@/app/lib/stores/settings";
import { player, playerRuntime } from "@/app/lib/player/controller";
import { detectSource } from "@/app/lib/player/detect";
import { ambientActions } from "@/app/lib/player/ambient";
import { intentStore, notesUIStore } from "@/app/lib/intents";
import { notify } from "@/app/lib/alerts";
import { fmtDate, relativeDay } from "@/app/lib/date";
import { cn } from "@/app/lib/cn";
import { ease, spring } from "@/app/lib/motion";
import { Kbd } from "../ui/Card";
import { Portal, useOverlayBehavior } from "../ui/Modal";

type Command = {
  id: string;
  group: string;
  label: string;
  hint?: string;
  icon: ReactNode;
  keywords?: string;
  run: () => void;
};

/** Commands built from the typed text itself always show; a "#List" task goes to the top. */
const isPinned = (id: string) => id === "add-music" || id.startsWith("quick-task");
const pinRank = (id: string) => (id === "quick-task-target" ? 3 : id === "add-music" ? 2 : id.startsWith("quick-task") ? -1 : 0);

/** Subsequence fuzzy match; higher is better, -1 means no match. */
function score(query: string, text: string) {
  if (!query) return 0;
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  const idx = t.indexOf(q);
  if (idx >= 0) return 100 - idx + (idx === 0 ? 50 : 0);
  let ti = 0;
  let s = 0;
  let streak = 0;
  for (const ch of q) {
    const found = t.indexOf(ch, ti);
    if (found < 0) return -1;
    streak = found === ti ? streak + 1 : 0;
    s += 1 + streak;
    ti = found + 1;
  }
  return s;
}

export default function CommandPalette() {
  const { palette: open } = useUI();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const panel = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const close = () => {
    ui.closePalette();
    setQuery("");
    setActive(0);
  };
  useOverlayBehavior(open, close, panel);

  useHotkey(
    (e) => (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k",
    (e) => {
      e.preventDefault();
      if (open) close();
      else ui.openPalette();
    },
    { allowInInputs: true },
  );

  const notes = useStore(notesStore);
  const tasks = useStore(tasksStore);
  const events = useStore(eventsStore);
  const habits = useStore(habitsStore);
  const timerStatus = useStore(timerStore).status;
  const musicStatus = useStore(playerRuntime).status;

  const commands = useMemo<Command[]>(() => {
    const go = (href: string) => () => router.push(href);
    const q = query.trim();
    const list: Command[] = [];

    if (q && detectSource(q) && /[./]/.test(q)) {
      list.push({
        id: "add-music",
        group: "Music",
        label: `Add to queue: ${q}`,
        icon: <ListMusic />,
        run: () => player.add(q).catch((err: Error) => notify({ title: "Couldn't add", body: err.message, icon: "⚠️", tone: "danger" })),
      });
    }
    if (q) {
      // Tasks: "#List" in the text targets that list; otherwise offer Inbox plus each other list.
      const parsed = parseQuickAdd(q, tasks.lists);
      const title = parsed.title || q;
      const addTo = (listId: string | undefined) => () => {
        const target = tasks.lists.find((l) => l.id === listId);
        addTask({ title, due: parsed.due, priority: parsed.priority, ...(listId ? { listId } : {}) });
        notify({ title: target && target.id !== INBOX_ID ? `Task added to ${target.name}` : "Task added", body: title, icon: "✅", tone: "success", duration: 2200 });
      };
      const extras = [parsed.due && relativeDay(parsed.due), parsed.priority > 0 && ["", "low", "medium", "high"][parsed.priority] + " priority"]
        .filter(Boolean)
        .join(" · ");
      if (parsed.listId) {
        const target = tasks.lists.find((l) => l.id === parsed.listId)!;
        list.push({ id: "quick-task-target", group: "Create", label: `Add task to ${target.name}: ${title}`, hint: extras || undefined, icon: <ListPlus />, run: addTo(parsed.listId) });
      } else {
        list.push({ id: "quick-task", group: "Create", label: `Add task: ${title}`, hint: extras || "Inbox", icon: <ListPlus />, run: addTo(undefined) });
        for (const l of tasks.lists.filter((l) => l.id !== INBOX_ID).slice(0, 5)) {
          list.push({ id: `quick-task-${l.id}`, group: "Create", label: `Add task to ${l.name}: ${title}`, hint: extras || undefined, icon: <ListPlus />, run: addTo(l.id) });
        }
      }
    }

    list.push(
      {
        id: "new-note",
        group: "Create",
        label: "New note",
        icon: <FilePlus />,
        run: () => {
          const page = createPage({ title: q && !detectSource(q) ? q : "" });
          notesUIStore.set((s) => ({ ...s, selectedId: page.id }));
          router.push("/notes");
        },
      },
      {
        id: "new-event",
        group: "Create",
        label: "New calendar event",
        icon: <CalendarPlus />,
        run: () => {
          intentStore.set((s) => ({ ...s, newEvent: true }));
          router.push("/calendar");
        },
      },
      {
        id: "new-habit",
        group: "Create",
        label: "New habit",
        icon: <Flame />,
        run: () => {
          intentStore.set((s) => ({ ...s, newHabit: true }));
          router.push("/habits");
        },
      },
      {
        id: "timer-toggle",
        group: "Timer",
        label: timerStatus === "running" ? "Pause timer" : "Start focus timer",
        icon: timerStatus === "running" ? <Pause /> : <Play />,
        keywords: "pomodoro focus",
        run: timerActions.toggle,
      },
      { id: "timer-skip", group: "Timer", label: "Skip to next phase", icon: <StepForward />, keywords: "pomodoro break", run: timerActions.skip },
      { id: "timer-reset", group: "Timer", label: "Reset timer", icon: <RotateCcw />, keywords: "pomodoro", run: timerActions.reset },
      {
        id: "music-toggle",
        group: "Music",
        label: musicStatus === "playing" ? "Pause music" : "Play music",
        icon: musicStatus === "playing" ? <Pause /> : <Play />,
        run: player.toggle,
      },
      { id: "music-next", group: "Music", label: "Next track", icon: <SkipForward />, run: player.next },
      { id: "ambient", group: "Music", label: "Toggle ambient noise", icon: <Waves />, keywords: "rain noise", run: ambientActions.toggle },
      {
        id: "theme",
        group: "Settings",
        label: "Toggle dark mode",
        icon: <Moon />,
        keywords: "theme light",
        run: () => updateSettings({ theme: document.documentElement.classList.contains("dark") ? "light" : "dark" }),
      },
      {
        id: "dnd",
        group: "Settings",
        label: settingsStore.get().dnd ? "Turn off silence mode" : "Silence sounds & notifications",
        icon: <Moon />,
        keywords: "dnd do not disturb mute",
        run: () => updateSettings({ dnd: !settingsStore.get().dnd }),
      },
      ...NAV.map((n) => {
        const Icon = n.icon;
        return { id: `nav-${n.href}`, group: "Go to", label: n.label, icon: <Icon />, keywords: "open page", run: go(n.href) };
      }),
    );

    if (q) {
      for (const n of notes) {
        list.push({
          id: `note-${n.id}`,
          group: "Notes",
          label: n.title || "Untitled",
          hint: n.icon,
          icon: <FileText />,
          keywords: n.text,
          run: () => {
            notesUIStore.set((s) => ({ ...s, selectedId: n.id }));
            router.push("/notes");
          },
        });
      }
      for (const t of tasks.tasks.filter((t) => !t.done)) {
        list.push({ id: `task-${t.id}`, group: "Tasks", label: t.title, icon: <SquareCheckBig />, run: go("/tasks") });
      }
      for (const e of events) {
        list.push({ id: `event-${e.id}`, group: "Events", label: e.title, hint: fmtDate(e.start), icon: <CalendarDays />, run: go("/calendar") });
      }
      for (const h of habits) {
        list.push({ id: `habit-${h.id}`, group: "Habits", label: h.name, hint: h.icon, icon: <Flame />, run: go("/habits") });
      }
    }

    if (!q) return list.filter((c) => c.group !== "Notes");
    return list
      .map((c) => ({ c, s: isPinned(c.id) ? 1 : Math.max(score(q, c.label), score(q, c.keywords ?? "") - 20) }))
      .filter((x) => x.s >= 0 && (x.s > 0 || isPinned(x.c.id)))
      .sort((a, b) => pinRank(b.c.id) - pinRank(a.c.id) || b.s - a.s)
      .slice(0, 40)
      .map((x) => x.c);
  }, [query, notes, tasks, events, habits, timerStatus, musicStatus, router]);

  const safeActive = Math.min(active, Math.max(0, commands.length - 1));

  function run(c: Command | undefined) {
    if (!c) return;
    close();
    c.run();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const n = commands.length;
      if (!n) return;
      const next = (safeActive + (e.key === "ArrowDown" ? 1 : -1) + n) % n;
      setActive(next);
      listRef.current?.querySelector(`[data-index="${next}"]`)?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter") {
      e.preventDefault();
      run(commands[safeActive]);
    }
  }

  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[75] flex items-start justify-center px-3 pt-[12vh]">
            <motion.div
              className="absolute inset-0 bg-[var(--backdrop)] backdrop-blur-[3px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: ease.out }}
              onClick={close}
            />
            <motion.div
              ref={panel}
              role="dialog"
              aria-modal="true"
              aria-label="Command palette"
              initial={{ opacity: 0, scale: 0.96, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: -6, transition: { duration: 0.12 } }}
              transition={spring.snappy}
              className="relative flex max-h-[70vh] w-full max-w-xl flex-col overflow-hidden rounded-tile border border-line bg-surface-solid shadow-pop"
            >
              <div className="flex items-center gap-3 border-b border-line px-5">
                <Search className="size-5 shrink-0 text-muted" />
                <input
                  data-autofocus
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setActive(0);
                  }}
                  onKeyDown={onKeyDown}
                  placeholder="Search, add a task (#list, tomorrow, !high), paste a music link…"
                  className="h-14 flex-1 bg-transparent text-[16px] text-fg outline-none placeholder:text-muted"
                  aria-label="Command"
                />
                <Kbd>Esc</Kbd>
              </div>
              <div ref={listRef} className="flex-1 overflow-y-auto p-2">
                {commands.length === 0 && <p className="px-3 py-8 text-center text-sm text-muted">No matches</p>}
                {commands.map((c, i) => {
                  const header = i === 0 || commands[i - 1].group !== c.group ? c.group : null;
                  return (
                    <div key={c.id}>
                      {header && <div className="px-3 pt-3 pb-1 text-[11px] font-bold tracking-wider text-muted uppercase">{header}</div>}
                      <button
                        type="button"
                        data-index={i}
                        onMouseMove={() => i !== safeActive && setActive(i)}
                        onClick={() => run(c)}
                        className={cn(
                          "relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[14px] font-semibold transition-colors [&_svg]:size-[18px]",
                          i === safeActive ? "text-fg" : "text-fg-2",
                        )}
                      >
                        {i === safeActive && (
                          <motion.span layoutId="palette-active" transition={spring.snappy} className="absolute inset-0 rounded-xl bg-surface-2" />
                        )}
                        <span className={cn("relative", i === safeActive ? "text-accent" : "text-muted")}>{c.icon}</span>
                        <span className="relative flex-1 truncate">{c.label}</span>
                        {c.hint && <span className="relative text-xs text-muted">{c.hint}</span>}
                        {i === safeActive && (
                          <span className="relative text-muted">
                            {c.group === "Go to" ? <ArrowRight className="size-4" /> : <CornerDownLeft className="size-4" />}
                          </span>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
