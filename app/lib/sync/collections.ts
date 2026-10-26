import type { Store } from "../storage";
import { notesStore, foldersStore } from "../stores/notes";
import { tasksStore } from "../stores/tasks";
import { eventsStore } from "../stores/events";
import { habitsStore } from "../stores/habits";
import { sessionsStore } from "../stores/sessions";
import { settingsStore } from "../stores/settings";
import { dashboardStore } from "../stores/dashboard";
import { playerStore } from "../player/controller";
import { timerSettingsStore } from "@/app/context/TimerContext";

/**
 * What gets synced, described as collections of items with stable ids. The engine merges
 * per item, so edits to different notes/tasks on different devices never overwrite each other.
 *
 * Not synced (device-specific): the music queue and volume, the running timer, ambient sound
 * and which note is open.
 */

export type SyncItem = { id: string; value: unknown };

export type Collection = {
  name: string;
  store: Store<unknown>;
  /** Items in their current order. */
  read: (state: unknown) => SyncItem[];
  /** Rebuild the store state from the merged items (in order). */
  write: (state: unknown, items: SyncItem[]) => unknown;
  /** Keep the user's manual order across devices. */
  ordered: boolean;
};

type WithId = { id: string };

function list<S>(name: string, store: Store<S>, pick: (s: S) => WithId[], put: (s: S, items: WithId[]) => S, ordered = true): Collection {
  return {
    name,
    store: store as Store<unknown>,
    ordered,
    read: (s) => pick(s as S).map((x) => ({ id: x.id, value: x })),
    write: (s, items) => put(s as S, items.map((i) => i.value as WithId)),
  };
}

const arrayList = <T extends WithId>(name: string, store: Store<T[]>, ordered = true) =>
  list(name, store, (s) => s, (_, items) => items as T[], ordered);

/** A whole store kept as one item (settings-like data): the newest version wins. */
function single<S>(name: string, store: Store<S>): Collection {
  return {
    name,
    store: store as Store<unknown>,
    ordered: false,
    read: (s) => [{ id: "value", value: s }],
    write: (s, items) => (items.find((i) => i.id === "value")?.value ?? s) as S,
  };
}

export const COLLECTIONS: Collection[] = [
  arrayList("notes", notesStore, false),
  arrayList("note-folders", foldersStore),
  list("tasks", tasksStore, (s) => s.tasks, (s, items) => ({ ...s, tasks: items as typeof s.tasks })),
  list("task-lists", tasksStore, (s) => s.lists, (s, items) => ({ ...s, lists: items as typeof s.lists })),
  arrayList("events", eventsStore, false),
  arrayList("habits", habitsStore),
  arrayList("sessions", sessionsStore, false),
  list("playlists", playerStore, (s) => s.playlists, (s, items) => ({ ...s, playlists: items as typeof s.playlists })),
  single("settings", settingsStore),
  single("timer-settings", timerSettingsStore),
  single("dashboard", dashboardStore),
];

export const ORDER_ID = "__order__";

/** Current items of a collection by id, plus a synthetic order item for ordered collections. */
export function snapshot(c: Collection) {
  const items = c.read(c.store.get());
  const map = new Map<string, unknown>();
  for (const it of items) map.set(it.id, it.value);
  if (c.ordered) map.set(ORDER_ID, items.map((i) => i.id));
  return map;
}
