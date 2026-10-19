"use client";

import { useEffect, useRef } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import Highlight from "@tiptap/extension-highlight";
import Typography from "@tiptap/extension-typography";
import { TableKit } from "@tiptap/extension-table";
import { updatePage, type NotePage } from "@/app/lib/stores/notes";
import { Callout, SlashCommand } from "./extensions";
import { BubbleToolbar } from "./BubbleToolbar";
import { BlockHandle } from "./BlockHandle";

/** Saves the open editor's debounced changes immediately (used before switching pages). */
export const activeEditorFlush: { current: (() => void) | null } = { current: null };

function words(text: string) {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

/** The block editor for one page. Mount with `key={page.id}` so each page gets a fresh editor. */
export function NoteEditor({
  page,
  onReady,
  onWordCount,
}: {
  page: NotePage;
  onReady?: (focus: () => void) => void;
  onWordCount?: (words: number) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<(() => void) | null>(null);
  const onWordCountRef = useRef(onWordCount);
  useEffect(() => {
    onWordCountRef.current = onWordCount;
  });

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: { openOnClick: false, autolink: true, defaultProtocol: "https" },
        dropcursor: { color: "var(--accent)", width: 3 },
      }),
      Placeholder.configure({
        includeChildren: false,
        placeholder: ({ node }) =>
          node.type.name === "heading" ? `Heading ${node.attrs.level}` : "Write something, or press “/” for blocks…",
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight,
      Typography,
      TableKit.configure({ table: { resizable: true, allowTableNodeSelection: true } }),
      Callout,
      SlashCommand,
    ],
    content: page.content || "",
    editorProps: {
      attributes: { class: "prose-editor", spellcheck: "true" },
    },
    onUpdate: ({ editor: e }) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      const save = () => {
        const text = e.getText();
        updatePage(page.id, { content: e.getJSON(), text: text.slice(0, 400) });
        onWordCountRef.current?.(words(text));
        pending.current = null;
      };
      pending.current = save;
      saveTimer.current = setTimeout(save, 400);
    },
  });

  // Flush unsaved edits when switching pages or leaving; also let the page flush on demand.
  useEffect(() => {
    const flush = () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      pending.current?.();
    };
    activeEditorFlush.current = flush;
    return () => {
      if (activeEditorFlush.current === flush) activeEditorFlush.current = null;
      flush();
    };
  }, []);

  useEffect(() => {
    if (editor && onReady) onReady(() => editor.commands.focus("start"));
  }, [editor, onReady]);

  // Report the full word count once the editor has loaded the page.
  useEffect(() => {
    if (editor) onWordCountRef.current?.(words(editor.getText()));
  }, [editor]);

  return (
    <div>
      <div ref={wrapRef} className="relative md:-ml-14 md:pl-14">
        {editor && <BlockHandle editor={editor} container={wrapRef} />}
        <EditorContent editor={editor} />
        {editor && <BubbleToolbar editor={editor} />}
      </div>
    </div>
  );
}
