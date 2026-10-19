"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion, useDragControls, type Variants } from "framer-motion";
import {
  BellOff,
  Coffee,
  Moon,
  Music,
  Pause,
  Play,
  Plus,
  Settings,
  SkipBack,
  SkipForward,
  Sun,
  Timer,
  Volume2,
  Waves,
  Zap,
} from "lucide-react";
import { ui, useAmbient, useIsDark, usePlayer, useSettings, useUI } from "@/app/context/hooks";
import { useTimer, PHASE_META } from "@/app/context/TimerContext";
import { player } from "@/app/lib/player/controller";
import { AMBIENT_KINDS, ambientActions } from "@/app/lib/player/ambient";
import { updateSettings } from "@/app/lib/stores/settings";
import { playSound } from "@/app/lib/alerts";
import { NAV } from "@/app/lib/nav";
import { fmtClock } from "@/app/lib/date";
import { ease, spring } from "@/app/lib/motion";
import { cn } from "@/app/lib/cn";
import { useOverlayBehavior, Portal } from "../ui/Modal";
import { Slider } from "../ui/Slider";
import { Artwork } from "../music/Artwork";
import { Equalizer } from "../ui/Rolling";
import { SOURCE_LABEL } from "@/app/lib/player/detect";

const container: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.022, delayChildren: 0.02 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: -14, scale: 0.96 },
  visible: { opacity: 1, y: 0, scale: 1, transition: spring.smooth },
};

function Tile({
  active,
  onClick,
  icon,
  label,
  sub,
  wide,
}: {
  active?: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  sub?: string;
  wide?: boolean;
}) {
  if (wide) {
    return (
      <motion.button
        variants={item}
        type="button"
        whileTap={{ scale: 0.95 }}
        onClick={onClick}
        aria-pressed={active}
        className={cn(
          "col-span-2 flex h-[68px] items-center gap-3 rounded-tile px-3 text-left transition-colors duration-200",
          active ? "bg-accent text-white" : "bg-white/10 text-white hover:bg-white/15",
        )}
      >
        <span className={cn("grid size-10 shrink-0 place-items-center rounded-full [&_svg]:size-5", active ? "bg-white/25" : "bg-white/10")}>
          {icon}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[14px] font-bold">{label}</span>
          {sub && <span className={cn("block truncate text-[12px]", active ? "text-white/80" : "text-white/50")}>{sub}</span>}
        </span>
      </motion.button>
    );
  }
  return (
    <motion.div variants={item} className="flex flex-col items-center gap-1.5">
      <motion.button
        type="button"
        whileTap={{ scale: 0.88 }}
        onClick={onClick}
        aria-pressed={active}
        aria-label={label}
        className={cn(
          "grid aspect-square w-full max-w-[64px] place-items-center rounded-full transition-colors duration-200 [&_svg]:size-[22px]",
          active ? "bg-accent text-white" : "bg-white/10 text-white hover:bg-white/15",
        )}
      >
        {icon}
      </motion.button>
      <span className="max-w-full truncate text-[11px] font-semibold text-white/70">{label}</span>
    </motion.div>
  );
}

