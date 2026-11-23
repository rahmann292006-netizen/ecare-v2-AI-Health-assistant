/**
 * Notifications: the honest kind.
 *
 * Rules implemented here:
 *   - nothing is invented: a reminder is only queued when there is real work behind it
 *   - delivery is tracked per row (pending → sent / failed), and a failure is recorded
 *     with its reason instead of being reported as delivered
 *   - quiet hours and the learner's own timezone decide WHEN, never whether
 *   - every notification carries a dedupe key, so a restarted worker cannot spam
 *   - the worker is a server-side interval: it does not need a browser tab open
 */
import { all, get, run } from '../db/index.js';

export const CATEGORIES = ['study', 'streak', 'assessment', 'event', 'weekly', 'milestone', 'system'];

const DEFAULT_PREFS = {
  timezone: 'Asia/Kolkata',
  reminder_time: '19:00',
  quiet_hours_start: '22:00',
  quiet_hours_end: '07:00',
  in_app_enabled: 1,
  email_enabled: 0,
  push_enabled: 0,
  study_reminders: 1,
  streak_reminders: 1,
  assessment_reminders: 1,
  event_reminders: 1,
  weekly_summary: 1,
};

export function prefsFor(userId) {
  const row = get('SELECT * FROM reminder_preferences WHERE user_id = ?', [userId]);
  if (row) return row;
  run(
    `INSERT INTO reminder_preferences (user_id, timezone, reminder_time, quiet_hours_start, quiet_hours_end)
     VALUES (?,?,?,?,?)`,
    [userId, DEFAULT_PREFS.timezone, DEFAULT_PREFS.reminder_time, DEFAULT_PREFS.quiet_hours_start, DEFAULT_PREFS.quiet_hours_end],
  );
  return get('SELECT * FROM reminder_preferences WHERE user_id = ?', [userId]);
}

export function updatePrefs(userId, input) {
  prefsFor(userId);
  const current = get('SELECT * FROM reminder_preferences WHERE user_id = ?', [userId]);
  const time = (v, fallback) => (/^([01]\d|2[0-3]):[0-5]\d$/.test(String(v || '')) ? String(v) : fallback);
  const flag = (v, fallback) => (v === undefined ? fallback : v ? 1 : 0);
  const tz = typeof input.timezone === 'string' && input.timezone.length < 64 ? input.timezone : current.timezone;
  run(
    `UPDATE reminder_preferences SET timezone = ?, reminder_time = ?, quiet_hours_start = ?, quiet_hours_end = ?,
            in_app_enabled = ?, email_enabled = ?, push_enabled = ?, study_reminders = ?, streak_reminders = ?,
            assessment_reminders = ?, event_reminders = ?, weekly_summary = ?, updated_at = ?
      WHERE user_id = ?`,
    [
      tz,
      time(input.reminderTime, current.reminder_time),
      time(input.quietHoursStart, current.quiet_hours_start),
      time(input.quietHoursEnd, current.quiet_hours_end),
      flag(input.inAppEnabled, current.in_app_enabled),
      flag(input.emailEnabled, current.email_enabled),
      flag(input.pushEnabled, current.push_enabled),
      flag(input.studyReminders, current.study_reminders),
      flag(input.streakReminders, current.streak_reminders),
      flag(input.assessmentReminders, current.assessment_reminders),
      flag(input.eventReminders, current.event_reminders),
      flag(input.weeklySummary, current.weekly_summary),
      new Date().toISOString(),
      userId,
    ],
  );
  return get('SELECT * FROM reminder_preferences WHERE user_id = ?', [userId]);
}

/** Minutes since midnight for a "HH:MM" string. */
function minutesOf(hhmm) {
  const [h, m] = String(hhmm || '00:00').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** Is this moment inside the learner's quiet hours? Handles windows across midnight. */
export function inQuietHours(hhmm, start, end) {
  const t = minutesOf(hhmm);
  const s = minutesOf(start);
  const e = minutesOf(end);
  if (s === e) return false;
  return s < e ? t >= s && t < e : t >= s || t < e;
}

/** Local date and time in a timezone, without a dependency. */
export function localNow(timezone, at = new Date()) {
  let parts;
  try {
    parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false, weekday: 'short',
    }).formatToParts(at);
  } catch {
    parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'UTC', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false, weekday: 'short',
    }).formatToParts(at);
  }
  const pick = (t) => parts.find((p) => p.type === t)?.value || '';
  return {
    date: `${pick('year')}-${pick('month')}-${pick('day')}`,
    time: `${pick('hour') === '24' ? '00' : pick('hour')}:${pick('minute')}`,
    weekday: pick('weekday'),
  };
}

