"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, Reorder, motion, useDragControls } from "framer-motion";
import { CalendarDays, CalendarClock, CheckCheck, Inbox, MoreHorizontal, Pencil, Plus, Sparkles, SquareCheckBig, Sun, Trash2 } from "lucide-react";
import { useHydrated, useStore } from "@/app/lib/storage";
import {
  INBOX_ID,
  addList,
  addTask,
  deleteList,
  parseQuickAdd,
  renameList,
  reorderTasks,
  tasksStore,
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

type View = "today" | "upcoming" | "completed" | `list:${string}`;

function ReorderItem({ task, children }: { task: Task; children: (grip: React.ReactNode) => React.ReactNode }) {
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={task.id}
      dragListener={false}
      dragControls={controls}
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

export default function TasksPage() {
  const hydrated = useHydrated();
  const { lists, tasks } = useStore(tasksStore);
  const [view, setView] = useState<View>("today");
  const [input, setInput] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [listModal, setListModal] = useState<{ id: string | null; name: string } | null>(null);

  const today = dayKey();
  const listById = useMemo(() => new Map(lists.map((l) => [l.id, l])), [lists]);
  const activeListId = view.startsWith("list:") ? view.slice(5) : null;
  const activeList = activeListId ? listById.get(activeListId) : undefined;

  const counts = {
    today: tasks.filter((t) => !t.done && t.due && t.due <= today).length,
    upcoming: tasks.filter((t) => !t.done && t.due && t.due > today).length,
    completed: tasks.filter((t) => t.done).length,
  };

  const visible = useMemo(() => {
    if (view === "today") return tasks.filter((t) => !t.done && t.due && t.due <= today).sort((a, b) => b.priority - a.priority);
    if (view === "upcoming") return tasks.filter((t) => !t.done && t.due && t.due > today).sort((a, b) => a.due!.localeCompare(b.due!));
    if (view === "completed") return tasks.filter((t) => t.done).sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0));
    return tasks.filter((t) => !t.done && t.listId === activeListId);
  }, [tasks, view, today, activeListId]);

  const parsed = input.trim() ? parseQuickAdd(input, lists) : null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!parsed || !parsed.title) return;
    addTask({
      title: parsed.title,
      priority: parsed.priority,
      due: parsed.due ?? (view === "today" ? today : null),
      listId: parsed.listId ?? activeListId ?? INBOX_ID,
    });
    setInput("");
  }

  const openTask = tasks.find((t) => t.id === openId) ?? null;

  const navItems: { id: View; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: "today", label: "Today", icon: <Sun />, count: counts.today },
    { id: "upcoming", label: "Upcoming", icon: <CalendarClock />, count: counts.upcoming },
    { id: "completed", label: "Completed", icon: <CheckCheck /> },
  ];

  const title = view === "today" ? "Today" : view === "upcoming" ? "Upcoming" : view === "completed" ? "Completed" : activeList?.name ?? "List";

  const grouped = useMemo(() => {
    if (view !== "upcoming") return null;
    const map = new Map<string, Task[]>();
    for (const t of visible) map.set(t.due!, [...(map.get(t.due!) ?? []), t]);
    return [...map.entries()];
  }, [view, visible]);

  return (
    <div>
      <PageHeader title="Tasks" subtitle="Capture everything. Do what matters today." />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[240px_minmax(0,1fr)]">
        <Card className="self-start p-2">
          <nav className="flex gap-1 overflow-x-auto md:flex-col">
            {navItems.map((n) => (
              <NavButton key={n.id} active={view === n.id} onClick={() => setView(n.id)} icon={n.icon} label={n.label} count={n.count} />
            ))}
          </nav>
          <div className="mt-2 flex items-center justify-between px-3 pt-2 pb-1 text-[11px] font-bold tracking-wider text-muted uppercase max-md:hidden">
            Lists
            <IconButton size="sm" label="New list" className="-mr-2 size-6" onClick={() => setListModal({ id: null, name: "" })}>
              <Plus />
            </IconButton>
          </div>
          <nav className="flex gap-1 overflow-x-auto md:flex-col max-md:mt-1">
            {lists.map((l) => (
              <NavButton
                key={l.id}
                active={view === `list:${l.id}`}
                onClick={() => setView(`list:${l.id}`)}
                icon={l.id === INBOX_ID ? <Inbox /> : <span className="size-2.5 rounded-full" style={{ background: l.color }} />}
                label={l.name}
                count={tasks.filter((t) => !t.done && t.listId === l.id).length}
              />
            ))}
            <button
              type="button"
              onClick={() => setListModal({ id: null, name: "" })}
              className="flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-muted hover:bg-surface-2 md:hidden"
            >
              <Plus className="size-4" /> List
            </button>
          </nav>
        </Card>

        <Card className="min-w-0 p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="text-xl font-extrabold tracking-tight text-fg">{title}</h2>
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

          {view !== "completed" && (
            <form onSubmit={submit} className="mb-2">
              <div className="flex items-center gap-2 rounded-2xl border border-line bg-surface-2 py-1.5 pr-1.5 pl-4 focus-within:border-accent/50 focus-within:ring-4 focus-within:ring-accent/10">
                <Plus className="size-5 shrink-0 text-muted" />
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Add a task — try “Call mom tomorrow !high”"
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
          )}

          {!hydrated ? null : visible.length === 0 ? (
            <EmptyState
              icon={view === "completed" ? <CheckCheck /> : <SquareCheckBig />}
              title={view === "today" ? "Nothing due today" : view === "completed" ? "Nothing completed yet" : view === "upcoming" ? "Nothing scheduled" : "This list is empty"}
              hint={view === "completed" ? "Checked-off tasks will show up here." : "Add a task above. Dates like “friday” or “tomorrow” are understood."}
            />
          ) : grouped ? (
            <div className="flex flex-col gap-3">
              {grouped.map(([day, items]) => (
                <div key={day}>
                  <div className="px-3 pt-2 pb-1 text-[12px] font-bold tracking-wider text-muted uppercase">{relativeDay(day)}</div>
                  <AnimatePresence initial={false}>
                    {items.map((t) => (
                      <motion.div key={t.id} layout exit={{ opacity: 0, x: -12 }} transition={spring.smooth}>
                        <TaskRow task={t} list={listById.get(t.listId)} showList onOpen={() => setOpenId(t.id)} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          ) : activeListId ? (
            <Reorder.Group axis="y" values={visible.map((t) => t.id)} onReorder={reorderTasks} className="flex flex-col">
              <AnimatePresence initial={false}>
                {visible.map((t) => (
                  <ReorderItem key={t.id} task={t}>
                    {(grip) => <TaskRow task={t} dragHandle={grip} onOpen={() => setOpenId(t.id)} />}
                  </ReorderItem>
                ))}
              </AnimatePresence>
            </Reorder.Group>
          ) : (
            <div className="flex flex-col">
              <AnimatePresence initial={false}>
                {visible.map((t) => (
                  <motion.div
                    key={t.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -12, transition: { duration: 0.15 } }}
                    transition={spring.smooth}
                  >
                    <TaskRow task={t} list={listById.get(t.listId)} showList onOpen={() => setOpenId(t.id)} />
                  </motion.div>
                ))}
              </AnimatePresence>
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

function NavButton({ active, onClick, icon, label, count }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; count?: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[14px] font-semibold transition-colors [&_svg]:size-[18px]",
        active ? "text-fg" : "text-fg-2 hover:bg-surface-2",
      )}
    >
      {active && <motion.span layoutId="tasks-nav" transition={spring.snappy} className="absolute inset-0 rounded-xl bg-surface-3" />}
      <span className={cn("relative grid w-[18px] place-items-center", active ? "text-accent" : "text-muted")}>{icon}</span>
      <span className="relative flex-1 truncate">{label}</span>
      {!!count && <span className="relative text-xs font-bold text-muted tabular-nums">{count}</span>}
    </button>
  );
}
