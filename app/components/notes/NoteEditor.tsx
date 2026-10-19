"use client";

import { useEffect, useRef, useState } from "react";
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

function words(text: string) {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

/** The block editor for one page. Mount with `key={page.id}` so each page gets a fresh editor. */
export function NoteEditor({ page, onReady }: { page: NotePage; onReady?: (focus: () => void) => void }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<(() => void) | null>(null);
  const [wordCount, setWordCount] = useState(() => words(page.text));

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
        setWordCount(words(text));
        pending.current = null;
      };
      pending.current = save;
      saveTimer.current = setTimeout(save, 400);
    },
  });

  // Flush unsaved edits when switching pages or leaving.
  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      pending.current?.();
    },
    [],
  );

  useEffect(() => {
    if (editor && onReady) onReady(() => editor.commands.focus("start"));
  }, [editor, onReady]);

  return (
    <div>
      <div ref={wrapRef} className="relative md:-ml-14 md:pl-14">
        {editor && <BlockHandle editor={editor} container={wrapRef} />}
        <EditorContent editor={editor} />
        {editor && <BubbleToolbar editor={editor} />}
      </div>
      <div className="pointer-events-none fixed right-6 bottom-24 hidden rounded-full border border-line bg-surface px-3 py-1 text-[12px] font-semibold text-muted shadow-card backdrop-blur-xl lg:block">
        {wordCount} {wordCount === 1 ? "word" : "words"}
      </div>
    </div>
  );
}
