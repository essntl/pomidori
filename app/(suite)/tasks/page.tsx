"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, Reorder, motion, useDragControls } from "framer-motion";
import { CalendarDays, ChevronDown, Inbox, Layers, MoreHorizontal, Pencil, Plus, Sparkles, SquareCheckBig, Trash2 } from "lucide-react";
import { createMemoryStore, useHydrated, useStore } from "@/app/lib/storage";
import { notify } from "@/app/lib/alerts";
import { openTaskStore } from "@/app/lib/intents";
import {
  INBOX_ID,
  addList,
  addTask,
  deleteList,
  parseQuickAdd,
  renameList,
  reorderTasks,
  tasksStore,
  updateTask,
  type Task,
} from "@/app/lib/stores/tasks";
import { dayKey, relativeDay } from "@/app/lib/date";
import { cn } from "@/app/lib/cn";
import { spring } from "@/app/lib/motion";
import { Card, EmptyState, PageHeader } from "@/app/components/ui/Card";
import { Button, IconButton } from "@/app/components/ui/Button";
import { Input } from "@/app/components/ui/Field";
import { Menu } from "@/app/components/ui/Menu";
import { Modal } from "@/app/components/ui/Modal";
import { DragGrip, PRIORITY_COLOR, TaskRow } from "@/app/components/tasks/TaskRow";
import { TaskDetail } from "@/app/components/tasks/TaskDetail";

type View = "all" | `list:${string}`;

/** Which sidebar list a task is currently being dragged over (to move it there on drop). */
const dropTargetStore = createMemoryStore<string | null>(null);

function listUnderPointer(point: { x: number; y: number }) {
  const els = document.elementsFromPoint(point.x - window.scrollX, point.y - window.scrollY);
  const el = els.find((e) => e instanceof HTMLElement && e.dataset.dropList) as HTMLElement | undefined;
  return el?.dataset.dropList ?? null;
}

function ReorderItem({ task, children }: { task: Task; children: (grip: React.ReactNode) => React.ReactNode }) {
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={task.id}
      dragListener={false}
      dragControls={controls}
      onDrag={(_, info) => {
        const target = listUnderPointer(info.point);
        if (target !== dropTargetStore.get()) dropTargetStore.set(target);
      }}
      onDragEnd={(_, info) => {
        const target = listUnderPointer(info.point);
        dropTargetStore.set(null);
        if (target && target !== task.listId) {
          const list = tasksStore.get().lists.find((l) => l.id === target);
          updateTask(task.id, { listId: target });
          notify({ title: `Moved to ${list?.name ?? "list"}`, body: task.title, icon: "📥", tone: "info", duration: 2200 });
        }
      }}
      layout="position"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -12, transition: { duration: 0.15 } }}
      transition={spring.smooth}
      whileDrag={{ scale: 1.02, boxShadow: "var(--shadow-pop)", borderRadius: 16, background: "var(--surface-solid)" }}
      className="relative list-none"
    >
      {children(<DragGrip onPointerDown={(e) => controls.start(e)} />)}
    </Reorder.Item>
  );
}

type Section = { id: string; label: string; tone?: "danger" | "accent"; tasks: Task[]; byDay?: boolean; reorder?: boolean };

