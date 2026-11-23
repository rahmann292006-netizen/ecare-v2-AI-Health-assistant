import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Check, Clock, Info, CalendarDays } from 'lucide-react';
import { get, post, patch } from '../lib/api.js';
import { AppShell, PageHead, Loading, ErrorState, useToast } from '../components/AppShell.jsx';

const CATEGORY_ROWS = [
  ['studyReminders', 'Study reminders', 'A daily nudge when sessions from your plan are waiting.'],
  ['streakReminders', 'Consistency nudges', 'When you have not studied for a few days.'],
  ['assessmentReminders', 'Assessment reminders', 'When a checkpoint is next in your plan.'],
  ['eventReminders', 'Quizzes and events', 'Competition and quiz announcements you registered for.'],
  ['weeklySummary', 'Weekly summary', 'Monday recap of what you actually completed.'],
];

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
}

export default function Notifications() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [prefs, setPrefs] = useState(null);
  const [diag, setDiag] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setError(null);
    Promise.all([get('/notifications'), get('/notifications/preferences'), get('/notifications/diagnostics')])
      .then(([n, p, d]) => {
        setData(n);
        setPrefs(p.preferences);
        setDiag(d);
      })
      .catch(setError);
  }, []);

  useEffect(load, [load]);

  // a notification may be delivered while this page is open — refresh once it is
  useEffect(() => {
    const timer = setInterval(() => {
      get('/notifications').then(setData).catch(() => {});
    }, 60_000);
    return () => clearInterval(timer);
  }, []);

  const savePref = async (key, value) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    try {
      const res = await patch('/notifications/preferences', { [key]: value });
      setPrefs(res.preferences);
    } catch (err) {
      toast.push(err.message, 'danger');
      load();
    }
  };

  const markAll = async () => {
    try {
      await post('/notifications/read-all', {});
      load();
    } catch (err) {
      toast.push(err.message, 'danger');
    }
  };

  if (error) return <AppShell title="Notifications"><div className="page"><ErrorState error={error} onRetry={load} /></div></AppShell>;
  if (!data || !prefs) return <AppShell title="Notifications"><div className="page"><Loading rows={3} height={100} /></div></AppShell>;

  return (
    <AppShell title="Notifications">
      <div className="page stack stack-6" style={{ maxWidth: 900 }}>
        <PageHead
          eyebrow={data.unread ? `${data.unread} unread` : 'All caught up'}
          title="Notifications and reminders"
          sub="Reminders are queued on the server from real work in your plans — they do not need a browser tab open, and nothing is invented to fill the list."
          actions={data.unread ? <button className="btn" onClick={markAll}><Check aria-hidden="true" /> Mark all read</button> : null}
        />

        <div className="card card--flush">
          <div style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--border)' }}>
            <div className="card__title">Inbox</div>
            <div className="card__hint">Newest first.</div>
          </div>
          {data.notifications.length === 0 ? (
            <div style={{ padding: 'var(--space-6) var(--space-5)', textAlign: 'center' }}>
              <Bell aria-hidden="true" style={{ width: 22, height: 22, color: 'var(--text-tertiary)' }} />
              <p className="small muted" style={{ marginTop: 8 }}>
                Nothing yet. Once you start a learning journey, your first reminder appears here.
              </p>
              <Link className="btn btn--sm" to="/courses" style={{ marginTop: 10 }}>Browse courses</Link>
            </div>
          ) : (
            data.notifications.map((n) => (
              <div key={n.id} style={{ padding: 'var(--space-3) var(--space-5)', borderBottom: '1px solid var(--border)', background: n.read ? 'transparent' : 'var(--bg-subtle)' }}>
                <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
                  <span className={`badge ${n.read ? '' : 'badge--accent'}`}>{n.category}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {n.link ? (
                      <Link className="small strong" to={n.link}>{n.title}</Link>
                    ) : (
                      <span className="small strong">{n.title}</span>
                    )}
                    {n.body && <div className="tiny muted" style={{ marginTop: 2, lineHeight: 1.55 }}>{n.body}</div>}
                  </div>
                  <span className="tiny muted" style={{ flexShrink: 0 }}>{timeAgo(n.created_at)}</span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="card">
          <div className="card__title">What you get, and when</div>
          <div className="card__hint">Turn off anything you do not want. Changes apply to the next reminder.</div>
          <div className="stack stack-3" style={{ marginTop: 'var(--space-4)' }}>
            {CATEGORY_ROWS.map(([key, label, hint]) => (
              <label key={key} className="row row--between" style={{ gap: 12, cursor: 'pointer', alignItems: 'flex-start' }}>
                <span>
                  <span className="small strong">{label}</span>
                  <span className="tiny muted" style={{ display: 'block', marginTop: 2 }}>{hint}</span>
                </span>
                <span
                  role="switch"
                  aria-checked={Boolean(prefs[key])}
                  tabIndex={0}
                  onClick={() => savePref(key, !prefs[key])}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      savePref(key, !prefs[key]);
                    }
                  }}
                  className="switch"
                  style={{
                    width: 34, height: 20, borderRadius: 10, flexShrink: 0, marginTop: 2, position: 'relative',
                    cursor: 'pointer', transition: 'background 120ms ease',
                    background: prefs[key] ? 'var(--accent)' : 'var(--border-strong)',
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      position: 'absolute', top: 2, left: prefs[key] ? 16 : 2, width: 16, height: 16,
                      borderRadius: 8, background: '#fff', transition: 'left 120ms ease',
                    }}
                  />
                </span>
              </label>
            ))}
          </div>

          <div className="grid grid--2" style={{ marginTop: 'var(--space-5)', gap: 'var(--space-4)' }}>
            <label className="field">
              <span className="field__label"><Clock style={{ width: 12, height: 12 }} aria-hidden="true" /> Daily reminder time</span>
              <input className="input" type="time" value={prefs.reminderTime} onChange={(e) => savePref('reminderTime', e.target.value)} />
            </label>
            <label className="field">
              <span className="field__label"><CalendarDays style={{ width: 12, height: 12 }} aria-hidden="true" /> Time zone</span>
              <input className="input" value={prefs.timezone} onChange={(e) => setPrefs({ ...prefs, timezone: e.target.value })} onBlur={(e) => savePref('timezone', e.target.value)} />
            </label>
            <label className="field">
              <span className="field__label">Quiet hours start</span>
              <input className="input" type="time" value={prefs.quietHoursStart} onChange={(e) => savePref('quietHoursStart', e.target.value)} />
            </label>
            <label className="field">
              <span className="field__label">Quiet hours end</span>
              <input className="input" type="time" value={prefs.quietHoursEnd} onChange={(e) => savePref('quietHoursEnd', e.target.value)} />
            </label>
          </div>
          <p className="tiny muted" style={{ marginTop: 8 }}>
            Nothing is delivered inside quiet hours. Suppressed reminders are recorded as suppressed, not as sent.
          </p>
        </div>

        <div className="card">
          <div className="card__title row" style={{ gap: 6 }}><Info style={{ width: 14, height: 14 }} aria-hidden="true" /> Delivery channels</div>
          <ul className="small" style={{ margin: '8px 0 0', paddingLeft: '1.05rem', color: 'var(--text-secondary)', display: 'grid', gap: 5 }}>
            <li>In-app: working — {diag?.worker?.running ? `the scheduler runs every ${Math.round(diag.worker.intervalMs / 60000)} min on the server` : 'scheduler idle'}.</li>
            <li>Email: {String(diag?.delivery?.email).includes('configured') ? 'configured' : 'not configured — nothing is claimed to be emailed'}.</li>
            <li>Push: {String(diag?.delivery?.push).includes('not configured') ? 'not configured — no push provider is connected' : diag?.delivery?.push}.</li>
          </ul>
        </div>
      </div>
    </AppShell>
  );
}