/** Category enabled for this learner? */
function categoryEnabled(prefs, category) {
  if (!prefs.in_app_enabled) return false;
  switch (category) {
    case 'study':
    case 'milestone':
      return Boolean(prefs.study_reminders);
    case 'streak':
      return Boolean(prefs.streak_reminders);
    case 'assessment':
      return Boolean(prefs.assessment_reminders);
    case 'event':
      return Boolean(prefs.event_reminders);
    case 'weekly':
      return Boolean(prefs.weekly_summary);
    default:
      return true;
  }
}

/** Insert one notification (idempotent through its dedupe key). */
export function notify({ userId, kind, category = 'system', title, body = '', link = null, dedupeKey = null }) {
  try {
    run(
      `INSERT INTO notifications (user_id, kind, category, title, body, link, dedupe_key)
       VALUES (?,?,?,?,?,?,?)`,
      [userId, kind, category, title, body, link, dedupeKey],
    );
    return true;
  } catch (err) {
    if (String(err.message || '').includes('UNIQUE')) return false;
    throw err;
  }
}

/**
 * Build today's study reminder for one learner, if there is real work.
 * Returns the queued row or null — null means "there was nothing honest to say".
 */
export function queueStudyReminder(userId, { at = new Date() } = {}) {
  const prefs = prefsFor(userId);
  const local = localNow(prefs.timezone, at);
  if (!categoryEnabled(prefs, 'study')) return null;

  const plans = all("SELECT * FROM learning_plans WHERE user_id = ? AND status = 'active'", [userId]);
  if (!plans.length) return null;

  let count = 0;
  let minutesLeft = 0;
  const titles = [];
  for (const p of plans) {
    const rows = all(
      "SELECT title, minutes FROM learning_plan_targets WHERE plan_id = ? AND scheduled_for <= ? AND status IN ('pending','missed') ORDER BY scheduled_for, id LIMIT 4",
      [p.id, local.date],
    );
    count += rows.length;
    minutesLeft += rows.reduce((n, r) => n + r.minutes, 0);
    for (const r of rows.slice(0, 2)) titles.push(r.title);
  }
  if (count === 0) return null;

  const course = get(
    `SELECT c.title, c.slug FROM courses c WHERE c.id = (SELECT course_id FROM learning_plans WHERE user_id = ? AND status = 'active' LIMIT 1)`,
    [userId],
  );

  return schedule({
    userId,
    kind: 'study_reminder',
    category: 'study',
    title: `${count} session${count === 1 ? '' : 's'} waiting · ${minutesLeft} min`,
    body: titles.length ? `Next: ${titles.join(' · ')}` : 'Open your plan to see today’s work.',
    link: course ? `/courses/${course.slug}/plan` : '/plan',
    dedupeKey: `study:${local.date}`,
    sendAt: at.toISOString(),
  });
}

/** Weekly summary built from what actually happened in the last seven days. */
export function queueWeeklySummary(userId, { at = new Date() } = {}) {
  const prefs = prefsFor(userId);
  const local = localNow(prefs.timezone, at);
  if (!categoryEnabled(prefs, 'weekly')) return null;
  if (local.weekday !== 'Mon') return null;

  const since = new Date(at.getTime() - 7 * 86_400_000).toISOString();
  const lessons = get(
    "SELECT COUNT(*) AS n FROM lesson_progress WHERE user_id = ? AND status = 'completed' AND completed_at >= ?",
    [userId, since],
  ).n;
  const attempts = get('SELECT COUNT(*) AS n FROM submissions WHERE user_id = ? AND submitted_at >= ?', [userId, since]).n;
  const passed = get('SELECT COUNT(*) AS n FROM submissions WHERE user_id = ? AND passed = 1 AND submitted_at >= ?', [userId, since]).n;

  if (lessons + attempts === 0) return null;

  return schedule({
    userId,
    kind: 'weekly_summary',
    category: 'weekly',
    title: `Last week: ${lessons} lesson${lessons === 1 ? '' : 's'}, ${passed}/${attempts} checks passed`,
    body: 'Your plan for this week is ready. Consistency beats long sessions.',
    link: '/plan',
    dedupeKey: `weekly:${local.date}`,
    sendAt: at.toISOString(),
  });
}

/**
 * Event reminders: the day before an event starts, and when registration is about to
 * close. Only for events that really exist and only for registered learners.
 */
