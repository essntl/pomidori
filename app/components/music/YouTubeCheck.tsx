"use client";

import { useRef, useState } from "react";
import { CheckCircle2, Copy, Loader2, Play, XCircle } from "lucide-react";
import { EMBED_REFUSED, HOSTS, loadApi, mountIframe, type YTPlayer } from "@/app/lib/player/youtube";
import { notify } from "@/app/lib/alerts";
import { cn } from "@/app/lib/cn";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";

/**
 * Diagnoses "can't play" errors on the user's own setup by trying the same video in a few
 * player setups. Comparing them tells apart a video that blocks embedding, a problem with the
 * site's address/referrer, and a problem with Pomidori's hidden background player.
 */

/** "Me at the zoo": public, embeddable, and has been for nearly 20 years. */
const REFERENCE = { id: "jNQXAC9IVRw", label: "Reference video (embedding allowed)" };

type Setup = "visible" | "nocookie" | "background";
const SETUPS: { id: Setup; label: string }[] = [
  { id: "visible", label: "Normal YouTube player" },
  { id: "nocookie", label: "Privacy-enhanced player" },
  { id: "background", label: "Pomidori's background player" },
];

type Result = { state: "running" } | { state: "ok" } | { state: "error"; code: number } | { state: "timeout" };

function attempt(setup: Setup, videoId: string, stage: HTMLElement): Promise<Result> {
  return loadApi().then(
    (YT) =>
      new Promise<Result>((resolve) => {
        let player: YTPlayer | null = null;
        let el: HTMLElement;
        const done = (r: Result) => {
          clearTimeout(timer);
          try {
            player?.destroy();
          } catch {
            /* gone */
          }
          el.remove();
          resolve(r);
        };
        const timer = setTimeout(() => done({ state: "timeout" }), 15000);
        const events = {
          onReady: (e: { target: YTPlayer }) => {
            player = e.target;
            e.target.mute();
            if (setup === "background") e.target.loadVideoById(videoId);
            else e.target.playVideo();
          },
          onStateChange: (e: { data: number }) => e.data === 1 && done({ state: "ok" }),
          onError: (e: { data: number }) => done({ state: "error", code: e.data }),
        };
        if (setup === "background") {
          // Exactly what the music player does: a hidden iframe that loads songs later.
          el = mountIframe(HOSTS[0]);
          player = null;
          new YT.Player(el, { events });
        } else {
          el = document.createElement("div");
          stage.appendChild(el);
          new YT.Player(el, {
            host: setup === "nocookie" ? HOSTS[1] : HOSTS[0],
            videoId,
            width: 200,
            height: 112,
            playerVars: { playsinline: 1, mute: 1, autoplay: 1, origin: window.location.origin },
            events,
          });
        }
      }),
  );
}

function describe(r: Result | undefined) {
  if (!r) return "—";
  if (r.state === "running") return "Testing…";
  if (r.state === "ok") return "Plays";
  if (r.state === "timeout") return "No answer from YouTube";
  return `Refused (code ${r.code})`;
}

function environment() {
  const host = window.location.hostname;
  const isIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(":");
  const meta = document.querySelector<HTMLMetaElement>('meta[name="referrer"]')?.content ?? "browser default";
  return [
    ["Address", window.location.origin],
    ["Kind", host === "localhost" || host === "127.0.0.1" ? "this computer" : isIp ? "IP address" : "domain name"],
    ["Secure (HTTPS)", window.isSecureContext && window.location.protocol === "https:" ? "yes" : "no"],
    ["Referrer policy", meta],
    ["Browser", navigator.userAgent],
  ] as const;
}

