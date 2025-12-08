const notes = getData("courseNotes");

noteForm.addEventListener("submit", e => {
  e.preventDefault();

  notes.push({
    title: noteTitle.value,
    body: noteBody.value,
    date: new Date().toISOString()
  });

  setData("courseNotes", notes);
  e.target.reset();
  render();
});

function render() {
  notesList.innerHTML = "";
  notes
    .reverse()
    .forEach(n => {
      notesList.innerHTML += `
        <div class="list-group-item">
          <strong>${n.title}</strong>
          <p class="small mb-1">${n.body}</p>
          <span class="text-muted small">${new Date(n.date).toLocaleString()}</span>
        </div>
      `;
    });
}

render();
