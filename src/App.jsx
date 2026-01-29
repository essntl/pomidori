import { useContext, useState } from "react";
import Navbar from "../src/components/layout/Navbar";
import Footer from "./components/layout/Footer";
import { ThemeContext } from "./context/ThemeContext";

function App() {
  const { isDarkMode } = useContext(ThemeContext);
  return (
    <div className={isDarkMode ? "dark" : ""}>
      <div className="min-h-screen flex flex-col bg-linear-to-t from-[#bcbcbc] to-white dark:from-[#222222] dark:to-black transition-all">
        <Navbar />
        <main className="flex-1"></main>
        <Footer />
      </div>
    </div>
  );
}

export default App;
