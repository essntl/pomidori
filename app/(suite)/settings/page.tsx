"use client";

import { useState } from "react";
import { Bell, Circle, Database, Disc3, Download, Monitor, Moon, Music, Palette, RotateCcw, Square, Sun, Timer, Upload, Volume2 } from "lucide-react";
import { usePlayer, useSettings } from "@/app/context/hooks";
import { NowPlayingArt } from "@/app/components/music/NowPlayingArt";
import { ACCENTS, updateMusicSettings, updateSettings, type ArtworkStyle, type Chime, type ThemePref } from "@/app/lib/stores/settings";
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
import { SyncCard } from "@/app/components/settings/SyncCard";
import { syncStatus } from "@/app/lib/sync/engine";
import { useStore } from "@/app/lib/storage";

export default function SettingsPage() {
  const s = useSettings();
  const p = usePlayer();
  const [confirmReset, setConfirmReset] = useState(false);
  const synced = useStore(syncStatus).connected;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Settings" subtitle={synced ? "Stored in this browser and synced, end-to-end encrypted." : "Everything is stored locally in this browser."} />
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
          <CardHeader title="Music player" icon={<Music />} />
          <div className="px-4 pb-1.5">
            {/* Phones: preview and text side by side, the style switch full width underneath. */}
            <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-3 py-2.5">
              <NowPlayingArt track={p.track} playing={p.playing || s.music.artworkStyle === "vinyl"} variant={s.music.artworkStyle} className="w-16 shrink-0 sm:row-span-2 sm:w-20" />
              <div className="min-w-0">
                <div className="text-[14px] font-semibold text-fg">Artwork style</div>
                <p className="mt-0.5 text-[12px] text-muted">Vinyl spins while music plays, in the player and the Dynamic Island.</p>
              </div>
              <Segmented<ArtworkStyle>
                value={s.music.artworkStyle}
                onChange={(artworkStyle) => updateMusicSettings({ artworkStyle })}
                className="col-span-2 w-full sm:col-span-1 sm:col-start-2 sm:w-auto sm:justify-self-start"
                options={[
                  { value: "square", label: <><Square /> Square</> },
                  { value: "round", label: <><Circle /> Round</> },
                  { value: "vinyl", label: <><Disc3 /> Vinyl</> },
                ]}
              />
            </div>
            <div className="divide-y divide-line border-t border-line">
              <Row label="Blurred artwork background" hint="Soft glow of the cover behind the player">
                <Switch label="Blurred artwork background" checked={s.music.blurBackdrop} onChange={(blurBackdrop) => updateMusicSettings({ blurBackdrop })} />
              </Row>
              <Row label="Song alerts" hint="Show each new song in the Dynamic Island">
                <Switch label="Song alerts" checked={s.music.trackAlerts} onChange={(trackAlerts) => updateMusicSettings({ trackAlerts })} />
              </Row>
              <Row label="Animated equalizer" hint="Moving bars while music plays">
                <Switch label="Animated equalizer" checked={s.music.equalizer} onChange={(equalizer) => updateMusicSettings({ equalizer })} />
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

        <SyncCard />

        <Card>
          <CardHeader title="Your data" icon={<Database />} />
          <div className="px-4 pb-4">
            <p className="mb-4 text-sm text-muted">
              {synced
                ? "Export a backup to keep a copy you control, or to move to a server without sync."
                : "Notes, tasks, events, habits, focus history and music queues never leave this browser unless you turn on sync. Export a backup to move them to another device."}
            </p>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              <Button variant="secondary" onClick={exportAll} className="w-full sm:w-auto">
                <Download className="size-4" /> Export backup
              </Button>
              <Button
                variant="secondary"
                className="w-full sm:w-auto"
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
              <Button variant="danger" onClick={() => setConfirmReset(true)} className="col-span-2 w-full sm:w-auto">
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
        <p className="text-sm text-fg-2">This permanently removes every note, task, event, habit, focus session and playlist stored in this browser. Export a backup first if you might need it.{synced && " Sync is turned off on this device first, so your other devices keep their data."}</p>
      </Modal>
    </div>
  );
}
