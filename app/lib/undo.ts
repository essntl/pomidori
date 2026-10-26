import { notify } from "./alerts";

/**
 * A short undo history for instant actions (e.g. Shift-click deletes that skip the confirm dialog).
 * In memory only; Ctrl/⌘ + Z outside a text field restores the latest entry.
 */
type Entry = { label: string; restore: () => void };

const stack: Entry[] = [];
const LIMIT = 20;

export function pushUndo(label: string, restore: () => void) {
  stack.push({ label, restore });
  if (stack.length > LIMIT) stack.shift();
}

export function undoLast() {
  const entry = stack.pop();
  if (!entry) return false;
  entry.restore();
  notify({ title: "Restored", body: entry.label, icon: "↩️", tone: "success", duration: 1800 });
  return true;
}

/** Re-insert `items` that were removed from `list`, each at its old index when possible. */
export function reinsert<T extends { id: string }>(list: T[], removed: { item: T; index: number }[]) {
  const next = [...list];
  for (const { item, index } of [...removed].sort((a, b) => a.index - b.index)) {
    if (next.some((x) => x.id === item.id)) continue;
    next.splice(Math.min(index, next.length), 0, item);
  }
  return next;
}

/** Diff two versions of a list and return what disappeared, with old positions. */
export function removedItems<T extends { id: string }>(before: T[], after: T[]) {
  const kept = new Set(after.map((x) => x.id));
  return before.flatMap((item, index) => (kept.has(item.id) ? [] : [{ item, index }]));
}

export function deletedNotice(label: string) {
  const mac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
  notify({ title: `Deleted “${label}”`, body: `${mac ? "⌘" : "Ctrl"} Z to undo`, icon: "🗑️", tone: "danger", duration: 2600 });
}
