"use client";

import { useState } from "react";
import { useTimerContext } from "../../context/TimerContext";
import TimerSettings from "./TimerSettings";

function TimerControls() {
  const { start, pause, reset, isRunning, isPaused } = useTimerContext();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleStartPause = () => {
    if (isRunning && !isPaused) {
      pause();
    } else {
      start();
    }
  };

  return (
    <>
      <div className="flex gap-2 sm:gap-3 justify-center items-center flex-wrap px-4">
        <button
          className="px-6 py-2.5 rounded-xl font-medium transition-all duration-300 bg-white/70 dark:bg-gray-900/60 backdrop-blur-md border border-pink-200/50 dark:border-pink-700/30 text-pink-600 dark:text-pink-300 hover:bg-pink-50/80 dark:hover:bg-pink-900/30 hover:scale-105 active:scale-95 shadow-sm hover:shadow-md min-w-25"
          onClick={reset}
        >
          Reset
        </button>
        <button
          className="px-6 py-2.5 rounded-xl font-medium transition-all duration-300 bg-linear-to-r from-pink-400 to-pink-300 dark:from-pink-500 dark:to-pink-400 text-white border border-pink-300/50 dark:border-pink-400/30 hover:from-pink-500 hover:to-pink-400 dark:hover:from-pink-400 dark:hover:to-pink-300 hover:scale-105 active:scale-95 shadow-md hover:shadow-lg min-w-25"
          onClick={handleStartPause}
        >
          {isRunning && !isPaused ? "Pause" : "Start"}
        </button>
        <button
          className="px-6 py-2.5 rounded-xl font-medium transition-all duration-300 bg-white/70 dark:bg-gray-900/60 backdrop-blur-md border border-pink-200/50 dark:border-pink-700/30 text-pink-600 dark:text-pink-300 hover:bg-pink-50/80 dark:hover:bg-pink-900/30 hover:scale-105 active:scale-95 shadow-sm hover:shadow-md min-w-25"
          onClick={() => setIsSettingsOpen(true)}
        >
          Settings
        </button>
      </div>
      <TimerSettings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  );
}

export default TimerControls;
