"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useTimerContext } from "../../context/TimerContext";

function Island() {
  const { status, currentLoop, totalLoops, timeLeft } = useTimerContext();

  const hours = Math.floor(timeLeft / 3600)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((timeLeft % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (timeLeft % 60).toString().padStart(2, "0");

  return (
    <div
      className={`flex items-center p-2 md:mr-35 text-black dark:text-white rounded-xl bg-white/50 dark:bg-gray-800/30 shadow-xl transition-all duration-300 ${status === "Idle" ? "opacity-0 scale-20 pointer-events-none" : "opacity-100 scale-100"}`}
    >
      <div className="flex items-center">
        <motion.svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mr-1"
          animate={{ rotate: 180 }}
          transition={{
            duration: 0.5,
            ease: "easeInOut",
            repeat: Infinity,
            repeatDelay: 2.5,
          }}
        >
          <path d="M5 22h14" />
          <path d="M5 2h14" />
          <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22" />
          <path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" />
        </motion.svg>

        <div className="relative overflow-hidden h-6 hidden sm:block">
          <AnimatePresence mode="wait">
            <motion.span
              key={status}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="status font-medium block"
            >
              {status}
            </motion.span>
          </AnimatePresence>
        </div>
        
        <span className="mx-1 hidden sm:block ">-</span>
        
        <span className="time">
          <span>{hours}</span>:
          <span>{minutes}</span>:
          <span className="text-pink-500 dark:text-pink-400">{seconds}</span>
        </span>
        
        <span className="mx-1">-</span>
        
        <div className="relative overflow-hidden h-6">
          <AnimatePresence mode="wait">
            <motion.span
              key={currentLoop}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="loop block"
            >
              {currentLoop}/{totalLoops}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default Island;
