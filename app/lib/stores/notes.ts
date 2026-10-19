import type { JSONContent } from "@tiptap/react";
import { createStore } from "../storage";
import { uid } from "../id";
import { markdownToHtml, stripMarkdown } from "../markdown";

export type NotePage = {
  id: string;
  title: string;
  icon: string;
  parentId: string | null;
  /** TipTap JSON, or HTML for pages migrated/imported and not yet edited. */
  content: JSONContent | string;
  /** Plain-text excerpt for search and previews. */
  text: string;
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
};

type LegacyNote = { id: number; title: string; content: string };

/** One-time migration of the old Markdown notes (`localStorage["notes"]`). The old key is left untouched. */
function seedFromLegacy(): NotePage[] | undefined {
  try {
    const raw = localStorage.getItem("notes");
    if (!raw) return undefined;
    const legacy = JSON.parse(raw) as LegacyNote[];
    if (!Array.isArray(legacy) || legacy.length === 0) return undefined;
    return legacy.map((n, i) => ({
      id: uid(),
      title: n.title || "Untitled",
      icon: "📝",
      parentId: null,
      content: markdownToHtml(n.content || ""),
      text: stripMarkdown(n.content || "").slice(0, 300),
      pinned: false,
      createdAt: typeof n.id === "number" ? n.id : Date.now() - i,
      updatedAt: typeof n.id === "number" ? n.id : Date.now() - i,
    }));
  } catch {
    return undefined;
  }
}

export const notesStore = createStore<NotePage[]>("notes", [], { seed: seedFromLegacy });

export function createPage(partial: Partial<NotePage> = {}) {
  const now = Date.now();
  const page: NotePage = {
    id: uid(),
    title: "",
    icon: "📄",
    parentId: null,
    content: "",
    text: "",
    pinned: false,
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
  notesStore.set((all) => [...all, page]);
  return page;
}

export function updatePage(id: string, patch: Partial<NotePage>) {
  notesStore.set((all) => all.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: Date.now() } : p)));
}

/** Deletes a page and all of its descendants. */
export function deletePage(id: string) {
  notesStore.set((all) => {
    const doomed = new Set([id]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const p of all) {
        if (p.parentId && doomed.has(p.parentId) && !doomed.has(p.id)) {
          doomed.add(p.id);
          grew = true;
        }
      }
    }
    return all.filter((p) => !doomed.has(p.id));
  });
}

export function importMarkdownPage(filename: string, md: string, parentId: string | null = null) {
  const heading = md.match(/^#\s+(.+)\n/);
  const title = heading ? heading[1].trim() : filename.replace(/\.(md|markdown|txt)$/i, "");
  const body = heading ? md.slice(heading[0].length) : md;
  return createPage({ title, parentId, content: markdownToHtml(body), text: stripMarkdown(body).slice(0, 300) });
}
