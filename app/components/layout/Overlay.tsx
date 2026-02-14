import Link from "next/link";
import DarkModeToggle from "../ui/DarkModeToggle";
import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

type OverlayProps = {
  isOpen: boolean;
  onClose: () => void;
};

type NavItem = {
  label: string;
  href: string;
};

const navItems: NavItem[] = [
  { label: "Home", href: "/app" },
  { label: "Notes", href: "/notes" },
  { label: "Calendar", href: "/calendar" },
  { label: "Front page", href: "/" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.3,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: -20 },
  visible: { opacity: 1, y: 0 },
};

function Overlay({ isOpen, onClose }: OverlayProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
      };
      window.addEventListener("keydown", handleEscape);
      return () => {
        document.body.style.overflow = "unset";
        window.removeEventListener("keydown", handleEscape);
      };
    }
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* panel slide top */}
          <motion.div
            initial={{ y: "-100%" }}
            animate={{ y: 0 }}
            exit={{ y: "-100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 200 }}
            className="fixed inset-0 w-full h-full flex z-50 overflow-hidden pointer-events-none"
          >
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="ml-auto h-full w-full max-w-105 sm:max-w-120 md:max-w-130 flex flex-col overflow-hidden  pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div
                variants={itemVariants}
                className="flex justify-end px-5 pt-4"
              >
                <button
                  onClick={onClose}
                  className="rounded-xl w-8 h-8 flex items-center justify-center bg-white/10 dark:bg-white/10 text-white/70 hover:bg-white/40 dark:hover:bg-white/20 transition-colors text-lg"
                  aria-label="Close overlay"
                >
                  ✕
                </button>
              </motion.div>

              <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-6 pt-2 flex gap-3">
                {/*navigation*/}
                <motion.nav
                  variants={itemVariants}
                  className="flex flex-col gap-2 min-w-25 shrink-0"
                  aria-label="Main navigation"
                >
                  {navItems.map((item) => (
                    <motion.div key={item.href} variants={itemVariants}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        className="block rounded-2xl px-4 py-3 text-sm font-medium bg-white/20 dark:bg-white/10 text-white/80 hover:bg-white/40 dark:hover:bg-white/20 transition-colors text-left"
                      >
                        {item.label}
                      </Link>
                    </motion.div>
                  ))}
                </motion.nav>

                {/*toggles and widgets col */}
                <motion.div
                  variants={itemVariants}
                  className="flex-1 flex flex-col gap-3 min-w-0"
                >
                  {/* Music widget placeholder */}
                  <motion.section
                    variants={itemVariants}
                    className="rounded-3xl bg-white/20 dark:bg-white/10 p-4 min-h-30 flex flex-col justify-between"
                    aria-label="Music widget"
                  >
                    <span className="text-xs font-semibold uppercase tracking-wider text-white/40">
                      Now Playing
                    </span>
                    <div className="flex items-center gap-3 mt-auto">
                      <div className="w-10 h-10 rounded-lg bg-black/10 dark:bg-white/10" />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-white/70">
                          No track
                        </span>
                        <span className="text-xs text-white/40">—</span>
                      </div>
                    </div>
                  </motion.section>

                  {/* Quick toggles grid */}
                  <motion.section
                    variants={itemVariants}
                    className="grid grid-cols-4 gap-2"
                    aria-label="Quick toggles"
                  >
                    <motion.div variants={itemVariants}>
                      <DarkModeToggle />
                    </motion.div>
                    <motion.div variants={itemVariants}>
                      <TogglePlaceholder label="Ambient" />
                    </motion.div>
                    <motion.div variants={itemVariants}>
                      <TogglePlaceholder label="Music" />
                    </motion.div>
                    <motion.div variants={itemVariants}>
                      <TogglePlaceholder label="Focus" />
                    </motion.div>
                  </motion.section>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/** placeholder tile for now */
function TogglePlaceholder({ label }: { label: string }) {
  return (
    <button
      className="w-full h-full rounded-2xl bg-white/20 dark:bg-white/10 p-3 flex flex-col items-center justify-center aspect-square text-white/50 hover:bg-white/30 dark:hover:bg-white/20 transition-colors"
      aria-label={label}
    >
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

export default Overlay;
