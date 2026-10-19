"use client";

import { useState } from "react";
import { AnimatePresence, Reorder, motion, useDragControls } from "framer-motion";
import {
  GripVertical,
  ListMusic,
  Loader2,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  Repeat,
  Repeat1,
  Save,
  Shuffle,
  SkipBack,
  SkipForward,
  Trash2,
  Volume1,
  Volume2,
  VolumeX,
  Waves,
  X,
} from "lucide-react";
import { useAmbient, usePlayer } from "@/app/context/hooks";
import { useHydrated } from "@/app/lib/storage";
import { player } from "@/app/lib/player/controller";
import { SOURCE_LABEL } from "@/app/lib/player/detect";
import { AMBIENT_KINDS, ambientActions } from "@/app/lib/player/ambient";
import type { Track } from "@/app/lib/player/types";
import { cn } from "@/app/lib/cn";
import { spring } from "@/app/lib/motion";
import { Card, CardHeader, EmptyState, PageHeader } from "@/app/components/ui/Card";
import { Button, IconButton } from "@/app/components/ui/Button";
import { Input } from "@/app/components/ui/Field";
import { Slider } from "@/app/components/ui/Slider";
import { Menu } from "@/app/components/ui/Menu";
import { Modal } from "@/app/components/ui/Modal";
import { Switch } from "@/app/components/ui/Switch";
import { Artwork, fmtSeconds } from "@/app/components/music/Artwork";
import { Equalizer } from "@/app/components/ui/Rolling";

const SOURCE_DOT: Record<Track["source"], string> = {
  youtube: "#ef4444",
  soundcloud: "#f97316",
  audio: "#3b82f6",
};

function QueueItem({ track, index, current, playing }: { track: Track; index: number; current: boolean; playing: boolean }) {
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={track.id}
      dragListener={false}
      dragControls={controls}
      layout="position"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -12, transition: { duration: 0.15 } }}
      transition={spring.smooth}
      whileDrag={{ scale: 1.02, boxShadow: "var(--shadow-pop)", background: "var(--surface-solid)", borderRadius: 16 }}
      className="list-none"
    >
      <div
        onDoubleClick={() => player.playIndex(index)}
        className={cn("group flex items-center gap-3 rounded-2xl px-2 py-2 transition-colors", current ? "bg-accent-soft" : "hover:bg-surface-2")}
      >
        <span
          onPointerDown={(e) => controls.start(e)}
          className="grid h-10 w-4 shrink-0 cursor-grab touch-none place-items-center text-muted opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing max-md:opacity-50"
        >
          <GripVertical className="size-4" />
        </span>
        <button type="button" onClick={() => (current ? player.toggle() : player.playIndex(index))} className="relative shrink-0" aria-label={current && playing ? "Pause" : `Play ${track.title}`}>
          <Artwork track={track} className="size-11 rounded-xl" />
          <span className={cn("absolute inset-0 grid place-items-center rounded-xl bg-black/45 text-white transition-opacity", current ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
            {current && playing ? <Equalizer playing className="text-white" /> : <Play className="size-4" fill="currentColor" />}
          </span>
        </button>
        <div className="min-w-0 flex-1">
          <div className={cn("truncate text-[14px] font-bold", current ? "text-accent" : "text-fg")}>{track.title}</div>
          <div className="flex items-center gap-1.5 truncate text-[12px] text-muted">
            <span className="size-1.5 shrink-0 rounded-full" style={{ background: SOURCE_DOT[track.source] }} />
            {SOURCE_LABEL[track.source]}
            {track.artist && <span className="truncate">· {track.artist}</span>}
          </div>
        </div>
        <IconButton size="sm" label="Remove from queue" onClick={() => player.remove(track.id)} className="opacity-0 group-hover:opacity-100 max-md:opacity-100">
          <X />
        </IconButton>
      </div>
    </Reorder.Item>
  );
}

