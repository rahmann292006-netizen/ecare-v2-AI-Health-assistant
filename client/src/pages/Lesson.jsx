import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, CheckCircle2, Circle, Bookmark, BookmarkCheck, Clock, Target,
  ExternalLink, NotebookPen, Sparkles, Terminal, ChevronRight,
} from 'lucide-react';
import { AppShell, Loading, ErrorState, Progress, useToast } from '../components/AppShell.jsx';
import { Markdown } from '../lib/markdown.jsx';
import { get, post } from '../lib/api.js';
import LessonQuiz from '../components/LessonQuiz.jsx';
import { minutes, fullDay } from '../lib/format.js';

export default function Lesson() {
  const { slug, lessonSlug } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [noteState, setNoteState] = useState('idle');
  const [navOpen, setNavOpen] = useState(false);
  const toast = useToast();
  const saveTimer = useRef(null);

  const load = useCallback(() => {
    setError(null);
    setData(null);
    get(`/learning/lessons/${slug}/${lessonSlug}`)
      .then((d) => {
        setData(d);
        setNote(d.note || '');
      })
      .catch(setError);
  }, [slug, lessonSlug]);

  useEffect(() => {
    load();
    window.scrollTo({ top: 0 });
  }, [load]);

  useEffect(() => {
    if (data) document.title = `${data.lesson.title} — ${data.course.title}`;
  }, [data]);

  const complete = async () => {
    setBusy(true);
    try {
      const res = await post(`/learning/lessons/${slug}/${lessonSlug}/complete`, {});
      toast.push(res.alreadyDone ? 'This lesson was already complete.' : 'Lesson complete. Progress saved.', 'success');
      if (res.awarded?.length) toast.push(`Achievement: ${res.awarded.map((a) => a.title).join(', ')}`, 'success');
      load();
    } catch (err) {
      toast.push(err.message, 'danger');
    } finally {
      setBusy(false);
    }
  };

  const reopen = async () => {
    setBusy(true);
    try {
      await post(`/learning/lessons/${slug}/${lessonSlug}/reopen`, {});
      toast.push('Marked as in progress.');
      load();
    } catch (err) {
      toast.push(err.message, 'danger');
    } finally {
      setBusy(false);
    }
  };

  const toggleBookmark = async () => {
    try {
      const res = await post(`/learning/lessons/${slug}/${lessonSlug}/bookmark`, {});
      setData((d) => ({ ...d, lesson: { ...d.lesson }, bookmarked: res.bookmarked }));
      toast.push(res.bookmarked ? 'Bookmarked.' : 'Bookmark removed.');
    } catch (err) {
      toast.push(err.message, 'danger');
    }
  };

  const saveNote = useCallback(
    async (value) => {
      setNoteState('saving');
      try {
        await post(`/learning/lessons/${slug}/${lessonSlug}/note`, { body: value });
        setNoteState('saved');
        setTimeout(() => setNoteState('idle'), 1600);
      } catch (err) {
        setNoteState('error');
        toast.push(err.message, 'danger');
      }
    },
    [slug, lessonSlug, toast],
  );

  const onNoteChange = (value) => {
    setNote(value);
    setNoteState('typing');
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveNote(value), 900);
  };

  const progressPercent = useMemo(() => {
    if (!data) return 0;
    return Math.round(((data.position.index - 1) / data.position.total) * 100);
  }, [data]);

  return (
    <AppShell title="Lesson">
      <div className="page">
        {error && <ErrorState error={error} onRetry={load} />}
        {!data && !error && <Loading rows={5} height={80} />}

        {data && (
          <div className="stack stack-5">
            <div className="row tiny muted" style={{ gap: 6, flexWrap: 'wrap' }}>
              <Link to="/courses">Courses</Link>
              <ChevronRight style={{ width: 12, height: 12 }} />
              <Link to={`/courses/${slug}`}>{data.course.title}</Link>
              <ChevronRight style={{ width: 12, height: 12 }} />
              <span>{data.module.title}</span>
            </div>

            <div className="row row--between" style={{ alignItems: 'flex-start', gap: 16 }}>
              <div style={{ minWidth: 0 }}>
                <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                  <span className="badge badge--accent">Lesson {data.position.index} of {data.position.total}</span>
                  <span className="badge"><Clock style={{ width: 11, height: 11 }} /> {minutes(data.lesson.minutes)}</span>
                  {data.progress.status === 'completed' && <span className="badge badge--success"><CheckCircle2 style={{ width: 11, height: 11 }} /> Completed</span>}
                </div>
                <h1 className="page__title" style={{ marginTop: 'var(--space-3)' }}>{data.lesson.title}</h1>
              </div>
              <div className="row" style={{ gap: 6, flexShrink: 0 }}>
                <button className="btn btn--ghost btn--icon" onClick={toggleBookmark} title="Bookmark this lesson" aria-label="Bookmark this lesson" aria-pressed={Boolean(data.bookmarked)}>
                  {data.bookmarked ? <BookmarkCheck style={{ color: 'var(--accent)' }} /> : <Bookmark />}
                </button>
                <Link className="btn btn--sm" to={`/tutor?course=${slug}&lesson=${lessonSlug}`}>
                  <Sparkles /> Ask the tutor
                </Link>
              </div>
            </div>

            <Progress value={progressPercent} />

            <div className="lesson-grid">
              <article className="stack stack-5" style={{ minWidth: 0 }}>
                {data.lesson.objectives.length > 0 && (
                  <div className="card card--tight" style={{ background: 'var(--surface-2)' }}>
                    <div className="row" style={{ gap: 8, marginBottom: 8 }}>
                      <Target aria-hidden="true" style={{ width: 15, height: 15, color: 'var(--accent)' }} />
                      <span className="small strong">By the end of this lesson</span>
                    </div>
                    <ul className="small muted" style={{ margin: 0, paddingLeft: '1.1rem', display: 'grid', gap: 4 }}>
                      {data.lesson.objectives.map((o) => <li key={o}>{o}</li>)}
                    </ul>
                  </div>
                )}

                <div className="card">
                  <Markdown source={data.lesson.body} />
                </div>

                {data.lesson.code?.length > 0 && (
                  <div className="stack stack-4">
                    {data.lesson.code.map((block, index) => (
                      <div key={index} className="card card--flush">
                        <div className="row row--between" style={{ padding: 'var(--space-3) var(--space-4)', borderBottom: '1px solid var(--border)' }}>
                          <span className="tiny muted">{block.caption || 'Example'}</span>
                          <span className="badge">{block.language}</span>
                        </div>
                        <pre className="terminal" style={{ border: 0, borderRadius: 0, maxHeight: 'none' }}>{block.source}</pre>
                      </div>
                    ))}
                  </div>
                )}

                {data.resources.length > 0 && (
                  <div className="card">
                    <div className="card__head"><div className="card__title">Further reading</div></div>
                    <div className="stack stack-3">
                      {data.resources.map((r) => (
                        <a key={r.url} href={r.url} target="_blank" rel="noopener noreferrer" className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
                          <ExternalLink aria-hidden="true" style={{ width: 14, height: 14, color: 'var(--faint)', marginTop: 3, flexShrink: 0 }} />
                          <div style={{ minWidth: 0 }}>
                            <div className="small strong">{r.title}</div>
                            <div className="tiny muted">
                              {r.provider}{r.kind ? ` · ${r.kind}` : ''}{r.licenseNote ? ` · ${r.licenseNote}` : ''}
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {data.relatedExercises.length > 0 && (
                  <div className="card">
                    <div className="card__head"><div className="card__title">Practise this</div><Terminal aria-hidden="true" style={{ width: 15, height: 15, color: 'var(--faint)' }} /></div>
                    <div className="stack stack-3">
                      {data.relatedExercises.map((ex) => (
                        <Link key={ex.slug} to={`/lab?exercise=${ex.slug}`} className="row" style={{ gap: 10 }}>
                          <Terminal aria-hidden="true" style={{ width: 14, height: 14, color: 'var(--accent)', flexShrink: 0 }} />
                          <span className="small" style={{ flex: 1 }}>{ex.title}</span>
                          <span className="badge">{ex.difficulty}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                <LessonQuiz lessonId={data.lessonId} />

                <div className="card">
                  <div className="card__head">
                    <div>
                      <div className="card__title">Your notes</div>
                      <div className="card__hint">Private to you. Saved automatically as you type.</div>
                    </div>
                    <NotebookPen aria-hidden="true" style={{ width: 15, height: 15, color: 'var(--faint)' }} />
                  </div>
                  <textarea
                    className="textarea"
                    value={note}
                    onChange={(e) => onNoteChange(e.target.value)}
                    placeholder="Write what you want to remember, or the question you still have…"
                    aria-label="Lesson notes"
                  />
                  <div className="tiny muted" style={{ marginTop: 6, minHeight: 16 }}>
                    {noteState === 'saving' && 'Saving…'}
                    {noteState === 'saved' && 'Saved'}
                    {noteState === 'error' && <span style={{ color: 'var(--danger)' }}>Could not save — retry by editing.</span>}
                  </div>
                </div>

                <div className="card card--tight">
                  <div className="row row--between row--wrap" style={{ gap: 10 }}>
                    <div className="row" style={{ gap: 8 }}>
                      {data.prev && <Link className="btn btn--sm" to={`/courses/${slug}/${data.prev.slug}`}><ArrowLeft /> Previous</Link>}
                      {data.next && <Link className="btn btn--sm" to={`/courses/${slug}/${data.next.slug}`}>Next <ArrowRight /></Link>}
                    </div>
                    <div className="row" style={{ gap: 8 }}>
                      {data.progress.status === 'completed' ? (
                        <>
                          <span className="badge badge--success"><CheckCircle2 style={{ width: 11, height: 11 }} /> Completed {data.progress.completedAt ? fullDay(data.progress.completedAt) : ''}</span>
                          <button className="btn btn--ghost btn--sm" onClick={reopen} disabled={busy}>Mark as in progress</button>
                        </>
                      ) : (
                        <button className="btn btn--primary" onClick={complete} disabled={busy}>
                          {busy ? 'Saving…' : 'Mark lesson complete'} {!busy && <CheckCircle2 />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </article>

              <aside className="stack stack-4" style={{ minWidth: 0 }}>
                <div className="card card--tight">
                  <div className="card__title" style={{ marginBottom: 10 }}>{data.module.title}</div>
                  <div className="stack" style={{ gap: 2 }}>
                    {data.prev || data.next ? null : null}
                    <Link to={`/courses/${slug}`} className="btn btn--ghost btn--sm" style={{ justifyContent: 'flex-start' }}>Full curriculum <ArrowRight /></Link>
                  </div>
                </div>

                <div className="card card--tight">
                  <div className="tiny muted" style={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 8 }}>Next up</div>
                  {data.next ? (
                    <Link to={`/courses/${slug}/${data.next.slug}`} className="row" style={{ gap: 8, alignItems: 'flex-start' }}>
                      <Circle aria-hidden="true" style={{ width: 13, height: 13, color: 'var(--border-strong)', marginTop: 3, flexShrink: 0 }} />
                      <span className="small">{data.next.title}</span>
                    </Link>
                  ) : (
                    <p className="small muted">This is the last lesson of the track.</p>
                  )}
                </div>
              </aside>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
