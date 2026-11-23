import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, CheckCircle2, Circle, Clock, Target } from 'lucide-react';
import { get } from '../lib/api.js';
import { AppShell, PageHead, Loading, ErrorState, Progress } from '../components/AppShell.jsx';
import { minutes } from '../lib/format.js';

function fmtDate(d) {
  return new Date(`${d}T00:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
}

/** Today across every active plan — the "what do I do now" page. */
export default function Today() {
  const [data, setData] = useState(null);
  const [week, setWeek] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setError(null);
    Promise.all([get('/plans/today'), get('/plans/week')])
      .then(([t, w]) => {
        setData(t);
        setWeek(w);
      })
      .catch(setError);
  }, []);

  useEffect(load, [load]);

  if (error) return <AppShell title="Today"><div className="page"><ErrorState error={error} onRetry={load} /></div></AppShell>;
  if (!data) return <AppShell title="Today"><div className="page"><Loading rows={3} height={100} /></div></AppShell>;

  const activePlans = week?.plans || [];
  const open = data.items.filter((i) => i.status !== 'done');

  return (
    <AppShell title="Today">
      <div className="page stack stack-6">
        <PageHead
          eyebrow={fmtDate(data.date)}
          title={open.length ? `${open.length} session${open.length === 1 ? '' : 's'} waiting` : 'You are up to date'}
          sub={
            activePlans.length
              ? 'Sessions come from your course plans. A session is done when the work itself is done.'
              : 'You have no active plan yet. Open a course roadmap and start a learning journey.'
          }
          actions={<Link className="btn" to="/courses">Browse courses</Link>}
        />

        {activePlans.length === 0 && (
          <div className="card">
            <div className="card__title">Nothing is scheduled</div>
            <p className="small" style={{ color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.65 }}>
              Pick a course, read its roadmap, then choose your pace — Lumen will turn it into dated sessions.
            </p>
            <Link className="btn btn--primary" to="/courses" style={{ marginTop: 12 }}>
              Choose a course <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        )}

        {data.items.length > 0 && (
          <div className="card card--flush">
            <div style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--border)' }}>
              <div className="card__title">Due today or earlier</div>
              <div className="card__hint">{data.items.reduce((n, i) => n + i.minutes, 0)} minutes in total</div>
            </div>
            {data.items.map((t) => (
              <div key={`${t.courseSlug}-${t.id}`} className="row" style={{ gap: 10, padding: '10px var(--space-5)', borderBottom: '1px solid var(--border)', alignItems: 'flex-start' }}>
                {t.status === 'done' ? (
                  <CheckCircle2 aria-hidden="true" style={{ width: 16, height: 16, color: 'var(--success)', flexShrink: 0, marginTop: 2 }} />
                ) : (
                  <Circle aria-hidden="true" style={{ width: 15, height: 15, color: 'var(--border-strong)', flexShrink: 0, marginTop: 3 }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {t.lessonSlug ? (
                    <Link className="small" to={`/courses/${t.courseSlug}/${t.lessonSlug}`} style={{ color: 'var(--text)' }}>
                      {t.title}
                    </Link>
                  ) : (
                    <span className="small">{t.title}</span>
                  )}
                  <div className="tiny muted">
                    {t.courseTitle} · {t.date < data.date ? `from ${fmtDate(t.date)}` : 'today'} · {t.status}
                  </div>
                </div>
                <span className="tiny muted" style={{ flexShrink: 0 }}>{minutes(t.minutes)}</span>
              </div>
            ))}
          </div>
        )}

        {activePlans.map((p) => (
          <div key={p.plan.id} className="card">
            <div className="row row--between" style={{ flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div className="card__title">{p.course.title}</div>
                <div className="card__hint">
                  {p.plan.targets.done} of {p.plan.targets.total} sessions · {p.plan.minutesPerDay} min a day · finish {fmtDate(p.plan.targetDate)}
                </div>
              </div>
              <div className="row" style={{ gap: 8 }}>
                <Link className="btn btn--sm" to={`/courses/${p.course.slug}/plan`}>
                  <CalendarDays aria-hidden="true" /> Open plan
                </Link>
                <Link className="btn btn--sm" to={`/courses/${p.course.slug}/roadmap`}>
                  Roadmap
                </Link>
              </div>
            </div>
            <Progress value={p.plan.percent} large />
          </div>
        ))}
      </div>
    </AppShell>
  );
}

