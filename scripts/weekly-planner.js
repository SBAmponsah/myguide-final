const tasks = getData("courseTasks");

document.getElementById("plannerForm").addEventListener("submit", e => {
  e.preventDefault();

  const task = {
    id: Date.now(),
    title: taskTitle.value,
    type: taskType.value,
    due: taskDue.value
  };

  tasks.push(task);
  setData("courseTasks", tasks);

  requestNotificationsPermission().then(() => {
    scheduleAllTaskReminders(task, { title: "ENG 227" });
  });

  e.target.reset();
  render();
});

function render() {
  const box = document.getElementById("weekTasks");
  box.innerHTML = "";

  tasks
    .sort((a,b)=>new Date(a.due)-new Date(b.due))
    .forEach(t=>{
      box.innerHTML += `
        <div class="list-group-item">
          <strong>${t.title}</strong>
          <div class="small text-muted">${t.type} — ${new Date(t.due).toLocaleString()}</div>
        </div>
      `;
    });
}

render();