function Clock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = setInterval(tick, 10_000);
    return () => clearInterval(id);
  }, []);
  if (!now) return <div className="h-[52px]" />;
  return (
    <div>
      <div className="text-[40px] leading-none font-light tracking-tight text-white tabular-nums">
        {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </div>
      <div className="mt-1 text-[13px] font-semibold text-white/60">
        {now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
      </div>
    </div>
  );
}

/** HyperOS-style control centre: media, volume sliders, toggles and app tiles. */
export default function ControlCenter() {
  const { controlCenter: open } = useUI();
  const panel = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  useOverlayBehavior(open, ui.closeControlCenter, panel);

  const p = usePlayer();
  const ambient = useAmbient();
  const settings = useSettings();
  const timer = useTimer();
  const isDark = useIsDark();
  const router = useRouter();
  const drag = useDragControls();

  const toggleTheme = () => {
    playSound("toggle");
    updateSettings({ theme: isDark ? "light" : "dark" });
  };

  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[65]">
            <motion.div
              className="absolute inset-0 bg-black/45 backdrop-blur-xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
              transition={{ duration: 0.25, ease: ease.out }}
              onClick={ui.closeControlCenter}
            />
            <motion.div
              ref={panel}
              role="dialog"
              aria-modal="true"
              aria-label="Control centre"
              tabIndex={-1}
              drag="y"
              dragControls={drag}
              dragListener={false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0.6, bottom: 0.08 }}
              onDragEnd={(_, info) => {
                if (info.offset.y < -70 || info.velocity.y < -500) ui.closeControlCenter();
              }}
              initial={{ y: "-24%", opacity: 0, scale: 0.97 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: "-18%", opacity: 0, scale: 0.97, transition: { duration: 0.2, ease: ease.out } }}
              transition={spring.smooth}
              style={{ transformOrigin: "top right" }}
              className="absolute top-0 right-0 max-h-dvh w-full overflow-y-auto px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-8 outline-none sm:w-[440px] sm:pr-5"
            >
              <motion.div variants={container} initial="hidden" animate="visible" className="flex flex-col gap-3">
                <motion.div variants={item} onPointerDown={(e) => drag.start(e)} className="flex touch-none items-end justify-between px-1 pt-1 pb-2">
                  <Clock />
                  <Link
                    href="/settings"
                    onClick={ui.closeControlCenter}
                    aria-label="Settings"
                    className="grid size-10 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                  >
                    <Settings className="size-5" />
                  </Link>
                </motion.div>

                {/* Media + sliders */}
                <div className="grid grid-cols-4 gap-3">
                  <motion.div variants={item} className="relative col-span-2 aspect-square overflow-hidden rounded-tile bg-white/10 text-white">
                    {/* Artwork fills the card; gradients keep text and controls legible. */}
                    {p.track && <Artwork track={p.track} fill />}
                    {p.track && <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/10 to-black/80" />}
                    <div className="relative flex h-full flex-col justify-between p-3.5">
                      <div className="min-w-0">
                        {p.track && (
                          <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-white/60 uppercase">
                            {p.playing && <Equalizer playing className="h-2.5 text-white/80" />}
                            {SOURCE_LABEL[p.track.source]}
                          </div>
                        )}
                        <div className="line-clamp-2 text-[14px] leading-tight font-bold drop-shadow">{p.track?.title ?? "Nothing queued"}</div>
                        <div className="truncate text-[12px] text-white/70">{p.track ? p.track.artist || "—" : "Add a YouTube or SoundCloud link"}</div>
                      </div>
                      {p.track ? (
                        <div className="flex flex-col gap-2">
                          {p.track.live ? (
                            <span className="flex items-center gap-1.5 self-start rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-extrabold tracking-wider">
                              <span className="size-1.5 animate-pulse rounded-full bg-danger" /> LIVE
                            </span>
                          ) : (
                            <div className="h-1 overflow-hidden rounded-full bg-white/20">
                              <div className="h-full rounded-full bg-white transition-[width] duration-500 ease-linear" style={{ width: `${p.duration ? Math.min(100, (p.position / p.duration) * 100) : 0}%` }} />
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <motion.button whileTap={{ scale: 0.85 }} onClick={player.prev} aria-label="Previous" className="grid size-9 place-items-center rounded-full hover:bg-white/10">
                              <SkipBack className="size-5" fill="currentColor" />
                            </motion.button>
                            <motion.button whileTap={{ scale: 0.85 }} onClick={player.toggle} aria-label={p.playing ? "Pause" : "Play"} className="grid size-11 place-items-center rounded-full bg-white text-black">
                              {p.playing ? <Pause className="size-5" fill="currentColor" /> : <Play className="size-5 translate-x-px" fill="currentColor" />}
                            </motion.button>
                            <motion.button whileTap={{ scale: 0.85 }} onClick={player.next} aria-label="Next" className="grid size-9 place-items-center rounded-full hover:bg-white/10">
                              <SkipForward className="size-5" fill="currentColor" />
                            </motion.button>
                          </div>
                        </div>
                      ) : (
                        <Link
                          href="/music"
                          onClick={ui.closeControlCenter}
                          className="flex items-center justify-center gap-1.5 rounded-full bg-white/15 py-2 text-[13px] font-bold hover:bg-white/20"
                        >
                          <Plus className="size-4" /> Add music
                        </Link>
                      )}
                    </div>
                  </motion.div>
                  <motion.div variants={item} className="col-span-1">
                    <Slider orientation="vertical" label="Music volume" value={p.volume} onChange={player.setVolume} icon={<Volume2 />} className="size-full" />
                  </motion.div>
                  <motion.div variants={item} className="col-span-1">
                    <Slider orientation="vertical" label="Ambient volume" value={ambient.volume} onChange={ambientActions.setVolume} icon={<Waves />} className="size-full" />
                  </motion.div>
                </div>

                {/* Wide tiles */}
                <div className="grid grid-cols-4 gap-3">
                  <Tile
                    wide
                    active={timer.status === "running"}
                    onClick={timer.toggle}
                    icon={timer.phase === "work" ? <Timer /> : <Coffee />}
                    label={timer.status === "running" ? PHASE_META[timer.phase].label : timer.status === "paused" ? "Paused" : "Start focus"}
                    sub={fmtClock(timer.remaining)}
                  />
                  <Tile
                    wide
                    active={ambient.enabled}
                    onClick={ambientActions.toggle}
                    icon={<Waves />}
                    label="Ambient"
                    sub={ambient.enabled ? AMBIENT_KINDS.find((k) => k.id === ambient.kind)?.label : "Off"}
                  />
                </div>

                <AnimatePresence initial={false}>
                  {ambient.enabled && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={spring.smooth}
                      className="overflow-hidden"
                    >
                      <div className="grid grid-cols-5 gap-2">
                        {AMBIENT_KINDS.map((k) => (
                          <button
                            key={k.id}
                            type="button"
                            onClick={() => ambientActions.setKind(k.id)}
                            aria-pressed={ambient.kind === k.id}
                            className={cn(
                              "flex min-w-0 flex-col items-center gap-1 rounded-2xl py-2 text-[11px] font-bold transition-colors",
                              ambient.kind === k.id ? "bg-white text-black" : "bg-white/10 text-white hover:bg-white/15",
                            )}
                          >
                            <span className="text-lg leading-none">{k.emoji}</span>
                            <span className="max-w-full truncate px-1">{k.label}</span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Round toggles */}
                <div className="grid grid-cols-4 gap-x-3 gap-y-1 px-1 pt-1">
                  <Tile active={isDark} onClick={toggleTheme} icon={isDark ? <Moon /> : <Sun />} label={isDark ? "Dark" : "Light"} />
                  <Tile active={settings.dnd} onClick={() => updateSettings({ dnd: !settings.dnd })} icon={<BellOff />} label="Silence" />
                  <Tile
                    active={timer.settings.autoStartBreaks}
                    onClick={() => timer.updateSettings({ autoStartBreaks: !timer.settings.autoStartBreaks })}
                    icon={<Zap />}
                    label="Auto breaks"
                  />
                  <Tile active={p.playing} onClick={p.track ? player.toggle : () => { ui.closeControlCenter(); router.push("/music"); }} icon={<Music />} label="Music" />
                </div>

                {/* App launcher */}
                <motion.div variants={item} className="mt-1 grid grid-cols-3 gap-2 rounded-tile bg-white/[0.07] p-2">
                  {NAV.map((n) => {
                    const Icon = n.icon;
                    const active = pathname === n.href;
                    return (
                      <Link
                        key={n.href}
                        href={n.href}
                        onClick={ui.closeControlCenter}
                        className={cn(
                          "flex flex-col items-center gap-1.5 rounded-[1.25rem] py-3 transition-colors",
                          active ? "bg-white/15" : "hover:bg-white/10",
                        )}
                      >
                        <span className="grid size-10 place-items-center rounded-[0.9rem] text-white shadow-md" style={{ background: n.color }}>
                          <Icon className="size-5" />
                        </span>
                        <span className="text-[12px] font-bold text-white/85">{n.label}</span>
                      </Link>
                    );
                  })}
                </motion.div>

                <motion.div variants={item} onPointerDown={(e) => drag.start(e)} className="flex cursor-grab touch-none justify-center py-2" aria-hidden>
                  <span className="h-1 w-10 rounded-full bg-white/30" />
                </motion.div>
              </motion.div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
