"use client";

import TimerControls from "./TimerControls";
import TimerDisplay from "./TimerDisplay";

function PomodoroTimer() {
  return (
    <div className="flex lg:flex-3 lg:max-w-[30%] m-4 py-4 flex-col justify-center bg-white/70 dark:bg-gray-900/60 rounded-3xl shadow-lg dark:shadow-xl border border-white/60 dark:border-white/10">
      <TimerDisplay />
      <TimerControls />
    </div>
  );
}

export default PomodoroTimer;
