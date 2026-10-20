"use client";

import { motion } from "framer-motion";
import type { Track } from "@/app/lib/player/types";
import type { ArtworkStyle } from "@/app/lib/stores/settings";
import { spring } from "@/app/lib/motion";
import { cn } from "@/app/lib/cn";
import { Artwork } from "./Artwork";

/**
 * The big now-playing artwork in one of three styles. "vinyl" draws a record with the cover as
 * its label; the label spins (a compositor-only CSS animation) while music plays and stops in place when paused.
 */
export function NowPlayingArt({
  track,
  playing,
  variant,
  className,
}: {
  track: Track | null;
  playing: boolean;
  variant: ArtworkStyle;
  className?: string;
}) {
  if (variant === "vinyl") {
    return (
      <motion.div
        key={track?.id ?? "none"}
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={spring.smooth}
        className={cn("relative aspect-square rounded-full shadow-pop", className)}
        style={{
          background:
            "radial-gradient(circle at center, #222 0 29%, transparent 29.5%), repeating-radial-gradient(circle at center, #0c0c0e 0 1.5px, #1a1a1e 1.5px 3px)",
        }}
      >
        <div
          className="absolute inset-0 animate-[spin_7s_linear_infinite] rounded-full motion-reduce:animate-none"
          style={{ animationPlayState: playing ? "running" : "paused" }}
        >
          <div className="absolute inset-[27%] overflow-hidden rounded-full ring-[3px] ring-black/70">
            <Artwork track={track} fill />
          </div>
          {/* Spindle hole */}
          <div className="absolute top-1/2 left-1/2 size-[4.5%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--bg)] ring-2 ring-black/40" />
        </div>
        {/* Static sheen so the rotation reads as a record turning under the light */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{
            background:
              "conic-gradient(from 40deg, transparent 0deg, rgb(255 255 255 / 0.09) 25deg, transparent 60deg, transparent 180deg, rgb(255 255 255 / 0.07) 205deg, transparent 240deg)",
          }}
        />
      </motion.div>
    );
  }

  return (
    <motion.div
      key={track?.id ?? "none"}
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: playing ? 1 : 0.94 }}
      transition={spring.smooth}
      className={cn("aspect-square overflow-hidden shadow-pop", variant === "round" ? "rounded-full" : "rounded-[1.5rem]", className)}
    >
      <Artwork track={track} className="size-full" />
    </motion.div>
  );
}
