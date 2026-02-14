import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import { Providers } from "./components/Providers";
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import YouTubeAudioPlayer from "./components/sounds/YouTubeAudioPlayer";

const nunito = Nunito({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pomidori",
  description: "Productivity suite to suit all your needs.",
};

const themeScript = `
  (function() {
    const savedPreference = localStorage.getItem("darkMode");
    const isDark = savedPreference === "true" || 
      (!savedPreference && window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (isDark) {
      document.documentElement.classList.add("dark");
      document.documentElement.style.colorScheme = "dark";
    }
  })();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={nunito.className}>
        <Providers>
          <div className="min-h-screen flex flex-col bg-linear-to-t from-[#bcbcbc] to-white dark:from-[#222222] dark:to-black transition-all">
            <Navbar />
            <main className="flex-1 flex lg:flex-row justify-center flex-col">
              {children}
              <YouTubeAudioPlayer/>
            </main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
