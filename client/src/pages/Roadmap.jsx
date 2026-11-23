import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowRight, CalendarDays, Check, CheckCircle2, Circle, Clock, Compass, Flag, Layers,
  Pause, Play, RotateCcw, Target, Wrench, BookOpen, AlertCircle, CalendarClock,
} from 'lucide-react';
import { get, post, patch } from '../lib/api.js';
import { AppShell, PageHead, Loading, ErrorState, Progress, useToast } from '../components/AppShell.jsx';
import { minutes, percent, formatDate } from '../lib/format.js';

const STAGE_ICON = {
  foundations: Layers,
  core: BookOpen,
  practice: Wrench,
  intermediate: Target,
  advanced: Compass,
  projects: Flag,
  portfolio: Flag,
};

function hours(m) {
  const h = m / 60;
  return `${Math.round(h * 10) / 10}h`;
}

/** The pre-enrolment journey: stages, modules, skills, what is written, what is planned. */
export default function Roadmap() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [openStage, setOpenStage] = useState(null);

  const load = useCallback(() => {
    setError(null);
    get(`/roadmap/courses/${slug}/roadmap`)
      .then((d) => {
        setData(d);
        setOpenStage(d.roadmap.stages[0]?.key ?? null);
      })
      .catch(setError);
  }, [slug]);

  useEffect(load, [load]);
  useEffect(() => {
    if (data) document.title = `${data.course.title} roadmap — Lumen`;
  }, [data]);

  if (error) {
    return (
      <AppShell title="Roadmap">
        <div className="page">
          <ErrorState error={error} onRetry={load} />
        </div>
      </AppShell>
    );
  }
  if (!data) {
    return (
      <AppShell title="Roadmap">
        <div className="page">
          <Loading rows={4} height={110} />
        </div>
      </AppShell>
    );
  }

  const { course, roadmap, availability } = data;
  const totalHours = Math.round((roadmap.totals.minutes / 60) * 10) / 10;

  return (
    <AppShell title="Roadmap">
      <div className="page stack stack-6">
        <div>
          <div className="tiny muted" style={{ marginBottom: 'var(--space-3)' }}>
            <Link to="/courses">Courses</Link> / <Link to={`/courses/${slug}`}>{course.title}</Link> / Roadmap
          </div>
          <PageHead
            eyebrow={`${course.level} · ${roadmap.totals.stages} stages · ${roadmap.totals.modules} modules · ${totalHours}h`}
            title={`${course.title} — the whole journey`}
            sub={roadmap.audience}
            actions={
              <>
                <Link className="btn btn--primary" to={`/courses/${slug}/start`}>
                  Start This Learning Journey <ArrowRight aria-hidden="true" />
                </Link>
                <Link className="btn" to={`/courses/${slug}`}>
                  Course details
                </Link>
              </>
            }
          />

          {!availability.complete && (
            <div className="notice" role="status" style={{ marginTop: 'var(--space-4)' }}>
              <AlertCircle aria-hidden="true" style={{ width: 16, height: 16, flexShrink: 0 }} />
              <span className="small">
                {availability.writtenLessons} of {availability.totalLessons} lessons are fully written. The rest are
                shown as planned topics and are marked clearly — none of them is presented as available to study yet.
              </span>
            </div>
          )}
        </div>

        <div className="grid grid--3">
          <div className="card card--tight">
            <div className="tiny muted">Time to complete</div>
            <div className="strong" style={{ fontSize: 22, marginTop: 4 }}>{totalHours} hours</div>
            <div className="tiny muted" style={{ marginTop: 2 }}>
              across {roadmap.totals.lessons} lessons and {roadmap.totals.modules} modules
            </div>
          </div>
          <div className="card card--tight">
            <div className="tiny muted">Capstone</div>
            <div className="small" style={{ marginTop: 6, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{roadmap.capstone}</div>
          </div>
          <div className="card card--tight">
            <div className="tiny muted">Assessment</div>
            <ul className="small" style={{ margin: '6px 0 0', paddingLeft: '1.05rem', color: 'var(--text-secondary)', display: 'grid', gap: 4 }}>
              {roadmap.assessmentPlan.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="card card--flush">
          <div className="row row--between" style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--border)' }}>
            <div>
              <div className="card__title">The stages</div>
              <div className="card__hint">Work through them in order — each stage ends with practice and a check.</div>
            </div>
            <span className="badge">{roadmap.totals.stages} stages</span>
          </div>

          {roadmap.stages.map((stage, si) => {
            const Icon = STAGE_ICON[stage.key] || Layers;
            const open = openStage === stage.key;
            return (
              <div key={stage.key} style={{ borderBottom: si === roadmap.stages.length - 1 ? 0 : '1px solid var(--border)' }}>
                <button
                  type="button"
                  onClick={() => setOpenStage(open ? null : stage.key)}
                  aria-expanded={open}
                  className="row"
                  style={{ gap: 12, width: '100%', padding: 'var(--space-4) var(--space-5)', background: 'none', border: 0, textAlign: 'left', cursor: 'pointer', alignItems: 'flex-start' }}
                >
                  <span
                    style={{
                      width: 30, height: 30, borderRadius: 8, background: 'var(--bg-subtle)', border: '1px solid var(--border)',
                      display: 'grid', placeItems: 'center', flexShrink: 0, color: 'var(--text-secondary)',
                    }}
                  >
                    <Icon style={{ width: 15, height: 15 }} aria-hidden="true" />
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="row" style={{ gap: 8 }}>
                      <span className="strong">{stage.title}</span>
                      <span className="badge">Stage {si + 1}</span>
                    </span>
                    <span className="tiny muted" style={{ display: 'block', marginTop: 3, lineHeight: 1.55 }}>{stage.goal}</span>
                  </span>
                  <span className="tiny muted" style={{ flexShrink: 0, textAlign: 'right' }}>
                    {stage.lessonCount} {stage.lessonCount === 1 ? "lesson" : "lessons"}
                    <br />
                    {hours(stage.minutes)}
                  </span>
                </button>

                {open && (
                  <div style={{ padding: '0 var(--space-5) var(--space-4)' }} className="stack stack-4">
                    {stage.modules.map((m) => (
                      <div key={m.slug} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                        <div style={{ padding: 'var(--space-3) var(--space-4)', background: 'var(--bg-subtle)' }}>
                          <div className="row row--between" style={{ gap: 10 }}>
                            <div className="strong small">{m.title}</div>
                            <div className="tiny muted" style={{ flexShrink: 0 }}>
                              {m.lessonCount} {m.lessonCount === 1 ? "lesson" : "lessons"} · {hours(m.minutes)}
                            </div>
                          </div>
                          {m.summary && <p className="tiny muted" style={{ margin: '4px 0 0', lineHeight: 1.55 }}>{m.summary}</p>}
                        </div>
                        <div style={{ padding: 'var(--space-3) var(--space-4)' }}>
                          {m.lessons?.length > 0 && (
                            <ul style={{ margin: '10px 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: 2 }}>
                              {m.lessons.map((l) => (
                                <li key={l.slug} className="row" style={{ gap: 8, padding: '3px 0' }}>
                                  {l.outline ? (
                                    <Circle aria-hidden="true" style={{ width: 13, height: 13, color: 'var(--border-strong)', flexShrink: 0 }} />
                                  ) : l.completed ? (
                                    <CheckCircle2 aria-hidden="true" style={{ width: 14, height: 14, color: 'var(--success)', flexShrink: 0 }} />
                                  ) : (
                                    <Circle aria-hidden="true" style={{ width: 13, height: 13, color: 'var(--border-strong)', flexShrink: 0 }} />
                                  )}
                                  <span className="small" style={{ flex: 1, minWidth: 0, color: l.outline ? 'var(--text-tertiary)' : 'var(--text-secondary)' }}>
                                    {l.title}
                                  </span>
                                  {l.outline && <span className="badge">Planned</span>}
                                  <span className="tiny muted" style={{ width: 48, textAlign: 'right' }}>{minutes(l.minutes)}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                          {m.projects?.length > 0 && (
                            <p className="tiny muted" style={{ margin: '8px 0 0' }}>
                              Build: {m.projects.map((p) => p.title).join(', ')}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                    {stage.skills?.length > 0 && (
                      <p className="tiny muted" style={{ margin: 0 }}>
                        By the end of this stage you can: {stage.skills.join('; ')}.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="card">
          <div className="card__title">Where this roadmap comes from</div>
          <p className="small" style={{ color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.65 }}>
            Benchmarked against established public curricula rather than invented:
          </p>
          <ul className="small" style={{ margin: '8px 0 0', paddingLeft: '1.05rem', color: 'var(--text-secondary)', display: 'grid', gap: 5 }}>
            {roadmap.sources.benchmark.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </div>
      </div>
    </AppShell>
  );
}
