"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";

// toolbar button
function ToolbarButton({
  onClick,
  title,
  children,
  isActive = false,
}: {
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  title: string;
  children: React.ReactNode;
  isActive?: boolean;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
      }}
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

export default function RichTextEditor({
  content,
  onChange,
  placeholder,
}: RichTextEditorProps) {
  const [mounted, setMounted] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const selectionRef = useRef<{ start: number; end: number } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // markdown wrap
  const insertMarkdown = useCallback(
    (prefix: string, suffix: string = "") => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = content.substring(start, end);
      const newText =
        content.substring(0, start) +
        prefix +
        selectedText +
        suffix +
        content.substring(end);
      let newCursorPos;
      if (selectedText.length === 0) {
        newCursorPos = start + prefix.length;
      } else {
        newCursorPos =
          start + prefix.length + selectedText.length + suffix.length;
      }
      selectionRef.current = { start: newCursorPos, end: newCursorPos };
      onChange(newText);
    },
    [content, onChange],
  );

  useEffect(() => {
    if (textareaRef.current && selectionRef.current) {
      const { start, end } = selectionRef.current;
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(start, end);
      selectionRef.current = null;
    }
  }, [content]);

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
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 12h8a4 4 0 100-8H6v8zm0 0h10a4 4 0 110 8H6v-8z"
            />
          </svg>
        </ToolbarButton>

        <ToolbarButton onClick={() => insertMarkdown("*", "*")} title="Italic">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <line
              x1="10"
              y1="4"
              x2="14"
              y2="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
            <line
              x1="8"
              y1="20"
              x2="12"
              y2="20"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
            <line
              x1="12"
              y1="4"
              x2="10"
              y2="20"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </svg>
        </ToolbarButton>

        <ToolbarButton onClick={() => insertMarkdown(">")} title="Quote">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 10h4a2 2 0 012 2v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a6 6 0 016-6"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10h4a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-6a6 6 0 016-6"
            />
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

        <ToolbarButton onClick={() => insertMarkdown("- ")} title="To-do item">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <line
              x1="9"
              y1="6"
              x2="20"
              y2="6"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
            <line
              x1="9"
              y1="12"
              x2="20"
              y2="12"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
            <line
              x1="9"
              y1="18"
              x2="20"
              y2="18"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
            <circle cx="5" cy="6" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="5" cy="18" r="1.5" fill="currentColor" stroke="none" />
          </svg>
        </ToolbarButton>

        <ToolbarButton
          onClick={() => insertMarkdown("```", "```")}
          title="Code"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <polyline
              points="16 18 22 12 16 6"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
            <polyline
              points="8 6 2 12 8 18"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </svg>
        </ToolbarButton>

        <div className="flex-1" />

        <ToolbarButton
          onClick={() => setIsPreview(!isPreview)}
          title={isPreview ? "Edit" : "Preview"}
          isActive={isPreview}
        >
          {isPreview ? (
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          ) : (
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
          )}
        </ToolbarButton>
      </div>

      {/* Content area */}
      <div className="flex-1 min-h-0">
        {isPreview ? (
          <div className="w-full h-full min-h-50 p-4 overflow-auto text-sm leading-relaxed">
            {content ? (
              <div className="markdown-preview">
                <ReactMarkdown
                  components={{
                    h1: ({ children }) => (
                      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4 mt-2">
                        {children}
                      </h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-3 mt-4">
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2 mt-3">
                        {children}
                      </h3>
                    ),
                    p: ({ children }) => (
                      <p className="text-gray-700 dark:text-gray-300 mb-3">
                        {children}
                      </p>
                    ),
                    strong: ({ children }) => (
                      <strong className="font-semibold text-gray-800 dark:text-gray-200">
                        {children}
                      </strong>
                    ),
                    em: ({ children }) => (
                      <em className="italic text-gray-700 dark:text-gray-300">
                        {children}
                      </em>
                    ),
                    ul: ({ children }) => (
                      <ul className="list-disc pl-5 mb-3 text-gray-700 dark:text-gray-300">
                        {children}
                      </ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="list-decimal pl-5 mb-3 text-gray-700 dark:text-gray-300">
                        {children}
                      </ol>
                    ),
                    li: ({ children }) => <li className="mb-1">{children}</li>,
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-4 border-pink-300 dark:border-pink-700 pl-4 italic text-gray-600 dark:text-gray-400 my-3">
                        {children}
                      </blockquote>
                    ),
                    code: ({ children }) => (
                      <code className="bg-gray-200 dark:bg-gray-800 px-1 py-0.5 rounded text-sm font-mono text-pink-600 dark:text-pink-400">
                        {children}
                      </code>
                    ),
                    pre: ({ children }) => (
                      <pre className="bg-gray-200 dark:bg-gray-800 p-3 rounded-lg overflow-x-auto my-3">
                        {children}
                      </pre>
                    ),
                    a: ({ children, href }) => (
                      <a
                        href={href}
                        className="text-pink-600 dark:text-pink-400 hover:underline"
                      >
                        {children}
                      </a>
                    ),
                  }}
                >
                  {content}
                </ReactMarkdown>
              </div>
            ) : (
              <span className="text-gray-400 italic">
                {placeholder || "No content to preview"}
              </span>
            )}
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder || "Start writing your notes..."}
            className="w-full h-full min-h-50 p-4 bg-transparent dark:text-white resize-none outline-none font-mono text-sm leading-relaxed"
          />
        )}
      </div>
    </div>
  );
}
