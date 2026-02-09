"use client";

import { useTimerContext } from "../../context/TimerContext";

function TimerDisplay() {
  const { status, currentLoop, totalLoops, timeLeft } = useTimerContext();

  const hours = Math.floor(timeLeft / 3600)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((timeLeft % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (timeLeft % 60).toString().padStart(2, "0");

  return (
    <div className="flex flex-col items-center justify-center relative p-4 sm:p-6 font-sans">
        {/* Status indicator */}
        <div className="flex justify-center mb-6 sm:mb-12">
          <span className="px-5 py-2.5 rounded-lg text-xs font-semibold tracking-widest uppercase bg-pink-100/80 dark:bg-pink-900/40 text-pink-600 dark:text-pink-300 border border-pink-200/50 dark:border-pink-700/30 shadow-sm">
            {status}
          </span>
        </div>

        {/* Time display */}
        <div className="flex items-baseline justify-center gap-1 sm:gap-3 lg:gap-1 xl:gap-3 leading-none mb-6 sm:mb-10">
          {/* Hours */}
          <div className="text-center">
            <span className="text-[48px] sm:text-[64px] md:text-[88px] lg:text-[74px] xl:text-[88px] font-bold text-gray-800 dark:text-gray-100 tracking-tight">
              {hours}
            </span>
            <span className="text-[9px] sm:text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-[0.15em] mt-2 sm:mt-3 block">
              hrs
            </span>
          </div>

          <span className="text-2xl sm:text-4xl font-extralight text-gray-300 dark:text-gray-600 self-start mt-3 sm:mt-5 font-serif">
            :
          </span>

          {/* Minutes */}
          <div className="text-center">
            <span className="text-[48px] sm:text-[64px] md:text-[88px] lg:text-[74px] xl:text-[88px] font-bold text-gray-800 dark:text-gray-100 tracking-tight">
              {minutes}
            </span>
            <span className="text-[9px] sm:text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-[0.15em] mt-2 sm:mt-3 block">
              min
            </span>
          </div>

          <span className="text-2xl sm:text-4xl font-extralight text-gray-300 dark:text-gray-600 self-start mt-3 sm:mt-5 font-serif">
            :
          </span>

          {/* Seconds */}
          <div className="text-center">
            <span className="text-[48px] sm:text-[64px] md:text-[88px] lg:text-[74px] xl:text-[88px] font-bold text-pink-500 dark:text-pink-400 tracking-tight tabular-nums block leading-[0.9]">
              {seconds}
            </span>
            <span className="text-[9px] sm:text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-[0.15em] mt-2 sm:mt-3 block">
              sec
            </span>
          </div>
        </div>

        {/* Loop Progress indicator */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex gap-1.5 items-center h-1">
            {Array.from({ length: totalLoops }).map((_, idx) => (
              <div
                key={idx}
                className={`h-1 rounded-full transition-all duration-500 ease-out ${
                  idx < currentLoop
                    ? "w-7 bg-linear-to-r from-pink-400 to-pink-300 dark:from-pink-500 dark:to-pink-400 shadow-sm"
                    : "w-1 bg-gray-200 dark:bg-gray-700"
                }`}
              />
            ))}
          </div>
          <span className="text-[13px] font-medium text-gray-500 dark:text-gray-400 tabular-nums tracking-wide">
            Session {currentLoop} of {totalLoops}
          </span>
        </div>
      </div>
  );
}

export default TimerDisplay;
