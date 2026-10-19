"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { NAV } from "@/app/lib/nav";
import { spring } from "@/app/lib/motion";
import { cn } from "@/app/lib/cn";
import { useSettings } from "@/app/context/hooks";

/** Floating HyperOS-style dock with the main destinations. */
export default function Dock() {
  const pathname = usePathname();
  const { showDock } = useSettings();
  if (!showDock) return null;

  return (
    <nav
      aria-label="Main"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <div className="glass pointer-events-auto flex items-center gap-1 rounded-[1.6rem] border border-line p-1.5 shadow-pop">
        {NAV.filter((n) => n.dock).map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex h-12 min-w-12 flex-col items-center justify-center rounded-[1.2rem] px-2 transition-colors sm:min-w-16",
                active ? "text-accent" : "text-fg-2 hover:text-fg",
              )}
            >
              {active && (
                <motion.span layoutId="dock-active" transition={spring.snappy} className="absolute inset-0 rounded-[1.2rem] bg-accent-soft" />
              )}
              <motion.span whileTap={{ scale: 0.85 }} transition={spring.snappy} className="relative flex flex-col items-center gap-0.5">
                <Icon className="size-[21px]" strokeWidth={active ? 2.4 : 2} />
                <span className="hidden text-[10.5px] font-bold sm:block">{item.label}</span>
              </motion.span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
