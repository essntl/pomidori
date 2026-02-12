"use client";

import { useState, useEffect } from "react";
import NoteCard from "./NoteCard";
import RichTextEditor from "@/app/notes/RichTextEditor";

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
        } w-full md:w-72 shrink-0 flex-col bg-white/70 dark:bg-gray-900/60 rounded-2xl shadow-lg dark:shadow-xl border border-white/60 dark:border-white/10 overflow-hidden md:min-h-[70vh] max-h-[70vh]`}
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-700/50">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold dark:text-white">Notes</h1>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
              {notes.length}
            </span>
          </div>
          <button
            onClick={addNote}
            className="w-full flex items-center justify-center gap-2 p-2.5 bg-pink-500 hover:bg-pink-600 dark:bg-pink-600 dark:hover:bg-pink-500 text-white rounded-xl transition-all duration-300 font-medium shadow-md hover:shadow-lg"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Note
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500 p-8">
              <svg className="w-12 h-12 mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span className="text-sm text-center">No notes yet</span>
              <span className="text-xs text-center mt-1 opacity-70">Create your first note to get started</span>
            </div>
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
            <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-700/50">
              {/* Mobile back button */}
              <button
                onClick={goBack}
                className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
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

              <input
                type="text"
                value={selectedNote.title}
                onChange={(e) =>
                  updateNote(selectedNote.id, "title", e.target.value)
                }
                className="flex-1 text-xl font-bold bg-transparent dark:text-white outline-none placeholder-gray-400"
                placeholder="Note title"
              />

              <button
                onClick={() => deleteNote(selectedNote.id)}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                title="Delete note"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>

            <RichTextEditor
              content={selectedNote.content}
              onChange={(content) => updateNote(selectedNote.id, "content", content)}
              placeholder="Start writing..."
            />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 p-8">
            <div className="w-20 h-20 mb-4 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <svg className="w-10 h-10 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <span className="text-lg font-medium">Select a note</span>
            <span className="text-sm mt-1">or create a new one to get started</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default NotesPanel;
