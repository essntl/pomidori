import { useContext } from "react";
import { ThemeContext } from "../../context/ThemeContext";

function DarkModeToggle() {
  const { isDarkMode, toggleDarkMode } = useContext(ThemeContext);

  return (
    <button
      onClick={toggleDarkMode}
      className="relative w-15 h-8.5 rounded-full transition-colors duration-400 bg-black"
    >
      <span
        className={`
          absolute top-1 left-1
          w-6.5 h-6.5 
          rounded-full 
          bg-[#f4f4f4]
          transition-all duration-400
          ${isDarkMode ? "translate-x-6.5 bg-black shadow-[inset_8px_-4px_0px_0px_#e1dfd5]" : ""}
        `}
      />
    </button>
  );
}

export default DarkModeToggle;
