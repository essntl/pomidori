import type { Transition, Variants } from "framer-motion";

/** Shared spring presets. Every animated component pulls from here so motion feels uniform. */
export const spring = {
  snappy: { type: "spring", stiffness: 520, damping: 38, mass: 0.7 },
  smooth: { type: "spring", stiffness: 320, damping: 34, mass: 0.9 },
  bouncy: { type: "spring", stiffness: 440, damping: 24, mass: 0.8 },
  island: { type: "spring", stiffness: 380, damping: 30, mass: 0.9 },
} satisfies Record<string, Transition>;

export const ease = {
  out: [0.22, 1, 0.36, 1],
  inOut: [0.65, 0, 0.35, 1],
} as const;

export const fade = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.18, ease: ease.out },
};

export const pop: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 6 },
  visible: { opacity: 1, scale: 1, y: 0, transition: spring.snappy },
  exit: { opacity: 0, scale: 0.97, y: 4, transition: { duration: 0.12, ease: ease.out } },
};

export const list: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.025 } },
};

export const listItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: spring.smooth },
};
