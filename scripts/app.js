// app.js
// Top-level application logic: render dashboard, handle events, mount to pages.

const data = loadData(); // from storage.js

/* ---------- Utilities ---------- */
function uid(prefix = '') {
  return prefix + Math.random().toString(36).slice(2, 9);
}

function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const k in props) {
    if (k === 'text') node.textContent = props[k];
    else node.setAttribute(k, props[k]);
  }
  children.forEach(c => {
    if (typeof c === 'string' || typeof c === 'number') node.appendChild(document.createTextNode(c));
    else if (c instanceof Node) node.appendChild(c);
  });
  return node;
}

/* ---------- Dashboard rendering ---------- */
function renderDashboard() {
  if (!document.getElementById('course-cards')) return;

  const cards = document.getElementById('course-cards');
  const noCourses = document.getElementById('no-courses');
  cards.innerHTML = '';

  const courses = loadData().courses || [];
  if (!courses.length) {
    noCourses.style.display = 'block';
  } else {
    noCourses.style.display = 'none';
  }

  courses.forEach(c => {
    const col = el('div', { class: 'col-12 col-md-6 col-lg-4' });
    const card = el('div', { class: 'course-card', style: `background:${c.color || '#7C4DFF'}` });
    const title = el('div', { class: 'course-title', text: c.title });
    const code = el('div', { class: 'course-code', text: c.code || '' });
    const next = getNextItemForCourse(c);
    const nextEl = el('div', {
    text: next
    ? next.type === 'Class'
      ? `Next up: Class — ${next.date.toLocaleString([], {
          weekday: 'short',
          hour: 'numeric',
          minute: '2-digit'
        })}`
      : `Next up: ${next.title} — ${new Date(next.due).toLocaleString()}`
    : 'No upcoming items'
});


    const actions = el('div', { class: 'd-flex justify-content-between mt-2' },
      el('a', { class: 'btn btn-sm btn-light', href: `course.html?course=${c.id}` }, 'Open'),
      el('button', { class: 'btn btn-sm btn-outline-light', onclick: `editCourse('${c.id}')` }, 'Edit')
    );

    card.append(title, code, nextEl, actions);
    col.appendChild(card);
    cards.appendChild(col);
  });

  populateQuickCourseSelect();
  renderStudyChart();
}
const dayMap = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6
};

function getNextDueForCourse(course) {
  if (!course.tasks || !course.tasks.length) return null;
  const now = Date.now();
  const future = course.tasks.filter(t => t.due && new Date(t.due).getTime() > now);
  future.sort((a,b) => new Date(a.due) - new Date(b.due));
  return future[0] || null;
}
function getNextClassOccurrence(course) {
  if (!Array.isArray(course.classTimes) || !course.classTimes.length) return null;

  const now = new Date();
  let soonest = null;

  course.classTimes.forEach(ct => {
    const shortDay = ct.day.slice(0, 3);
    const targetDow = dayMap[shortDay];
    if (targetDow === undefined) return;

    const next = new Date(now);
    const diff = (targetDow - now.getDay() + 7) % 7;
    next.setDate(now.getDate() + diff);

    const [hh, mm] = ct.start.split(':').map(Number);
    next.setHours(hh, mm, 0, 0);

    // If class already passed today → next week
    if (next <= now) {
      next.setDate(next.getDate() + 7);
    }

    if (!soonest || next < soonest.date) {
      soonest = {
        type: 'Class',
        date: next,
        start: ct.start,
        end: ct.end
      };
    }
  });

  return soonest;
}
function getNextItemForCourse(course) {
  const task = getNextDueForCourse(course);
  const cls = getNextClassOccurrence(course);

  if (!task && !cls) return null;
  if (!task) return cls;
  if (!cls) return task;

  return new Date(task.due) < cls.date ? task : cls;
}

/* ---------- Quick-add handlers ---------- */
function populateQuickCourseSelect() {
  const sel = document.getElementById('quick-course-select');
  if (!sel) return;
  sel.innerHTML = '<option value="">Choose course</option>';
  (loadData().courses || []).forEach(c => {
    const o = document.createElement('option'); 
    o.value = c.id; 
    o.textContent = `${c.code} — ${c.title}`;
    sel.appendChild(o);
  });
}

