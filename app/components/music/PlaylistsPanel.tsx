"use client";

import { useState } from "react";
import { AnimatePresence, Reorder, motion, useDragControls } from "framer-motion";
import {
  ChevronLeft,
  GripVertical,
  ListMusic,
  ListPlus,
  Loader2,
  MoreHorizontal,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Save,
  Shuffle,
  Trash2,
  X,
} from "lucide-react";
import { player, type SavedPlaylist } from "@/app/lib/player/controller";
import { SOURCE_LABEL, artworkSrc } from "@/app/lib/player/detect";
import type { Track } from "@/app/lib/player/types";
import { cn } from "@/app/lib/cn";
import { spring } from "@/app/lib/motion";
import { Button, IconButton } from "../ui/Button";
import { EmptyState } from "../ui/Card";
import { Menu } from "../ui/Menu";
import { Modal } from "../ui/Modal";
import { Artwork } from "./Artwork";

/** 2×2 artwork collage from the first tracks (single cover when there are fewer than four). */
export function Mosaic({ tracks, className }: { tracks: Track[]; className?: string }) {
  const covers = [...new Map(tracks.filter((t) => t.artwork).map((t) => [artworkSrc(t.artwork), t])).values()].slice(0, 4);
  if (covers.length < 4) {
    return <Artwork track={covers[0] ?? tracks[0] ?? null} className={cn("rounded-xl", className)} />;
  }
  return (
    <div className={cn("grid shrink-0 grid-cols-2 overflow-hidden rounded-xl bg-surface-3", className)}>
      {covers.map((t) => (
        <Artwork key={t.id} track={t} className="size-full" />
      ))}
    </div>
  );
}

function trackCount(n: number) {
  return `${n} track${n === 1 ? "" : "s"}`;
}

function PlaylistMenu({
  pl,
  queueLength,
  onRename,
  onDelete,
  trigger,
}: {
  pl: SavedPlaylist;
  queueLength: number;
  onRename: () => void;
  onDelete: () => void;
  trigger?: "icon" | "button";
}) {
  return (
    <Menu
      trigger={(t) =>
        trigger === "button" ? (
          <IconButton label="Playlist options" variant="secondary" {...t}>
            <MoreHorizontal />
          </IconButton>
        ) : (
          <IconButton size="sm" label="Playlist options" {...t}>
            <MoreHorizontal />
          </IconButton>
        )
      }
      items={[
        { label: "Shuffle play", icon: <Shuffle />, onSelect: () => player.loadPlaylist(pl.id, { shuffle: true }) },
        { label: "Add to queue", icon: <ListPlus />, onSelect: () => player.appendPlaylist(pl.id) },
        ...(queueLength ? [{ label: "Replace with current queue", icon: <RefreshCw />, onSelect: () => player.replacePlaylistWithQueue(pl.id) }] : []),
        { label: "Rename", icon: <Pencil />, onSelect: onRename },
        "separator",
        { label: "Delete playlist", icon: <Trash2 />, danger: true, onSelect: onDelete },
      ]}
    />
  );
}

function PlaylistTrack({ pl, track, index }: { pl: SavedPlaylist; track: Track; index: number }) {
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
      <div className="group flex items-center gap-3 rounded-2xl px-2 py-1.5 transition-colors hover:bg-surface-2">
        <span
          onPointerDown={(e) => controls.start(e)}
          className="grid h-9 w-4 shrink-0 cursor-grab touch-none place-items-center text-muted opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing max-md:opacity-50"
        >
          <GripVertical className="size-4" />
        </span>
        <button
          type="button"
          onClick={() => player.loadPlaylist(pl.id, { startAt: index })}
          className="relative shrink-0"
          aria-label={`Play ${track.title}`}
        >
          <Artwork track={track} className="size-10 rounded-lg" />
          <span className="absolute inset-0 grid place-items-center rounded-lg bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100">
            <Play className="size-4" fill="currentColor" />
          </span>
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-semibold text-fg">{track.title}</div>
          <div className="truncate text-[12px] text-muted">
            {SOURCE_LABEL[track.source]}
            {track.artist && ` · ${track.artist}`}
          </div>
        </div>
        <IconButton
          size="sm"
          label="Remove from playlist"
          onClick={() => player.removeFromPlaylist(pl.id, track.id)}
          className="opacity-0 group-hover:opacity-100 max-md:opacity-100"
        >
          <X />
        </IconButton>
      </div>
    </Reorder.Item>
  );
}

