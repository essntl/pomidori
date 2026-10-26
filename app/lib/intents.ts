import { useEffect, useRef } from "react";
import { createMemoryStore, createStore } from "./storage";

/** Which note page is open (persisted so the notes page reopens where you left off). */
export const notesUIStore = createStore<{ selectedId: string | null; expanded: Record<string, boolean> }>("notes-ui", {
  selectedId: null,
  expanded: {},
});

/** One-shot requests from elsewhere in the app (e.g. command palette → "new event"). */
export const intentStore = createMemoryStore<{ newEvent: boolean; newHabit: boolean; youtubeCheck: boolean }>({ newEvent: false, newHabit: false, youtubeCheck: false });

type IntentKey = "newEvent" | "newHabit" | "youtubeCheck";

/** Run `onFire` once whenever the intent is raised (on mount, or later while mounted). */
export function useIntent(key: IntentKey, onFire: () => void) {
  const fire = useRef(onFire);
  useEffect(() => {
    fire.current = onFire;
  });
  useEffect(() => {
    const check = () => {
      if (!intentStore.get()[key]) return;
      intentStore.set((s) => ({ ...s, [key]: false }));
      fire.current();
    };
    check();
    return intentStore.subscribe(check);
  }, [key]);
}

/** Ask the Tasks page to show a task where it lives and open its editor (from search, home, etc.). */
export const openTaskStore = createMemoryStore<{ id: string | null }>({ id: null });

export function requestOpenTask(id: string) {
  openTaskStore.set({ id });
}
