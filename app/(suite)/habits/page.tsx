"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Flame, MoreHorizontal, Pencil, Plus, Trash2, Trophy } from "lucide-react";
import { useHydrated, useStore } from "@/app/lib/storage";
import {
  addHabit,
  bestStreak,
  currentStreak,
  quickDeleteHabit,
  habitsStore,
  isScheduled,
  toggleHabitDay,
  updateHabit,
  type Habit,
} from "@/app/lib/stores/habits";
import { useIntent } from "@/app/lib/intents";
import { addDays, dayKey, isToday, startOfWeek, WEEKDAYS_SHORT } from "@/app/lib/date";
import { playSound } from "@/app/lib/alerts";
import { cn } from "@/app/lib/cn";
import { spring } from "@/app/lib/motion";
import { Card, EmptyState, PageHeader } from "@/app/components/ui/Card";
import { Button, IconButton } from "@/app/components/ui/Button";
import { Field, Input } from "@/app/components/ui/Field";
import { Menu } from "@/app/components/ui/Menu";
import { Modal } from "@/app/components/ui/Modal";
import { QuickDelete } from "@/app/components/ui/QuickDelete";

const HABIT_ICONS = ["💧", "🏃", "📖", "🧘", "💪", "🥗", "😴", "✍️", "🎸", "🧹", "💊", "🌿", "🚭", "📵", "🙏", "🧠"];
const HABIT_COLORS = ["#ec4899", "#f97316", "#eab308", "#10b981", "#06b6d4", "#3b82f6", "#8b5cf6", "#64748b"];

type Draft = { id: string | null; name: string; icon: string; color: string; days: number[] };

const emptyDraft = (): Draft => ({ id: null, name: "", icon: "💧", color: HABIT_COLORS[4], days: [0, 1, 2, 3, 4, 5, 6] });

