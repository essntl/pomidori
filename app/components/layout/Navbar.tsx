"use client";

import Overlay from "./Overlay";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Island from "./Island";

function Navbar() {
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);

  return (
    <nav className="flex justify-between items-center p-4">
      <Link 
        href="/" 
        className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/70 dark:bg-gray-900/60 shadow-lg dark:shadow-xl border border-white/60 dark:border-white/10 transition-all duration-300 hover:shadow-xl"
      >
        <Image 
          src="/images/logo.png" 
          alt="logo" 
          width="40" 
          height="40"
          className="block" 
        />
        <span className="text-2xl font-bold text-gray-800 dark:text-gray-100 hidden md:block tracking-tight">
          Pomidori
        </span>
      </Link>

      <Island />


      <button
        onClick={() => setIsOverlayOpen(!isOverlayOpen)}
        className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white/70 dark:bg-gray-900/60 shadow-lg dark:shadow-xl border border-white/60 dark:border-white/10 transition-all duration-300 hover:shadow-xl hover:scale-105 group"
        aria-label="Menu"
      >
        <div className="flex flex-col items-center justify-center gap-1.5">
          <span
            className={`block h-0.5 w-5 rounded-full bg-gray-700 dark:bg-gray-200 transition-all duration-300 ease-in-out ${
              isOverlayOpen ? "rotate-45 translate-y-2" : ""
            }`}
          />
          <span
            className={`block h-0.5 w-5 rounded-full bg-gray-700 dark:bg-gray-200 transition-all duration-300 ease-in-out ${
              isOverlayOpen ? "opacity-0 scale-0" : "opacity-100"
            }`}
          />
          <span
            className={`block h-0.5 w-5 rounded-full bg-gray-700 dark:bg-gray-200 transition-all duration-300 ease-in-out ${
              isOverlayOpen ? "-rotate-45 -translate-y-2" : ""
            }`}
          />
        </div>
      </button>

      <Overlay
        isOpen={isOverlayOpen}
        onClose={() => setIsOverlayOpen(false)}
      />
    </nav>
  );
}

export default Navbar;
