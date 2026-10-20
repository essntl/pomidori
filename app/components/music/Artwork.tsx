/* eslint-disable @next/next/no-img-element -- remote artwork from arbitrary hosts */
import { Music, Radio } from "lucide-react";
import { cn } from "@/app/lib/cn";
import type { Track } from "@/app/lib/player/types";
import { artworkSrc } from "@/app/lib/player/detect";

/** `fill` stretches the artwork over its positioned parent (used as a background). */
export function Artwork({
  track,
  className,
  fill,
  style,
}: {
  track: Track | null;
  className?: string;
  fill?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <div className={cn(fill ? "absolute inset-0" : "relative shrink-0", "overflow-hidden bg-surface-3", className)} style={style}>
      {track?.artwork ? (
        <img
          src={artworkSrc(track.artwork)!}
          alt=""
          className="absolute inset-0 size-full object-cover"
          draggable={false}
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center text-muted [&_svg]:size-[45%]">
          {track?.source === "audio" ? <Radio /> : <Music />}
        </div>
      )}
    </div>
  );
}

export function fmtSeconds(s: number) {
  if (!Number.isFinite(s) || s <= 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const h = Math.floor(m / 60);
  return h ? `${h}:${String(m % 60).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
}
