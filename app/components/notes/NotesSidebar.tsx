"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, FilePlus, Folder, FolderOpen, FolderPlus, Hash, MoreHorizontal, Pencil, Pin, Search, Trash2, Upload, X } from "lucide-react";
import {
  allTags,
  createFolder,
  deleteFolder,
  renameFolder,
  type NoteFolder,
  type NotePage,
} from "@/app/lib/stores/notes";
import { notesUIStore } from "@/app/lib/intents";
import { cn } from "@/app/lib/cn";
import { spring } from "@/app/lib/motion";
import { Card } from "../ui/Card";
import { IconButton } from "../ui/Button";
import { Menu } from "../ui/Menu";
import { QuickDelete } from "../ui/QuickDelete";
import { PAGE_DRAG_TYPE, PageTree, type TreeProps } from "./PageTree";

function hasPageDrag(e: React.DragEvent) {
  return e.dataTransfer.types.includes(PAGE_DRAG_TYPE);
}

function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex items-center gap-1.5 px-2 pt-2.5 pb-1 text-[11px] font-bold tracking-wider text-muted uppercase", className)}>{children}</div>;
}

function FolderRow({
  folder,
  count,
  open,
  renaming,
  onToggle,
  onRename,
  onStartRename,
  onNewPage,
  onDropPage,
  children,
}: {
  folder: NoteFolder;
  count: number;
  open: boolean;
  renaming: boolean;
  onToggle: () => void;
  onRename: (name: string) => void;
  onStartRename: () => void;
  onNewPage: () => void;
  onDropPage: (pageId: string) => void;
  children: React.ReactNode;
}) {
  const [over, setOver] = useState(false);
  const Icon = open ? FolderOpen : Folder;

  return (
    <li>
      <div
        onDragOver={(e) => {
          if (!hasPageDrag(e)) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          if (!over) setOver(true);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(false);
        }}
        onDrop={(e) => {
          setOver(false);
          const id = e.dataTransfer.getData(PAGE_DRAG_TYPE);
          if (id) onDropPage(id);
        }}
        className={cn(
          "group flex h-8 items-center gap-0.5 rounded-lg pr-1 text-[13.5px] font-semibold text-fg-2 transition-colors",
          over ? "bg-accent-soft text-accent ring-1 ring-accent/40" : "hover:bg-surface-2",
        )}
      >
        <button type="button" onClick={onToggle} aria-expanded={open} className="flex min-w-0 flex-1 items-center gap-1 pl-0.5 text-left">
          <span className="grid size-5 shrink-0 place-items-center text-muted">
            <ChevronRight className={cn("size-3.5 transition-transform duration-200", open && "rotate-90")} />
          </span>
          <Icon className={cn("size-4 shrink-0", over ? "text-accent" : "text-muted")} />
          {renaming ? (
            <input
              autoFocus
              defaultValue={folder.name}
              onClick={(e) => e.stopPropagation()}
              onBlur={(e) => onRename(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                if (e.key === "Escape") onRename(folder.name);
              }}
              className="ml-1 h-6 min-w-0 flex-1 rounded-md bg-surface-solid px-1.5 text-[13px] text-fg ring-1 ring-accent/50 outline-none"
            />
          ) : (
            <span className="ml-1 truncate" onDoubleClick={onStartRename}>
              {folder.name}
            </span>
          )}
        </button>
        {!renaming && <span className="px-1 text-[11px] font-bold text-muted tabular-nums group-hover:hidden">{count || ""}</span>}
        <div className="hidden items-center group-hover:flex group-focus-within:flex max-md:flex">
          <Menu
            trigger={(t) => (
              <button type="button" aria-label="Folder options" className="grid size-6 place-items-center rounded-md text-muted hover:bg-surface-3 hover:text-fg" {...t}>
                <MoreHorizontal className="size-4" />
              </button>
            )}
            items={[
              { label: "New page here", icon: <FilePlus />, onSelect: onNewPage },
              { label: "Rename", icon: <Pencil />, onSelect: onStartRename },
              "separator",
              { label: "Delete folder", hint: "keeps pages", icon: <Trash2 />, danger: true, onSelect: () => deleteFolder(folder.id) },
            ]}
          />
        </div>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={spring.smooth}
            className="overflow-hidden"
          >
            <div className="ml-[13px] border-l border-line pl-1">
              {count === 0 ? <p className="px-2 py-1 text-[12px] text-muted">Drag pages here</p> : children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

export function NotesSidebar({
  tree,
  roots,
  className,
  onNewPage,
  onImport,
}: {
  tree: TreeProps;
  roots: NotePage[];
  className?: string;
  onNewPage: (opts?: { folderId?: string | null }) => void;
  onImport: () => void;
}) {
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [unfiledOver, setUnfiledOver] = useState(false);
  const { pages, folders, expanded, selectedId } = tree;

  const tags = useMemo(() => allTags(pages), [pages]);
  const pinned = pages.filter((p) => p.pinned);
  const unfiled = roots.filter((p) => !p.folderId || !folders.some((f) => f.id === p.folderId));

  const results = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^#/, "");
    if (!q && !activeTag) return null;
    return pages.filter(
      (p) =>
        (!activeTag || (p.tags ?? []).includes(activeTag)) &&
        (!q || p.title.toLowerCase().includes(q) || p.text.toLowerCase().includes(q) || (p.tags ?? []).some((t) => t.includes(q))),
    );
  }, [query, activeTag, pages]);

  const folderOpen = (id: string) => expanded[`f:${id}`] !== false;
  const setFolderOpen = (id: string, open: boolean) =>
    notesUIStore.set((s) => ({ ...s, expanded: { ...s.expanded, [`f:${id}`]: open } }));

  return (
    <Card className={cn("flex min-h-0 flex-col", className)}>
      <div className="flex items-center justify-between px-3.5 pt-3 pb-2">
        <h1 className="text-[18px] font-extrabold tracking-tight text-fg">Notes</h1>
        <div className="flex gap-0.5">
          <IconButton size="sm" label="Import Markdown" onClick={onImport}>
            <Upload />
          </IconButton>
          <IconButton
            size="sm"
            label="New folder"
            onClick={() => {
              const f = createFolder("New folder");
              setRenamingId(f.id);
            }}
          >
            <FolderPlus />
          </IconButton>
          <IconButton size="sm" variant="soft" label="New page" onClick={() => onNewPage()}>
            <FilePlus />
          </IconButton>
        </div>
      </div>

      <div className="px-2.5 pb-1.5">
        <label className="flex h-8 items-center gap-2 rounded-lg bg-surface-2 px-2.5 text-muted focus-within:ring-2 focus-within:ring-accent/25">
          <Search className="size-3.5 shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes or #tags"
            className="min-w-0 flex-1 bg-transparent text-[13px] text-fg outline-none placeholder:text-muted"
          />
          {query && (
            <button type="button" aria-label="Clear search" onClick={() => setQuery("")} className="text-muted hover:text-fg">
              <X className="size-3.5" />
            </button>
          )}
        </label>
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 px-2.5 pb-1.5">
          {tags.slice(0, 12).map(([tag, n]) => (
            <button
              key={tag}
              type="button"
              onClick={() => setActiveTag((t) => (t === tag ? null : tag))}
              className={cn(
                "flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11.5px] font-semibold transition-colors",
                activeTag === tag ? "bg-accent text-white" : "bg-surface-2 text-fg-2 hover:bg-surface-3",
              )}
            >
              <Hash className="size-3" />
              {tag}
              <span className={cn("ml-0.5 text-[10px]", activeTag === tag ? "text-white/80" : "text-muted")}>{n}</span>
            </button>
          ))}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-1.5 pb-2">
        {results ? (
          results.length === 0 ? (
            <p className="px-2 py-3 text-[13px] text-muted">No matching pages.</p>
          ) : (
            <ul className="flex flex-col gap-px">
              {results.map((p) => (
                <li key={p.id} className="flex items-center gap-1 pr-1">
                  <button
                    type="button"
                    onClick={() => tree.onSelect(p.id)}
                    className={cn("flex min-w-0 flex-1 flex-col rounded-lg px-2 py-1.5 text-left hover:bg-surface-2", selectedId === p.id && "bg-surface-3")}
                  >
                    <span className="truncate text-[13.5px] font-semibold text-fg">
                      {p.icon} {p.title || "Untitled"}
                    </span>
                    <span className="truncate text-[11.5px] text-muted">{p.text.trim().slice(0, 70) || "Empty page"}</span>
                  </button>
                  <QuickDelete size="sm" label="Delete page" onDelete={() => tree.onQuickDelete(p)} />
                </li>
              ))}
            </ul>
          )
        ) : (
          <>
            {pinned.length > 0 && (
              <>
                <SectionLabel>
                  <Pin className="size-3" /> Pinned
                </SectionLabel>
                <ul className="flex flex-col gap-px">
                  {pinned.map((p) => (
                    <li key={p.id} className="flex items-center gap-1 pr-1">
                      <button
                        type="button"
                        onClick={() => tree.onSelect(p.id)}
                        className={cn(
                          "flex h-8 min-w-0 flex-1 items-center gap-1.5 rounded-lg px-2 text-left text-[13.5px] font-semibold transition-colors",
                          selectedId === p.id ? "bg-surface-3 text-fg" : "text-fg-2 hover:bg-surface-2",
                        )}
                      >
                        <span className="text-[14px]">{p.icon}</span>
                        <span className="truncate">{p.title || "Untitled"}</span>
                      </button>
                      <QuickDelete size="sm" label="Delete page" onDelete={() => tree.onQuickDelete(p)} />
                    </li>
                  ))}
                </ul>
              </>
            )}

            {folders.length > 0 && (
              <>
                <SectionLabel>Folders</SectionLabel>
                <ul className="flex flex-col gap-px">
                  {folders.map((f) => {
                    const inFolder = roots.filter((p) => p.folderId === f.id);
                    return (
                      <FolderRow
                        key={f.id}
                        folder={f}
                        count={inFolder.length}
                        open={folderOpen(f.id)}
                        renaming={renamingId === f.id}
                        onToggle={() => setFolderOpen(f.id, !folderOpen(f.id))}
                        onStartRename={() => setRenamingId(f.id)}
                        onRename={(name) => {
                          renameFolder(f.id, name);
                          setRenamingId(null);
                        }}
                        onNewPage={() => {
                          setFolderOpen(f.id, true);
                          onNewPage({ folderId: f.id });
                        }}
                        onDropPage={(id) => {
                          tree.onMove(pages.find((p) => p.id === id)!, f.id);
                          setFolderOpen(f.id, true);
                        }}
                      >
                        <PageTree roots={inFolder} {...tree} />
                      </FolderRow>
                    );
                  })}
                </ul>
              </>
            )}

            <div
              onDragOver={(e) => {
                if (!hasPageDrag(e)) return;
                e.preventDefault();
                if (!unfiledOver) setUnfiledOver(true);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setUnfiledOver(false);
              }}
              onDrop={(e) => {
                setUnfiledOver(false);
                const id = e.dataTransfer.getData(PAGE_DRAG_TYPE);
                const page = pages.find((p) => p.id === id);
                if (page && (page.folderId || page.parentId)) tree.onMove(page, null);
              }}
              className={cn("mt-0.5 min-h-12 rounded-lg transition-colors", unfiledOver && "bg-accent-soft ring-1 ring-accent/40")}
            >
              {(folders.length > 0 || pinned.length > 0) && <SectionLabel>Pages</SectionLabel>}
              {unfiled.length === 0 ? (
                <p className="px-2 py-1 text-[12px] text-muted">{pages.length ? "Everything is filed." : "No pages yet."}</p>
              ) : (
                <PageTree roots={unfiled} {...tree} />
              )}
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
