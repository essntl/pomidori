"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { JSONContent } from "@tiptap/react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, FilePlus, FileText, Hash, NotebookPen, Trash2, X } from "lucide-react";
import { useStore } from "@/app/lib/storage";
import {
  addTag,
  allTags,
  createPage,
  deletePage,
  foldersStore,
  importMarkdownPage,
  isBlankPage,
  movePageToFolder,
  notesStore,
  removeTag,
  updatePage,
  type NotePage,
} from "@/app/lib/stores/notes";
import { notesUIStore } from "@/app/lib/intents";
import { docToMarkdown } from "@/app/lib/markdown";
import { downloadText, pickTextFile } from "@/app/lib/backup";
import { notify } from "@/app/lib/alerts";
import { cn } from "@/app/lib/cn";
import { spring } from "@/app/lib/motion";
import { Card, EmptyState } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Modal } from "@/app/components/ui/Modal";
import type { TreeProps } from "@/app/components/notes/PageTree";
import { NotesSidebar } from "@/app/components/notes/NotesSidebar";
import { NoteEditor, activeEditorFlush } from "@/app/components/notes/NoteEditor";

const ICONS = ["📄", "📝", "📌", "💡", "✅", "📚", "🎯", "🚀", "🧠", "🗂️", "📅", "✨", "🔥", "🌱", "🎨", "🛠️", "💼", "🏠", "❤️", "⭐", "🍅", "🎵", "🧪", "📈"];

function htmlToText(html: string) {
  return html.replace(/<[^>]+>/g, " ");
}

function TagRow({ page, suggestions }: { page: NotePage; suggestions: string[] }) {
  const [adding, setAdding] = useState(false);
  const [value, setValue] = useState("");
  const tags = page.tags ?? [];

  const commit = () => {
    if (value.trim()) addTag(page.id, value);
    setValue("");
  };

  return (
    <div className="mb-4 flex flex-wrap items-center gap-1.5">
      {tags.map((t) => (
        <span key={t} className="flex items-center gap-0.5 rounded-md bg-surface-2 py-0.5 pr-1 pl-1.5 text-[12px] font-semibold text-fg-2">
          #{t}
          <button type="button" aria-label={`Remove tag ${t}`} onClick={() => removeTag(page.id, t)} className="rounded text-muted hover:text-fg">
            <X className="size-3" />
          </button>
        </span>
      ))}
      {adding ? (
        <input
          autoFocus
          list="note-tag-suggestions"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === "," || e.key === " ") {
              e.preventDefault();
              commit();
            } else if (e.key === "Escape") {
              setValue("");
              setAdding(false);
            } else if (e.key === "Backspace" && !value && tags.length) {
              removeTag(page.id, tags[tags.length - 1]);
            }
          }}
          onBlur={() => {
            commit();
            setAdding(false);
          }}
          placeholder="tag name"
          className="h-6 w-28 rounded-md bg-surface-2 px-1.5 text-[12px] text-fg ring-1 ring-accent/40 outline-none placeholder:text-muted"
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[12px] font-semibold text-muted transition-colors hover:bg-surface-2 hover:text-fg"
        >
          <Hash className="size-3" /> {tags.length ? "Add" : "Add tag"}
        </button>
      )}
      <datalist id="note-tag-suggestions">
        {suggestions.filter((t) => !tags.includes(t)).map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>
    </div>
  );
}

