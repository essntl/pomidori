"use client";

import { useState } from "react";
import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { NodeSelection } from "@tiptap/pm/state";
import { Bold, Code, Highlighter, Italic, Link as LinkIcon, Strikethrough, Underline, Check, X } from "lucide-react";
import { cn } from "@/app/lib/cn";

function Btn({ active, label, onClick, children }: { active?: boolean; label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "grid h-8 min-w-8 place-items-center rounded-lg px-1.5 text-[13px] font-bold transition-colors [&_svg]:size-4",
        active ? "bg-accent-soft text-accent" : "text-fg-2 hover:bg-surface-2 hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}

/** Floating formatting toolbar that appears over a text selection. */
export function BubbleToolbar({ editor }: { editor: Editor }) {
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
      h1: e.isActive("heading", { level: 1 }),
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
    }),
  });

  const applyLink = () => {
    const url = href.trim();
    if (!url) editor.chain().focus().extendMarkRange("link").unsetLink().run();
    else editor.chain().focus().extendMarkRange("link").setLink({ href: /^[a-z]+:/i.test(url) ? url : `https://${url}` }).run();
    setLinkMode(false);
  };

  return (
    <BubbleMenu
      editor={editor}
      options={{ placement: "top", offset: 8 }}
      shouldShow={({ editor: e, state }) => !state.selection.empty && e.isEditable && !e.isActive("codeBlock") && !(state.selection instanceof NodeSelection)}
      className="flex items-center gap-0.5 rounded-2xl border border-line bg-surface-solid p-1 shadow-pop"
    >
      {linkMode ? (
        <div className="flex items-center gap-1">
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
            className="h-8 w-56 rounded-lg bg-surface-2 px-2.5 text-sm text-fg outline-none"
          />
          <Btn label="Apply link" onClick={applyLink}><Check /></Btn>
          <Btn label="Cancel" onClick={() => setLinkMode(false)}><X /></Btn>
        </div>
      ) : (
        <>
          <Btn label="Heading 1" active={s.h1} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>H1</Btn>
          <Btn label="Heading 2" active={s.h2} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</Btn>
          <Btn label="Heading 3" active={s.h3} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</Btn>
          <span className="mx-0.5 h-5 w-px bg-line" />
          <Btn label="Bold" active={s.bold} onClick={() => editor.chain().focus().toggleBold().run()}><Bold /></Btn>
          <Btn label="Italic" active={s.italic} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic /></Btn>
          <Btn label="Underline" active={s.underline} onClick={() => editor.chain().focus().toggleUnderline().run()}><Underline /></Btn>
          <Btn label="Strikethrough" active={s.strike} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough /></Btn>
          <Btn label="Inline code" active={s.code} onClick={() => editor.chain().focus().toggleCode().run()}><Code /></Btn>
          <Btn label="Highlight" active={s.highlight} onClick={() => editor.chain().focus().toggleHighlight().run()}><Highlighter /></Btn>
          <Btn
            label="Link"
            active={s.link}
            onClick={() => {
              setHref((editor.getAttributes("link").href as string) ?? "");
              setLinkMode(true);
            }}
          >
            <LinkIcon />
          </Btn>
        </>
      )}
    </BubbleMenu>
  );
}
