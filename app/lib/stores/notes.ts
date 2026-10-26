import type { JSONContent } from "@tiptap/react";
import { createStore } from "../storage";
import { uid } from "../id";
import { deletedNotice, pushUndo, reinsert, removedItems } from "../undo";
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
  /** Folder for top-level pages (sub-pages live under their parent). Missing on older data. */
  folderId?: string | null;
  /** Lower-case tags without "#". Missing on older data. */
  tags?: string[];
  createdAt: number;
  updatedAt: number;
};

export type NoteFolder = { id: string; name: string; createdAt: number };

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
    folderId: null,
    tags: [],
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

/** A page counts as blank when it has no title, no text and no sub-pages. */
export function isBlankPage(page: NotePage, all: NotePage[]) {
  return !page.title.trim() && !page.text.trim() && !all.some((p) => p.parentId === page.id);
}

/* ───────────── Folders ───────────── */

export const foldersStore = createStore<NoteFolder[]>("note-folders", []);

export function createFolder(name: string) {
  const folder: NoteFolder = { id: uid(), name: name.trim() || "New folder", createdAt: Date.now() };
  foldersStore.set((all) => [...all, folder]);
  return folder;
}

export function renameFolder(id: string, name: string) {
  foldersStore.set((all) => all.map((f) => (f.id === id ? { ...f, name: name.trim() || f.name } : f)));
}

/** Removes the folder; its pages move back to the unfiled list. */
export function deleteFolder(id: string) {
  foldersStore.set((all) => all.filter((f) => f.id !== id));
  notesStore.set((all) => all.map((p) => (p.folderId === id ? { ...p, folderId: null } : p)));
}

/** File a page into a folder (null = unfiled). A sub-page becomes a top-level page in that folder. */
export function movePageToFolder(pageId: string, folderId: string | null) {
  notesStore.set((all) => all.map((p) => (p.id === pageId ? { ...p, folderId, parentId: null } : p)));
}

/* ───────────── Tags ───────────── */

export function normalizeTag(raw: string) {
  return raw.trim().replace(/^#+/, "").toLowerCase().replace(/\s+/g, "-").slice(0, 32);
}

export function addTag(pageId: string, raw: string) {
  const tag = normalizeTag(raw);
  if (!tag) return;
  notesStore.set((all) =>
    all.map((p) => (p.id === pageId && !(p.tags ?? []).includes(tag) ? { ...p, tags: [...(p.tags ?? []), tag] } : p)),
  );
}

export function removeTag(pageId: string, tag: string) {
  notesStore.set((all) => all.map((p) => (p.id === pageId ? { ...p, tags: (p.tags ?? []).filter((t) => t !== tag) } : p)));
}

export function allTags(pages: NotePage[]) {
  const counts = new Map<string, number>();
  for (const p of pages) for (const t of p.tags ?? []) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

/** Delete without confirmation; Ctrl/⌘ Z brings the page (and its sub-pages) back. */
export function quickDeletePage(id: string) {
  const before = notesStore.get();
  const page = before.find((p) => p.id === id);
  if (!page) return;
  deletePage(id);
  const removed = removedItems(before, notesStore.get());
  pushUndo(page.title || "Untitled", () => notesStore.set((all) => reinsert(all, removed)));
  deletedNotice(page.title || "Untitled");
}
