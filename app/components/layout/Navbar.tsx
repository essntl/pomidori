"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { ui, useUI } from "@/app/context/hooks";
import { spring } from "@/app/lib/motion";
import { cn } from "@/app/lib/cn";
import { Kbd } from "../ui/Card";
import Island from "./Island";

function ControlCenterIcon({ open }: { open: boolean }) {
  // Four tiles that morph into a close mark.
  const tiles = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 1 },
  ];
  return (
    <span className="relative block size-[18px]">
      {tiles.map((t, i) => (
        <motion.span
          key={i}
          className="absolute size-[7px] rounded-[2.5px] bg-current"
          initial={false}
          animate={
            open
              ? { left: 5.5, top: 5.5, rotate: i % 3 === 0 ? 45 : -45, scaleX: 2.4, scaleY: 0.35, opacity: i < 2 ? 1 : 0 }
              : { left: t.x * 11, top: t.y * 11, rotate: 0, scaleX: 1, scaleY: 1, opacity: 1 }
          }
          transition={spring.snappy}
        />
      ))}
    </span>
  );
}

export default function Navbar() {
  const { controlCenter } = useUI();

  return (
    <>
      <Island />
      <header className="sticky top-0 z-50 px-3 pt-3 pb-2 sm:px-5 sm:pt-4">
        {/* Soft frosted fade so content scrolling underneath never clashes with the controls. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -bottom-4 bg-gradient-to-b from-[var(--bg)] from-40% to-transparent"
        />
        <div className="relative mx-auto flex h-12 max-w-7xl items-center justify-between">
          <Link
            href="/app"
            aria-label="Pomidori home"
            className="glass flex h-11 min-w-11 items-center justify-center gap-2 rounded-full border border-line px-1.5 shadow-card transition-transform active:scale-95 md:pr-4"
          >
            <Image src="/images/logo.png" alt="" width={32} height={32} className="size-8 shrink-0" priority />
            <span className="hidden text-[17px] font-extrabold tracking-tight text-fg md:block">Pomidori</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={ui.openPalette}
              className="glass hidden h-11 items-center gap-2 rounded-full border border-line pr-2 pl-4 text-sm font-semibold text-muted shadow-card transition-colors hover:text-fg lg:flex"
            >
              <Search className="size-4" />
              <span className="mr-6">Search or run…</span>
              <Kbd>Ctrl</Kbd>
              <Kbd>K</Kbd>
            </button>
            <button
              type="button"
              aria-label="Search"
              onClick={ui.openPalette}
              className="glass grid size-11 place-items-center rounded-full border border-line text-fg shadow-card transition-transform active:scale-90 lg:hidden"
            >
              <Search className="size-[18px]" />
            </button>
            <button
              type="button"
              aria-label={controlCenter ? "Close control centre" : "Open control centre"}
              aria-expanded={controlCenter}
              onClick={ui.toggleControlCenter}
              className={cn(
                "relative grid size-11 place-items-center rounded-full border shadow-card transition-[transform,background-color,color] active:scale-90",
                controlCenter ? "border-white/15 bg-white/15 text-white" : "glass border-line text-fg",
              )}
            >
              <ControlCenterIcon open={controlCenter} />
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
