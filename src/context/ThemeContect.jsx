import { createContext, useEffect, useState } from "react";
import toggleSound from "../assets/sounds/toggle.mp3";
import { is } from "@babel/types";

export const ThemeContext = createContext(null);
export function ThemeProvider({children}) {
    const [isDarkMode, setIsDarkMode] = useState(false)
    useEffect(() => {
        const savedPreference = localStorage.getItem("darkMode");

        if (savedPreference === "true") {
            setIsDarkMode(true);
        }
    }, []);

    function toggleDarkMode() {
        const sound = new Audio(toggleSound);
        sound.play();

        SetIsDarkMode(PrevValue => {
            newValue = !PrevValue
            localStorage.setItem("darkMode", newValue);
            return newValue;
        })


    }

    return (
        <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode}}>
            {children}
        </ThemeContext.Provider>
    );
}

