"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Bell, Clock, Flame, Target } from "lucide-react";
import { useTimer } from "@/app/context/TimerContext";
import { useHotkey, useSettings } from "@/app/context/hooks";
import { useHydrated, useStore } from "@/app/lib/storage";
import { sessionsStore } from "@/app/lib/stores/sessions";
import { tasksStore } from "@/app/lib/stores/tasks";
import { updateSettings } from "@/app/lib/stores/settings";
import { requestNotificationPermission } from "@/app/lib/alerts";
import { dayKey, fmtDuration, fmtTime } from "@/app/lib/date";
import { Card, CardHeader, Kbd, PageHeader } from "@/app/components/ui/Card";
import { Select } from "@/app/components/ui/Field";
import { Button } from "@/app/components/ui/Button";
import { TimerDial } from "@/app/components/timer/TimerDial";
import { TimerSettingsForm } from "@/app/components/timer/TimerSettingsForm";

export default function FocusPage() {
  const t = useTimer();
  const sessions = useStore(sessionsStore);
  const { tasks } = useStore(tasksStore);
  const settings = useSettings();

  useHotkey((e) => e.code === "Space" && !e.ctrlKey && !e.metaKey, (e) => { e.preventDefault(); t.toggle(); });
  useHotkey((e) => e.key.toLowerCase() === "r" && !e.ctrlKey && !e.metaKey, () => t.reset());
  useHotkey((e) => e.key.toLowerCase() === "s" && !e.ctrlKey && !e.metaKey, () => t.skip());
  useHotkey((e) => e.key === "+" || e.key === "=", () => t.addMinutes(1));

  const today = dayKey();
  const todaySessions = useMemo(() => sessions.filter((s) => dayKey(s.start) === today).reverse(), [sessions, today]);
  const todayMinutes = todaySessions.reduce((a, s) => a + s.minutes, 0);
  const openTasks = tasks.filter((x) => !x.done);
  const current = tasks.find((x) => x.id === t.taskId);
  const taskTitle = (id: string | null) => tasks.find((x) => x.id === id)?.title;

  const hydrated = useHydrated();
  const [, rerender] = useState(0);
  const notifPermission = hydrated && typeof Notification !== "undefined" ? Notification.permission : "unsupported";

  return (
    <div>
      <PageHeader title="Focus" subtitle="Work in focused sprints, rest on purpose." />
      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="flex flex-col items-center px-4 py-6">
          <TimerDial />
          <div className="mt-4 flex flex-wrap justify-center gap-1.5">
            {[1, 5, 10].map((m) => (
              <Button key={m} size="sm" variant="secondary" onClick={() => t.addMinutes(m)}>
                +{m} min
              </Button>
            ))}
          </div>
          <div className="mt-4 hidden flex-wrap items-center justify-center gap-x-3.5 gap-y-1 text-[11px] text-muted sm:flex">
            <span><Kbd>Space</Kbd> start / pause</span>
            <span><Kbd>R</Kbd> reset</span>
            <span><Kbd>S</Kbd> skip</span>
            <span><Kbd>+</Kbd> add a minute</span>
          </div>
        </Card>

        <div className="flex flex-col gap-3">
          <Card>
            <CardHeader title="Focusing on" icon={<Target />} />
            <div className="px-4 pb-3">
              <Select value={t.taskId ?? ""} onChange={(e) => t.setTask(e.target.value || null)} aria-label="Task to focus on">
                <option value="">Nothing in particular</option>
                {current?.done && <option value={current.id}>{current.title} (done)</option>}
                {openTasks.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.title}
                  </option>
                ))}
              </Select>
              {openTasks.length === 0 && (
                <p className="mt-1.5 text-xs text-muted">
                  Add tasks in <Link href="/tasks" className="font-semibold text-accent">Tasks</Link> to track time per task.
                </p>
              )}
            </div>
            <div className="border-t border-line px-4 pt-2.5 pb-3">
              <div className="flex items-center justify-between text-[12px] font-bold tracking-wider text-muted uppercase">
                <span className="flex items-center gap-1.5">
                  <Flame className="size-[15px]" /> Today
                </span>
                <span className="text-[13px] tracking-normal text-fg normal-case tabular-nums">{fmtDuration(todayMinutes)}</span>
              </div>
              {todaySessions.length === 0 ? (
                <p className="pt-1.5 text-[13px] text-muted">No sessions yet.</p>
              ) : (
                <div className="mt-1 max-h-40 overflow-y-auto">
                  {todaySessions.map((s) => (
                    <div key={s.id} className="flex items-center gap-2.5 py-1.5 text-[13px]">
                      <Clock className="size-3.5 shrink-0 text-accent" />
                      <span className="flex-1 truncate font-semibold text-fg">{taskTitle(s.taskId) ?? "Focus session"}</span>
                      <span className="text-muted tabular-nums">
                        {fmtTime(s.start)} · {s.minutes}m
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Timer" />
            <div className="px-4 pb-3">
              <TimerSettingsForm collapsible />
              {settings.notifications && notifPermission === "default" && (
                <button
                  type="button"
                  className="mt-1 flex items-center gap-1.5 text-[12px] font-semibold text-accent"
                  onClick={async () => {
                    const r = await requestNotificationPermission();
                    if (r === "denied") updateSettings({ notifications: false });
                    rerender((n) => n + 1);
                  }}
                >
                  <Bell className="size-3.5" /> Notify me when the tab is in the background
                </button>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
