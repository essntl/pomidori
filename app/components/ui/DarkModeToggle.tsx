"use client";

import { useTheme } from "../../context/ThemeContext";

function DarkModeToggle() {
  const { isDarkMode, toggleDarkMode } = useTheme();

  return (
    <button
      onClick={toggleDarkMode}
      className="flex items-center justify-center bg-white/20 hover:bg-white/30 dark:bg-blue-200/30 h-full w-full rounded-2xl transition-colors duration-400"
    >
      <div
        className={`
          relative w-8 h-8
          transition-transform duration-500 ease-in-out
          ${isDarkMode ? "rotate-360" : "rotate-0"}
        `}
      >
        {/* Sun */}
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className={`
            absolute inset-0 w-8 h-8 text-yellow-200
            transition-opacity duration-500
            ${isDarkMode ? "opacity-0" : "opacity-100"}
          `}
        >
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="2" x2="12" y2="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="12" y1="20" x2="12" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="4.93" y1="4.93" x2="6.34" y2="6.34" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="17.66" y1="17.66" x2="19.07" y2="19.07" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="2" y1="12" x2="4" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="20" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="4.93" y1="19.07" x2="6.34" y2="17.66" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="17.66" y1="6.34" x2="19.07" y2="4.93" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>

        {/* Moon */}
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className={`
            absolute inset-0 w-8 h-8 text-yellow-200
            transition-opacity duration-500
            ${isDarkMode ? "opacity-100" : "opacity-0"}
          `}
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      </div>
    </button>
  );
}

export default DarkModeToggle;
