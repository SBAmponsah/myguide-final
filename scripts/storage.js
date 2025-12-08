// storage.js
// Responsible for persisting/loading/exporting/importing all data in localStorage.

const STORAGE_KEY = 'myguide_v1';

function defaultData() {
  return {
    meta: {
      username: 'Student',
      semester: 'Fall 2025',
      lastWeeklyPrompt: null
    },
    settings: {
      theme: 'purple-white',
      notificationsEnabled: true,
      defaultReminderMinutes: 20
    },
    courses: [],
    goals: [],
    history: [],
    studyLogs: []
  };
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const d = defaultData();
      saveData(d);
      return d;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load data', e);
    const d = defaultData();
    saveData(d);
    return d;
  }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/* EXPORT DATA */
function exportJSON() {
  const data = loadData();

  const blob = new Blob(
    [JSON.stringify(data, null, 2)],
    { type: 'application/json' }
  );

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'myguide-backup.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* IMPORT DATA */
function importJSON(file, merge = false) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(reader.result);
        if (!merge) {
          saveData(obj);
          resolve(obj);
        } else {
          const existing = loadData();
          existing.courses = existing.courses.concat(obj.courses || []);
          existing.goals = existing.goals.concat(obj.goals || []);
          existing.history = existing.history.concat(obj.history || []);
          existing.studyLogs = existing.studyLogs.concat(obj.studyLogs || []);
          saveData(existing);
          resolve(existing);
        }
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

/*  CLEAR ALL DATA */
function clearAllData() {
  localStorage.removeItem(STORAGE_KEY);
  saveData(defaultData());
}

/*  MAKE FUNCTIONS AVAILABLE GLOBALLY */
window.loadData = loadData;
window.saveData = saveData;
window.exportJSON = exportJSON;
window.importJSON = importJSON;
window.clearAllData = clearAllData;

