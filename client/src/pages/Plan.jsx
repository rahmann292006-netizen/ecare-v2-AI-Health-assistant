import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowRight, CalendarClock, CheckCircle2, Circle, Clock, Pause, Play, RotateCcw,
  AlertCircle, SlidersHorizontal, XCircle,
} from 'lucide-react';
import { get, post } from '../lib/api.js';
import { AppShell, PageHead, Loading, ErrorState, Progress, useToast } from '../components/AppShell.jsx';
import { minutes, percent } from '../lib/format.js';

const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function fmtDate(d) {
  const dt = new Date(`${d}T00:00:00Z`);
  return dt.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
}

const STATUS_TONE = {
  done: 'var(--success)',
  missed: 'var(--danger)',
  skipped: 'var(--text-tertiary)',
  pending: 'var(--text-secondary)',
};

/** The learner's dated plan for one course. */
export default function Plan() {
  const { slug } = useParams();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [week, setWeek] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [offset, setOffset] = useState(0);

  const load = useCallback(() => {
    setError(null);
    get(`/plans/courses/${slug}`).then(setData).catch(setError);
  }, [slug]);

  const loadWeek = useCallback(() => {
    const start = new Date();
    const monday = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()) - ((start.getUTCDay() + 6) % 7) * 86400000 + offset * 7 * 86400000);
    get(`/plans/week?start=${monday.toISOString().slice(0, 10)}&course=${slug}`)
      .then((d) => setWeek(d.plans[0] || null))
      .catch(() => setWeek(null));
  }, [slug, offset]);

  useEffect(load, [load]);
  useEffect(loadWeek, [loadWeek]);

  const act = async (path, message) => {
    setBusy(true);
    try {
      await post(`/plans/courses/${slug}/${path}`, {});
      toast.push(message, 'success');
      load();
      loadWeek();
    } catch (err) {
      toast.push(err.message, 'danger');
    } finally {
      setBusy(false);
    }
  };

  const skip = async (id) => {
    try {
      await post(`/plans/targets/${id}/skip`, {});
      loadWeek();
      load();
      toast.push('Skipped. Your progress is unchanged.', 'default');
    } catch (err) {
      toast.push(err.message, 'danger');
    }
  };

  if (error) return <AppShell title="My plan"><div className="page"><ErrorState error={error} onRetry={load} /></div></AppShell>;
  if (!data) return <AppShell title="My plan"><div className="page"><Loading rows={3} height={110} /></div></AppShell>;

  if (!data.plan) {
    return (
      <AppShell title="My plan">
        <div className="page stack stack-5" style={{ maxWidth: 720 }}>
          <PageHead
            eyebrow="No plan yet"
            title={`Plan your ${data.course.title} journey`}
            sub="Nothing is scheduled for this course yet. Choose your pace and Lumen will turn the roadmap into dated sessions."
          />
          <Link className="btn btn--primary" to={`/courses/${slug}/start`}>
            Start This Learning Journey <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </AppShell>
    );
  }

  const plan = data.plan;

  return (
    <AppShell title="My plan">
      <div className="page stack stack-6">
        <PageHead
          eyebrow={`${plan.status} · ${plan.minutesPerDay} min × ${plan.daysPerWeek} days a week`}
          title={`Your ${data.course.title} plan`}
          sub={`Started ${fmtDate(plan.startDate)} · targeted finish ${fmtDate(plan.targetDate)} · reminders at ${plan.reminderTime} (${plan.timezone})`}
          actions={
            <>
              <Link className="btn" to={`/courses/${slug}/start`}>
                <SlidersHorizontal aria-hidden="true" /> Change pace
              </Link>
              {plan.status === 'active' ? (
                <button className="btn" disabled={busy} onClick={() => act('pause', 'Plan paused. Your progress is safe.')}>
                  <Pause aria-hidden="true" /> Pause
                </button>
              ) : (
                <button className="btn btn--primary" disabled={busy} onClick={() => act('resume', 'Plan resumed — missed sessions were moved to the next study days.')}>
                  <Play aria-hidden="true" /> Resume
                </button>
              )}
              <button className="btn" disabled={busy} onClick={() => act('reschedule', 'Remaining sessions were re-dated from today.')}>
                <CalendarClock aria-hidden="true" /> Recover missed
              </button>
            </>
          }
        />

        <div className="grid grid--4">
          <div className="card card--tight">
            <div className="tiny muted">Progress</div>
            <div className="strong" style={{ fontSize: 22, marginTop: 4 }}>{plan.percent}%</div>
            <Progress value={plan.percent} />
          </div>
          <div className="card card--tight">
            <div className="tiny muted">Sessions done</div>
            <div className="strong" style={{ fontSize: 22, marginTop: 4 }}>
              {plan.targets.done}<span className="muted" style={{ fontSize: 14 }}> / {plan.targets.total}</span>
            </div>
          </div>
          <div className="card card--tight">
            <div className="tiny muted">Time studied</div>
            <div className="strong" style={{ fontSize: 22, marginTop: 4 }}>
              {Math.round((plan.completedMinutes / 60) * 10) / 10}h
            </div>
            <div className="tiny muted">of {Math.round((plan.totalMinutes / 60) * 10) / 10}h planned</div>
          </div>
          <div className="card card--tight">
            <div className="tiny muted">Needs attention</div>
            <div className="strong" style={{ fontSize: 22, marginTop: 4 }}>{plan.targets.missed}</div>
            <div className="tiny muted">missed session{plan.targets.missed === 1 ? '' : 's'}</div>
          </div>
        </div>

        <div className="card card--flush">
          <div className="row row--between" style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--border)' }}>
            <div>
              <div className="card__title">This week</div>
              <div className="card__hint">
                {week ? `${week.days.reduce((n, d) => n + d.done, 0)} of ${week.days.reduce((n, d) => n + d.targets.length, 0)} sessions done` : 'Loading…'}
              </div>
            </div>
            <div className="row" style={{ gap: 6 }}>
              <button className="btn btn--ghost btn--sm" onClick={() => setOffset((o) => o - 1)} aria-label="Previous week">←</button>
              <button className="btn btn--ghost btn--sm" onClick={() => setOffset(0)} disabled={offset === 0}>This week</button>
              <button className="btn btn--ghost btn--sm" onClick={() => setOffset((o) => o + 1)} aria-label="Next week">→</button>
            </div>
          </div>

          {week && week.days.map((d) => (
            <div key={d.date} style={{ borderBottom: '1px solid var(--border)', padding: 'var(--space-3) var(--space-5)' }}>
              <div className="row row--between" style={{ gap: 10 }}>
                <div className="row" style={{ gap: 8 }}>
                  <span className="strong small">{fmtDate(d.date)}</span>
                  {!d.isStudyDay && <span className="badge">Rest day</span>}
                </div>
                <span className="tiny muted">{d.targets.length ? `${d.minutes} min` : ''}</span>
              </div>
              {d.targets.length === 0 ? (
                <div className="tiny muted" style={{ marginTop: 4 }}>{d.isStudyDay ? 'Nothing scheduled.' : 'No session — this is your day off.'}</div>
              ) : (
                <ul style={{ listStyle: 'none', margin: '8px 0 0', padding: 0, display: 'grid', gap: 4 }}>
                  {d.targets.map((t) => (
                    <li key={t.id} className="row" style={{ gap: 8, alignItems: 'flex-start' }}>
                      {t.status === 'done' ? (
                        <CheckCircle2 aria-hidden="true" style={{ width: 15, height: 15, color: 'var(--success)', flexShrink: 0, marginTop: 2 }} />
                      ) : t.status === 'missed' ? (
                        <XCircle aria-hidden="true" style={{ width: 15, height: 15, color: 'var(--danger)', flexShrink: 0, marginTop: 2 }} />
                      ) : (
                        <Circle aria-hidden="true" style={{ width: 14, height: 14, color: 'var(--border-strong)', flexShrink: 0, marginTop: 3 }} />
                      )}
                      <span style={{ flex: 1, minWidth: 0 }}>
                        {t.lessonSlug ? (
                          <Link to={`/courses/${slug}/${t.lessonSlug}`} className="small" style={{ color: 'var(--text)' }}>
                            {t.title}
                          </Link>
                        ) : (
                          <span className="small" style={{ color: 'var(--text)' }}>{t.title}</span>
                        )}
                        {t.movedFrom && <span className="tiny muted"> · moved from {fmtDate(t.movedFrom)}</span>}
                      </span>
                      <span className="badge">{t.kind}</span>
                      <span className="tiny muted" style={{ width: 46, textAlign: 'right' }}>{minutes(t.minutes)}</span>
                      {t.status === 'pending' && (
                        <button className="btn btn--ghost btn--sm" onClick={() => skip(t.id)} title="Skip this session">Skip</button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        <p className="tiny muted" style={{ maxWidth: 720, lineHeight: 1.65 }}>
          A session is marked done only when the lesson itself is completed or the assessment is passed — never by
          opening this page. If you miss days, use “Recover missed” and the remaining work is re-dated from today;
          anything you already finished stays finished.
        </p>
      </div>
    </AppShell>
  );
}
