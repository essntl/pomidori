"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ease, spring } from "@/app/lib/motion";
import { cn } from "@/app/lib/cn";
import { useStore } from "@/app/lib/storage";
import { settingsStore, type Settings } from "@/app/lib/stores/settings";

/** Text whose characters roll vertically when they change (clock digits). */
export function Rolling({ value, className }: { value: string; className?: string }) {
  return (
    <span className={cn("inline-flex tabular-nums", className)} aria-label={value}>
      {value.split("").map((ch, i) => (
        <span key={`${value.length}-${i}`} className="relative inline-block overflow-hidden" aria-hidden>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={ch}
              initial={{ y: "-70%", opacity: 0 }}
              animate={{ y: "0%", opacity: 1 }}
              exit={{ y: "70%", opacity: 0 }}
              transition={{ duration: 0.22, ease: ease.out }}
              className="inline-block"
            >
              {ch}
            </motion.span>
          </AnimatePresence>
        </span>
      ))}
    </span>
  );
}

/** Animated equaliser bars for "now playing". */
const selectEqualizer = (s: Settings) => s.music.equalizer;

export function Equalizer({ playing: isPlaying, className }: { playing: boolean; className?: string }) {
  // Settings → Music player can turn the animation off; bars then sit still.
  const animated = useStore(settingsStore, selectEqualizer);
  const playing = isPlaying && animated;
  return (
    <span className={cn("inline-flex h-3.5 items-end gap-[2px]", className)} aria-hidden>
      {[0.9, 0.5, 0.75, 0.6].map((h, i) => (
        <motion.span
          key={i}
          className="h-full w-[3px] origin-bottom rounded-full bg-current"
          animate={playing ? { scaleY: [0.3, 1, 0.45, 0.85, 0.3] } : { scaleY: h * 0.4 }}
          transition={
            playing
              ? { duration: 0.9 + i * 0.17, repeat: Infinity, ease: "easeInOut", delay: i * 0.08 }
              : spring.smooth
          }
        />
      ))}
    </span>
  );
}

/** Circular progress ring. */
export function Ring({
  progress,
  size = 20,
  stroke = 3,
  color = "var(--accent)",
  track = "rgb(255 255 255 / 0.18)",
  className,
}: {
  progress: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  className?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={cn("-rotate-90", className)} aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - Math.min(1, Math.max(0, progress)))}
        style={{ transition: "stroke-dashoffset 0.3s linear, stroke 0.3s" }}
      />
    </svg>
  );
}