/* ---------- Course CRUD ---------- */
function openCourseModal(editId = null) {
  const modalEl = document.getElementById('modal-course');
  if (!modalEl) {
    console.warn('modal-course not found in DOM — cannot open modal here.');
    return;
  }
  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  const form = document.getElementById('form-course');
  if (!form) { 
    modal.show(); 
    return; 
  }

  if (editId) {
    const c = loadData().courses.find(x => x.id === editId);
    form.dataset.editId = editId;
    document.getElementById('course-title').value = c.title || '';
    document.getElementById('course-code').value = c.code || '';
    document.getElementById('course-instructor').value = c.instructor || '';
    document.getElementById('course-color').value = c.color || '#7C4DFF';
    document.getElementById('course-times').value = (c.classTimes || []).map(t => `${t.day} ${t.start}-${t.end}`).join('\n');
  } else {
    form.removeAttribute('data-edit-id');
    form.reset();
    const colorInput = document.getElementById('course-color');
    if (colorInput) colorInput.value = '#7C4DFF';
  }
  modal.show();
}

function setupCourseForm() {
  const form = document.getElementById('form-course');
  if (!form) return;
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const title = document.getElementById('course-title').value.trim();
    const code = document.getElementById('course-code').value.trim();
    const instructor = document.getElementById('course-instructor').value.trim();
    const color = document.getElementById('course-color').value;
    const timesRaw = document.getElementById('course-times').value.trim();
    const times = (timesRaw ? timesRaw.split('\n').map(line => {
      const match = line.trim().match(/^([A-Za-z]{3,})\s+(\d{2}:\d{2})-(\d{2}:\d{2})/);
      if (!match) return null;
      return { day: match[1], start: match[2], end: match[3] };
    }).filter(Boolean) : []);

    const d = loadData();
    const editId = form.dataset.editId;
    if (editId) {
      const idx = d.courses.findIndex(c => c.id === editId);
      if (idx >= 0) {
        d.courses[idx] = { ...d.courses[idx], title, code, instructor, color, classTimes: times };
      }
    } else {
      const newCourse = {
        id: uid('c-'),
        title, code, instructor, color,
        classTimes: times,
        notes: [], tasks: [], weeklyPlans: []
      };
      scheduleClassReminders(newCourse);

      d.courses.push(newCourse);
    }
    saveData(d);
    // hide modal only if modal exists
    const modalEl = document.getElementById('modal-course');
    if (modalEl) {
      const inst = bootstrap.Modal.getInstance(modalEl);
      if (inst) inst.hide();
    }
    renderDashboard();
  });
}

/* ---------- Edit helper (global accessible from card onclick) ---------- */
window.editCourse = (id) => {
  openCourseModal(id);
};

/* ---------- Quick-add submit ---------- */
function parseLocalDateAndTimeToISO(dateStr, timeStr) {
  // dateStr: 'YYYY-MM-DD' ; timeStr: 'HH:MM' or undefined
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  let hours = 23, minutes = 59;
  if (timeStr) {
    const [hh, mm] = timeStr.split(':').map(Number);
    if (!Number.isNaN(hh)) hours = hh;
    if (!Number.isNaN(mm)) minutes = mm;
  }
  const dt = new Date(y, m - 1, d, hours, minutes, 0, 0); // local time
  return dt.toISOString();
}

function setupQuickAdd() {
  const form = document.getElementById('quick-add-form');
  if (!form) return;

  form.addEventListener('submit', (ev) => {
    ev.preventDefault();

    const courseId = document.getElementById('quick-course-select')?.value;
    const title = document.getElementById('quick-title')?.value.trim();
    const dateVal = document.getElementById('quick-due')?.value;   // YYYY-MM-DD
    const timeVal = document.getElementById('quick-time')?.value; // HH:MM (optional)

    // 🔽 NEW: read task type from dropdown (default to Assignment)
    const typeVal = document.getElementById('quick-type')?.value || 'Assignment';

    if (!courseId || !title) {
      alert('Select a course and provide a title.');
      return;
    }

    // Combine date + time in local timezone (default 23:59 if no time)
    const due = dateVal ? parseLocalDateAndTimeToISO(dateVal, timeVal) : null;

    const d = loadData();
    const course = d.courses.find(c => c.id === courseId);
    if (!course) return alert('Course not found.');

    const task = {
      id: uid('t-'),
      title,
      // 🔽 Store type exactly as dropdown value so course.js can group it
      type: typeVal,                 // "Assignment" | "Quiz" | "Other"
      due,
      added: new Date().toISOString(),
      status: 'open',
      reminderMinutes: d.settings?.defaultReminderMinutes ?? 20
    };

    course.tasks = course.tasks || [];
    course.tasks.push(task);
    saveData(d);
    renderDashboard();

    // Only schedule reminders once (when task is created) and only if permission granted
    requestNotificationsPermission().then(ok => {
      if (ok && due) {
        if (typeof scheduleAllTaskReminders === 'function') {
          scheduleAllTaskReminders(task, course);
        } else {
          console.warn('scheduleAllTaskReminders not found — make sure notifications.js is loaded');
        }
      }
    });

    form.reset();
  });
}


