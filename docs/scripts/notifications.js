// notifications.js
// Web Notifications helper and in-page scheduling.

/* ---------- Permission ---------- */
async function requestNotificationsPermission() {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;

  const perm = await Notification.requestPermission();
  return perm === "granted";
}

/* ---------- Show notification ---------- */
function showNotification(title, body) {
  if (!("Notification" in window)) {
    alert(title + "\n\n" + body);
    return;
  }

  if (Notification.permission === "granted") {
    new Notification(title, { body });
  }
}

/* ---------- Schedule safely ---------- */
function scheduleNotificationAt(title, body, timestamp) {
  const delay = timestamp - Date.now();

  //  NEVER fire notifications for past times
  if (delay <= 0) return;

  setTimeout(() => {
    showNotification(title, body);
  }, delay);
}

/* ---------- TASK REMINDERS (FIXED) ---------- */
function scheduleAllTaskReminders(task, course) {
  if (!task?.due) return;

  const now = Date.now();
  const dueTs = new Date(task.due).getTime();
  const title = `${course.title}: ${task.title}`;

  // Ignore already-past tasks
  if (dueTs <= now) return;

  //  Immediate confirmation ONLY
  showNotification(
    "Task Added",
    `${title} due ${new Date(task.due).toLocaleString()}`
  );

  const timeUntilDue = dueTs - now;

  //  1 HOUR REMINDER (only if actually valid)
  if (timeUntilDue >= 60 * 60 * 1000) {
    scheduleNotificationAt(
      `${title}: 1 hour left`,
      `Due at ${new Date(task.due).toLocaleString()}`,
      dueTs - 60 * 60 * 1000
    );
  }

  // 20 MINUTE REMINDER (only if actually valid)
  if (timeUntilDue >= 20 * 60 * 1000) {
    scheduleNotificationAt(
      `${title}: 20 minutes left`,
      `Due at ${new Date(task.due).toLocaleString()}`,
      dueTs - 20 * 60 * 1000
    );
  }
}

/* ---------- CLASS REMINDERS (unchanged but safe) ---------- */
function scheduleClassReminders(course) {
  if (!course.classTimes) return;

  requestNotificationsPermission().then(ok => {
    if (!ok) return;

    const next = getNextClassOccurrence(course);
    if (!next) return;

    const startTs = next.date.getTime();
    const now = Date.now();

    // 1 hour before
    if (startTs - now >= 60 * 60 * 1000) {
      scheduleNotificationAt(
        `${course.code || course.title}: Class Soon`,
        `Class starts at ${next.start}`,
        startTs - 60 * 60 * 1000
      );
    }

    // 20 minutes before
    if (startTs - now >= 20 * 60 * 1000) {
      scheduleNotificationAt(
        `${course.code || course.title}: Class in 20 minutes`,
        `Starts at ${next.start}`,
        startTs - 20 * 60 * 1000
      );
    }
  });
}


