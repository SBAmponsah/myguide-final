// scripts/course.js
(function(){
  // Helpers
  function uid(prefix='') { return prefix + Math.random().toString(36).slice(2,9); }
  function $(id){ return document.getElementById(id); }
  function formatDateShort(iso){ if(!iso) return ''; const d=new Date(iso); return d.toLocaleString(); }

  // Read course id from querystring ?course=ID
  const params = new URLSearchParams(location.search);
  const courseId = params.get('course') || (loadData().courses[0] && loadData().courses[0].id);

  if(!courseId){
    // No course found: show minimal message and stop
    document.body.innerHTML = '<div class="p-5"><h3>No course selected. Go back to dashboard and open a course.</h3></div>';
    return;
  }

  // Ensure course exists
  const data = loadData();
  let course = (data.courses || []).find(c => c.id === courseId);
  if(!course){
    // create a skeleton course (safe)
    course = {
      id: courseId,
      code: courseId.toUpperCase(),
      title: 'New Course',
      tasks: [],
      notes: [],
      weeklyPlans: []
    };
    data.courses = data.courses || [];
    data.courses.push(course);
    saveData(data);
  }

  /* ---------- elements ---------- */
  const elCourseCode = $('course-code');
  const elCourseName = $('course-name');
  const btnNotes = $('btn-open-notes');
  const btnPlanWeek = $('btn-plan-week');
  const btnNewNote = $('btn-new-note');
  const notesList = $('notes-list');

  const overviewList = $('overview-list');
  const assignList = $('assign-list');
  const quizList = $('quiz-list');
  const otherList = $('other-list');

  // Note editor page elements
  const noteEditor = $('note-editor');
  const noteTitleInput = $('note-title-input');
  const noteDateInput = $('note-date-input');
  const noteCategory = $('note-category');
  const noteBody = $('note-body');
  //  Auto-resize note textarea (with scroll support)
function autoResizeNote() {
  if (!noteBody) return;

  noteBody.style.height = 'auto';

  const maxHeight = window.innerHeight * 0.7; // match CSS
  const newHeight = Math.min(noteBody.scrollHeight, maxHeight);

  noteBody.style.height = newHeight + 'px';
}

  // ---------- Auto-grow note textarea ----------
if (noteBody) {
  const autoResize = () => {
    noteBody.style.height = 'auto';
    noteBody.style.height = noteBody.scrollHeight + 'px';
  };

  // Grow on typing
  noteBody.addEventListener('input', autoResize);

  // Grow when pasting
  noteBody.addEventListener('paste', () => {
    setTimeout(autoResize, 0);
  });
}

  const btnSaveNote = $('btn-save-note');
  const btnCancelNote = $('btn-cancel-note');
  const editorHeading = $('editor-heading');
  const btnNewNoteTop = $('btn-new-note');

  // Planner elements
  const plannerPage = $('planner-page');
  const plannerWeekStart = $('planner-week-start');
  const btnAddWeekItem = $('btn-add-week-item');
  const addItemArea = $('add-item-area');
  const itemTitle = $('item-title');
  const itemType = $('item-type');
  const itemDate = $('item-date');
  const itemTime = $('item-time');
  const btnAddItemSave = $('btn-add-item-save');
  const plannerGrid = $('planner-grid');
  const btnSaveWeek = $('btn-save-week');
  const btnCloseWeek = $('btn-close-week');
  const archivedWeeksList = $('archived-weeks');

  /* ---------- render header ---------- */
  function renderHeader(){
    if (elCourseCode) elCourseCode.textContent = course.code || course.id.toUpperCase();
    if (elCourseName) elCourseName.textContent = course.title || 'Untitled Course';
  }
function createTaskRow(t) {
  const el = document.createElement('div');
  el.className = 'list-group-item d-flex justify-content-between align-items-start';

  const left = document.createElement('div');
  left.innerHTML = `
    <strong>${t.title}</strong>
    <div class="small text-muted">
      ${(t.type || 'Task')} • ${t.due ? new Date(t.due).toLocaleString() : 'No due date'}
    </div>
  `;

  const right = document.createElement('div');

  const badge = document.createElement('span');
  badge.className = 'task-type-badge bg-light border';
  badge.textContent = t.type || 'Task';
  right.appendChild(badge);

  const del = document.createElement('button');
  del.className = 'btn btn-sm btn-outline-danger ms-2';
  del.textContent = 'Delete';

  del.onclick = () => {
    if (confirm('Delete this item?')) {
      deleteTask(t.id);
    }
  };

  right.appendChild(del);

  el.appendChild(left);
  el.appendChild(right);

  return el;
}

  /* ---------- tasks & overview rendering ---------- */
function renderTasksTabs(){
  if (!overviewList || !assignList || !quizList || !otherList) return;

  const rawTasks = course.tasks || [];

  const seen = new Set();
  const tasks = [];
  rawTasks.forEach(t => {
    const key = t.sourceId || `${t.title}|${t.type}|${t.due}`;
    if (seen.has(key)) return;
    seen.add(key);
    tasks.push(t);
  });

  // Sort by due earliest
  tasks.sort((a,b)=> new Date(a.due || 0) - new Date(b.due || 0));

  overviewList.innerHTML = '';
  assignList.innerHTML = '';
  quizList.innerHTML = '';
  otherList.innerHTML = '';

  tasks.forEach(t => {
    //  CREATE ROW FUNCTION INLINE (NO CLONING)
    function createRow() {
      const el = document.createElement('div');
      el.className = 'list-group-item d-flex justify-content-between align-items-start';

      const left = document.createElement('div');
      left.innerHTML = `
        <strong>${t.title}</strong>
        <div class="small text-muted">
          ${(t.type || 'Task')} • ${t.due ? new Date(t.due).toLocaleString() : 'No due date'}
        </div>
      `;

      const right = document.createElement('div');

      const badge = document.createElement('span');
      badge.className = 'task-type-badge bg-light border';
      badge.textContent = t.type || 'Task';
      right.appendChild(badge);

      const del = document.createElement('button');
      del.className = 'btn btn-sm btn-outline-danger ms-2';
      del.textContent = 'Delete';
      del.onclick = () => {
        if (confirm('Delete this item?')) {
          deleteTask(t.id);
        }
      };
      right.appendChild(del);

      el.appendChild(left);
      el.appendChild(right);

      return el;
    }

    // Overview
    overviewList.appendChild(createRow());

    //  Category tabs
    if (t.type === 'Assignment' || t.type === 'Exam') {
      assignList.appendChild(createRow());
    } else if (t.type === 'Quiz') {
      quizList.appendChild(createRow());
    } else {
      otherList.appendChild(createRow());
    }
  });

  if(tasks.length === 0){
    overviewList.innerHTML = '<div class="text-muted">No tasks yet — plan your week to add tasks.</div>';
  }
}

/* ---------- delete task ---------- */
function deleteTask(taskId){
  course.tasks = (course.tasks || []).filter(t => t.id !== taskId);
  saveData(data);
  renderTasksTabs();
}

  /* ---------- Notes rendering ---------- */
  function renderNotesList(){
    if (!notesList) return;
    notesList.innerHTML = '';
    const notes = (course.notes || []).slice().sort((a,b)=> new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0));
    if(notes.length===0){
      notesList.innerHTML = '<div class="text-muted">No notes yet.</div>'; 
      return;
    }
    notes.forEach(n=>{
      const it = document.createElement('div');
      it.className = 'list-group-item';
      it.innerHTML = `
        <div class="d-flex justify-content-between">
          <div>
            <strong>${n.title}</strong> <span class="tag">${n.category || 'Note'}</span>
            <div class="small text-muted">${formatDateShort(n.createdAt || n.date)}</div>
          </div>
          <div>
            <button class="btn btn-sm btn-outline-primary me-2">Open</button>
            <button class="btn btn-sm btn-outline-danger">Delete</button>
          </div>
        </div>
        <p class="mt-2 mb-0 small">
          ${(n.content||'').slice(0,220)}${(n.content||'').length>220?'...':''}
        </p>
      `;
      // Open button shows note in editor read-only
      it.querySelector('button.btn-outline-primary').onclick = ()=> openNoteEditor(n, true);
      it.querySelector('button.btn-outline-danger').onclick = ()=>{
        if(confirm('Delete note?')) { 
          course.notes = course.notes.filter(x=> x.id !== n.id); 
          saveData(data); 
          renderNotesList(); 
        }
      };
      notesList.appendChild(it);
    });
  }

  /* ---------- Note editor (full page) ---------- */
  let editingNote = null;
  function openNoteEditor(note = null, readOnly=false){
    if (!noteEditor) return;
    editingNote = note;
    noteEditor.style.display = 'block';

    const todayISO = new Date().toISOString().split('T')[0];

    if(note){
      if (editorHeading) editorHeading.textContent = readOnly ? 'View Note' : 'Edit Note';
      if (noteTitleInput) noteTitleInput.value = note.title || '';
      if (noteDateInput) noteDateInput.value = note.date ? new Date(note.date).toISOString().split('T')[0] : todayISO;
      if (noteCategory) noteCategory.value = note.category || 'Lecture';
      if (noteBody) {
        noteBody.value = note.content || '';
        setTimeout(() => {
  noteBody.style.height = 'auto';

  const maxHeight = window.innerHeight * 0.7;
  noteBody.style.height =
    Math.min(noteBody.scrollHeight, maxHeight) + 'px';
}, 0);


        noteBody.readOnly = !!readOnly;
      }
      if (btnSaveNote) btnSaveNote.style.display = readOnly ? 'none' : 'inline-block';
    } else {
      if (editorHeading) editorHeading.textContent = 'New Note';
      if (noteTitleInput) noteTitleInput.value = '';
      if (noteDateInput) noteDateInput.value = todayISO;
      if (noteCategory) noteCategory.value = 'Lecture';
      if (noteBody) {
        noteBody.value = '';
        noteBody.readOnly = false;
      }
      if (btnSaveNote) btnSaveNote.style.display = 'inline-block';
    }
    window.scrollTo(0,0);
  }

  function closeNoteEditor(){ 
    editingNote = null; 
    if (noteEditor) noteEditor.style.display = 'none'; 
  }

  if (btnNotes) btnNotes.addEventListener('click', ()=> openNoteEditor(null,false));
  if (btnNewNoteTop) btnNewNoteTop.addEventListener('click', ()=> openNoteEditor(null,false));
  if (btnCancelNote) btnCancelNote.addEventListener('click', closeNoteEditor);

  if (btnSaveNote){
    btnSaveNote.addEventListener('click', ()=>{
      const title = (noteTitleInput?.value || '').trim() || 'Untitled';
      const date = noteDateInput?.value || new Date().toISOString().split('T')[0];
      const category = noteCategory?.value || 'Lecture';
      const content = (noteBody?.value || '').trim() || '';

      if(editingNote){
        editingNote.title = title;
        editingNote.date = date;
        editingNote.category = category;
        editingNote.content = content;
        editingNote.updatedAt = new Date().toISOString();
      } else {
        const n = { id: uid('n-'), title, date, category, content, createdAt: new Date().toISOString() };
        course.notes = course.notes || [];
        course.notes.push(n);
      }
      saveData(data);
      renderNotesList();
      closeNoteEditor();
    });
  }

  /* ---------- Weekly planner ---------- */
//  Wire Save & Apply button safely (DEFINE FIRST)
function wireSaveWeek() {
  const btn = document.getElementById('btn-save-week');
  if (!btn) {
    console.warn('Save & Apply button not found');
    return;
  }

  // prevent double-binding
  if (btn.dataset.bound === 'true') return;

  btn.addEventListener('click', saveAndArchiveWeek);
  btn.dataset.bound = 'true';

  console.log(' Save & Apply button wired');
}

  function openPlanner(){
    if (!plannerPage || !plannerWeekStart) return;
    plannerPage.style.display = 'block';
    // set week start to next or last sunday
    const today = new Date();
    // using date-fns if available, else manual
    let sunday;
    if (window.dateFns && dateFns.startOfWeek) {
      sunday = dateFns.startOfWeek(today, {weekStartsOn:0});
    } else {
      sunday = new Date(today);
      const day = sunday.getDay(); // 0=Sun
      sunday.setDate(sunday.getDate() - day);
      sunday.setHours(0,0,0,0);
    }
    plannerWeekStart.value = sunday.toISOString().split('T')[0];
    renderPlannerGrid();
    renderArchivedWeeks();
    wireSaveWeek(); 
  }

  function closePlanner(){ 
    if (plannerPage) plannerPage.style.display = 'none'; 
    if (addItemArea) addItemArea.style.display='none'; 
  }

  if (btnPlanWeek) btnPlanWeek.addEventListener('click', openPlanner);
  if (btnCloseWeek) btnCloseWeek.addEventListener('click', closePlanner);

  // UI to show add item area
  if (btnAddWeekItem){
    btnAddWeekItem.addEventListener('click', ()=> {
      if (!addItemArea) return;
      addItemArea.style.display = addItemArea.style.display === 'none' ? 'block' : 'none';
      if (addItemArea.style.display === 'block' && itemTitle) itemTitle.focus();
    });
  }

  // Add item save (single, correct handler)
  if (btnAddItemSave){
    btnAddItemSave.addEventListener('click', ()=>{
      const title = (itemTitle?.value || '').trim();
      let type = itemType?.value || 'Assignment';
    if (type === 'Exam') type = 'Assignment';
      const date = itemDate?.value;
      const time = itemTime?.value;

      if(!title || !date){
        alert('Give the item a title and a date.');
        return;
      }
      // build ISO local datetime (respect local TZ)
      let iso = null;
      if(time){
        const [y,mo,d] = date.split('-').map(Number);
        const [hh,mm] = time.split(':').map(Number);
        iso = new Date(y,mo-1,d,hh,mm,0,0).toISOString();
      } else {
        // default end of day
        const [y,mo,d] = date.split('-').map(Number);
        iso = new Date(y,mo-1,d,23,59,0,0).toISOString();
      }

      // Create weekly item (store under course.weeklyPlans for this week start)
      const weekStart = plannerWeekStart?.value;
      if (!weekStart){
        alert('Pick a week start date first.');
        return;
      }

      course.weeklyPlans = course.weeklyPlans || [];
      let week = course.weeklyPlans.find(w => w.weekStart === weekStart);
      if(!week){
        week = { weekStart, items: [] };
        course.weeklyPlans.push(week);
      }

      const item = { id: uid('w-'), title, type, due: iso, createdAt: new Date().toISOString() };
      week.items.push(item);

      // ALSO add to course.tasks for auto-grouping
      course.tasks = course.tasks || [];
      course.tasks.push({ id: uid('t-'), title, type, due: iso, added: new Date().toISOString(), status: 'open' });

      saveData(data);
      renderPlannerGrid();
      renderTasksTabs();

      // schedule notifications
      const MIN_DELAY = 60 * 1000; // 1 minute safety buffer

if (typeof requestNotificationsPermission === 'function' &&
    typeof scheduleNotificationAt === 'function') {

  requestNotificationsPermission().then(ok => {
    if (!ok) return;

    const now = Date.now();
    const dueTs = new Date(iso).getTime();

    //  Do nothing if already overdue
    if (dueTs <= now) return;

    //  Immediate confirmation (ONLY when task is added)
    scheduleNotificationAt(
      `${course.code}: Task added`,
      `${title} due ${new Date(iso).toLocaleString()}`,
      now + 500
    );

    //  1 hour reminder — ONLY if truly in the future
    const oneHourAt = dueTs - (60 * 60 * 1000);
    if (oneHourAt - now > MIN_DELAY) {
      scheduleNotificationAt(
        `${title}: 1 hour left`,
        `${title} due at ${new Date(iso).toLocaleString()}`,
        oneHourAt
      );
    }

    // 20 minute reminder — ONLY if truly in the future
    const twentyMinAt = dueTs - (20 * 60 * 1000);
    if (twentyMinAt - now > MIN_DELAY) {
      scheduleNotificationAt(
        `${title}: 20 minutes left`,
        `Due at ${new Date(iso).toLocaleString()}`,
        twentyMinAt
      );
    }
  });
}


      // reset add area
      if (itemTitle) itemTitle.value = ''; 
      if (itemDate) itemDate.value=''; 
      if (itemTime) itemTime.value=''; 
      if (itemType) itemType.value='Assignment';
      if (addItemArea) addItemArea.style.display='none';
    });
  }

  // Render planner grid for chosen week
  function renderPlannerGrid() {
  if (!plannerGrid || !plannerWeekStart) return;

  plannerGrid.innerHTML = '';
  const weekStart = plannerWeekStart.value;

  if (!weekStart) {
    plannerGrid.innerHTML =
      '<div class="text-danger">Pick a week start date.</div>';
    return;
  }

  // Start on MONDAY after selected Sunday (LOCAL + SAFE)
  const [y, m, d0] = weekStart.split('-').map(Number);
  const start = new Date(y, m - 1, d0 + 1, 12); // Monday at noon

  const week = (course.weeklyPlans || []).find(
    w => w.weekStart === weekStart
  );

  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);

    //  Local YYYY-MM-DD (NO UTC)
    const dayKey =
      d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');

    const col = document.createElement('div');
    col.className = 'col-12 col-md-4 col-lg-2';

    const card = document.createElement('div');
    card.className = 'week-day';

    const heading = document.createElement('div');
    heading.innerHTML = `
      <strong>${d.toLocaleDateString(undefined, {
        weekday: 'short',
        day: '2-digit'
      })}</strong>
      <div class="small text-muted">
        ${d.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric'
        })}
      </div>
    `;
    card.appendChild(heading);

    /* ---------- FIXED ITEM LOGIC ---------- */

    //  Weekly planner items (FILTERED BY DAY)
    const weekItems = week?.items
      ? week.items.filter(it => {
          if (!it.due) return false;
          const due = new Date(it.due);
          const itDay =
            due.getFullYear() + '-' +
            String(due.getMonth() + 1).padStart(2, '0') + '-' +
            String(due.getDate()).padStart(2, '0');
          return itDay === dayKey;
        })
      : [];

    // Tasks added via Quick Add (course.tasks)
    const taskItems = (course.tasks || []).filter(t => {
      if (!t.due) return false;
      const due = new Date(t.due);
      const taskDay =
        due.getFullYear() + '-' +
        String(due.getMonth() + 1).padStart(2, '0') + '-' +
        String(due.getDate()).padStart(2, '0');
      return taskDay === dayKey;
    });

    // Merge WITHOUT duplicates
    const seen = new Set();
    const items = [];
    [...weekItems, ...taskItems].forEach(it => {
      const key = `${it.title}|${it.due}`;
      if (seen.has(key)) return;
      seen.add(key);
      items.push(it);
    });

    /* ---------- RENDER ---------- */

    const list = document.createElement('div');
    list.className = 'mt-2';

    if (items.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'small text-muted';
      empty.textContent = 'No items';
      list.appendChild(empty);
    } else {
      items.forEach(it => {
        const row = document.createElement('div');
        row.className =
          'mb-2 d-flex justify-content-between align-items-start';

        row.innerHTML = `
          <div>
            <div>
              <strong>${it.title}</strong>
              <span class="badge bg-light text-dark">${it.type || 'Task'}</span>
            </div>
            <div class="small text-muted">
              ${new Date(it.due).toLocaleString()}
            </div>
          </div>
        `;

        const controls = document.createElement('div');
        const del = document.createElement('button');
        del.className = 'btn btn-sm btn-outline-danger ms-2';
        del.textContent = 'Delete';

        del.onclick = () => {
          if (!confirm('Delete this item?')) return;

          // Remove from weekly plan
          if (week?.items) {
            week.items = week.items.filter(x => x.id !== it.id);
          }

          // Remove matching task
          course.tasks = (course.tasks || []).filter(
            t =>
              !(
                t.title === it.title &&
                new Date(t.due).getTime() ===
                  new Date(it.due).getTime()
              )
          );

          saveData(data);
          renderPlannerGrid();
          renderTasksTabs();
        };

        controls.appendChild(del);
        row.appendChild(controls);
        list.appendChild(row);
      });
    }

    card.appendChild(list);
    col.appendChild(card);
    plannerGrid.appendChild(col);
  }
}
function saveAndArchiveWeek() {
  console.log(' Save & Apply clicked');
  if (!plannerWeekStart || !plannerWeekStart.value) {
    alert('Pick a week start date first.');
    return;
  }

  const weekStart = plannerWeekStart.value;

  course.weeklyPlans = course.weeklyPlans || [];
  course.archivedWeeks = course.archivedWeeks || [];

  const index = course.weeklyPlans.findIndex(
    w => w.weekStart === weekStart
  );

  if (index === -1) {
    alert('No planned items to save.');
    return;
  }

  const week = course.weeklyPlans[index];

  if (!week.items || week.items.length === 0) {
    alert('This week has no items.');
    return;
  }

  //  Archive it
  course.archivedWeeks.push({
    weekStart,
    items: week.items.slice(),
    archivedAt: new Date().toISOString()
  });

  //  Remove it from active planner
  course.weeklyPlans.splice(index, 1);

  saveData(data);

  alert('Week saved & archived ');

  /** RESET PLANNER TO NEXT WEEK **/
  const oldDate = new Date(weekStart);
  oldDate.setDate(oldDate.getDate() + 7);
  plannerWeekStart.value = oldDate.toISOString().split('T')[0];

  // Re-render clean state
  renderPlannerGrid();
  renderArchivedWeeks();
}


  function renderArchivedWeeks(){
    if (!archivedWeeksList) return;
    archivedWeeksList.innerHTML = '';
    (course.archivedWeeks||[]).slice().reverse().forEach(aw=>{
      const it = document.createElement('div'); 
      it.className='list-group-item d-flex justify-content-between align-items-center';
      it.innerHTML = `
        <div>
          <strong>Week of ${aw.weekStart}</strong>
          <div class="small text-muted">
            Archived ${new Date(aw.archivedAt).toLocaleString()}
          </div>
        </div>
      `;
      const btn = document.createElement('button'); 
      btn.className='btn btn-sm btn-outline-secondary'; 
      btn.textContent='View';
      btn.onclick = ()=>{
        // show items in an alert (simple preview)
        const list = (aw.items||[]).map(i=> 
          `${i.type} — ${i.title} • ${new Date(i.due).toLocaleString()}`
        ).join('\n');
        alert(`Items for week ${aw.weekStart}:\n\n${list}`);
      };
      it.appendChild(btn);
      archivedWeeksList.appendChild(it);
    });
    if((course.archivedWeeks||[]).length===0) 
      archivedWeeksList.innerHTML = '<div class="text-muted">No archived weeks.</div>';
  }

  /* ---------- initial render ---------- */
  function init(){
    renderHeader();
    renderTasksTabs();
    renderNotesList();

    // Wire top-right buttons (some already wired above, but safe)
    if (btnNotes) btnNotes.addEventListener('click', ()=> openNoteEditor(null,false));
    if (btnPlanWeek) btnPlanWeek.addEventListener('click', openPlanner);
    if (btnNewNote) btnNewNote.addEventListener('click', ()=> openNoteEditor(null,false));
    if (btnCloseWeek) btnCloseWeek.addEventListener('click', closePlanner);
function wireSaveWeek() {
  const btn = document.getElementById('btn-save-week');
  if (btn && !btn.dataset.bound) {
    btn.addEventListener('click', saveAndArchiveWeek);
    btn.dataset.bound = 'true';
  }
}


    
  }

  init();
})();