function PlaylistDetail({
  pl,
  queueLength,
  adding,
  onBack,
  onRename,
  onDelete,
}: {
  pl: SavedPlaylist;
  queueLength: number;
  adding: boolean;
  onBack: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setError(null);
    try {
      await player.addUrlToPlaylist(pl.id, url);
      setUrl("");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <motion.div key={pl.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={spring.smooth}>
      <button type="button" onClick={onBack} className="mb-3 flex items-center gap-1 rounded-lg px-1 text-[13px] font-semibold text-muted hover:text-fg">
        <ChevronLeft className="size-4" /> All playlists
      </button>
      <div className="mb-4 flex items-center gap-4 px-1">
        <Mosaic tracks={pl.tracks} className="size-20 sm:size-24" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-xl font-extrabold tracking-tight text-fg">{pl.name}</h3>
          <p className="text-[13px] text-muted">{trackCount(pl.tracks.length)}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Button size="sm" variant="primary" disabled={!pl.tracks.length} onClick={() => player.loadPlaylist(pl.id)}>
              <Play className="size-3.5" fill="currentColor" /> Play
            </Button>
            <Button size="sm" variant="secondary" disabled={!pl.tracks.length} onClick={() => player.loadPlaylist(pl.id, { shuffle: true })}>
              <Shuffle className="size-3.5" /> Shuffle
            </Button>
            <PlaylistMenu pl={pl} queueLength={queueLength} onRename={onRename} onDelete={onDelete} />
          </div>
        </div>
      </div>

      <form onSubmit={add} className="mb-2">
        <div className="flex items-center gap-2 rounded-xl border border-line bg-surface-2 py-1 pr-1 pl-3 focus-within:border-accent/50 focus-within:ring-4 focus-within:ring-accent/10">
          <Plus className="size-4 shrink-0 text-muted" />
          <input
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setError(null);
            }}
            placeholder={`Add a link to ${pl.name}`}
            className="h-8 min-w-0 flex-1 bg-transparent text-[14px] text-fg outline-none placeholder:text-muted"
            aria-label="Link to add to playlist"
            inputMode="url"
          />
          <Button type="submit" size="sm" variant="soft" disabled={!url.trim() || adding}>
            {adding ? <Loader2 className="size-4 animate-spin" /> : "Add"}
          </Button>
        </div>
        {error && <p className="px-2 pt-1.5 text-[13px] font-semibold text-danger">{error}</p>}
      </form>

      {pl.tracks.length === 0 ? (
        <EmptyState icon={<ListMusic />} title="Empty playlist" hint="Paste links above, or use “Add to playlist” on any track in the queue." />
      ) : (
        <Reorder.Group axis="y" values={pl.tracks.map((t) => t.id)} onReorder={(ids) => player.reorderPlaylist(pl.id, ids)} className="flex flex-col">
          <AnimatePresence initial={false}>
            {pl.tracks.map((t, i) => (
              <PlaylistTrack key={t.id} pl={pl} track={t} index={i} />
            ))}
          </AnimatePresence>
        </Reorder.Group>
      )}
    </motion.div>
  );
}

export function PlaylistsPanel({
  playlists,
  queueLength,
  adding,
  onRequestName,
}: {
  playlists: SavedPlaylist[];
  queueLength: number;
  adding: boolean;
  /** Ask the page for a name (new, save-queue or rename). */
  onRequestName: (req: { mode: "new" | "save" | "rename"; id?: string; initial?: string }) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<SavedPlaylist | null>(null);
  const open = playlists.find((p) => p.id === openId) ?? null;

  const deleteDialog = (
    <Modal
      open={!!confirm}
      onClose={() => setConfirm(null)}
      title="Delete playlist?"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={() => setConfirm(null)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              if (!confirm) return;
              player.deletePlaylist(confirm.id);
              if (openId === confirm.id) setOpenId(null);
              setConfirm(null);
            }}
          >
            Delete
          </Button>
        </>
      }
    >
      <p className="text-sm text-fg-2">“{confirm?.name}” will be removed. The songs stay in your queue if they’re there.</p>
    </Modal>
  );

  if (open) {
    return (
      <>
        <PlaylistDetail
          pl={open}
          queueLength={queueLength}
          adding={adding}
          onBack={() => setOpenId(null)}
          onRename={() => onRequestName({ mode: "rename", id: open.id, initial: open.name })}
          onDelete={() => setConfirm(open)}
        />
        {deleteDialog}
      </>
    );
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1.5 px-1">
        <Button size="sm" variant="soft" onClick={() => onRequestName({ mode: "new" })}>
          <Plus className="size-3.5" /> New playlist
        </Button>
        {queueLength > 0 && (
          <Button size="sm" variant="secondary" onClick={() => onRequestName({ mode: "save" })}>
            <Save className="size-3.5" /> Save queue as playlist
          </Button>
        )}
      </div>
      {playlists.length === 0 ? (
        <EmptyState icon={<ListMusic />} title="No playlists yet" hint="Save your queue, or create a playlist and paste links into it." />
      ) : (
        <motion.ul layout className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {playlists.map((pl) => (
            <motion.li layout key={pl.id} transition={spring.smooth}>
              <div className="group flex items-center gap-3 rounded-2xl p-2 transition-colors hover:bg-surface-2">
                <button type="button" onClick={() => setOpenId(pl.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <Mosaic tracks={pl.tracks} className="size-14" />
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-bold text-fg">{pl.name}</span>
                    <span className="block text-[12px] text-muted">{trackCount(pl.tracks.length)}</span>
                  </span>
                </button>
                <IconButton
                  label={`Play ${pl.name}`}
                  variant="primary"
                  className="rounded-full opacity-0 transition-opacity group-hover:opacity-100 max-md:opacity-100"
                  disabled={!pl.tracks.length}
                  onClick={() => player.loadPlaylist(pl.id)}
                >
                  <Play fill="currentColor" />
                </IconButton>
                <PlaylistMenu
                  pl={pl}
                  queueLength={queueLength}
                  onRename={() => onRequestName({ mode: "rename", id: pl.id, initial: pl.name })}
                  onDelete={() => setConfirm(pl)}
                />
              </div>
            </motion.li>
          ))}
        </motion.ul>
      )}
      {deleteDialog}
    </div>
  );
}
