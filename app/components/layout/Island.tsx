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
        <div className="relative overflow-hidden h-6">
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
        
        <span className="mx-1">-</span>
        
        <span className="time">
          <span className="hours">{hours}</span>:
          <span className="minutes">{minutes}</span>:
          <span className="seconds">{seconds}</span>
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
              Loop {currentLoop}/{totalLoops}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default Island;
