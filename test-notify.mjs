/** Notifications: queueing, quiet hours, dedupe, delivery tracking, preferences. */
const BASE = process.env.BASE || 'http://localhost:4180';
let cookies = {};
let csrf = '';
let failures = 0;
const pass = (m) => console.log('PASS ' + m);
const fail = (m, d) => { failures += 1; console.log('FAIL ' + m + (d ? ' — ' + JSON.stringify(d).slice(0, 300) : '')); };

async function req(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (auth) { headers.cookie = Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; '); if (method !== 'GET') headers['x-csrf-token'] = csrf; }
  const res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  for (const c of res.headers.getSetCookie?.() || []) {
    const [pair] = c.split(';'); const [k, v] = pair.split('=');
    if (k === 'lumen_csrf' && v) { csrf = v; cookies.lumen_csrf = v; }
    if (k === 'lumen_session' && v) cookies.lumen_session = v;
  }
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

await req('/api/catalogue/status', { auth: false });
const email = `notify${Date.now()}@example.com`;
let r = await req('/api/auth/signup', { method: 'POST', auth: false, body: { email, password: 'Correct-horse-battery9', displayName: 'Notify Tester' } });
r = await req('/api/auth/login', { method: 'POST', auth: false, body: { email, password: 'Correct-horse-battery9' } });
if (!cookies.lumen_session) { fail('login', r.json); process.exit(1); }
pass('signed in as ' + email);

const Database = (await import('better-sqlite3')).default;
const db = new Database('server/data/lumen.db');
const uid = db.prepare('SELECT id FROM users WHERE email = ?').get(email).id;

// preferences exist by default
r = await req('/api/notifications/preferences');
const p0 = r.json?.data?.preferences;
r.status === 200 && p0 ? pass(`default preferences: ${p0.reminderTime}, quiet ${p0.quietHoursStart}–${p0.quietHoursEnd}, in-app ${p0.inAppEnabled}`) : fail('preferences', r.json);

// no plan → nothing is queued (no invented reminders)
const mine = () => db.prepare('SELECT COUNT(*) AS n FROM scheduled_notifications WHERE user_id = ?').get(uid).n;
r = await req('/api/notifications/run-now', { method: 'POST', body: {} });
r.status === 200 && mine() === 0 ? pass('no plan → no reminder is invented for this learner') : fail('should not queue without a plan', [r.json?.data, mine()]);

// create a plan, then a tick must queue a real reminder
r = await req('/api/plans/courses/python-programming', { method: 'POST', body: { minutesPerDay: 60, daysPerWeek: 5 } });
r.status === 201 ? pass('plan created for notification test') : fail('plan create', r.json);
r = await req('/api/notifications/run-now', { method: 'POST', body: {} });
r.json?.data?.queued >= 1 ? pass(`worker queued ${r.json.data.queued} reminder(s) with real work behind them`) : fail('no reminder queued with pending work', r.json?.data);

r = await req('/api/notifications');
const inbox = r.json?.data?.notifications || [];
inbox.length >= 1 ? pass(`inbox has ${inbox.length} notification(s), unread ${r.json.data.unread}`) : fail('inbox empty after delivery', r.json?.data);

// dedupe: a second tick must not duplicate today's reminder
const before = inbox.length;
await req('/api/notifications/run-now', { method: 'POST', body: {} });
r = await req('/api/notifications');
r.json.data.notifications.length === before ? pass('second tick does not duplicate the same day') : fail('duplicate notification created', [before, r.json.data.notifications.length]);

// quiet hours suppress delivery, and it is recorded honestly
r = await req('/api/notifications/preferences', { method: 'PATCH', body: { quietHoursStart: '00:00', quietHoursEnd: '23:59' } });
r.status === 200 ? pass('quiet hours updated to all day') : fail('prefs patch', r.json);
// restore study reminders, drop any row already delivered today, then queue afresh
await req('/api/notifications/preferences', { method: 'PATCH', body: { studyReminders: true } });
db.prepare("DELETE FROM scheduled_notifications WHERE user_id = ?").run(uid);
r = await req('/api/notifications/run-now', { method: 'POST', body: {} });
const diag = await req('/api/notifications/diagnostics');
const cancelled = (diag.json?.data?.queued || []).filter((q) => q.status === 'cancelled' && q.last_error === 'quiet hours');
cancelled.length >= 1
  ? pass(`quiet hours suppressed ${cancelled.length} queued reminder(s) and recorded the reason`)
  : fail('quiet hours did not suppress a queued reminder', diag.json?.data?.queued);

// category switch
await req('/api/notifications/preferences', { method: 'PATCH', body: { quietHoursStart: '22:00', quietHoursEnd: '07:00', studyReminders: false } });
r = await req('/api/notifications/run-now', { method: 'POST', body: {} });
r.json?.data?.queued === 0 ? pass('disabling study reminders stops them being queued') : fail('study reminders still queued while disabled', r.json?.data);
await req('/api/notifications/preferences', { method: 'PATCH', body: { studyReminders: true } });

// read state
r = await req('/api/notifications');
const first = r.json.data.notifications[0];
if (first) {
  await req(`/api/notifications/${first.id}/read`, { method: 'POST', body: {} });
  r = await req('/api/notifications');
  r.json.data.notifications.find((n) => n.id === first.id)?.read === true ? pass('notification can be marked read') : fail('mark read');
  await req('/api/notifications/read-all', { method: 'POST', body: {} });
  r = await req('/api/notifications');
  r.json.data.unread === 0 ? pass('read-all clears the badge') : fail('read-all', r.json.data.unread);
}

// delivery honesty: email/push are reported as not configured, never as sent
r = await req('/api/notifications/diagnostics');
const d = r.json?.data;
d?.delivery?.inApp === true ? pass('in-app delivery is live') : fail('in-app delivery');
String(d?.delivery?.push).includes('not configured') ? pass('push is reported as not configured, not faked') : fail('push honesty', d?.delivery);
d?.worker?.running === true ? pass(`worker is running server-side every ${d.worker.intervalMs / 60000} min`) : fail('worker not running', d?.worker);

// authz
const anon = await fetch(BASE + '/api/notifications');
anon.status === 401 ? pass('notifications require authentication') : fail('unauth notifications', anon.status);

console.log(failures === 0 ? '\nALL NOTIFICATION TESTS PASSED' : `\n${failures} FAILURE(S)`);
process.exit(failures ? 1 : 0);
