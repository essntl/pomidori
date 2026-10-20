"use client";

import { useMemo, useState } from "react";
import { ChartColumn, Grid3x3, Target } from "lucide-react";
import { useStore } from "@/app/lib/storage";
import { sessionsStore } from "@/app/lib/stores/sessions";
import { tasksStore } from "@/app/lib/stores/tasks";
import { addDays, dayKey, fmtDuration, startOfDay, startOfWeek } from "@/app/lib/date";
import { focusStreak, heatmapWeeks, lastNDays, minutesByDay } from "@/app/lib/stats";
import { Card, CardHeader, EmptyState, PageHeader } from "@/app/components/ui/Card";
import { Segmented } from "@/app/components/ui/Segmented";
import { LinkButton } from "@/app/components/ui/Button";
import { BarChart, Heatmap, StatTile } from "@/app/components/stats/charts";

export default function StatsPage() {
  const sessions = useStore(sessionsStore);
  const { tasks } = useStore(tasksStore);
  const [range, setRange] = useState<"7" | "14" | "30">("14");

  const byDay = useMemo(() => minutesByDay(sessions), [sessions]);
  const today = byDay.get(dayKey()) ?? 0;
  const weekStart = startOfWeek(new Date()).getTime();
  const week = sessions.filter((s) => s.start >= weekStart).reduce((a, s) => a + s.minutes, 0);
  const lastWeekStart = addDays(new Date(weekStart), -7).getTime();
  const lastWeek = sessions.filter((s) => s.start >= lastWeekStart && s.start < weekStart).reduce((a, s) => a + s.minutes, 0);
  const total = sessions.reduce((a, s) => a + s.minutes, 0);
  const streak = focusStreak(byDay);
  const activeDays = byDay.size;
  const bars = useMemo(() => lastNDays(byDay, Number(range)), [byDay, range]);
  const weeks = useMemo(() => heatmapWeeks(byDay, 26), [byDay]);

  const topTasks = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of sessions) if (s.taskId) map.set(s.taskId, (map.get(s.taskId) ?? 0) + s.minutes);
    return [...map.entries()]
      .map(([id, minutes]) => ({ id, minutes, title: tasks.find((t) => t.id === id)?.title ?? "Deleted task" }))
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 6);
  }, [sessions, tasks]);

  const weekDelta = lastWeek ? Math.round(((week - lastWeek) / lastWeek) * 100) : null;
  const todayCount = sessions.filter((s) => s.start >= startOfDay(new Date()).getTime()).length;

  if (sessions.length === 0) {
    return (
      <div>
        <PageHeader title="Stats" subtitle="Your focus over time." />
        <Card>
          <EmptyState
            icon={<ChartColumn />}
            title="No focus sessions yet"
            hint="Finish a focus session and your progress, streaks and heatmap appear here."
            action={
              <LinkButton href="/focus" variant="primary">
                Start focusing
              </LinkButton>
            }
          />
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Stats" subtitle="Your focus over time." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Today" value={fmtDuration(today)} sub={`${todayCount} session${todayCount === 1 ? "" : "s"}`} />
        <StatTile
          label="This week"
          value={fmtDuration(week)}
          sub={weekDelta === null ? "vs. last week: —" : `${weekDelta >= 0 ? "+" : ""}${weekDelta}% vs. last week`}
        />
        <StatTile label="Streak" value={`${streak} day${streak === 1 ? "" : "s"}`} sub={`${activeDays} active days`} />
        <StatTile label="All time" value={fmtDuration(total)} sub={`${sessions.length} sessions`} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader
            title="Focus time"
            icon={<ChartColumn />}
            action={
              <Segmented
                size="sm"
                value={range}
                onChange={setRange}
                options={[
                  { value: "7", label: "7d" },
                  { value: "14", label: "14d" },
                  { value: "30", label: "30d" },
                ]}
              />
            }
          />
          <div className="px-4 pt-6 pb-5">
            <BarChart data={bars} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Top tasks" icon={<Target />} />
          <div className="px-4 pb-4">
            {topTasks.length === 0 ? (
              <p className="text-sm text-muted">Pick a task on the Focus page to see where your time goes.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {topTasks.map((t) => (
                  <li key={t.id}>
                    <div className="mb-1 flex justify-between gap-3 text-sm">
                      <span className="truncate font-semibold text-fg">{t.title}</span>
                      <span className="shrink-0 text-muted tabular-nums">{fmtDuration(t.minutes)}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${(t.minutes / topTasks[0].minutes) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader title="Last 6 months" icon={<Grid3x3 />} />
        <div className="px-4 pb-4">
          <Heatmap weeks={weeks} />
        </div>
      </Card>
    </div>
  );
}
