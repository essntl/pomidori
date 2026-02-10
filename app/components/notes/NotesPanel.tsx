"use client";

import { useState, useEffect } from "react";
import NoteCard from "./NoteCard";

export interface Note {
  id: number;
  title: string;
  content: string;
}

function NotesPanel() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("notes");
    if (saved) {
      setNotes(JSON.parse(saved));
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("notes", JSON.stringify(notes));
    }
  }, [notes, isLoaded]);

  function addNote() {
    const newNote = {
      id: Date.now(),
      title: `Note ${notes.length + 1}`,
      content: "",
    };
    setNotes([...notes, newNote]);
    setSelectedNote(newNote);
  }

  function updateNote(id: number, field: string, value: string) {
    setNotes(
      notes.map((note) =>
        note.id === id ? { ...note, [field]: value } : note,
      ),
    );
    if (selectedNote?.id === id) {
      setSelectedNote({ ...selectedNote, [field]: value });
    }
  }

  function deleteNote(id: number) {
    setNotes(notes.filter((note) => note.id !== id));
    if (selectedNote?.id === id) {
      setSelectedNote(null);
    }
  }

  function goBack() {
    setSelectedNote(null);
  }

  return (
    <div className="flex flex-1 gap-4 p-4 min-h-0">
      {/* Sidebar - Note List */}
      <div
        className={`${
          selectedNote ? "hidden md:flex" : "flex min-h-[60vh]"
        } w-full md:w-64 shrink-0 flex-col bg-white/70 dark:bg-gray-900/60 rounded-2xl shadow-lg dark:shadow-xl border border-white/60 dark:border-white/10 overflow-hidden md:min-h-[70vh] max-h-[70vh]`}
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-xl font-bold dark:text-white mb-3">Notes</h1>
          <button
            onClick={addNote}
            className="w-full p-2 bg-pink-200 hover:bg-pink-300 dark:bg-pink-600 dark:hover:bg-pink-700 rounded-md transition-colors duration-300 dark:text-white"
          >
            + Add Note
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {notes.length === 0 ? (
            <span className="text-gray-500 text-center block p-4">
              No notes yet
            </span>
          ) : (
            <div className="flex flex-col gap-2">
              {notes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  isSelected={selectedNote?.id === note.id}
                  onClick={() => setSelectedNote(note)}
                  onDelete={() => deleteNote(note.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Note Viewer/Editor */}
      <div
        className={`${
          selectedNote ? "flex min-h-[60vh]" : "hidden md:flex"
        } flex-1 flex-col bg-white/70 dark:bg-gray-900/60 rounded-2xl shadow-lg dark:shadow-xl border border-white/60 dark:border-white/10 overflow-hidden`}
      >
        {selectedNote ? (
          <>
            {/* Mobile back button */}
            <div className="flex items-center gap-2 p-4 border-b border-gray-200 dark:border-gray-700 md:hidden">
              <button
                onClick={goBack}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <svg
                  className="w-5 h-5 dark:text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <span className="font-medium dark:text-white">Back to Notes</span>
            </div>
            <input
              type="text"
              value={selectedNote.title}
              onChange={(e) =>
                updateNote(selectedNote.id, "title", e.target.value)
              }
              className="text-2xl font-bold p-4 bg-transparent dark:text-white border-b border-gray-200 dark:border-gray-700 outline-none"
              placeholder="Note title"
            />
            <textarea
              value={selectedNote.content}
              onChange={(e) =>
                updateNote(selectedNote.id, "content", e.target.value)
              }
              placeholder="Write your note here..."
              className="flex-1 p-4 bg-transparent dark:text-white resize-none outline-none"
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a note or create a new one
          </div>
        )}
      </div>
    </div>
  );
}

export default NotesPanel;
