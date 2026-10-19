"use client";

import { motion } from "framer-motion";
import { spring } from "../lib/motion";

/** Re-mounts on every navigation: a short, soft entrance for each page. */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={spring.smooth}>
      {children}
    </motion.div>
  );
}