export function queueEventReminders(userId, { at = new Date() } = {}) {
  const prefs = prefsFor(userId);
  const local = localNow(prefs.timezone, at);
  if (!categoryEnabled(prefs, 'event')) return [];
  const queued = [];
  const events = all(
    `SELECT c.slug, c.title, c.starts_at, c.registration_closes_at, c.status
       FROM competitions c
       JOIN competition_registrations r ON r.competition_id = c.id AND r.user_id = ? AND r.withdrawn_at IS NULL
      WHERE c.status IN ('announced','live')`,
    [userId],
  );
  for (const e of events) {
    if (e.starts_at) {
      const startDate = localNow(prefs.timezone, new Date(e.starts_at)).date;
      const today = local.date;
      const days = Math.round((new Date(`${startDate}T00:00:00Z`) - new Date(`${today}T00:00:00Z`)) / 86_400_000);
      if (days === 1) {
        const row = schedule({
          userId, kind: 'competition_tomorrow', category: 'event',
          title: `${e.title} starts tomorrow`,
          body: 'Open the event page to check the rules and the time.',
          link: `/events/${e.slug}`,
          dedupeKey: `comp-tomorrow:${e.slug}:${today}`,
          sendAt: at.toISOString(),
        });
        if (row) queued.push(row);
      }
    }
  }
  return queued;
}

/** Queue one notification row for the worker. */
export function schedule({ userId, kind, category, title, body = '', link = null, dedupeKey, sendAt, channel = 'in_app' }) {
  const existing = get('SELECT * FROM scheduled_notifications WHERE user_id = ? AND dedupe_key = ?', [userId, dedupeKey]);
  if (existing) return null;
  run(
    `INSERT INTO scheduled_notifications (user_id, kind, category, channel, title, body, link, dedupe_key, send_at)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [userId, kind, category, channel, title, body, link, dedupeKey, sendAt],
  );
  return get('SELECT * FROM scheduled_notifications WHERE user_id = ? AND dedupe_key = ?', [userId, dedupeKey]);
}

/**
 * Deliver everything that is due. Called by the worker on an interval.
 * Returns a small report so the caller can log honestly.
 */
export function deliverDue({ at = new Date(), limit = 200 } = {}) {
  const due = all(
    "SELECT * FROM scheduled_notifications WHERE status = 'pending' AND send_at <= ? ORDER BY send_at LIMIT ?",
    [at.toISOString(), limit],
  );
  const report = { attempted: due.length, sent: 0, failed: 0, suppressed: 0 };

  for (const row of due) {
    const prefs = prefsFor(row.user_id);
    const local = localNow(prefs.timezone, at);
    const blocked = !categoryEnabled(prefs, row.category) || inQuietHours(local.time, prefs.quiet_hours_start, prefs.quiet_hours_end);

    if (blocked) {
      run("UPDATE scheduled_notifications SET status = 'cancelled', last_error = ? WHERE id = ?", [
        inQuietHours(local.time, prefs.quiet_hours_start, prefs.quiet_hours_end) ? 'quiet hours' : 'category disabled',
        row.id,
      ]);
      report.suppressed += 1;
      continue;
    }

    try {
      const created = notify({
        userId: row.user_id,
        kind: row.kind,
        category: row.category,
        title: row.title,
        body: row.body,
        link: row.link,
        dedupeKey: row.dedupe_key,
      });
      run("UPDATE scheduled_notifications SET status = 'sent', sent_at = ?, attempts = attempts + 1 WHERE id = ?", [
        new Date().toISOString(),
        row.id,
      ]);
      report.sent += created ? 1 : 0;
    } catch (err) {
      run("UPDATE scheduled_notifications SET status = 'failed', attempts = attempts + 1, last_error = ? WHERE id = ?", [
        String(err.message || err).slice(0, 300),
        row.id,
      ]);
      report.failed += 1;
    }
  }
  return report;
}

/** One tick of the worker across every learner with preferences. */
export function runWorkerTick({ at = new Date() } = {}) {
  const users = all('SELECT user_id FROM reminder_preferences');
  let queued = 0;
  for (const u of users) {
    if (queueStudyReminder(u.user_id, { at })) queued += 1;
    if (queueWeeklySummary(u.user_id, { at })) queued += 1;
    queued += queueEventReminders(u.user_id, { at }).length;
  }
  const delivered = deliverDue({ at });
  return { users: users.length, queued, ...delivered };
}
