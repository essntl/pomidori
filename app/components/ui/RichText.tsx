"use client";

import { useState } from "react";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import Highlight from "@tiptap/extension-highlight";
import { Bold, Check, Code, Highlighter, Italic, Link as LinkIcon, List, ListOrdered, ListTodo, Strikethrough, Underline, X } from "lucide-react";
import { notesToHtml } from "@/app/lib/text";
import { cn } from "@/app/lib/cn";

function ToolButton({ active, label, onClick, children }: { active?: boolean; label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "grid size-[26px] shrink-0 place-items-center rounded-md transition-colors [&_svg]:size-[15px]",
        active ? "bg-accent-soft text-accent" : "text-muted hover:bg-surface-3 hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const [linkMode, setLinkMode] = useState(false);
  const [href, setHref] = useState("");
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      code: e.isActive("code"),
      highlight: e.isActive("highlight"),
      link: e.isActive("link"),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      task: e.isActive("taskList"),
    }),
  });

  const applyLink = () => {
    const url = href.trim();
    const chain = editor.chain().focus().extendMarkRange("link");
    if (!url) chain.unsetLink().run();
    else chain.setLink({ href: /^[a-z]+:/i.test(url) ? url : `https://${url}` }).run();
    setLinkMode(false);
  };

  if (linkMode) {
    return (
      <div className="flex items-center gap-1 border-b border-line px-1.5 py-1">
        <input
          autoFocus
          value={href}
          onChange={(e) => setHref(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              applyLink();
            } else if (e.key === "Escape") setLinkMode(false);
          }}
          placeholder="Paste a link…"
          className="h-7 min-w-0 flex-1 rounded-md bg-surface-solid px-2 text-[13px] text-fg outline-none"
        />
        <ToolButton label="Apply link" onClick={applyLink}>
          <Check />
        </ToolButton>
        <ToolButton label="Cancel" onClick={() => setLinkMode(false)}>
          <X />
        </ToolButton>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-px border-b border-line px-1 py-1 sm:justify-start sm:gap-0.5 sm:px-1.5">
      <ToolButton label="Bold" active={s.bold} onClick={() => editor.chain().focus().toggleBold().run()}><Bold /></ToolButton>
      <ToolButton label="Italic" active={s.italic} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic /></ToolButton>
      <ToolButton label="Underline" active={s.underline} onClick={() => editor.chain().focus().toggleUnderline().run()}><Underline /></ToolButton>
      <ToolButton label="Strikethrough" active={s.strike} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough /></ToolButton>
      <ToolButton label="Highlight" active={s.highlight} onClick={() => editor.chain().focus().toggleHighlight().run()}><Highlighter /></ToolButton>
      <ToolButton label="Inline code" active={s.code} onClick={() => editor.chain().focus().toggleCode().run()}><Code /></ToolButton>
      <span className="mx-0.5 h-4 w-px shrink-0 bg-line" />
      <ToolButton label="Bulleted list" active={s.bullet} onClick={() => editor.chain().focus().toggleBulletList().run()}><List /></ToolButton>
      <ToolButton label="Numbered list" active={s.ordered} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered /></ToolButton>
      <ToolButton label="Checklist" active={s.task} onClick={() => editor.chain().focus().toggleTaskList().run()}><ListTodo /></ToolButton>
      <ToolButton
        label="Link"
        active={s.link}
        onClick={() => {
          setHref((editor.getAttributes("link").href as string) ?? "");
          setLinkMode(true);
        }}
      >
        <LinkIcon />
      </ToolButton>
    </div>
  );
}

/**
 * Compact rich text field (bold/italic/lists/checklists/links) for task notes and other short text.
 * Stores HTML. Mount with a `key` per record; `value` is only read on mount.
 */
export function RichText({
  value,
  onChange,
  placeholder = "Add notes…",
  className,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        horizontalRule: false,
        link: { openOnClick: false, autolink: true, defaultProtocol: "https" },
      }),
      Placeholder.configure({ placeholder }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight,
    ],
    content: notesToHtml(value),
    editorProps: { attributes: { class: "prose-editor !pb-0 min-h-16 text-[15px] leading-relaxed" } },
    onUpdate: ({ editor: e }) => onChange(e.isEmpty ? "" : e.getHTML()),
  });

  return (
    <div
      className={cn(
        "overflow-hidden rounded-control border border-line bg-surface-2 transition-[border-color,box-shadow] focus-within:border-accent/60 focus-within:ring-4 focus-within:ring-accent/15",
        className,
      )}
    >
      {editor && <Toolbar editor={editor} />}
      <EditorContent editor={editor} className="px-2.5 py-1.5 sm:px-3 sm:py-2" />
    </div>
  );
}
