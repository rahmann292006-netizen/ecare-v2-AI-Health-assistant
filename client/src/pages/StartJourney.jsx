import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  ArrowRight, CalendarDays, CalendarClock, CheckCircle2, Circle, Clock, Pause, Play,
  RotateCcw, Target, AlertCircle, Wand2,
} from 'lucide-react';
import { get, post, patch } from '../lib/api.js';
import { AppShell, PageHead, Loading, ErrorState, Progress, useToast } from '../components/AppShell.jsx';

const PACE = [
  { minutes: 30, label: 'Light', hint: '30 min a day — steady progress alongside college' },
  { minutes: 60, label: 'Balanced', hint: '1 hour a day — the usual pace for a placement push' },
  { minutes: 120, label: 'Focused', hint: '2 hours a day — finishing before a deadline' },
];

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

/** Start (or tune) the personalised learning journey for one course. */
export default function StartJourney() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [roadmap, setRoadmap] = useState(null);
  const [existing, setExisting] = useState(undefined);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    skillLevel: 'beginner',
    minutesPerDay: 60,
    daysPerWeek: 5,
    startDate: isoToday(),
    targetDate: '',
    reminderTime: '19:00',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
  });
  const [preview, setPreview] = useState(null);

  const load = useCallback(() => {
    setError(null);
    Promise.all([get(`/roadmap/courses/${slug}/roadmap`), get(`/plans/courses/${slug}`)])
      .then(([r, p]) => {
        setRoadmap(r);
        setExisting(p.plan);
        if (p.plan) {
          setForm((f) => ({
            ...f,
            skillLevel: p.plan.skillLevel,
            minutesPerDay: p.plan.minutesPerDay,
            daysPerWeek: p.plan.daysPerWeek,
            startDate: isoToday(),
            targetDate: p.plan.targetDate || '',
            reminderTime: p.plan.reminderTime,
            timezone: p.plan.timezone,
          }));
        }
      })
      .catch(setError);
  }, [slug]);

  useEffect(load, [load]);

  useEffect(() => {
    if (!roadmap) return;
    const q = new URLSearchParams({ minutesPerDay: String(form.minutesPerDay), daysPerWeek: String(form.daysPerWeek), startDate: form.startDate });
    get(`/plans/courses/${slug}/preview?${q}`)
      .then((d) => setPreview(d.remaining))
      .catch(() => setPreview(null));
  }, [roadmap, slug, form.minutesPerDay, form.daysPerWeek, form.startDate]);

  const totalWritten = roadmap ? roadmap.availability.writtenLessons : 0;

  const submit = async (e) => {
    e?.preventDefault?.();
    setBusy(true);
    try {
      const body = { ...form, targetDate: form.targetDate || undefined };
      const res = existing ? await patch(`/plans/courses/${slug}`, body) : await post(`/plans/courses/${slug}`, body);
      toast.push(
        existing
          ? `Plan updated — ${res.created} session(s) re-dated. Completed work was kept.`
          : `Journey started — first session on ${res.plan.startDate}.`,
        'success',
      );
      navigate(`/courses/${slug}/plan`);
    } catch (err) {
      toast.push(err.message, 'danger');
    } finally {
      setBusy(false);
    }
  };

  if (error) {
    return (
      <AppShell title="Start journey">
        <div className="page"><ErrorState error={error} onRetry={load} /></div>
      </AppShell>
    );
  }
  if (!roadmap || existing === undefined) {
    return (
      <AppShell title="Start journey">
        <div className="page"><Loading rows={3} height={120} /></div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Start journey">
      <div className="page stack stack-6" style={{ maxWidth: 980 }}>
        <PageHead
          eyebrow={existing ? 'Adjust your journey' : 'Start this learning journey'}
          title={roadmap.course.title}
          sub={
            existing
              ? 'Change your pace or dates. Finished sessions stay finished; only the remaining work is re-dated.'
              : 'Tell us how much time you really have. Lumen turns the course into dated sessions using the actual length of every lesson.'
          }
          actions={<Link className="btn" to={`/courses/${slug}/roadmap`}>See the full roadmap</Link>}
        />

        {roadmap.availability.complete ? null : (
          <div className="notice" role="status">
            <AlertCircle aria-hidden="true" style={{ width: 16, height: 16, flexShrink: 0 }} />
            <span className="small">
              {totalWritten} of {roadmap.availability.totalLessons} lessons are fully written. Your plan only
              schedules lessons that exist, so it will grow as the remaining topics are published — you will be
              told when that happens rather than being handed empty tasks.
            </span>
          </div>
        )}

        <form onSubmit={submit} className="stack stack-5">
          <div className="card">
            <div className="card__title">Where are you starting from?</div>
            <div className="grid grid--3" style={{ marginTop: 'var(--space-3)' }}>
              {[
                ['beginner', 'New to this', 'Little or no experience'],
                ['intermediate', 'Some experience', 'I have built small things'],
                ['advanced', 'Comfortable', 'I want the depth, not the basics'],
              ].map(([id, label, hint]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, skillLevel: id }))}
                  aria-pressed={form.skillLevel === id}
                  className="card card--tight"
                  style={{
                    textAlign: 'left', cursor: 'pointer',
                    borderColor: form.skillLevel === id ? 'var(--accent)' : 'var(--border)',
                    background: form.skillLevel === id ? 'var(--accent-soft)' : 'var(--surface)',
                  }}
                >
                  <div className="strong small">{label}</div>
                  <div className="tiny muted" style={{ marginTop: 3 }}>{hint}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card__title">How much time each day?</div>
            <div className="grid grid--3" style={{ marginTop: 'var(--space-3)' }}>
              {PACE.map((p) => (
                <button
                  key={p.minutes}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, minutesPerDay: p.minutes }))}
                  aria-pressed={form.minutesPerDay === p.minutes}
                  className="card card--tight"
                  style={{
                    textAlign: 'left', cursor: 'pointer',
                    borderColor: form.minutesPerDay === p.minutes ? 'var(--accent)' : 'var(--border)',
                    background: form.minutesPerDay === p.minutes ? 'var(--accent-soft)' : 'var(--surface)',
                  }}
                >
                  <div className="strong small">{p.label} · {p.minutes} min</div>
                  <div className="tiny muted" style={{ marginTop: 3 }}>{p.hint}</div>
                </button>
              ))}
            </div>

            <div className="grid grid--2" style={{ marginTop: 'var(--space-4)', gap: 'var(--space-4)' }}>
              <label className="field">
                <span className="field__label">Days per week</span>
                <select className="input" value={form.daysPerWeek} onChange={(e) => setForm((f) => ({ ...f, daysPerWeek: Number(e.target.value) }))}>
                  {[2, 3, 4, 5, 6, 7].map((d) => (
                    <option key={d} value={d}>{d} days</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span className="field__label">Reminder time</span>
                <input className="input" type="time" value={form.reminderTime} onChange={(e) => setForm((f) => ({ ...f, reminderTime: e.target.value }))} />
              </label>
              <label className="field">
                <span className="field__label">Start date</span>
                <input className="input" type="date" value={form.startDate} min={isoToday()} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
              </label>
              <label className="field">
                <span className="field__label">Target finish date (optional)</span>
                <input className="input" type="date" value={form.targetDate} min={form.startDate} onChange={(e) => setForm((f) => ({ ...f, targetDate: e.target.value }))} />
              </label>
            </div>
            <p className="tiny muted" style={{ marginTop: 10 }}>
              Time zone: {form.timezone}. Reminders use it, so a 19:00 reminder arrives at 19:00 where you are.
            </p>
          </div>

          {preview && (
            <div className="card">
              <div className="row row--between" style={{ flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div className="card__title">At this pace</div>
                  <div className="card__hint">Based on the {preview.items} sessions still ahead of you.</div>
                </div>
                <div className="row" style={{ gap: 'var(--space-5)' }}>
                  <div>
                    <div className="tiny muted">Finish</div>
                    <div className="strong">{preview.finishDate || '—'}</div>
                  </div>
                  <div>
                    <div className="tiny muted">Study days</div>
                    <div className="strong">{preview.studyDays}</div>
                  </div>
                  <div>
                    <div className="tiny muted">Total</div>
                    <div className="strong">{preview.hours}h</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
            <button className="btn btn--primary" type="submit" disabled={busy}>
              {existing ? 'Update my plan' : 'Start This Learning Journey'} <ArrowRight aria-hidden="true" />
            </button>
            {existing && (
              <Link className="btn" to={`/courses/${slug}/plan`}>Back to my plan</Link>
            )}
          </div>
        </form>
      </div>
    </AppShell>
  );
}