/* ---------- Study chart ---------- */
let streakChart = null;
function renderStudyChart() {
  const canvas = document.getElementById('streak-chart');
  if (!canvas) return;
  const d = loadData();
  // compute last 14 days study totals
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const date = new Date(); 
    date.setDate(date.getDate() - i);
    const key = date.toISOString().split('T')[0];
    const total = (d.studyLogs || []).filter(s => s.date === key).reduce((a,b) => a + (b.minutes || 0), 0);
    days.push({ date: key, minutes: total });
  }
  const labels = days.map(x => x.date.slice(5));
  const dataPoints = days.map(x => x.minutes);

  if (streakChart) { 
    streakChart.data.labels = labels; 
    streakChart.data.datasets[0].data = dataPoints; 
    streakChart.update(); 
    return; 
  }

  streakChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{ label: 'Study minutes (last 14 days)', data: dataPoints, borderRadius: 4 }]
    },
    options: { responsive: true, plugins: { legend: { display: false } } }
  });
}

/* ---------- Weekly prompt logic ---------- */
function checkWeeklyPrompt() {
  const today = new Date();

  // ✅ Safe Sunday check (no dependency)
  const isSunday = today.getDay() === 0;

  if (!isSunday) return;

  const data = loadData();
  const last = data.meta?.lastWeeklyPrompt;

  const todayISO = today.toISOString().split("T")[0];
  if (last === todayISO) return;

  alert("It's Sunday — plan your week!");

  data.meta.lastWeeklyPrompt = todayISO;
  saveData(data);
}


/* ---------- Bind UI actions ---------- */
function wireDashboardButtons() {
  const btnNew = document.getElementById('btn-new-course');
  if (btnNew) btnNew.addEventListener('click', () => openCourseModal());

  const btnExport = document.getElementById('btn-export-json');
  if (btnExport) btnExport.addEventListener('click', () => exportJSON());

  const btnExportICS = document.getElementById('btn-export-ics');
  if (btnExportICS) btnExportICS.addEventListener('click', () => {
    const events = gatherAllEventsForICS();
    downloadICS(events, 'myguide_events.ics');
  });

  const btnReqNot = document.getElementById('btn-request-notifs');
  if (btnReqNot) btnReqNot.addEventListener('click', () => {
    requestNotificationsPermission().then(ok => alert(ok ? 'Notifications enabled' : 'Notifications denied'));
  });
    // 🔴 Clear all data (RESET)
  const btnReset = document.getElementById('btn-reset-data');

  if (btnReset) {
    btnReset.addEventListener('click', () => {
      const ok = confirm(
        'This will permanently delete ALL courses, tasks, notes, and plans.\n\nThis action cannot be undone.\n\nAre you sure?'
      );
      if (!ok) return;

      clearAllData();   // ✅ YOU ALREADY HAVE THIS FUNCTION
      alert('All data cleared.');
      location.reload();
    });
  }

}

/* ---------- ICS export helper ---------- */
function gatherAllEventsForICS() {
  const d = loadData();
  const events = [];
  (d.courses || []).forEach(course => {
    (course.tasks || []).forEach(task => {
      if (!task.due) return;
      const dt = new Date(task.due);
      const dtstart = dt.toISOString().replace(/[-:]/g,'').split('.')[0];
      const dtend = new Date(dt.getTime() + (60*60*1000)).toISOString().replace(/[-:]/g,'').split('.')[0]; // +1hr
      events.push({
        uid: uid('e-'),
        title: `${course.title}: ${task.title}`,
        dtstart: dtstart,
        dtend: dtend,
        desc: task.type || 'Task',
      });
    });
  });
  return events;
}

