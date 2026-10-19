import { createStore } from "../storage";
import { uid } from "../id";

export type FocusSession = {
  id: string;
  start: number;
  end: number;
  minutes: number;
  taskId: string | null;
};

export const sessionsStore = createStore<FocusSession[]>("sessions", []);

export function logSession(start: number, end: number, taskId: string | null) {
  const minutes = Math.max(1, Math.round((end - start) / 60000));
  sessionsStore.set((all) => [...all, { id: uid(), start, end, minutes, taskId }]);
}
