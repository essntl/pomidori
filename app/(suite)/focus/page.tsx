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
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="flex flex-col items-center px-4 py-8 sm:py-10">
          <TimerDial />
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {[1, 5, 10].map((m) => (
              <Button key={m} size="sm" variant="secondary" onClick={() => t.addMinutes(m)}>
                +{m} min
              </Button>
            ))}
          </div>
          <div className="mt-6 hidden flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted sm:flex">
            <span><Kbd>Space</Kbd> start / pause</span>
            <span><Kbd>R</Kbd> reset</span>
            <span><Kbd>S</Kbd> skip</span>
            <span><Kbd>+</Kbd> add a minute</span>
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader title="Focusing on" icon={<Target />} />
            <div className="px-5 pb-5">
              <Select
                value={t.taskId ?? ""}
                onChange={(e) => t.setTask(e.target.value || null)}
                aria-label="Task to focus on"
              >
                <option value="">Nothing in particular</option>
                {current?.done && <option value={current.id}>{current.title} (done)</option>}
                {openTasks.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.title}
                  </option>
                ))}
              </Select>
              {openTasks.length === 0 && (
                <p className="mt-2 text-xs text-muted">
                  Add tasks in <Link href="/tasks" className="font-semibold text-accent">Tasks</Link> to track focus time per task.
                </p>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Today" icon={<Flame />} action={<span className="text-sm font-bold text-fg tabular-nums">{fmtDuration(todayMinutes)}</span>} />
            <div className="max-h-56 overflow-y-auto px-3 pb-3">
              {todaySessions.length === 0 ? (
                <p className="px-2 pb-2 text-sm text-muted">No sessions yet today. Your first one is a click away.</p>
              ) : (
                todaySessions.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 rounded-xl px-2 py-2 text-sm">
                    <span className="grid size-8 place-items-center rounded-full bg-accent-soft text-accent">
                      <Clock className="size-4" />
                    </span>
                    <span className="flex-1 truncate font-semibold text-fg">{taskTitle(s.taskId) ?? "Focus session"}</span>
                    <span className="text-muted tabular-nums">
                      {fmtTime(s.start)} · {s.minutes}m
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Timer" />
            <div className="px-5 pb-4">
              <TimerSettingsForm />
              {settings.notifications && notifPermission === "default" && (
                <Button
                  variant="soft"
                  size="sm"
                  className="mt-2 w-full"
                  onClick={async () => {
                    const r = await requestNotificationPermission();
                    if (r === "denied") updateSettings({ notifications: false });
                    rerender((n) => n + 1);
                  }}
                >
                  <Bell className="size-4" /> Notify me when the tab is in the background
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
