"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { JSONContent } from "@tiptap/react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, FilePlus, FileText, NotebookPen, Pin, Search, Trash2, Upload } from "lucide-react";
import { useHydrated, useStore } from "@/app/lib/storage";
import { createPage, deletePage, importMarkdownPage, notesStore, updatePage, type NotePage } from "@/app/lib/stores/notes";
import { notesUIStore } from "@/app/lib/intents";
import { docToMarkdown } from "@/app/lib/markdown";
import { downloadText, pickTextFile } from "@/app/lib/backup";
import { notify } from "@/app/lib/alerts";
import { cn } from "@/app/lib/cn";
import { spring } from "@/app/lib/motion";
import { Card, EmptyState } from "@/app/components/ui/Card";
import { Button, IconButton } from "@/app/components/ui/Button";
import { Modal } from "@/app/components/ui/Modal";
import { PageTree } from "@/app/components/notes/PageTree";
import { NoteEditor } from "@/app/components/notes/NoteEditor";

const ICONS = ["📄", "📝", "📌", "💡", "✅", "📚", "🎯", "🚀", "🧠", "🗂️", "📅", "✨", "🔥", "🌱", "🎨", "🛠️", "💼", "🏠", "❤️", "⭐", "🍅", "🎵", "🧪", "📈"];

function htmlToText(html: string) {
  return html.replace(/<[^>]+>/g, " ");
}