/* ---------- Course page rendering (legacy, kept for safety) ---------- */
function renderCoursePage() {
  // expects ?course=id in query
  const params = new URLSearchParams(location.search);
  const courseId = params.get('course');
  if (!courseId) return;
  const d = loadData();
  const course = d.courses.find(c => c.id === courseId);
  if (!course) {
    const heading = document.getElementById('course-title-heading');
    if (heading) heading.textContent = 'Course not found';
    return;
  }
  document.getElementById('course-title-heading').textContent = course.title;
  document.getElementById('course-code-heading').textContent = course.code || '';

  // populate notes list
  const notesList = document.getElementById('notes-list');
  if (notesList) {
    notesList.innerHTML = '';
    (course.notes || []).sort((a,b)=> new Date(b.date) - new Date(a.date)).forEach(n => {
      const a = el('div', { class: 'list-group-item' },
        el('div', { class: 'd-flex justify-content-between' },
          el('div', {}, el('strong', { text: n.title }), el('div', { text: n.date })),
          el('div', {}, el('button', { class: 'btn btn-sm btn-outline-danger', onclick: `deleteNote('${course.id}','${n.id}')` }, 'Delete'))
        ),
        el('p', { text: n.content })
      );
      notesList.appendChild(a);
    });
  }


  // tasks (legacy: filters 'assignment' type)
  const assignList = document.getElementById('assign-list');
  if (assignList) {
    assignList.innerHTML = '';
    (course.tasks || []).filter(t => t.type === 'assignment').forEach(t => {
      const it = el('div', { class: 'list-group-item d-flex justify-content-between align-items-center' },
        el('div', {}, el('strong', { text: t.title }), el('div', { text: t.due ? new Date(t.due).toLocaleString() : 'No due date' })),
        el('div', {}, el('button', { class: 'btn btn-sm btn-outline-danger', onclick: `deleteTask('${course.id}','${t.id}')` }, 'Delete'))
      );
      assignList.appendChild(it);
    });
  }

  // weekly planner basic rendering
  const weekGrid = document.getElementById('week-grid');
  if (weekGrid) {
    const wkStartEl = document.getElementById('week-start');
    const today = new Date();
    const sunday = dateFns.startOfWeek(today, {weekStartsOn:0});
    wkStartEl.value = sunday.toISOString().split('T')[0];
    renderWeekGrid(course, sunday);
  }
}

/* ---------- delete helpers (globally accessible) ---------- */
window.deleteNote = (courseId, noteId) => {
  const d = loadData();
  const c = d.courses.find(x=>x.id===courseId);
  if (!c) return;
  c.notes = c.notes.filter(n=> n.id !== noteId);
  saveData(d); 
  renderCoursePage();
};
window.deleteTask = (courseId, taskId) => {
  const d = loadData(); 
  const c = d.courses.find(x=>x.id===courseId);
  if (!c) return;
  c.tasks = c.tasks.filter(t=> t.id !== taskId);
  saveData(d); 
  renderCoursePage(); 
  renderDashboard();
};

/* ---------- Weekly planner render ---------- */
function renderWeekGrid(course, sundayDate) {
  const weekGrid = document.getElementById('week-grid');
  if (!weekGrid) return;
  weekGrid.innerHTML = '';
  const days = [];
  for (let i=0; i<7; i++){
    const d = new Date(sundayDate); 
    d.setDate(d.getDate()+i);
    days.push(d);
  }
  days.forEach((d, idx) => {
    const col = el('div', { class: 'col-12 col-md-4 col-lg-2' },
      el('div', { class: 'week-cell' },
        el('div', { class: 'fw-bold', text: dateFns.format(d, 'EEE dd') }),
        el('div', { id: `day-items-${idx}` , text: ''})
      )
    );
    weekGrid.appendChild(col);
    // list tasks for date
    const items = (course.tasks || []).filter(t => {
      if (!t.due) return false;
      const dueDate = new Date(t.due).toISOString().split('T')[0];
      return dueDate === d.toISOString().split('T')[0];
    });
    const listEl = document.getElementById(`day-items-${idx}`);
    if (!listEl) return;
    listEl.innerHTML = '';
    items.forEach(it => {
      listEl.appendChild(el('div', { class: 'mb-1' }, el('small', { text: `${it.title} (${it.type})` })));
    });
  });
}

/* ---------- Archive current week ---------- */
function archiveCurrentWeek(courseId) {
  const course = loadData().courses.find(c => c.id === courseId);
  if (!course) return;
  const wkStart = document.getElementById('week-start').value;
  if (!wkStart) return alert('Pick a week start date.');
  // Add weekly plan entry (simple)
  const d = loadData();
  const c = d.courses.find(x=> x.id === courseId);
  c.weeklyPlans = c.weeklyPlans || [];
  c.weeklyPlans.push({ weekStart: wkStart, items: (c.tasks || []).map(t => t.id), archived: true, archivedAt: new Date().toISOString() });
  saveData(d);
  alert('Week archived.');
  renderCoursePage();
}

