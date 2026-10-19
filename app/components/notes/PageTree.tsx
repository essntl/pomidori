"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, Download, Folder, FolderMinus, MoreHorizontal, Pin, PinOff, Plus, Trash2 } from "lucide-react";
import type { NoteFolder, NotePage } from "@/app/lib/stores/notes";
import { cn } from "@/app/lib/cn";
import { spring } from "@/app/lib/motion";
import { Menu, type MenuItem } from "../ui/Menu";

/** MIME type used when dragging a page onto a folder. */
export const PAGE_DRAG_TYPE = "application/x-pomidori-page";

export type TreeProps = {
  pages: NotePage[];
  folders: NoteFolder[];
  selectedId: string | null;
  expanded: Record<string, boolean>;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  onAddChild: (parentId: string) => void;
  onPin: (page: NotePage) => void;
  onExport: (page: NotePage) => void;
  onDelete: (page: NotePage) => void;
  onMove: (page: NotePage, folderId: string | null) => void;
};

export function PageRow({ page, depth, ...p }: TreeProps & { page: NotePage; depth: number }) {
  const children = p.pages.filter((c) => c.parentId === page.id);
  const open = !!p.expanded[page.id];
  const selected = p.selectedId === page.id;

  const moveItems: MenuItem[] = [
    ...p.folders
      .filter((f) => f.id !== page.folderId || page.parentId)
      .map((f) => ({ label: `Move to ${f.name}`, icon: <Folder />, onSelect: () => p.onMove(page, f.id) })),
    ...(page.folderId || page.parentId ? [{ label: "Move out of folder", icon: <FolderMinus />, onSelect: () => p.onMove(page, null) }] : []),
  ];

  return (
    <li>
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData(PAGE_DRAG_TYPE, page.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        className={cn(
          "group relative flex h-8 cursor-pointer items-center gap-0.5 rounded-lg pr-1 text-[13.5px] transition-colors",
          selected ? "text-fg" : "text-fg-2 hover:bg-surface-2",
        )}
        style={{ paddingLeft: 2 + depth * 14 }}
      >
        {selected && <motion.span layoutId="note-selected" transition={spring.snappy} className="absolute inset-0 rounded-lg bg-surface-3" />}
        <button
          type="button"
          aria-label={open ? "Collapse" : "Expand"}
          onClick={() => p.onToggle(page.id)}
          className={cn("relative grid size-5 shrink-0 place-items-center rounded text-muted hover:bg-surface-3", !children.length && "invisible")}
        >
          <ChevronRight className={cn("size-3.5 transition-transform duration-200", open && "rotate-90")} />
        </button>
        <button type="button" onClick={() => p.onSelect(page.id)} className="relative flex min-w-0 flex-1 items-center gap-1.5 text-left">
          <span className="shrink-0 text-[14px] leading-none">{page.icon}</span>
          <span className={cn("truncate", selected ? "font-bold" : "font-semibold")}>{page.title || "Untitled"}</span>
        </button>
        <div className="relative flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 max-md:opacity-100">
          <Menu
            trigger={(t) => (
              <button type="button" aria-label="Page options" className="grid size-6 place-items-center rounded-md text-muted hover:bg-surface-3 hover:text-fg" {...t}>
                <MoreHorizontal className="size-4" />
              </button>
            )}
            items={[
              { label: page.pinned ? "Unpin" : "Pin to top", icon: page.pinned ? <PinOff /> : <Pin />, onSelect: () => p.onPin(page) },
              ...moveItems,
              { label: "Export as Markdown", icon: <Download />, onSelect: () => p.onExport(page) },
              "separator",
              { label: "Delete", icon: <Trash2 />, danger: true, onSelect: () => p.onDelete(page) },
            ]}
          />
          <button
            type="button"
            aria-label="Add sub-page"
            onClick={() => p.onAddChild(page.id)}
            className="grid size-6 place-items-center rounded-md text-muted hover:bg-surface-3 hover:text-fg"
          >
            <Plus className="size-4" />
          </button>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {open && children.length > 0 && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={spring.smooth}
            className="overflow-hidden"
          >
            {children.map((c) => (
              <PageRow key={c.id} page={c} depth={depth + 1} {...p} />
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </li>
  );
}

export function PageTree(props: TreeProps & { roots: NotePage[]; depth?: number }) {
  const { roots, depth = 0, ...rest } = props;
  return (
    <ul className="flex flex-col gap-px">
      {roots.map((page) => (
        <PageRow key={page.id} page={page} depth={depth} {...rest} />
      ))}
    </ul>
  );
}