function DayDot({ habit, date }: { habit: Habit; date: Date }) {
  const key = dayKey(date);
  const done = !!habit.log[key];
  const scheduled = isScheduled(habit, date);
  const future = date > new Date();
  const today = isToday(date);
  return (
    <motion.button
      type="button"
      disabled={future}
      whileTap={{ scale: 0.8 }}
      transition={spring.bouncy}
      onClick={() => {
        if (!done) playSound("toggle");
        toggleHabitDay(habit.id, key);
      }}
      aria-label={`${date.toLocaleDateString([], { weekday: "long" })}: ${done ? "done" : "not done"}`}
      aria-pressed={done}
      className={cn(
        "grid size-9 place-items-center rounded-full border-2 transition-colors duration-200 sm:size-10",
        future && "opacity-30",
        !done && (scheduled ? "border-line bg-surface-2 hover:border-[var(--c)]" : "border-dashed border-line"),
        today && !done && "ring-2 ring-[var(--c)]/30",
      )}
      style={{ ["--c" as string]: habit.color, ...(done ? { background: habit.color, borderColor: habit.color } : {}) }}
    >
      <AnimatePresence initial={false}>
        {done && (
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={spring.bouncy}>
            <Check className="size-4 text-white" strokeWidth={3.5} />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

function History({ habit }: { habit: Habit }) {
  const weeks = 15;
  const first = addDays(startOfWeek(new Date()), -(weeks - 1) * 7);
  return (
    <div className="flex gap-[3px] overflow-x-auto pb-1">
      {Array.from({ length: weeks }, (_, w) => (
        <div key={w} className="flex flex-col gap-[3px]">
          {Array.from({ length: 7 }, (_, d) => {
            const date = addDays(first, w * 7 + d);
            const done = !!habit.log[dayKey(date)];
            const future = date > new Date();
            return (
              <span
                key={d}
                title={date.toLocaleDateString()}
                className="size-3 rounded-[3px]"
                style={{
                  background: future ? "transparent" : done ? habit.color : isScheduled(habit, date) ? "var(--surface-3)" : "var(--surface-2)",
                }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default function HabitsPage() {
  const hydrated = useHydrated();
  const habits = useStore(habitsStore);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Command palette "New habit".
  useIntent("newHabit", () => setDraft(emptyDraft()));

  const week = useMemo(() => {
    const start = startOfWeek(new Date());
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, []);

  const todayKey = dayKey();
  const dueToday = habits.filter((h) => isScheduled(h, new Date()));
  const doneToday = dueToday.filter((h) => h.log[todayKey]).length;

  function save() {
    if (!draft || !draft.name.trim() || draft.days.length === 0) return;
    const data = { name: draft.name.trim(), icon: draft.icon, color: draft.color, days: [...draft.days].sort() };
    if (draft.id) updateHabit(draft.id, data);
    else addHabit(data);
    setDraft(null);
  }

  return (
    <div>
      <PageHeader
        title="Habits"
        subtitle={habits.length ? `${doneToday} of ${dueToday.length} done today` : "Small things, every day."}
        actions={
          <Button variant="primary" onClick={() => setDraft(emptyDraft())}>
            <Plus className="size-4" /> New habit
          </Button>
        }
      />

      {!hydrated ? null : habits.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Flame />}
            title="Build your first habit"
            hint="Pick something small you want to do regularly. Check it off each day and watch the streak grow."
            action={
              <Button variant="primary" onClick={() => setDraft(emptyDraft())}>
                <Plus className="size-4" /> New habit
              </Button>
            }
          />
        </Card>
      ) : (
        <Card className="p-2 sm:p-3">
          <div className="hidden items-center gap-3 px-3 pt-1 pb-2 sm:flex">
            <div className="flex-1" />
            <div className="flex gap-2">
              {week.map((d, i) => (
                <span key={i} className={cn("w-10 text-center text-[11px] font-bold uppercase", isToday(d) ? "text-accent" : "text-muted")}>
                  {WEEKDAYS_SHORT[i]}
                </span>
              ))}
            </div>
            <div className="w-8" />
          </div>
          <motion.ul layout className="flex flex-col">
            {habits.map((h) => {
              const streak = currentStreak(h);
              const open = expanded === h.id;
              return (
                <motion.li layout key={h.id} transition={spring.smooth} className="rounded-2xl transition-colors hover:bg-surface-2/60">
                  <div className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center">
                    <button type="button" onClick={() => setExpanded(open ? null : h.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                      <span className="grid size-11 shrink-0 place-items-center rounded-2xl text-xl" style={{ background: `color-mix(in oklab, ${h.color} 16%, transparent)` }}>
                        {h.icon}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[15px] font-bold text-fg">{h.name}</span>
                        <span className="flex items-center gap-1 text-[12px] font-semibold text-muted">
                          <Flame className={cn("size-3.5", streak > 0 && "text-warning")} />
                          {streak} day streak
                        </span>
                      </span>
                    </button>
                    <div className="flex items-center justify-between gap-2 sm:justify-end">
                      <div className="flex gap-1.5 sm:gap-2">
                        {week.map((d) => (
                          <div key={dayKey(d)} className="flex flex-col items-center gap-1">
                            <span className="text-[10px] font-bold text-muted uppercase sm:hidden">{WEEKDAYS_SHORT[(d.getDay() + 6) % 7][0]}</span>
                            <DayDot habit={h} date={d} />
                          </div>
                        ))}
                      </div>
                      <QuickDelete label="Delete habit" onDelete={() => quickDeleteHabit(h.id)} />
                      <Menu
                        trigger={(t) => (
                          <IconButton size="sm" label="Habit options" {...t}>
                            <MoreHorizontal />
                          </IconButton>
                        )}
                        items={[
                          { label: "Edit", icon: <Pencil />, onSelect: () => setDraft({ id: h.id, name: h.name, icon: h.icon, color: h.color, days: h.days }) },
                          { label: "Delete", icon: <Trash2 />, danger: true, onSelect: () => quickDeleteHabit(h.id) },
                        ]}
                      />
                    </div>
                  </div>
                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={spring.smooth}
                        className="overflow-hidden"
                      >
                        <div className="flex flex-wrap items-end gap-6 px-3 pb-4">
                          <History habit={h} />
                          <div className="flex gap-6 text-sm">
                            <div>
                              <div className="text-[11px] font-bold tracking-wider text-muted uppercase">Best</div>
                              <div className="flex items-center gap-1 text-lg font-extrabold text-fg">
                                <Trophy className="size-4 text-warning" /> {bestStreak(h)}
                              </div>
                            </div>
                            <div>
                              <div className="text-[11px] font-bold tracking-wider text-muted uppercase">Total</div>
                              <div className="text-lg font-extrabold text-fg">{Object.keys(h.log).length}</div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.li>
              );
            })}
          </motion.ul>
        </Card>
      )}

      <Modal
        open={!!draft}
        onClose={() => setDraft(null)}
        title={draft?.id ? "Edit habit" : "New habit"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={save} disabled={!draft?.name.trim() || !draft?.days.length}>
              Save
            </Button>
          </>
        }
      >
        {draft && (
          <div className="flex flex-col gap-5">
            <Field label="Name">
              <Input
                data-autofocus
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && save()}
                placeholder="e.g. Drink water, Read 10 pages"
              />
            </Field>
            <Field label="Icon">
              <div className="grid grid-cols-8 gap-1.5">
                {HABIT_ICONS.map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setDraft({ ...draft, icon: i })}
                    className={cn("grid aspect-square place-items-center rounded-xl text-xl transition-colors", draft.icon === i ? "bg-accent-soft ring-2 ring-accent" : "bg-surface-2 hover:bg-surface-3")}
                  >
                    {i}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Colour">
              <div className="flex flex-wrap gap-2">
                {HABIT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={c}
                    onClick={() => setDraft({ ...draft, color: c })}
                    className={cn("size-8 rounded-full transition-transform", draft.color === c && "scale-110 ring-2 ring-offset-2 ring-offset-[var(--surface-solid)]")}
                    style={{ background: c, ["--tw-ring-color" as string]: c }}
                  />
                ))}
              </div>
            </Field>
            <Field label="Repeat on" hint={draft.days.length === 7 ? "Every day" : draft.days.length === 5 && !draft.days.includes(5) && !draft.days.includes(6) ? "Weekdays" : `${draft.days.length} days a week`}>
              <div className="flex gap-1.5">
                {WEEKDAYS_SHORT.map((d, i) => {
                  const on = draft.days.includes(i);
                  return (
                    <button
                      key={d}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setDraft({ ...draft, days: on ? draft.days.filter((x) => x !== i) : [...draft.days, i] })}
                      className={cn("h-10 flex-1 rounded-xl text-[13px] font-bold transition-colors", on ? "bg-accent text-white" : "bg-surface-2 text-muted hover:bg-surface-3")}
                    >
                      {d[0]}
                    </button>
                  );
                })}
              </div>
            </Field>
          </div>
        )}
      </Modal>
    </div>
  );
}
