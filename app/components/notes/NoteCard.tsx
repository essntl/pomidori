"use client";

import { Note } from "./NotesPanel";

interface NoteCardProps {
  note: Note;
  isSelected: boolean;
  onClick: () => void;
  onDelete: () => void;
}

function NoteCard({ note, isSelected, onClick, onDelete }: NoteCardProps) {
  // note text preview
  const contentPreview = note.content
    ? note.content.split('\n')[0].slice(0, 60) || "No content"
    : "No content";

  return (
    <div
      onClick={onClick}
      className={`group p-3 rounded-xl cursor-pointer transition-all duration-200 border ${
        isSelected
          ? "bg-pink-50 dark:bg-pink-900/30 border-pink-200 dark:border-pink-800/50 shadow-sm"
          : "bg-transparent border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className={`font-medium truncate ${
            isSelected 
              ? "text-pink-700 dark:text-pink-300" 
              : "text-gray-800 dark:text-gray-100"
          }`}>
            {note.title || "Untitled"}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-1">
            {contentPreview}
          </p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className={`opacity-0 group-hover:opacity-100 p-1 rounded-lg transition-all duration-200 ${
            isSelected
              ? "text-pink-400 hover:text-pink-600 hover:bg-pink-100 dark:hover:bg-pink-800/30"
              : "text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
          }`}
          title="Delete note"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default NoteCard;