export default function NotesPage() {
  const hydrated = useHydrated();
  const pages = useStore(notesStore);
  const { selectedId, expanded } = useStore(notesUIStore);
  const [query, setQuery] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<NotePage | null>(null);
  const [iconOpen, setIconOpen] = useState(false);
  const focusEditor = useRef<(() => void) | null>(null);

  const page = pages.find((p) => p.id === selectedId) ?? null;

  const select = useCallback((id: string | null) => {
    notesUIStore.set((s) => ({ ...s, selectedId: id }));
  }, []);

  const toggle = (id: string) => notesUIStore.set((s) => ({ ...s, expanded: { ...s.expanded, [id]: !s.expanded[id] } }));

  const sorted = useMemo(() => [...pages].sort((a, b) => a.createdAt - b.createdAt), [pages]);
  const roots = sorted.filter((p) => !p.parentId || !pages.some((x) => x.id === p.parentId));
  const pinned = sorted.filter((p) => p.pinned);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return sorted.filter((p) => p.title.toLowerCase().includes(q) || p.text.toLowerCase().includes(q));
  }, [query, sorted]);

  const breadcrumbs = useMemo(() => {
    const chain: NotePage[] = [];
    let cur = page;
    while (cur?.parentId) {
      cur = pages.find((p) => p.id === cur!.parentId) ?? null;
      if (cur) chain.unshift(cur);
    }
    return chain;
  }, [page, pages]);

  function newPage(parentId: string | null = null) {
    const p = createPage({ parentId });
    if (parentId) notesUIStore.set((s) => ({ ...s, expanded: { ...s.expanded, [parentId]: true } }));
    select(p.id);
  }

  function exportPage(p: NotePage) {
    const md =
      typeof p.content === "string"
        ? `# ${p.title}\n\n${htmlToText(p.content)}`
        : docToMarkdown(p.content as JSONContent, p.title || "Untitled");
    downloadText(`${(p.title || "untitled").replace(/[^\w\- ]+/g, "").trim() || "untitled"}.md`, md, "text/markdown");
  }

  async function importFile() {
    const file = await pickTextFile(".md,.markdown,.txt,text/markdown,text/plain");
    if (!file) return;
    const p = importMarkdownPage(file.name, file.text);
    select(p.id);
    notify({ title: "Imported", body: p.title, icon: "📥", tone: "success", duration: 2400 });
  }

  const treeProps = {
    pages: sorted,
    selectedId,
    expanded,
    onSelect: (id: string) => {
      select(id);
      setQuery("");
    },
    onToggle: toggle,
    onAddChild: (id: string) => newPage(id),
    onPin: (p: NotePage) => updatePage(p.id, { pinned: !p.pinned }),
    onExport: exportPage,
    onDelete: (p: NotePage) => setConfirmDelete(p),
  };

  const onEditorReady = useCallback((focus: () => void) => {
    focusEditor.current = focus;
  }, []);

  const childCount = (id: string): number => pages.filter((p) => p.parentId === id).reduce((n, c) => n + 1 + childCount(c.id), 0);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[272px_minmax(0,1fr)]">
      {/* Sidebar */}
      <Card className={cn("flex flex-col self-start md:sticky md:top-24 md:max-h-[calc(100dvh-8.5rem)]", page && "max-md:hidden")}>
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h1 className="text-[22px] font-extrabold tracking-tight text-fg">Notes</h1>
          <div className="flex gap-1">
            <IconButton size="sm" label="Import Markdown" onClick={importFile}>
              <Upload />
            </IconButton>
            <IconButton size="sm" variant="soft" label="New page" onClick={() => newPage()}>
              <FilePlus />
            </IconButton>
          </div>
        </div>
        <div className="px-3 pb-2">
          <label className="flex h-9 items-center gap-2 rounded-xl bg-surface-2 px-3 text-muted focus-within:ring-2 focus-within:ring-accent/25">
            <Search className="size-4 shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search notes"
              className="min-w-0 flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-muted"
            />
          </label>
        </div>
        <div className="min-h-40 flex-1 overflow-y-auto px-2 pb-3">
          {!hydrated ? null : results ? (
            results.length === 0 ? (
              <p className="px-3 py-4 text-sm text-muted">Nothing matches “{query}”.</p>
            ) : (
              <ul className="flex flex-col gap-0.5">
                {results.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => treeProps.onSelect(p.id)}
                      className="flex w-full flex-col rounded-xl px-3 py-2 text-left hover:bg-surface-2"
                    >
                      <span className="truncate text-sm font-semibold text-fg">
                        {p.icon} {p.title || "Untitled"}
                      </span>
                      <span className="truncate text-xs text-muted">{p.text.trim().slice(0, 80) || "Empty page"}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )
          ) : pages.length === 0 ? (
            <p className="px-3 py-4 text-sm text-muted">No pages yet.</p>
          ) : (
            <>
              {pinned.length > 0 && (
                <>
                  <div className="flex items-center gap-1.5 px-3 pt-2 pb-1 text-[11px] font-bold tracking-wider text-muted uppercase">
                    <Pin className="size-3" /> Pinned
                  </div>
                  <ul className="mb-2 flex flex-col gap-0.5">
                    {pinned.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => select(p.id)}
                          className={cn(
                            "flex h-9 w-full items-center gap-2 rounded-xl px-3 text-left text-[14px] font-semibold transition-colors",
                            selectedId === p.id ? "bg-surface-3 text-fg" : "text-fg-2 hover:bg-surface-2",
                          )}
                        >
                          <span>{p.icon}</span>
                          <span className="truncate">{p.title || "Untitled"}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="px-3 pt-1 pb-1 text-[11px] font-bold tracking-wider text-muted uppercase">All pages</div>
                </>
              )}
              <PageTree roots={roots} {...treeProps} />
            </>
          )}
        </div>
      </Card>

      {/* Editor */}
      <Card className={cn("min-h-[70dvh] min-w-0", !page && "max-md:hidden")}>
        <AnimatePresence mode="wait" initial={false}>
          {page ? (
            <motion.div
              key={page.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.08 } }}
              transition={spring.smooth}
              className="mx-auto max-w-3xl px-5 pt-5 pb-10 sm:px-10 md:px-16 md:pt-10"
            >
              <div className="mb-6 flex items-center gap-1 text-[13px] font-semibold text-muted">
                <button type="button" onClick={() => select(null)} className="mr-1 -ml-2 grid size-8 place-items-center rounded-lg hover:bg-surface-2 md:hidden" aria-label="Back to pages">
                  <ChevronLeft className="size-5" />
                </button>
                {breadcrumbs.map((b) => (
                  <span key={b.id} className="flex min-w-0 items-center gap-1">
                    <button type="button" onClick={() => select(b.id)} className="truncate rounded-md px-1 hover:bg-surface-2 hover:text-fg">
                      {b.icon} {b.title || "Untitled"}
                    </button>
                    <span>/</span>
                  </span>
                ))}
                <span className="truncate px-1">{page.title || "Untitled"}</span>
                <span className="ml-auto shrink-0 text-xs font-medium">
                  Edited {new Date(page.updatedAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>

              <div className="relative mb-2">
                <button
                  type="button"
                  onClick={() => setIconOpen((o) => !o)}
                  className="grid size-16 place-items-center rounded-2xl text-[44px] leading-none transition-colors hover:bg-surface-2"
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
                className="mb-4 field-sizing-content w-full resize-none overflow-hidden bg-transparent text-[34px] leading-tight font-extrabold tracking-tight text-fg outline-none placeholder:text-muted/50 sm:text-[40px]"
              />

              <NoteEditor key={page.id} page={page} onReady={onEditorReady} />

              {childCount(page.id) > 0 && (
                <div className="mt-6 border-t border-line pt-4">
                  <div className="mb-2 text-[11px] font-bold tracking-wider text-muted uppercase">Sub-pages</div>
                  <div className="flex flex-wrap gap-2">
                    {pages
                      .filter((p) => p.parentId === page.id)
                      .map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => select(c.id)}
                          className="flex items-center gap-2 rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm font-semibold text-fg hover:bg-surface-3"
                        >
                          <FileText className="size-4 text-muted" /> {c.icon} {c.title || "Untitled"}
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid min-h-[70dvh] place-items-center">
              <EmptyState
                icon={<NotebookPen />}
                title={pages.length ? "Pick a page" : "Your notes live here"}
                hint="Type “/” in a page for headings, to-dos, callouts, tables and more. Everything is saved in this browser."
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
                if (selectedId === confirmDelete.id) select(confirmDelete.parentId);
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
