import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Circle,
  Clock,
  ClipboardCheck,
  FolderGit2,
  ListChecks,
  Terminal,
  ChevronRight,
  Bookmark,
} from 'lucide-react';
import { get, post, del } from '../lib/api.js';
import { AppShell, PageHead, Loading, ErrorState, Progress, useToast } from '../components/AppShell.jsx';
import { formatDate, minutes, percent } from '../lib/format.js';

const KIND_LABEL = {
  reading: 'Reading',
  lab: 'Hands-on',
  project: 'Project',
  checkpoint: 'Checkpoint',
};

export default function CourseDetail() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const load = useCallback(() => {
    setError(null);
    get(`/learning/courses/${slug}`)
      .then(setData)
      .catch(setError);
  }, [slug]);

  useEffect(load, [load]);
  useEffect(() => {
    if (data) document.title = `${data.course.title} — Lumen`;
  }, [data]);

  const toggleEnroll = async () => {
    setBusy(true);
    try {
      if (data.enrolled) {
        await del(`/learning/courses/${slug}/enroll`);
        toast.push('Removed from your courses. Your progress is kept.', 'default');
      } else {
        await post(`/learning/courses/${slug}/enroll`, {});
        toast.push('Enrolled. Your progress now counts toward your dashboard.', 'success');
      }
      load();
    } catch (err) {
      toast.push(err.message, 'danger');
    } finally {
      setBusy(false);
    }
  };

  const nextLesson = data ? data.modules.flatMap((m) => m.lessons).find((l) => l.status !== 'completed') : null;

  return (
    <AppShell title="Course">
      <div className="page">
        {error && <ErrorState error={error} onRetry={load} />}
        {!data && !error && <Loading rows={4} height={100} />}
        {data && (
          <div className="stack stack-6">
            <div>
              <div className="row tiny muted" style={{ gap: 6, marginBottom: 'var(--space-3)' }}>
                <Link to="/courses">Courses</Link>
                <ChevronRight style={{ width: 12, height: 12 }} />
                <span>{data.course.category}</span>
              </div>
              <PageHead
                eyebrow={data.course.level}
                title={data.course.title}
                sub={data.course.tagline}
                actions={
                  <>
                    {data.enrolled && nextLesson && (
                      <Link className="btn btn--primary" to={`/courses/${slug}/${nextLesson.slug}`}>
                        {data.progress.completed ? 'Continue' : 'Start first lesson'} <ArrowRight aria-hidden="true" />
                      </Link>
                    )}
                    {!data.enrolled && nextLesson && (
                      <Link className="btn btn--primary" to={`/courses/${slug}/${nextLesson.slug}`}>
                        Start lesson 1 <ArrowRight aria-hidden="true" />
                      </Link>
                    )}
                    <Link className="btn" to={`/courses/${slug}/roadmap`}>
                      <ListChecks aria-hidden="true" /> Full roadmap
                    </Link>
                    {data.enrolled && (
                      <Link className="btn" to={`/courses/${slug}/plan`}>
                        <Clock aria-hidden="true" /> My plan
                      </Link>
                    )}
                    <Link className="btn" to={`/courses/${slug}/readiness`}>
                      <CheckCircle2 aria-hidden="true" /> Readiness
                    </Link>
                    <button className="btn" onClick={toggleEnroll} disabled={busy}>
                      {data.enrolled ? (
                        <>
                          <CheckCircle2 aria-hidden="true" /> Enrolled
                        </>
                      ) : (
                        'Add to my courses'
                      )}
                    </button>
                  </>
                }
              />
            </div>

            <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1.7fr) minmax(0, 1fr)', alignItems: 'start' }}>
              <div className="stack stack-5">
                <div className="card">
                  <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>{data.course.description}</p>
                  <div className="grid grid--2" style={{ marginTop: 'var(--space-5)' }}>
                    <div>
                      <div
                        className="tiny muted"
                        style={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 8 }}
                      >
                        What you will be able to do
                      </div>
                      <ul
                        className="small"
                        style={{ margin: 0, paddingLeft: '1.1rem', display: 'grid', gap: 6, color: 'var(--text-secondary)' }}
                      >
                        {data.course.outcomes.map((o) => (
                          <li key={o}>{o}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div
                        className="tiny muted"
                        style={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 8 }}
                      >
                        Before you start
                      </div>
                      {data.course.prereqs.length ? (
                        <ul
                          className="small"
                          style={{ margin: 0, paddingLeft: '1.1rem', display: 'grid', gap: 6, color: 'var(--text-secondary)' }}
                        >
                          {data.course.prereqs.map((p) => (
                            <li key={p}>{p}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="small muted">Nothing — this track starts from the beginning.</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="card card--flush">
                  <div
                    className="row row--between"
                    style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--border)' }}
                  >
                    <div>
                      <div className="card__title">Curriculum</div>
                      <div className="card__hint">
                        {data.modules.length} modules · {data.progress.total} lessons
                      </div>
                    </div>
                    <span className="badge">{percent(data.progress.percent)} done</span>
                  </div>
                  <div>
                    {data.modules.map((m, mi) => {
                      const done = m.lessons.filter((l) => l.status === 'completed').length;
                      return (
                        <div key={m.slug} style={{ borderBottom: mi === data.modules.length - 1 ? 0 : '1px solid var(--border)' }}>
                          <div style={{ padding: 'var(--space-4) var(--space-5) var(--space-3)' }}>
                            <div className="row row--between" style={{ alignItems: 'flex-start', gap: 10 }}>
                              <div>
                                <div className="row" style={{ gap: 8 }}>
                                  <span className="badge">Module {mi + 1}</span>
                                  <span className="badge">{m.level}</span>
                                </div>
                                <div className="strong" style={{ marginTop: 6 }}>
                                  {m.title}
                                </div>
                                {m.summary && (
                                  <p className="tiny muted" style={{ marginTop: 2 }}>
                                    {m.summary}
                                  </p>
                                )}
                              </div>
                              <span className="tiny muted" style={{ flexShrink: 0 }}>
                                {done}/{m.lessons.length}
                              </span>
                            </div>
                          </div>
                          <div style={{ paddingBottom: 'var(--space-2)' }}>
                            {m.lessons.map((l) => {
                              const complete = l.status === 'completed';
                              return (
                                <Link
                                  key={l.slug}
                                  to={`/courses/${slug}/${l.slug}`}
                                  className="row"
                                  style={{ gap: 10, padding: '9px var(--space-5)', color: 'var(--text-secondary)' }}
                                >
                                  {complete ? (
                                    <CheckCircle2
                                      aria-hidden="true"
                                      style={{ width: 15, height: 15, color: 'var(--success)', flexShrink: 0 }}
                                    />
                                  ) : (
                                    <Circle aria-hidden="true" style={{ width: 15, height: 15, color: 'var(--border-strong)', flexShrink: 0 }} />
                                  )}
                                  <span className="small" style={{ flex: 1, minWidth: 0 }}>
                                    {l.title}
                                  </span>
                                  {l.bookmarked && <Bookmark aria-hidden="true" style={{ width: 13, height: 13, color: 'var(--accent)' }} />}
                                  <span className="badge">{KIND_LABEL[l.kind] || l.kind}</span>
                                  <span className="tiny muted" style={{ width: 52, textAlign: 'right' }}>
                                    {minutes(l.minutes)}
                                  </span>
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="stack stack-4">
                <div className="card card--tight">
                  <div className="stack stack-3">
                    <div className="row row--between">
                      <span className="small muted">Progress</span>
                      <span className="small strong">{percent(data.progress.percent)}</span>
                    </div>
                    <Progress value={data.progress.percent} large />
                    <div className="row row--between tiny muted">
                      <span>
                        {data.progress.completed} of {data.progress.total} lessons
                      </span>
                      <span>
                        <Clock style={{ width: 11, height: 11, display: 'inline' }} /> {minutes(data.course.durationHours * 60)}
                      </span>
                    </div>
                    {data.enrolledAt && <div className="tiny muted">Enrolled {formatDate(data.enrolledAt)}</div>}
                  </div>
                </div>

                <div className="card">
                  <div className="card__head">
                    <div className="card__title">Coding exercises</div>
                    <Terminal aria-hidden="true" style={{ width: 15, height: 15, color: 'var(--faint)' }} />
                  </div>
                  {data.exercises.length === 0 ? (
                    <p className="small muted">This track has no standalone exercises; the lessons carry the practice.</p>
                  ) : (
                    <div className="stack stack-3">
                      {data.exercises.map((ex) => (
                        <Link key={ex.slug} to={`/lab?exercise=${ex.slug}`} className="row" style={{ gap: 10 }}>
                          <Terminal aria-hidden="true" style={{ width: 14, height: 14, color: 'var(--accent)', flexShrink: 0 }} />
                          <span className="small" style={{ flex: 1 }}>
                            {ex.title}
                          </span>
                          <span className="badge">{ex.difficulty}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                {data.projects.length > 0 && (
                  <div className="card">
                    <div className="card__head">
                      <div className="card__title">Projects</div>
                      <FolderGit2 aria-hidden="true" style={{ width: 15, height: 15, color: 'var(--faint)' }} />
                    </div>
                    <div className="stack stack-3">
                      {data.projects.map((p) => (
                        <div key={p.slug} className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
                          <FolderGit2 aria-hidden="true" style={{ width: 14, height: 14, color: 'var(--faint)', marginTop: 3, flexShrink: 0 }} />
                          <div style={{ minWidth: 0 }}>
                            <div className="small strong">{p.title}</div>
                            <div className="tiny muted">
                              {p.difficulty} · about {p.estHours}h
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {data.assessments.length > 0 && (
                  <div className="card">
                    <div className="card__head">
                      <div className="card__title">Checkpoints</div>
                      <ClipboardCheck aria-hidden="true" style={{ width: 15, height: 15, color: 'var(--faint)' }} />
                    </div>
                    <div className="stack stack-3">
                      {data.assessments.map((a) => (
                        <Link key={a.id} to={`/checkpoints/${a.id}`} className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
                          <ListChecks
                            aria-hidden="true"
                            style={{
                              width: 14,
                              height: 14,
                              color: a.passed ? 'var(--success)' : 'var(--faint)',
                              marginTop: 3,
                              flexShrink: 0,
                            }}
                          />
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div className="small strong">{a.title}</div>
                            <div className="tiny muted">
                              Pass {a.passScore}% · {a.timeLimitMinutes} min
                              {a.bestPercent !== null && ` · best ${a.bestPercent}%`}
                              {a.attempts > 0 && ` · ${a.attempts} attempt${a.attempts === 1 ? '' : 's'}`}
                            </div>
                          </div>
                          <span className={`badge ${a.passed ? 'badge--success' : ''}`}>{a.passed ? 'Passed' : 'Open'}</span>
                        </Link>
                      ))}
                      <p className="tiny muted" style={{ marginTop: 4 }}>
                        <BookOpen style={{ width: 11, height: 11, display: 'inline' }} /> A checkpoint opens once its
                        module's lessons are complete. Explanations are shown after you submit.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
