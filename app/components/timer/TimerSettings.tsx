"use client";

import { useState } from "react";
import { useTimerContext } from "../../context/TimerContext";

type TimerSettingsProps = {
  isOpen: boolean;
  onClose: () => void;
};

function TimerSettings({ isOpen, onClose }: TimerSettingsProps) {
  const {
    workDuration,
    breakDuration,
    totalLoops,
    updateSettings,
  } = useTimerContext();

  const [work, setWork] = useState(workDuration || 25);
  const [breakTime, setBreakTime] = useState(breakDuration || 5);
  const [loops, setLoops] = useState(totalLoops || 2);

  const handleSave = () => {
    if (
      work < 1 ||
      work > 360 ||
      breakTime < 1 ||
      breakTime > 360 ||
      loops < 1 ||
      loops > 15
    ) {
      alert(
        "Please enter valid work (1-360 min), break (1-360 min), and loops (1-15).",
      );
      return;
    }
    updateSettings(work, breakTime, loops); 
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl rounded-2xl p-8 max-w-md w-full shadow-xl border border-white/60 dark:border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold mb-6 text-gray-800 dark:text-gray-100">
          Timer Settings
        </h2>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-600 dark:text-gray-300">
              Work Duration (minutes)
            </label>
            <input
              type="number"
              min="1"
              max="360"
              value={work}
              onChange={(e) => setWork(Number(e.target.value))}
              className="w-full px-4 py-2.5 rounded-xl bg-white/60 dark:bg-gray-800/60 border border-pink-200/50 dark:border-pink-700/30 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-pink-300 dark:focus:ring-pink-600 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-600 dark:text-gray-300">
              Break Duration (minutes)
            </label>
            <input
              type="number"
              min="1"
              max="360"
              value={breakTime}
              onChange={(e) => setBreakTime(Number(e.target.value))}
              className="w-full px-4 py-2.5 rounded-xl bg-white/60 dark:bg-gray-800/60 border border-pink-200/50 dark:border-pink-700/30 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-pink-300 dark:focus:ring-pink-600 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-600 dark:text-gray-300">
              Total Loops
            </label>
            <input
              type="number"
              min="1"
              max="15"
              value={loops}
              onChange={(e) => setLoops(Number(e.target.value))}
              className="w-full px-4 py-2.5 rounded-xl bg-white/60 dark:bg-gray-800/60 border border-pink-200/50 dark:border-pink-700/30 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-pink-300 dark:focus:ring-pink-600 transition-all"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl font-medium transition-all duration-300 bg-white/70 dark:bg-gray-800/60 backdrop-blur-md border border-pink-200/50 dark:border-pink-700/30 text-pink-600 dark:text-pink-300 hover:bg-pink-50/80 dark:hover:bg-pink-900/30 hover:scale-105 active:scale-95 shadow-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2.5 rounded-xl font-medium transition-all duration-300 bg-linear-to-r from-pink-400 to-pink-300 dark:from-pink-500 dark:to-pink-400 text-white border border-pink-300/50 dark:border-pink-400/30 hover:from-pink-500 hover:to-pink-400 dark:hover:from-pink-400 dark:hover:to-pink-300 hover:scale-105 active:scale-95 shadow-md"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default TimerSettings;