export default function MusicPage() {
  const hydrated = useHydrated();
  const p = usePlayer();
  const ambient = useAmbient();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [plName, setPlName] = useState("");

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setError(null);
    try {
      await player.add(url);
      setUrl("");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const VolumeIcon = p.volume === 0 ? VolumeX : p.volume < 0.5 ? Volume1 : Volume2;
  const RepeatIcon = p.repeat === "one" ? Repeat1 : Repeat;

  return (
    <div>
      <PageHeader title="Music" subtitle="Queue YouTube, SoundCloud or any stream, and play it from anywhere in the app." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[400px_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          {/* Now playing */}
          <Card className="relative overflow-hidden p-5">
            {p.track?.artwork && <Artwork track={p.track} fill className="scale-125 opacity-25 blur-3xl" />}
            <div className="relative">
              <motion.div
                key={p.track?.id ?? "none"}
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: p.playing ? 1 : 0.94 }}
                transition={spring.smooth}
                className="mx-auto aspect-square w-full max-w-[300px] overflow-hidden rounded-[1.5rem] shadow-pop"
              >
                <Artwork track={p.track} className="size-full" />
              </motion.div>
              <div className="mt-5 min-h-[52px] text-center">
                <div className="line-clamp-2 text-lg leading-snug font-extrabold text-fg">{p.track?.title ?? "Nothing playing"}</div>
                <div className="truncate text-sm text-muted">{p.track ? p.track.artist || SOURCE_LABEL[p.track.source] : "Paste a link below to start"}</div>
              </div>

              <div className="mt-4">
                {p.track?.live ? (
                  <div className="flex justify-center">
                    <span className="flex items-center gap-1.5 rounded-full bg-danger/15 px-2.5 py-0.5 text-[11px] font-extrabold tracking-wider text-danger">
                      <span className="size-1.5 animate-pulse rounded-full bg-danger" /> LIVE
                    </span>
                  </div>
                ) : (
                  <>
                    <Slider label="Seek" value={p.position} max={Math.max(1, p.duration)} step={1} onChange={player.seek} disabled={!p.duration} />
                    <div className="mt-1 flex justify-between text-[11px] font-semibold text-muted tabular-nums">
                      <span>{fmtSeconds(p.position)}</span>
                      <span>{fmtSeconds(p.duration)}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="mt-3 flex items-center justify-between">
                <IconButton label="Shuffle" onClick={player.toggleShuffle} className={cn(p.shuffle && "text-accent")}>
                  <Shuffle />
                </IconButton>
                <IconButton label="Previous" size="lg" onClick={player.prev} disabled={!p.queue.length}>
                  <SkipBack fill="currentColor" />
                </IconButton>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.9 }}
                  transition={spring.snappy}
                  onClick={player.toggle}
                  disabled={!p.queue.length}
                  aria-label={p.playing ? "Pause" : "Play"}
                  className="grid size-16 place-items-center rounded-full bg-accent text-white shadow-[0_12px_30px_-10px_var(--accent)] disabled:opacity-40"
                >
                  {p.status === "buffering" ? (
                    <Loader2 className="size-6 animate-spin" />
                  ) : p.playing ? (
                    <Pause className="size-7" fill="currentColor" />
                  ) : (
                    <Play className="size-7 translate-x-0.5" fill="currentColor" />
                  )}
                </motion.button>
                <IconButton label="Next" size="lg" onClick={player.next} disabled={!p.queue.length}>
                  <SkipForward fill="currentColor" />
                </IconButton>
                <IconButton label={`Repeat: ${p.repeat}`} onClick={player.cycleRepeat} className={cn(p.repeat !== "off" && "text-accent")}>
                  <RepeatIcon />
                </IconButton>
              </div>

              <div className="mt-3 flex items-center gap-3 text-muted">
                <button type="button" aria-label={p.volume ? "Mute" : "Unmute"} onClick={() => player.setVolume(p.volume ? 0 : 0.7)}>
                  <VolumeIcon className="size-4" />
                </button>
                <Slider label="Volume" value={p.volume} onChange={player.setVolume} className="flex-1" />
              </div>
              {p.error && <p className="mt-3 rounded-xl bg-danger/10 px-3 py-2 text-[13px] font-semibold text-danger">{p.error}</p>}
            </div>
          </Card>

          {/* Ambient */}
          <Card>
            <CardHeader title="Ambient sound" icon={<Waves />} action={<Switch label="Ambient sound" checked={ambient.enabled} onChange={ambientActions.toggle} />} />
            <div className="px-5 pb-5">
              <div className="grid grid-cols-5 gap-2">
                {AMBIENT_KINDS.map((k) => (
                  <button
                    key={k.id}
                    type="button"
                    onClick={() => ambientActions.setKind(k.id)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-2xl py-2.5 text-[12px] font-bold transition-colors",
                      ambient.enabled && ambient.kind === k.id ? "bg-accent-soft text-accent ring-1 ring-accent/40" : "bg-surface-2 text-fg-2 hover:bg-surface-3",
                    )}
                  >
                    <span className="text-xl">{k.emoji}</span>
                    {k.label}
                  </button>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-3 text-muted">
                <Waves className="size-4" />
                <Slider label="Ambient volume" value={ambient.volume} onChange={ambientActions.setVolume} className="flex-1" />
              </div>
              <p className="mt-3 text-xs text-muted">Generated live in your browser. Layers under music.</p>
            </div>
          </Card>
        </div>

        {/* Queue */}
        <Card className="min-w-0 p-3 sm:p-4">
          <form onSubmit={add} className="mb-1">
            <div className="flex items-center gap-2 rounded-2xl border border-line bg-surface-2 py-1.5 pr-1.5 pl-4 focus-within:border-accent/50 focus-within:ring-4 focus-within:ring-accent/10">
              <Plus className="size-5 shrink-0 text-muted" />
              <input
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setError(null);
                }}
                placeholder="Paste a YouTube video/playlist, SoundCloud or audio URL"
                className="h-9 min-w-0 flex-1 bg-transparent text-[15px] text-fg outline-none placeholder:text-muted"
                aria-label="Music link"
                inputMode="url"
              />
              <Button type="submit" variant="primary" size="sm" disabled={!url.trim() || p.adding}>
                {p.adding ? <Loader2 className="size-4 animate-spin" /> : "Add"}
              </Button>
            </div>
            <AnimatePresence>
              {error && (
                <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden px-3 pt-2 text-[13px] font-semibold text-danger">
                  {error}
                </motion.p>
              )}
            </AnimatePresence>
          </form>

          <div className="mt-3 mb-2 flex items-center justify-between px-1">
            <h2 className="flex items-center gap-2 text-lg font-extrabold text-fg">
              Queue <span className="text-sm font-bold text-muted">{p.queue.length}</span>
            </h2>
            <div className="flex items-center gap-1">
              {p.playlists.length > 0 && (
                <Menu
                  trigger={(t) => (
                    <Button size="sm" variant="ghost" {...t}>
                      <ListMusic className="size-4" /> Playlists
                    </Button>
                  )}
                  items={p.playlists.flatMap((pl) => [
                    { label: `${pl.name} (${pl.tracks.length})`, icon: <Play />, onSelect: () => player.loadPlaylist(pl.id) },
                    { label: `Delete “${pl.name}”`, icon: <Trash2 />, danger: true, onSelect: () => player.deletePlaylist(pl.id) },
                  ])}
                />
              )}
              <Menu
                trigger={(t) => (
                  <IconButton size="sm" label="Queue options" {...t}>
                    <MoreHorizontal />
                  </IconButton>
                )}
                items={[
                  { label: "Save queue as playlist", icon: <Save />, onSelect: () => setSaveOpen(true) },
                  { label: "Clear queue", icon: <Trash2 />, danger: true, onSelect: player.clear },
                ]}
              />
            </div>
          </div>

          {!hydrated ? null : p.queue.length === 0 ? (
            <EmptyState
              icon={<ListMusic />}
              title="Your queue is empty"
              hint="YouTube videos and playlists, SoundCloud tracks and sets, and direct audio or radio stream links all work."
            />
          ) : (
            <Reorder.Group axis="y" values={p.queue.map((t) => t.id)} onReorder={player.reorder} className="flex flex-col">
              <AnimatePresence initial={false}>
                {p.queue.map((t, i) => (
                  <QueueItem key={t.id} track={t} index={i} current={i === p.index && p.loaded} playing={p.playing} />
                ))}
              </AnimatePresence>
            </Reorder.Group>
          )}
        </Card>
      </div>

      <Modal
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        title="Save playlist"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setSaveOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="pl-form" disabled={!plName.trim()}>
              Save
            </Button>
          </>
        }
      >
        <form
          id="pl-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (!plName.trim()) return;
            player.savePlaylist(plName.trim());
            setPlName("");
            setSaveOpen(false);
          }}
        >
          <Input data-autofocus value={plName} onChange={(e) => setPlName(e.target.value)} placeholder="e.g. Deep focus, Lo-fi mornings" />
        </form>
      </Modal>
    </div>
  );
}
