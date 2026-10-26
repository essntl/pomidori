"use client";

import { useRef, useState, type ReactNode } from "react";
import { motion, useDragControls } from "framer-motion";
import { EyeOff, GripVertical, Plus } from "lucide-react";
import {
  MAX_SPAN,
  WIDGET_NAMES,
  moveWidget,
  resizeWidget,
  setWidgetHidden,
  type WidgetId,
  type WidgetLayout,
} from "@/app/lib/stores/dashboard";
import { cn } from "@/app/lib/cn";
import { list, listItem, spring } from "@/app/lib/motion";

// Literal class names so Tailwind picks them up. Phones are always one column.
const COL_SPAN = ["", "", "md:col-span-2", "md:col-span-2 xl:col-span-3"];
const ROW_SPAN = ["", "", "md:row-span-2", "md:row-span-3"];

/** Current column count and gap of the grid, read from the computed style so it tracks breakpoints. */
function gridMetrics(grid: HTMLElement) {
  const style = getComputedStyle(grid);
  const cols = style.gridTemplateColumns.split(" ").filter(Boolean).length || 1;
  const gap = parseFloat(style.columnGap) || 16;
  const colWidth = (grid.clientWidth - gap * (cols - 1)) / cols;
  return { cols, gap, colWidth };
}

/** Pause after a swap while widgets animate into place. */
const SETTLE_MS = 280;

function WidgetFrame({
  item,
  index,
  prevIndex,
  nextIndex,
  editing,
  gridRef,
  children,
}: {
  item: WidgetLayout;
  index: number;
  /** Positions of the neighbouring visible widgets, so keyboard moves skip hidden ones. */
  prevIndex: number;
  nextIndex: number;
  editing: boolean;
  gridRef: React.RefObject<HTMLDivElement | null>;
  children: ReactNode;
}) {
  const controls = useDragControls();
  const frameRef = useRef<HTMLDivElement>(null);
  const lastTarget = useRef<string | null>(null);
  const lastMove = useRef(0);
  const resize = useRef<{ x: number; y: number; w: number; h: number; cols: number; colStep: number; rowStep: number } | null>(null);
  const [lifted, setLifted] = useState(false);
  const [resizing, setResizing] = useState(false);

  function startResize(e: React.PointerEvent<HTMLDivElement>) {
    const grid = gridRef.current;
    const frame = frameRef.current;
    if (!grid || !frame) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const { cols, gap, colWidth } = gridMetrics(grid);
    const rect = frame.getBoundingClientRect();
    resize.current = {
      x: e.clientX,
      y: e.clientY,
      w: Math.min(item.w, cols),
      h: item.h,
      cols,
      colStep: colWidth + gap,
      rowStep: (rect.height + gap) / item.h,
    };
    setResizing(true);
  }

  function onResizeMove(e: React.PointerEvent<HTMLDivElement>) {
    const r = resize.current;
    if (!r) return;
    const w = Math.max(1, Math.min(r.cols, r.w + Math.round((e.clientX - r.x) / r.colStep)));
    const h = Math.max(1, Math.min(MAX_SPAN, r.h + Math.round((e.clientY - r.y) / r.rowStep)));
    // On a narrower screen, keep the saved (wider) width unless the user actually changed it.
    resizeWidget(item.id, w === r.w ? item.w : w, h);
  }

  function endResize() {
    resize.current = null;
    setResizing(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!editing || e.target !== e.currentTarget) return;
    const grid = gridRef.current;
    const cols = grid ? gridMetrics(grid).cols : MAX_SPAN;
    const w = Math.min(item.w, cols);
    const keys: Record<string, () => void> = e.shiftKey
      ? {
          ArrowRight: () => resizeWidget(item.id, Math.min(cols, w + 1), item.h),
          ArrowLeft: () => resizeWidget(item.id, w - 1, item.h),
          ArrowDown: () => resizeWidget(item.id, item.w, item.h + 1),
          ArrowUp: () => resizeWidget(item.id, item.w, item.h - 1),
        }
      : {
          ArrowRight: () => moveWidget(item.id, nextIndex),
          ArrowDown: () => moveWidget(item.id, nextIndex),
          ArrowLeft: () => moveWidget(item.id, prevIndex),
          ArrowUp: () => moveWidget(item.id, prevIndex),
          Delete: () => setWidgetHidden(item.id, true),
          Backspace: () => setWidgetHidden(item.id, true),
        };
    const run = keys[e.key];
    if (!run) return;
    e.preventDefault();
    run();
    // Keep keyboard focus on the widget after it moves.
    requestAnimationFrame(() => frameRef.current?.focus());
  }

  return (
    <motion.div
      ref={frameRef}
      data-widget={item.id}
      variants={listItem}
      layout="position"
      transition={spring.smooth}
      drag={editing}
      dragControls={controls}
      dragListener={false}
      dragSnapToOrigin
      dragMomentum={false}
      whileDrag={{ scale: 1.02, boxShadow: "var(--shadow-pop)" }}
      onDragStart={() => {
        lastTarget.current = null;
        setLifted(true);
      }}
      onDrag={(e, info) => {
        const pe = e as PointerEvent;
        const x = typeof pe.clientX === "number" ? pe.clientX : info.point.x - window.scrollX;
        const y = typeof pe.clientY === "number" ? pe.clientY : info.point.y - window.scrollY;
        // Nudge the page when dragging near the top or bottom edge.
        if (y < 72) window.scrollBy(0, -14);
        else if (y > window.innerHeight - 72) window.scrollBy(0, 14);
        const target = document
          .elementsFromPoint(x, y)
          .map((n) => (n as HTMLElement).closest<HTMLElement>("[data-widget]"))
          .find((n) => n && n.dataset.widget !== item.id);
        const id = target?.dataset.widget ?? null;
        // Swap once per widget entered, and let the grid settle first so neighbours don't ping-pong.
        const settling = performance.now() - lastMove.current < SETTLE_MS;
        if (settling) return;
        if (id && id !== lastTarget.current) {
          const to = Number(target!.dataset.index);
          if (!Number.isNaN(to)) {
            moveWidget(item.id, to);
            lastMove.current = performance.now();
          }
        }
        lastTarget.current = id;
      }}
      onDragEnd={() => setTimeout(() => setLifted(false), 450)}
      onPointerDown={(e) => {
        if (!editing || e.button !== 0) return;
        const t = e.target as HTMLElement;
        if (t.closest("[data-no-drag]")) return;
        // Touch drags start from the grip only, so the page can still scroll.
        if (e.pointerType !== "mouse" && !t.closest("[data-grip]")) return;
        controls.start(e);
      }}
      onKeyDown={onKeyDown}
      tabIndex={editing ? 0 : undefined}
      aria-label={editing ? `${WIDGET_NAMES[item.id]} widget. Arrow keys move it, Shift + arrows resize it.` : undefined}
      data-index={index}
      className={cn(
        "relative flex min-w-0 flex-col rounded-card border border-line bg-surface shadow-card",
        COL_SPAN[item.w],
        ROW_SPAN[item.h],
        editing && "cursor-grab outline-2 outline-offset-2 outline-dashed select-none focus-visible:outline-solid active:cursor-grabbing",
        editing && (lifted ? "outline-transparent" : "outline-accent/40 focus-visible:outline-accent"),
        (lifted || resizing) && "z-30",
      )}
    >
      <div inert={editing} className="flex min-h-0 flex-1 flex-col">
        {children}
      </div>

      {editing && (
        <>
          <div className="absolute top-2 right-2 z-10 flex items-center gap-0.5 rounded-xl border border-line bg-surface-solid p-0.5 shadow-card">
            <span data-grip className="grid size-7 cursor-grab touch-none place-items-center rounded-lg text-muted active:cursor-grabbing" title="Drag to move">
              <GripVertical className="size-4" />
            </span>
            <button
              type="button"
              data-no-drag
              aria-label={`Hide ${WIDGET_NAMES[item.id]}`}
              title="Hide widget"
              onClick={() => setWidgetHidden(item.id, true)}
              className="grid size-7 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-fg"
            >
              <EyeOff className="size-4" />
            </button>
          </div>
          <span className="pointer-events-none absolute bottom-2 left-3 rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] font-bold text-muted tabular-nums max-md:hidden">
            {item.w} × {item.h}
          </span>
          <div
            data-no-drag
            role="presentation"
            title="Drag to resize"
            onPointerDown={startResize}
            onPointerMove={onResizeMove}
            onPointerUp={endResize}
            onPointerCancel={endResize}
            className="absolute right-0 bottom-0 z-10 grid size-7 cursor-nwse-resize touch-none place-items-center max-md:hidden"
          >
            <svg viewBox="0 0 10 10" className={cn("size-3 transition-colors", resizing ? "text-accent" : "text-muted")} aria-hidden>
              <path d="M9 1 1 9M9 5 5 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" />
            </svg>
          </div>
        </>
      )}
    </motion.div>
  );
}