/* ---------- In-class prompt (simple) ---------- */
function showInClassPrompt(courseId) {
  if (!confirm('Were there any assignments/quizzes announced in class? Add now?')) return;
  location.href = `course.html?course=${courseId}#tab-assign`;
}

/* ---------- Gather page wiring ---------- */
document.addEventListener('DOMContentLoaded', () => {
  // Setup modals and handlers for pages
  setupCourseForm();
  setupQuickAdd();
  wireDashboardButtons();

  // page-specific renderers
  if (document.getElementById('course-cards')) {
    renderDashboard();
    checkWeeklyPrompt();
    // wire modal anchor open
    const courseModal = document.getElementById('modal-course');
    if (courseModal) {
      courseModal.addEventListener('shown.bs.modal', () => {
        const titleInput = document.getElementById('course-title');
        if (titleInput) titleInput.focus();
      });
    }
  }
  if (document.getElementById('course-title-heading')) {
    renderCoursePage();
    // wire archive button
    const params = new URLSearchParams(location.search);
    const cid = params.get('course');
    const btnArchive = document.getElementById('btn-archive-week');
    if (btnArchive) btnArchive.addEventListener('click', () => archiveCurrentWeek(cid));
    // wire add note form
    const noteForm = document.getElementById('note-form');
    if (noteForm) {
      noteForm.addEventListener('submit', (ev) => {
        ev.preventDefault();
        const title = document.getElementById('note-title').value.trim() || 'Note';
        const date = document.getElementById('note-date').value || new Date().toISOString().split('T')[0];
        const content = document.getElementById('note-content').value || '';
        const d = loadData();
        const c = d.courses.find(x=>x.id === cid);
        c.notes = c.notes || [];
        c.notes.push({ id: uid('n-'), title, date, content });
        saveData(d);
        document.getElementById('note-form').reset();
        renderCoursePage();
      });
    }
  }

  // profile page wiring
  const profileForm = document.getElementById('profile-form');

if (profileForm) {
  const nameInput = document.getElementById('profile-name');
  const yearInput = document.getElementById('profile-year');
  const schoolInput = document.getElementById('profile-school');

  const d = loadData();

  // ✅ Load saved data
  nameInput.value = d.meta?.username || '';
  yearInput.value = d.meta?.classYear || '';
  schoolInput.value = d.meta?.school || '';

  profileForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const data = loadData();

    data.meta = data.meta || {};
    data.meta.username = nameInput.value.trim();
    data.meta.classYear = yearInput.value.trim();
    data.meta.school = schoolInput.value.trim();

    saveData(data);
    alert('Profile saved ✅');
  });
}

});
// ✅ REAL THIRD-PARTY API INTEGRATION
// Fetch a motivational quote for students
// ✅ REAL THIRD-PARTY API INTEGRATION (RANDOM)
// ✅ REAL THIRD-PARTY API INTEGRATION (RANDOM)
function loadMotivationalQuote() {
  const quoteText = document.getElementById("quote-text");
  const quoteAuthor = document.getElementById("quote-author");

  if (!quoteText || !quoteAuthor) return;

  // ✅ Fallback quotes (still random)
  const fallbackQuotes = [
    { q: "Discipline beats motivation.", a: "Unknown" },
    { q: "Small progress every day adds up.", a: "MyGuide" },
    { q: "Focus on what you can control.", a: "Unknown" },
    { q: "You don’t need to be perfect — just consistent.", a: "MyGuide" }
  ];

  fetch("https://quotes-api-self.vercel.app/quote")
    .then(res => {
      if (!res.ok) throw new Error("API failed");
      return res.json();
    })
    .then(data => {
      quoteText.textContent = `"${data.quote}"`;
      quoteAuthor.textContent = `— ${data.author || "Unknown"}`;
    })
    .catch(() => {
      console.warn("Quote API failed, using fallback");
      const random =
        fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)];
      quoteText.textContent = `"${random.q}"`;
      quoteAuthor.textContent = `— ${random.a}`;
    });
}

// ✅ Load once per page load (random every refresh)
document.addEventListener("DOMContentLoaded", loadMotivationalQuote);
