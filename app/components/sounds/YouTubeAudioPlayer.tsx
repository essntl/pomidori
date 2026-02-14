"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

type YouTubePlayerEvent = {
  data?: number;
};

export default function YouTubeAudioPlayer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);

  const createPlayer = () => {
    if (!containerRef.current) return;

    playerRef.current = new window.YT.Player(containerRef.current, {
      height: "390",
      width: "640",
      videoId: "9ytiyD_QA2s",
      playerVars: {
        playsinline: 1,
        autoplay: 0,
      },
      events: {
        onReady: () => {
          console.log("Player is ready");
        },
        onStateChange: (event: YouTubePlayerEvent) => {
          console.log("Player state changed:", event.data);
        },
      },
    });
  };

  useEffect(() => {
    if (window.YT && window.YT.Player) {
      createPlayer();
      return;
    }

    window.onYouTubeIframeAPIReady = () => {
      createPlayer();
    };

    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName("script")[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed bottom-0 right-0 opacity-0 pointer-events-none w-0 h-0"
      aria-hidden="true"
    />
  );
}
