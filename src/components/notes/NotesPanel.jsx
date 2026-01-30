import { useState } from "react";
import NoteCard from "./NoteCard";

function NotesPanel() {
  const [notes, setNotes] = useState([]);
  const { pinnedNotes, setPinnedNotes } = useState([]);

  function addNote() {
    setNotes([...notes, ""]);
  }

  return (
    <div className="flex max-w-[30%] flex-col m-4 p-6 bg-white/50 dark:bg-gray-800/30 rounded-xl shadow-xl gap-4">
      <h1 className="text-3xl font-bold dark:text-white">Notes</h1>
      <button onClick={addNote} className="p-2 bg-pink-200 rounded-md">
        + Add Note
      </button>
      {notes.map((note, index) => (
        <NoteCard key={index} />
      ))}
      {notes.length === 0 && (
        <span className="text-gray-500 text-center">
          There are no notes yet
        </span>
      )}
    </div>
  );
}

export default NotesPanel;
