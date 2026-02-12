"use client";

import { useState, useEffect } from "react";

// toolbar button
function ToolbarButton({
  onClick,
  title,
  children,
  isActive = false,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  isActive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 ${
        isActive
          ? "bg-pink-100 dark:bg-pink-900/50 text-pink-600 dark:text-pink-300"
          : "bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
      }`}
    >
      {children}
    </button>
  );
}

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

export default function RichTextEditor({ content, onChange, placeholder }: RichTextEditorProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // markdown wrap and cursor insert
  const insertMarkdown = (before: string, after: string = "") => {
    const textarea = document.querySelector("[data-rich-text-editor]") as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const newText =
      content.substring(0, start) +
      before +
      selectedText +
      after +
      content.substring(end);

    onChange(newText);
  };

  if (!mounted) {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 p-4 bg-transparent resize-none outline-none font-mono text-sm text-gray-400">
          Loading editor...
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-3 border-b border-gray-200 dark:border-gray-700/50">
        <ToolbarButton onClick={() => insertMarkdown("**", "**")} title="Bold">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12h8a4 4 0 100-8H6v8zm0 0h10a4 4 0 110 8H6v-8z" />
          </svg>
        </ToolbarButton>

        <ToolbarButton onClick={() => insertMarkdown("*", "*")} title="Italic">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        </ToolbarButton>

        <div className="w-px h-5 bg-gray-300 dark:bg-gray-700 mx-1" />

        <ToolbarButton onClick={() => insertMarkdown("# ")} title="Heading 1">
          <span className="text-xs font-bold">H1</span>
        </ToolbarButton>

        <ToolbarButton onClick={() => insertMarkdown("## ")} title="Heading 2">
          <span className="text-xs font-bold">H2</span>
        </ToolbarButton>

        <ToolbarButton onClick={() => insertMarkdown("### ")} title="Heading 3">
          <span className="text-xs font-bold">H3</span>
        </ToolbarButton>

        <div className="w-px h-5 bg-gray-300 dark:bg-gray-700 mx-1" />

        <ToolbarButton onClick={() => insertMarkdown("- [ ] ")} title="To-do item">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </ToolbarButton>


      </div>

      {/* Content area */}
      <div className="flex-1 min-h-0 ">
          <textarea
            data-rich-text-editor
            value={content}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder || "Start writing your notes..."}
            className="w-full h-full min-h-50 p-4 bg-transparent dark:text-white resize-none outline-none font-mono text-sm leading-relaxed"
          />
      </div>
    </div>
  );
}
