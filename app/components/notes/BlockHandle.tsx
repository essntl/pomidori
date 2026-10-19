"use client";

import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { NodeSelection } from "@tiptap/pm/state";
import { GripVertical, Plus } from "lucide-react";
import { cn } from "@/app/lib/cn";

/** Find the top-level block element under a vertical position. */
function blockAt(editor: Editor, y: number): HTMLElement | null {
  const children = Array.from(editor.view.dom.children) as HTMLElement[];
  for (const el of children) {
    const r = el.getBoundingClientRect();
    if (y >= r.top - 4 && y <= r.bottom + 4) return el;
  }
  return null;
}

function blockStart(editor: Editor, el: HTMLElement) {
  const view = editor.view;
  const inside = view.posAtDOM(el, 0);
  const $pos = view.state.doc.resolve(inside);
  return $pos.depth > 0 ? $pos.before(1) : inside;
}

/**
 * Notion-style gutter: hovering a block shows "+" (insert a block below and open the
 * "/" menu) and a grip that drags the block to a new position.
 */
export function BlockHandle({ editor, container }: { editor: Editor; container: React.RefObject<HTMLDivElement | null> }) {
  const [target, setTarget] = useState<{ el: HTMLElement; top: number } | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = container.current;
    if (!wrap) return;

    function onMove(e: MouseEvent) {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      if (handleRef.current?.contains(e.target as Node)) return;
      const el = blockAt(editor, e.clientY);
      if (!el) return;
      const wrapRect = wrap!.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 24;
      const firstLine = el.tagName === "HR" ? r.height : Math.min(r.height, lineHeight);
      setTarget({ el, top: r.top - wrapRect.top + firstLine / 2 });
    }
    function onLeave() {
      hideTimer.current = setTimeout(() => setTarget(null), 250);
    }
    wrap.addEventListener("mousemove", onMove);
    wrap.addEventListener("mouseleave", onLeave);
    return () => {
      wrap.removeEventListener("mousemove", onMove);
      wrap.removeEventListener("mouseleave", onLeave);
    };
  }, [editor, container]);

  // Hide while typing.
  useEffect(() => {
    const hide = () => setTarget(null);
    editor.on("update", hide);
    return () => {
      editor.off("update", hide);
    };
  }, [editor]);

  if (!target || !editor.isEditable) return null;

  function insertBelow() {
    if (!target) return;
    const start = blockStart(editor, target.el);
    const node = editor.state.doc.nodeAt(start);
    if (!node) return;
    const end = start + node.nodeSize;
    const isEmptyParagraph = node.type.name === "paragraph" && node.content.size === 0;
    if (isEmptyParagraph) {
      editor.chain().focus(start + 1).insertContent("/").run();
    } else {
      editor.chain().insertContentAt(end, { type: "paragraph" }).focus(end + 1).insertContent("/").run();
    }
    setTarget(null);
  }

  function onDragStart(e: React.DragEvent) {
    if (!target) return;
    const view = editor.view;
    const start = blockStart(editor, target.el);
    const nodeSel = NodeSelection.create(view.state.doc, start);
    view.dispatch(view.state.tr.setSelection(nodeSel));
    // Take the slice from our own NodeSelection: plugins (e.g. tables) may normalise the
    // editor selection into something else, which would turn the move into a copy.
    const slice = nodeSel.content();
    const ser = (view as unknown as { serializeForClipboard?: (s: typeof slice) => { dom: HTMLElement; text: string } }).serializeForClipboard;
    const serialized = ser ? ser.call(view, slice) : null;
    e.dataTransfer.clearData();
    e.dataTransfer.setData("text/html", serialized?.dom.innerHTML ?? target.el.outerHTML);
    e.dataTransfer.setData("text/plain", serialized?.text ?? target.el.textContent ?? "");
    e.dataTransfer.effectAllowed = "copyMove";
    e.dataTransfer.setDragImage(target.el, 0, 0);
    // ProseMirror reads `view.dragging` on drop; `node` tells it exactly which block to remove,
    // so the block is moved rather than copied.
    Object.assign(view, { dragging: { slice, move: true, node: nodeSel } });
  }

  return (
    <div
      ref={handleRef}
      className="absolute left-0 z-10 hidden -translate-y-1/2 items-center gap-0.5 text-muted md:flex"
      style={{ top: target.top }}
      onMouseEnter={() => hideTimer.current && clearTimeout(hideTimer.current)}
    >
      <button
        type="button"
        aria-label="Insert block below"
        title="Insert block below"
        onClick={insertBelow}
        className="grid size-6 place-items-center rounded-md transition-colors hover:bg-surface-2 hover:text-fg"
      >
        <Plus className="size-4" />
      </button>
      <div
        draggable
        onDragStart={onDragStart}
        onDragEnd={() => setTarget(null)}
        role="button"
        aria-label="Drag to move block"
        title="Drag to move"
        className={cn("grid h-6 w-5 cursor-grab place-items-center rounded-md transition-colors hover:bg-surface-2 hover:text-fg active:cursor-grabbing")}
      >
        <GripVertical className="size-4" />
      </div>
    </div>
  );
}