export default function TasksPage() {
  const hydrated = useHydrated();
  const { lists, tasks } = useStore(tasksStore);
  const dropTarget = useStore(dropTargetStore);
  const [view, setView] = useState<View>("all");
  const [showCompleted, setShowCompleted] = useState(false);
  const [input, setInput] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [listModal, setListModal] = useState<{ id: string | null; name: string } | null>(null);

  // Opened from search or the home page: show the task in its own list and open its editor.
  useEffect(() => {
    const check = () => {
      const id = openTaskStore.get().id;
      if (!id) return;
      openTaskStore.set({ id: null });
      const t = tasksStore.get().tasks.find((x) => x.id === id);
      if (!t) return;
      setView(`list:${t.listId}`);
      if (t.done) setShowCompleted(true);
      setOpenId(t.id);
    };
    check();
    return openTaskStore.subscribe(check);
  }, []);

  const today = dayKey();
  const listById = useMemo(() => new Map(lists.map((l) => [l.id, l])), [lists]);
  const activeListId = view.startsWith("list:") ? view.slice(5) : null;
  const activeList = activeListId ? listById.get(activeListId) : undefined;
  const openCount = (listId?: string) => tasks.filter((t) => !t.done && (!listId || t.listId === listId)).length;
  const dueNow = (listId?: string) => tasks.filter((t) => !t.done && t.due && t.due <= today && (!listId || t.listId === listId)).length;

  // One view per list (or all lists), always split by when things are due.
  const { sections, completed } = useMemo(() => {
    const scope = activeListId ? tasks.filter((t) => t.listId === activeListId) : tasks;
    const open = scope.filter((t) => !t.done);
    const byPriority = (a: Task, b: Task) => b.priority - a.priority;
    const out: Section[] = [
      { id: "overdue", label: "Overdue", tone: "danger", tasks: open.filter((t) => t.due && t.due < today).sort((a, b) => a.due!.localeCompare(b.due!) || byPriority(a, b)) },
      { id: "today", label: "Today", tone: "accent", tasks: open.filter((t) => t.due === today).sort(byPriority) },
      { id: "upcoming", label: "Upcoming", tasks: open.filter((t) => t.due && t.due > today).sort((a, b) => a.due!.localeCompare(b.due!) || byPriority(a, b)), byDay: true },
      // Undated tasks keep their manual order and can be dragged.
      { id: "anytime", label: "Anytime", tasks: open.filter((t) => !t.due), reorder: true },
    ];
    return {
      sections: out.filter((x) => x.tasks.length),
      completed: scope.filter((t) => t.done).sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0)),
    };
  }, [tasks, today, activeListId]);

  const parsed = input.trim() ? parseQuickAdd(input, lists) : null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!parsed || !parsed.title) return;
    addTask({ title: parsed.title, priority: parsed.priority, due: parsed.due ?? null, listId: parsed.listId ?? activeListId ?? INBOX_ID });
    setInput("");
  }

  const openTask = tasks.find((t) => t.id === openId) ?? null;
  const title = activeList?.name ?? "All tasks";
  const showList = !activeListId;
  const row = (t: Task, grip?: React.ReactNode) => (
    <TaskRow task={t} list={listById.get(t.listId)} lists={lists} showList={showList} dragHandle={grip} onOpen={() => setOpenId(t.id)} />
  );
  const plainRows = (items: Task[]) => (
    <AnimatePresence initial={false}>
      {items.map((t) => (
        <motion.div
          key={t.id}
          layout
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, x: -12, transition: { duration: 0.15 } }}
          transition={spring.smooth}
        >
          {row(t)}
        </motion.div>
      ))}
    </AnimatePresence>
  );

  return (
    <div>
      <PageHeader title="Tasks" subtitle="Capture everything. Do what matters today." />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[240px_minmax(0,1fr)]">
        <Card className="self-start p-2 max-md:hidden">
          <nav className="flex flex-col gap-1">
            <NavButton active={view === "all"} onClick={() => setView("all")} icon={<Layers />} label="All tasks" count={openCount()} due={dueNow()} />
          </nav>
          <div className="mt-2 flex items-center justify-between px-3 pt-2 pb-1 text-[11px] font-bold tracking-wider text-muted uppercase">
            Lists
            <IconButton size="sm" label="New list" className="-mr-2 size-6" onClick={() => setListModal({ id: null, name: "" })}>
              <Plus />
            </IconButton>
          </div>
          <nav className="flex flex-col gap-1">
            {lists.map((l) => (
              <NavButton
                key={l.id}
                dropId={l.id}
                dropActive={dropTarget === l.id}
                active={view === `list:${l.id}`}
                onClick={() => setView(`list:${l.id}`)}
                icon={l.id === INBOX_ID ? <Inbox /> : <span className="size-2.5 rounded-full" style={{ background: l.color }} />}
                label={l.name}
                count={openCount(l.id)}
                due={dueNow(l.id)}
              />
            ))}
          </nav>
        </Card>

        {/* Phones: a list picker instead of the sidebar. */}
        <div className="md:hidden">
          <Menu
            align="start"
            trigger={(t) => (
              <button type="button" className="flex h-11 w-full items-center gap-2 rounded-control bg-surface-2 px-3.5 text-[14px] font-semibold text-fg" {...t}>
                {activeList ? (
                  activeList.id === INBOX_ID ? <Inbox className="size-4 shrink-0 text-muted" /> : <span className="size-2.5 shrink-0 rounded-full" style={{ background: activeList.color }} />
                ) : (
                  <Layers className="size-4 shrink-0 text-muted" />
                )}
                <span className="flex-1 truncate text-left">{title}</span>
                <span className="text-[12px] text-muted tabular-nums">{openCount(activeListId ?? undefined)}</span>
                <ChevronDown className="size-4 shrink-0 text-muted" />
              </button>
            )}
            items={[
              { label: "All tasks", hint: String(openCount() || ""), icon: <Layers />, onSelect: () => setView("all") },
              "separator",
              ...lists.map((l) => ({
                label: l.name,
                hint: String(openCount(l.id) || ""),
                icon: l.id === INBOX_ID ? <Inbox /> : <span className="size-2.5 rounded-full" style={{ background: l.color }} />,
                onSelect: () => setView(`list:${l.id}`),
              })),
              "separator",
              { label: "New list", icon: <Plus />, onSelect: () => setListModal({ id: null, name: "" }) },
            ]}
          />
        </div>

        <Card className="min-w-0 p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-2 px-1">
            <h2 className="truncate text-xl font-extrabold tracking-tight text-fg">{title}</h2>
            {activeList && activeList.id !== INBOX_ID && (
              <Menu
                trigger={(t) => (
                  <IconButton label="List options" size="sm" {...t}>
                    <MoreHorizontal />
                  </IconButton>
                )}
                items={[
                  { label: "Rename", icon: <Pencil />, onSelect: () => setListModal({ id: activeList.id, name: activeList.name }) },
                  {
                    label: "Delete list",
                    icon: <Trash2 />,
                    danger: true,
                    onSelect: () => {
                      deleteList(activeList.id);
                      setView(`list:${INBOX_ID}`);
                    },
                  },
                ]}
              />
            )}
          </div>

          <form onSubmit={submit} className="mb-2">
            <div className="flex items-center gap-2 rounded-2xl border border-line bg-surface-2 py-1.5 pr-1.5 pl-4 focus-within:border-accent/50 focus-within:ring-4 focus-within:ring-accent/10">
              <Plus className="size-5 shrink-0 text-muted" />
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Add to ${activeList?.name ?? "Inbox"} — try “Call mom tomorrow !high”`}
                className="h-9 min-w-0 flex-1 bg-transparent text-[15px] text-fg outline-none placeholder:text-muted"
                aria-label="New task"
              />
              <Button type="submit" variant="primary" size="sm" disabled={!parsed?.title}>
                Add
              </Button>
            </div>
            <AnimatePresence>
              {parsed && (parsed.due || parsed.priority > 0 || parsed.listId) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={spring.snappy}
                  className="flex gap-2 overflow-hidden px-2 pt-2 text-[12px] font-bold"
                >
                  <Sparkles className="size-4 text-accent" />
                  {parsed.due && (
                    <span className="flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-accent">
                      <CalendarDays className="size-3" /> {relativeDay(parsed.due)}
                    </span>
                  )}
                  {parsed.priority > 0 && (
                    <span className="rounded-full px-2 py-0.5" style={{ color: PRIORITY_COLOR[parsed.priority], background: `color-mix(in oklab, ${PRIORITY_COLOR[parsed.priority]} 14%, transparent)` }}>
                      {["", "Low", "Medium", "High"][parsed.priority]} priority
                    </span>
                  )}
                  {parsed.listId && <span className="rounded-full bg-surface-3 px-2 py-0.5 text-fg-2">#{listById.get(parsed.listId)?.name}</span>}
                </motion.div>
              )}
            </AnimatePresence>
          </form>

          {!hydrated ? null : sections.length === 0 && completed.length === 0 ? (
            <EmptyState
              icon={<SquareCheckBig />}
              title={activeList ? "This list is empty" : "Nothing to do"}
              hint="Add a task above. Dates like “friday” or “tomorrow” are understood."
            />
          ) : (
            <div className="flex flex-col gap-2">
              {sections.length === 0 && <p className="px-3 py-4 text-sm text-muted">All done here. 🎉</p>}
              {sections.map((sec) => (
                <section key={sec.id}>
                  <SectionHeader label={sec.label} count={sec.tasks.length} tone={sec.tone} />
                  {sec.byDay ? (
                    groupByDay(sec.tasks).map(([day, items]) => (
                      <div key={day}>
                        <div className="px-3 pt-1.5 pb-0.5 text-[12px] font-semibold text-muted">{relativeDay(day)}</div>
                        {plainRows(items)}
                      </div>
                    ))
                  ) : sec.reorder ? (
                    <Reorder.Group axis="y" values={sec.tasks.map((t) => t.id)} onReorder={reorderTasks} className="flex flex-col">
                      <AnimatePresence initial={false}>
                        {sec.tasks.map((t) => (
                          <ReorderItem key={t.id} task={t}>
                            {(grip) => row(t, grip)}
                          </ReorderItem>
                        ))}
                      </AnimatePresence>
                    </Reorder.Group>
                  ) : (
                    plainRows(sec.tasks)
                  )}
                </section>
              ))}

              {completed.length > 0 && (
                <section>
                  <button
                    type="button"
                    onClick={() => setShowCompleted((x) => !x)}
                    aria-expanded={showCompleted}
                    className="flex w-full items-center gap-1.5 rounded-lg px-3 pt-2 pb-1 text-left text-[12px] font-bold tracking-wider text-muted uppercase hover:text-fg"
                  >
                    <ChevronDown className={cn("size-3.5 transition-transform", !showCompleted && "-rotate-90")} />
                    Completed <span className="tabular-nums">{completed.length}</span>
                  </button>
                  {showCompleted && plainRows(completed)}
                </section>
              )}
            </div>
          )}
        </Card>
      </div>

      <TaskDetail task={openTask} lists={lists} onClose={() => setOpenId(null)} />

      <Modal
        open={!!listModal}
        onClose={() => setListModal(null)}
        title={listModal?.id ? "Rename list" : "New list"}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setListModal(null)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="list-form" disabled={!listModal?.name.trim()}>
              Save
            </Button>
          </>
        }
      >
        <form
          id="list-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (!listModal?.name.trim()) return;
            if (listModal.id) renameList(listModal.id, listModal.name.trim());
            else {
              const l = addList(listModal.name.trim());
              setView(`list:${l.id}`);
            }
            setListModal(null);
          }}
        >
          <Input
            data-autofocus
            value={listModal?.name ?? ""}
            onChange={(e) => setListModal((m) => (m ? { ...m, name: e.target.value } : m))}
            placeholder="e.g. Work, Errands, Side project"
          />
        </form>
      </Modal>
    </div>
  );
}

function groupByDay(items: Task[]) {
  const map = new Map<string, Task[]>();
  for (const t of items) map.set(t.due!, [...(map.get(t.due!) ?? []), t]);
  return [...map.entries()];
}

function SectionHeader({ label, count, tone }: { label: string; count: number; tone?: "danger" | "accent" }) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 px-3 pt-2 pb-1 text-[12px] font-bold tracking-wider uppercase",
        tone === "danger" ? "text-danger" : tone === "accent" ? "text-accent" : "text-muted",
      )}
    >
      {label} <span className="tabular-nums opacity-70">{count}</span>
    </div>
  );
}

function NavButton({
  active,
  onClick,
  icon,
  label,
  count,
  due,
  dropId,
  dropActive,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count?: number;
  /** Open tasks due today or overdue, shown as an accent badge. */
  due?: number;
  /** Lists accept tasks dragged by their grip. */
  dropId?: string;
  dropActive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-drop-list={dropId}
      className={cn(
        "relative flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[14px] font-semibold transition-colors [&_svg]:size-[18px]",
        active ? "text-fg" : "text-fg-2 hover:bg-surface-2",
        dropActive && "bg-accent-soft text-accent ring-1 ring-accent/50",
      )}
    >
      {active && <motion.span layoutId="tasks-nav" transition={spring.snappy} className="absolute inset-0 rounded-xl bg-surface-3" />}
      <span className={cn("relative grid w-[18px] place-items-center", active ? "text-accent" : "text-muted")}>{icon}</span>
      <span className="relative flex-1 truncate">{label}</span>
      {!!due && (
        <span className="relative rounded-full bg-accent-soft px-1.5 text-[11px] font-bold text-accent tabular-nums" title={`${due} due today or overdue`}>
          {due}
        </span>
      )}
      {!!count && <span className="relative text-xs font-bold text-muted tabular-nums">{count}</span>}
    </button>
  );
}