export default function NotesPage() {
  const pages = useStore(notesStore);
  const folders = useStore(foldersStore);
  const { selectedId, expanded } = useStore(notesUIStore);
  const [confirmDelete, setConfirmDelete] = useState<NotePage | null>(null);
  const [iconOpen, setIconOpen] = useState(false);
  const [wordCount, setWordCount] = useState<{ id: string; n: number } | null>(null);
  const focusEditor = useRef<(() => void) | null>(null);

  const page = pages.find((p) => p.id === selectedId) ?? null;

  /** Switch pages; a page left completely blank is discarded so "Untitled" pages don't pile up. */
  const select = useCallback((id: string | null) => {
    const prev = notesUIStore.get().selectedId;
    if (prev && prev !== id) {
      activeEditorFlush.current?.();
      const all = notesStore.get();
      const prevPage = all.find((p) => p.id === prev);
      if (prevPage && !prevPage.pinned && isBlankPage(prevPage, all)) deletePage(prev);
    }
    setIconOpen(false);
    notesUIStore.set((s) => ({ ...s, selectedId: id }));
  }, []);

  const sorted = useMemo(() => [...pages].sort((a, b) => a.createdAt - b.createdAt), [pages]);
  const roots = sorted.filter((p) => !p.parentId || !pages.some((x) => x.id === p.parentId));
  const tagSuggestions = useMemo(() => allTags(pages).map(([t]) => t), [pages]);

  const breadcrumbs = useMemo(() => {
    const chain: { id: string; label: string }[] = [];
    let cur = page;
    while (cur?.parentId) {
      cur = pages.find((p) => p.id === cur!.parentId) ?? null;
      if (cur) chain.unshift({ id: cur.id, label: `${cur.icon} ${cur.title || "Untitled"}` });
    }
    const folder = folders.find((f) => f.id === (chain.length ? pages.find((p) => p.id === chain[0].id)?.folderId : page?.folderId));
    return { chain, folder };
  }, [page, pages, folders]);

  function newPage(opts: { parentId?: string | null; folderId?: string | null } = {}) {
    const p = createPage({ parentId: opts.parentId ?? null, folderId: opts.folderId ?? null });
    if (opts.parentId) notesUIStore.set((s) => ({ ...s, expanded: { ...s.expanded, [opts.parentId!]: true } }));
    select(p.id);
  }

  function exportPage(p: NotePage) {
    const md =
      typeof p.content === "string" ? `# ${p.title}\n\n${htmlToText(p.content)}` : docToMarkdown(p.content as JSONContent, p.title || "Untitled");
    downloadText(`${(p.title || "untitled").replace(/[^\w\- ]+/g, "").trim() || "untitled"}.md`, md, "text/markdown");
  }

  async function importFile() {
    const file = await pickTextFile(".md,.markdown,.txt,text/markdown,text/plain");
    if (!file) return;
    const p = importMarkdownPage(file.name, file.text);
    select(p.id);
    notify({ title: "Imported", body: p.title, icon: "📥", tone: "success", duration: 2400 });
  }

  const tree: TreeProps = {
    pages: sorted,
    folders,
    selectedId,
    expanded,
    onSelect: (id) => select(id),
    onToggle: (id) => notesUIStore.set((s) => ({ ...s, expanded: { ...s.expanded, [id]: !s.expanded[id] } })),
    onAddChild: (id) => newPage({ parentId: id }),
    onPin: (p) => updatePage(p.id, { pinned: !p.pinned }),
    onExport: exportPage,
    onDelete: (p) => setConfirmDelete(p),
    onMove: (p, folderId) => movePageToFolder(p.id, folderId),
  };

  const onEditorReady = useCallback((focus: () => void) => {
    focusEditor.current = focus;
  }, []);

  const childCount = (id: string): number => pages.filter((p) => p.parentId === id).reduce((n, c) => n + 1 + childCount(c.id), 0);
  const words = page && wordCount?.id === page.id ? wordCount.n : null;

  return (
    <div className="grid grid-cols-1 gap-3 md:h-[calc(100dvh-10.75rem)] md:min-h-[460px] md:grid-cols-[256px_minmax(0,1fr)]">
      <NotesSidebar
        tree={tree}
        roots={roots}
        onNewPage={(o) => newPage({ folderId: o?.folderId ?? null })}
        onImport={importFile}
        className={cn("h-[calc(100dvh-10rem)] md:h-full", page && "max-md:hidden")}
      />

      {/* Editor */}
      <Card className={cn("min-h-[60dvh] min-w-0 md:h-full md:min-h-0 md:overflow-y-auto", !page && "max-md:hidden")}>
        <AnimatePresence mode="wait" initial={false}>
          {page ? (
            <motion.div
              key={page.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.08 } }}
              transition={spring.smooth}
              className="mx-auto max-w-3xl px-4 pt-4 pb-10 sm:px-8 md:px-12 md:pt-5"
            >
              {/* Meta line: location on the left, stats on the right */}
              <div className="mb-5 flex items-center gap-1 text-[12px] font-semibold text-muted">
                <button type="button" onClick={() => select(null)} className="-ml-1.5 grid size-7 place-items-center rounded-lg hover:bg-surface-2 md:hidden" aria-label="Back to pages">
                  <ChevronLeft className="size-5" />
                </button>
                <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
                  {breadcrumbs.folder && (
                    <>
                      <span className="truncate">{breadcrumbs.folder.name}</span>
                      <span>/</span>
                    </>
                  )}
                  {breadcrumbs.chain.map((b) => (
                    <span key={b.id} className="flex min-w-0 items-center gap-1">
                      <button type="button" onClick={() => select(b.id)} className="truncate rounded px-0.5 hover:bg-surface-2 hover:text-fg">
                        {b.label}
                      </button>
                      <span>/</span>
                    </span>
                  ))}
                  <span className="truncate text-fg-2">{page.title || "Untitled"}</span>
                </div>
                <span className="shrink-0 font-medium tabular-nums">
                  {words !== null && (
                    <>
                      {words} {words === 1 ? "word" : "words"}
                      <span className="mx-1.5 opacity-50">·</span>
                    </>
                  )}
                  Edited {new Date(page.updatedAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>

              <div className="relative mb-1">
                <button
                  type="button"
                  onClick={() => setIconOpen((o) => !o)}
                  className="-ml-1 grid size-12 place-items-center rounded-xl text-[34px] leading-none transition-colors hover:bg-surface-2"
                  aria-label="Change icon"
                >
                  {page.icon}
                </button>
                {iconOpen && <button type="button" aria-label="Close icon picker" className="fixed inset-0 z-10 cursor-default" onClick={() => setIconOpen(false)} />}
                <AnimatePresence>
                  {iconOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      transition={spring.snappy}
                      style={{ transformOrigin: "top left" }}
                      className="absolute top-full left-0 z-20 mt-1 grid w-72 grid-cols-8 gap-1 rounded-2xl border border-line bg-surface-solid p-2 shadow-pop"
                    >
                      {ICONS.map((i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            updatePage(page.id, { icon: i });
                            setIconOpen(false);
                          }}
                          className="grid aspect-square place-items-center rounded-lg text-xl hover:bg-surface-2"
                        >
                          {i}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <textarea
                value={page.title}
                onChange={(e) => updatePage(page.id, { title: e.target.value.replace(/\n/g, "") })}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || (e.key === "ArrowDown" && !e.shiftKey)) {
                    e.preventDefault();
                    focusEditor.current?.();
                  }
                }}
                placeholder="Untitled"
                rows={1}
                autoFocus={!page.title}
                className="mb-1.5 field-sizing-content w-full resize-none overflow-hidden bg-transparent text-[28px] leading-tight font-extrabold tracking-tight text-fg outline-none placeholder:text-muted/50 sm:text-[32px]"
              />

              <TagRow page={page} suggestions={tagSuggestions} />

              <NoteEditor key={page.id} page={page} onReady={onEditorReady} onWordCount={(n) => setWordCount({ id: page.id, n })} />

              {childCount(page.id) > 0 && (
                <div className="mt-6 border-t border-line pt-3">
                  <div className="mb-2 text-[11px] font-bold tracking-wider text-muted uppercase">Sub-pages</div>
                  <div className="flex flex-wrap gap-1.5">
                    {pages
                      .filter((p) => p.parentId === page.id)
                      .map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => select(c.id)}
                          className="flex items-center gap-1.5 rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-[13px] font-semibold text-fg hover:bg-surface-3"
                        >
                          <FileText className="size-3.5 text-muted" /> {c.icon} {c.title || "Untitled"}
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid h-full min-h-[50dvh] place-items-center">
              <EmptyState
                icon={<NotebookPen />}
                title={pages.length ? "Pick a page" : "Your notes live here"}
                hint="Type “/” for headings, to-dos, callouts and tables. Drag pages onto folders in the sidebar to sort them."
                action={
                  <Button variant="primary" onClick={() => newPage()}>
                    <FilePlus className="size-4" /> New page
                  </Button>
                }
              />
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete page?"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!confirmDelete) return;
                if (selectedId === confirmDelete.id) notesUIStore.set((s) => ({ ...s, selectedId: confirmDelete.parentId }));
                deletePage(confirmDelete.id);
                setConfirmDelete(null);
              }}
            >
              <Trash2 className="size-4" /> Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-fg-2">
          “{confirmDelete?.title || "Untitled"}”
          {confirmDelete && childCount(confirmDelete.id) > 0 ? ` and its ${childCount(confirmDelete.id)} sub-page(s)` : ""} will be removed from this
          browser. This can’t be undone.
        </p>
      </Modal>
    </div>
  );
}
