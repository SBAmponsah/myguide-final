// scripts/calendar.js
// Weekly calendar view (timezone-safe)

(function () {

/* ---------- Helpers ---------- */

// Sunday-based week start (LOCAL)
function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sun
  d.setDate(d.getDate() - day);
  d.setHours(12,0,0,0); // ✅ noon prevents TZ bugs
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  d.setHours(12,0,0,0); // ✅ noon
  return d;
}

// ✅ LOCAL yyyy-mm-dd (NO UTC)
function toLocalISODate(date) {
  return (
    date.getFullYear() + '-' +
    String(date.getMonth() + 1).padStart(2,'0') + '-' +
    String(date.getDate()).padStart(2,'0')
  );
}

function formatDisplay(date) {
  return date.toLocaleDateString(undefined, {
    month: '2-digit',
    day: '2-digit'
  });
}

function formatLong(date) {
  return date.toLocaleString();
}

/* ---------- Task lookup (FIXED) ---------- */

function tasksForDate(isoDate) {
  const d = loadData();
  const tasks = [];

  (d.courses || []).forEach(course => {
    (course.tasks || []).forEach(t => {
      if (!t.due) return;

      const due = new Date(t.due);

      // ✅ LOCAL DATE comparison (NO toISOString)
      const taskDay = toLocalISODate(due);

      if (taskDay === isoDate) {
        tasks.push({
          ...t,
          courseId: course.id,
          courseTitle: course.title
        });
      }
    });
  });

  tasks.sort((a,b) => new Date(a.due) - new Date(b.due));
  return tasks;
}

/* ---------- Render week ---------- */

function renderWeek(sundayDate) {
  const grid = document.getElementById('week-grid');
  const weekRange = document.getElementById('week-range');
  const list = document.getElementById('week-task-list');
  if (!grid || !weekRange || !list) return;

  grid.innerHTML = '';
  list.innerHTML = '';

  const sunday = new Date(sundayDate);
  const end = addDays(sunday, 6);

  weekRange.textContent =
    `${sunday.toLocaleDateString()} — ${end.toLocaleDateString()}`;

  for (let i = 0; i < 7; i++) {
    const day = addDays(sunday, i);
    const iso = toLocalISODate(day);
    const tasks = tasksForDate(iso);

    const badge = tasks.length
      ? `<span class="badge bg-primary ms-2">${tasks.length}</span>`
      : '';

    const col = document.createElement('div');
    col.className = 'col-12 col-md-4 col-lg-1';

    const header = document.createElement('div');
    header.className = 'd-flex justify-content-between align-items-center mb-2';
    header.innerHTML =
      `<div class="fw-bold">
        ${day.toLocaleDateString(undefined,{weekday:'short'})}
        ${formatDisplay(day)}
      </div>
      <div>${badge}</div>`;

    col.appendChild(header);

    const tasksContainer = document.createElement('div');

    if (!tasks.length) {
      const empty = document.createElement('div');
      empty.className = 'text-muted small';
      empty.textContent = 'No tasks';
      tasksContainer.appendChild(empty);
    } else {
      tasks.forEach(t => {
        const btn = document.createElement('button');
        btn.className =
          'btn btn-sm btn-outline-secondary w-100 text-start mb-1';

        const timeStr = t.due
          ? new Date(t.due).toLocaleTimeString([], {
              hour:'2-digit',
              minute:'2-digit'
            })
          : '';

        btn.innerHTML =
          `<div class="d-flex justify-content-between">
            <div>
              <strong>${timeStr} ${t.title}</strong>
              <div class="small text-muted">${t.courseTitle}</div>
            </div>
            <div>&gt;</div>
          </div>`;

        btn.onclick = () => showTaskDetail(t);
        tasksContainer.appendChild(btn);
      });
    }

    col.appendChild(tasksContainer);
    grid.appendChild(col);

    // summary list
    tasks.forEach(t => {
      const item = document.createElement('div');
      item.className = 'list-group-item';
      item.innerHTML =
        `<strong>${t.title}</strong>
         <div class="small text-muted">
           ${t.courseTitle} • ${formatLong(new Date(t.due))}
         </div>`;
      list.appendChild(item);
    });
  }
}

/* ---------- Modal ---------- */

function showTaskDetail(task) {
  document.getElementById('modal-task-title').textContent = task.title;
  document.getElementById('modal-task-course').textContent =
    task.courseTitle || '';
  document.getElementById('modal-task-due').textContent =
    task.due ? `Due: ${formatLong(new Date(task.due))}` : 'No due date';

  const modal = new bootstrap.Modal(
    document.getElementById('taskDetailModal')
  );
  modal.show();
}

/* ---------- Init ---------- */

let currentSunday = startOfWeek(new Date());

function initCalendar() {
  document.getElementById('prev-week').onclick = () => {
    currentSunday = addDays(currentSunday, -7);
    renderWeek(currentSunday);
  };

  document.getElementById('next-week').onclick = () => {
    currentSunday = addDays(currentSunday, 7);
    renderWeek(currentSunday);
  };

  document.getElementById('today-week').onclick = () => {
    currentSunday = startOfWeek(new Date());
    renderWeek(currentSunday);
  };

  renderWeek(currentSunday);
}

document.addEventListener('DOMContentLoaded', initCalendar);

})();

