// elements
const notesList = document.getElementById("notes-list");
const addNoteButton = document.getElementById("add-note-btn");
// variables
let notes = ["Hello world one two three", "Hello world", "Hello"];

function addNote() {}

function displayNotes() {
  notesList.innerHTML = "";
    notes.forEach((note) => {
        const div = document.createElement("div");
        const textarea = document.createElement("textarea");
        textarea.textContent = note;
        div.classList.add("note-card");

        div.appendChild(textarea);
        notesList.appendChild(div);
    });
}

displayNotes();

addNoteButton.addEventListener("click", addNote);
