import type { MetadataRoute } from "next";

/** Lets phones install Pomidori as a full-screen app, without the browser's address and tool bars. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pomidori",
    short_name: "Pomidori",
    description: "Focus timer, notes, tasks, calendar, habits and music in one calm place.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    background_color: "#f3f3f6",
    theme_color: "#f3f3f6",
    icons: [
      { src: "/images/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/images/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/images/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
