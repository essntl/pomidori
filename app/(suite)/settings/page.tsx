"use client";

import { useState } from "react";
import { Bell, Database, Download, Monitor, Moon, Palette, RotateCcw, Sun, Timer, Upload, Volume2 } from "lucide-react";
import { useSettings } from "@/app/context/hooks";
import { ACCENTS, updateSettings, type Chime, type ThemePref } from "@/app/lib/stores/settings";
import { exportAll, importAll, pickTextFile, resetAll } from "@/app/lib/backup";
import { notify, playSound, requestNotificationPermission } from "@/app/lib/alerts";
import { cn } from "@/app/lib/cn";
import { Card, CardHeader, PageHeader } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Row, Select } from "@/app/components/ui/Field";
import { Segmented } from "@/app/components/ui/Segmented";
import { Switch } from "@/app/components/ui/Switch";
import { Slider } from "@/app/components/ui/Slider";
import { Modal } from "@/app/components/ui/Modal";
import { TimerSettingsForm } from "@/app/components/timer/TimerSettingsForm";

export default function SettingsPage() {
  const s = useSettings();
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Settings" subtitle="Everything is stored locally in this browser." />
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader title="Appearance" icon={<Palette />} />
          <div className="divide-y divide-line px-4 pb-1.5">
            <Row label="Theme">
              <Segmented<ThemePref>
                value={s.theme}
                onChange={(theme) => {
                  playSound("toggle");
                  updateSettings({ theme });
                }}
                options={[
                  { value: "light", label: <><Sun /> Light</> },
                  { value: "dark", label: <><Moon /> Dark</> },
                  { value: "system", label: <><Monitor /> Auto</> },
                ]}
              />
            </Row>
            <Row label="Accent colour">
              <div className="flex gap-2">
                {ACCENTS.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    aria-label={a.id}
                    aria-pressed={s.accent === a.id}
                    onClick={() => updateSettings({ accent: a.id })}
                    className={cn(
                      "size-7 rounded-full transition-transform hover:scale-110",
                      s.accent === a.id && "scale-110 ring-2 ring-offset-2 ring-offset-[var(--surface-solid)]",
                    )}
                    style={{ background: a.color, ["--tw-ring-color" as string]: a.color }}
                  />
                ))}
              </div>
            </Row>
            <Row label="Show dock" hint="Quick navigation bar at the bottom">
              <Switch label="Show dock" checked={s.showDock} onChange={(v) => updateSettings({ showDock: v })} />
            </Row>
          </div>
        </Card>

        <Card>
          <CardHeader title="Focus timer" icon={<Timer />} />
          <div className="px-4 pb-3.5">
            <TimerSettingsForm />
            <div className="divide-y divide-line border-t border-line">
              <Row label="Countdown in tab title">
                <Switch label="Countdown in tab title" checked={s.titleCountdown} onChange={(v) => updateSettings({ titleCountdown: v })} />
              </Row>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Sounds & notifications" icon={<Volume2 />} />
          <div className="divide-y divide-line px-4 pb-1.5">
            <Row label="Sounds">
              <Switch label="Sounds" checked={s.sounds} onChange={(v) => updateSettings({ sounds: v })} />
            </Row>
            <Row label="Phase chime">
              <div className="flex items-center gap-2">
                <div className="w-32">
<Select value={s.chime} onChange={(e) => updateSettings({ chime: e.target.value as Chime })} className="h-9">
                  <option value="timer">Bell</option>
                  <option value="start">Rise</option>
                  <option value="reset">Soft</option>
                  <option value="toggle">Click</option>
                </Select>
                </div>
                <Button size="sm" variant="secondary" onClick={() => playSound(s.chime, true)}>
                  Test
                </Button>
              </div>
            </Row>
            <Row label="Volume">
              <Slider label="Sound volume" value={s.soundVolume} onChange={(v) => updateSettings({ soundVolume: v })} className="w-40" />
            </Row>
            <Row label="System notifications" hint="When a phase ends while the tab is in the background">
              <Switch
                label="System notifications"
                checked={s.notifications}
                onChange={async (v) => {
                  if (v) {
                    const r = await requestNotificationPermission();
                    if (r === "denied") {
                      notify({ title: "Notifications blocked", body: "Allow them in your browser's site settings.", icon: "🔕", tone: "warning" });
                      return;
                    }
                  }
                  updateSettings({ notifications: v });
                }}
              />
            </Row>
            <Row label="Silence mode" hint="Mute chimes and notifications">
              <Switch label="Silence mode" checked={s.dnd} onChange={(v) => updateSettings({ dnd: v })} />
            </Row>
          </div>
        </Card>

        <Card>
          <CardHeader title="Your data" icon={<Database />} />
          <div className="px-4 pb-4">
            <p className="mb-4 text-sm text-muted">
              Notes, tasks, events, habits, focus history and music queues never leave this browser. Export a backup to move them to another device.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={exportAll}>
                <Download className="size-4" /> Export backup
              </Button>
              <Button
                variant="secondary"
                onClick={async () => {
                  const file = await pickTextFile(".json,application/json");
                  if (!file) return;
                  try {
                    importAll(file.text);
                    notify({ title: "Backup restored", icon: "✅", tone: "success" });
                  } catch (err) {
                    notify({ title: "Import failed", body: (err as Error).message, icon: "⚠️", tone: "danger" });
                  }
                }}
              >
                <Upload className="size-4" /> Import backup
              </Button>
              <Button variant="danger" onClick={() => setConfirmReset(true)}>
                <RotateCcw className="size-4" /> Reset everything
              </Button>
            </div>
          </div>
        </Card>

        <p className="flex items-center justify-center gap-1.5 pt-2 text-xs text-muted">
          <Bell className="size-3.5" /> Pomidori · made by essential · open source under GPL-3.0
        </p>
      </div>

      <Modal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Reset everything?"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmReset(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                resetAll();
                setConfirmReset(false);
                notify({ title: "All data cleared", icon: "🧹", tone: "info" });
              }}
            >
              Delete all data
            </Button>
          </>
        }
      >
        <p className="text-sm text-fg-2">This permanently removes every note, task, event, habit, focus session and playlist stored in this browser. Export a backup first if you might need it.</p>
      </Modal>
    </div>
  );
}