export function YouTubeCheck({ open, onClose, songId, songTitle }: { open: boolean; onClose: () => void; songId?: string | null; songTitle?: string }) {
  const stage = useRef<HTMLDivElement>(null);
  const [results, setResults] = useState<Record<string, Result>>({});
  const [running, setRunning] = useState(false);
  const videos = [REFERENCE, ...(songId && songId !== REFERENCE.id ? [{ id: songId, label: songTitle ? `Your song: ${songTitle}` : "Your song" }] : [])];

  async function run() {
    if (!stage.current) return;
    setRunning(true);
    setResults({});
    for (const v of videos) {
      for (const s of SETUPS) {
        const key = `${v.id}:${s.id}`;
        setResults((r) => ({ ...r, [key]: { state: "running" } }));
        const res = await attempt(s.id, v.id, stage.current!).catch(() => ({ state: "timeout" }) as Result);
        setResults((r) => ({ ...r, [key]: res }));
      }
    }
    setRunning(false);
  }

  function report() {
    const lines = ["Pomidori YouTube check", ...environment().map(([k, v]) => `${k}: ${v}`), ""];
    for (const v of videos) {
      lines.push(`${v.label} (${v.id})`);
      for (const s of SETUPS) lines.push(`  ${s.label}: ${describe(results[`${v.id}:${s.id}`])}`);
    }
    return lines.join("\n");
  }

  const ref = (s: Setup) => results[`${REFERENCE.id}:${s}`];
  const refOk = (s: Setup) => ref(s)?.state === "ok";
  const refusedRef = SETUPS.some((s) => {
    const r = ref(s.id);
    return r?.state === "error" && EMBED_REFUSED.has(r.code);
  });
  const finished = !running && Object.keys(results).length > 0;
  const verdict = !finished
    ? null
    : refOk("visible") && !refOk("background")
      ? "YouTube plays in a normal player but not in Pomidori's background player. That points to the hidden player; send me these results."
      : !refOk("visible") && refusedRef
        ? "YouTube refuses even the reference video on this address. That points to the address or browser rather than your songs; send me these results."
        : refOk("visible") && songId && results[`${songId}:visible`]?.state === "error"
          ? "The reference video plays but your song doesn't, even in a normal player. The song's owner has turned off playing it on other sites; nothing in Pomidori can change that."
          : refOk("visible") && refOk("background")
            ? "Everything plays here. If songs still fail in the player, send me these results."
            : "Mixed results. Send me these results.";

  return (
    <Modal
      open={open}
      onClose={() => !running && onClose()}
      title="YouTube check"
      footer={
        <>
          <Button
            variant="ghost"
            disabled={!finished}
            onClick={async () => {
              const text = report();
              try {
                await navigator.clipboard.writeText(text);
              } catch {
                const el = document.createElement("textarea");
                el.value = text;
                document.body.appendChild(el);
                el.select();
                document.execCommand("copy");
                el.remove();
              }
              notify({ title: "Results copied", icon: "📋", tone: "success", duration: 1600 });
            }}
          >
            <Copy className="size-4" /> Copy results
          </Button>
          <Button variant="primary" onClick={run} disabled={running}>
            {running ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />} {finished ? "Run again" : "Run check"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4 text-sm text-fg-2">
        <p>Plays a few seconds of muted video in different player setups to find out why YouTube refuses to play.</p>
        {videos.map((v) => (
          <div key={v.id}>
            <div className="mb-1 truncate text-[12px] font-bold tracking-wider text-muted uppercase">{v.label}</div>
            <ul className="divide-y divide-line rounded-control border border-line">
              {SETUPS.map((s) => {
                const r = results[`${v.id}:${s.id}`];
                return (
                  <li key={s.id} className="flex items-center justify-between gap-3 px-3 py-2">
                    <span>{s.label}</span>
                    <span
                      className={cn(
                        "flex items-center gap-1.5 text-[13px] font-semibold",
                        r?.state === "ok" ? "text-success" : r?.state === "error" || r?.state === "timeout" ? "text-danger" : "text-muted",
                      )}
                    >
                      {r?.state === "ok" ? <CheckCircle2 className="size-4" /> : r?.state === "running" ? <Loader2 className="size-4 animate-spin" /> : r ? <XCircle className="size-4" /> : null}
                      {describe(r)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        {verdict && <p className="rounded-control bg-surface-2 p-3 text-[13px] font-semibold text-fg">{verdict}</p>}
        {/* Visible players must be on screen; YouTube doesn't allow hiding them. */}
        <div ref={stage} className="flex min-h-0 justify-center [&_iframe]:rounded-lg" />
      </div>
    </Modal>
  );
}
