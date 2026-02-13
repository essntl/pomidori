"use client";

import { ThemeProvider } from "../context/ThemeContext";
import { TimerProvider } from "../context/TimerContext";
import { ReactNode } from "react";

type ProvidersProps = {
  children: ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  return (
    <TimerProvider>
      <ThemeProvider>{children}</ThemeProvider>
    </TimerProvider>
  );
}