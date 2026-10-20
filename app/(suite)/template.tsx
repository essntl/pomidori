"use client";

import { motion } from "framer-motion";
import { spring } from "../lib/motion";
import { useHydrated } from "../lib/storage";

/**
 * Re-mounts on every navigation: a short, soft entrance for each page.
 * All data lives in localStorage, so the server can only render empty placeholders. Waiting for
 * hydration means a page appears once, with real data, instead of flashing empty → full.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrated();
  if (!hydrated) return <div aria-hidden className="min-h-[60dvh]" />;
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={spring.smooth}>
      {children}
    </motion.div>
  );
}
