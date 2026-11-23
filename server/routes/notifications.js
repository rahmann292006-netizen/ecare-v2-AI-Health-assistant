/**
 * Notifications API — the learner's inbox and their reminder preferences.
 */
import express from 'express';
import { get, all, run } from '../db/index.js';
import { requireUser } from '../lib/context.js';
import { ok, notFound } from '../lib/http.js';
import { prefsFor, updatePrefs, runWorkerTick, deliverDue } from '../lib/notify.js';

const router = express.Router();
router.use(requireUser);

router.get('/', (req, res) => {
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));
  const rows = all(
    'SELECT id, kind, category, title, body, link, read_at, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
    [req.user.id, limit],
  );
  const unread = get('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL', [req.user.id]).n;
  ok(res, {
    notifications: rows.map((r) => ({ ...r, read: Boolean(r.read_at) })),
    unread,
  });
});

router.get('/unread-count', (req, res) => {
  const n = get('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL', [req.user.id]).n;
  ok(res, { unread: n });
});

router.post('/read-all', (req, res) => {
  run('UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL', [new Date().toISOString(), req.user.id]);
  ok(res, { unread: 0 });
});

router.post('/:id/read', (req, res) => {
  const id = Number(req.params.id);
  const row = get('SELECT * FROM notifications WHERE id = ? AND user_id = ?', [id, req.user.id]);
  if (!row) throw notFound('That notification does not exist.');
  run('UPDATE notifications SET read_at = COALESCE(read_at, ?) WHERE id = ?', [new Date().toISOString(), id]);
  ok(res, { read: true });
});

router.get('/preferences', (req, res) => {
  const p = prefsFor(req.user.id);
  ok(res, {
    preferences: {
      timezone: p.timezone,
      reminderTime: p.reminder_time,
      quietHoursStart: p.quiet_hours_start,
      quietHoursEnd: p.quiet_hours_end,
      inAppEnabled: Boolean(p.in_app_enabled),
      emailEnabled: Boolean(p.email_enabled),
      pushEnabled: Boolean(p.push_enabled),
      studyReminders: Boolean(p.study_reminders),
      streakReminders: Boolean(p.streak_reminders),
      assessmentReminders: Boolean(p.assessment_reminders),
      eventReminders: Boolean(p.event_reminders),
      weeklySummary: Boolean(p.weekly_summary),
    },
  });
});

router.patch('/preferences', (req, res) => {
  const p = updatePrefs(req.user.id, req.body || {});
  ok(res, {
    preferences: {
      timezone: p.timezone,
      reminderTime: p.reminder_time,
      quietHoursStart: p.quiet_hours_start,
      quietHoursEnd: p.quiet_hours_end,
      inAppEnabled: Boolean(p.in_app_enabled),
      emailEnabled: Boolean(p.email_enabled),
      pushEnabled: Boolean(p.push_enabled),
      studyReminders: Boolean(p.study_reminders),
      streakReminders: Boolean(p.streak_reminders),
      assessmentReminders: Boolean(p.assessment_reminders),
      eventReminders: Boolean(p.event_reminders),
      weeklySummary: Boolean(p.weekly_summary),
    },
  });
});

/** What the scheduler would say right now — used by the UI to prove it is live. */
router.get('/diagnostics', (req, res) => {
  const queued = all(
    "SELECT kind, category, title, send_at, status, last_error FROM scheduled_notifications WHERE user_id = ? ORDER BY send_at DESC LIMIT 10",
    [req.user.id],
  );
  ok(res, {
    queued,
    worker: req.app.locals.notifyWorker || { running: false },
    delivery: {
      inApp: true,
      email: Boolean(process.env.SMTP_HOST) ? 'configured' : 'not configured — nothing is claimed to be emailed',
      push: 'not configured — no push provider is connected',
    },
  });
});

/** Run one tick now (rate-limited in index.js). Honest: it does the same work as the timer. */
router.post('/run-now', (req, res) => {
  const report = runWorkerTick();
  ok(res, report);
});

export default router;