/** The home page grid: widgets can be dragged to reorder and resized from their corner while `editing`. */
export function WidgetGrid({
  layout,
  editing,
  render,
}: {
  layout: WidgetLayout[];
  editing: boolean;
  render: (item: WidgetLayout) => ReactNode;
}) {
  const gridRef = useRef<HTMLDivElement>(null);
  const hidden = layout.filter((w) => w.hidden);
  const visible = layout.flatMap((w, i) => (w.hidden ? [] : [i]));

  return (
    <>
      <motion.div
        ref={gridRef}
        variants={list}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 gap-4 md:auto-rows-[minmax(9.5rem,auto)] md:grid-cols-2 xl:grid-cols-3"
      >
        {visible.map((index, v) => {
          const item = layout[index];
          return (
            <WidgetFrame
              key={item.id}
              item={item}
              index={index}
              prevIndex={visible[Math.max(0, v - 1)]}
              nextIndex={visible[Math.min(visible.length - 1, v + 1)]}
              editing={editing}
              gridRef={gridRef}
            >
              {render(item)}
            </WidgetFrame>
          );
        })}
      </motion.div>

      {editing && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring.smooth}
          className="mt-4 flex flex-wrap items-center gap-2 rounded-card border border-dashed border-line px-4 py-3"
        >
          <span className="mr-1 text-[12px] font-bold tracking-wider text-muted uppercase">Hidden</span>
          {hidden.length === 0 ? (
            <span className="text-[13px] text-muted">Nothing hidden. Use the eye button on a widget to tuck it away.</span>
          ) : (
            hidden.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => setWidgetHidden(w.id as WidgetId, false)}
                className="flex items-center gap-1 rounded-full bg-surface-2 px-3 py-1.5 text-[13px] font-semibold text-fg-2 transition-colors hover:bg-surface-3 hover:text-fg"
              >
                <Plus className="size-3.5" /> {WIDGET_NAMES[w.id]}
              </button>
            ))
          )}
        </motion.div>
      )}
    </>
  );
}
