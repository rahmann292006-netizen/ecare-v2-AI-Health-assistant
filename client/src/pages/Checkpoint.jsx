import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Clock, Check, X, AlertTriangle, ChevronLeft, ChevronRight, ArrowLeft, RotateCcw, Award } from 'lucide-react';
import { get, post } from '../lib/api.js';
import { Markdown } from '../lib/markdown.jsx';
import { PageHead, Loading, ErrorState, Progress } from '../components/AppShell.jsx';
import { formatDuration, formatDate } from '../lib/format.js';

/**
 * Checkpoint assessment.
 *
 * Three screens share one route:
 *   intro    — what the checkpoint is, the gate, previous attempts
 *   attempt  — questions, navigation, answered/unanswered map, timer
 *   result   — score, per-question review with explanations
 *
 * All scoring is server-side; this component only collects answers.
 */
export default function Checkpoint() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState({ status: 'loading' });
  const [phase, setPhase] = useState('intro');
  const [answers, setAnswers] = useState({});
  const [index, setIndex] = useState(0);
  const [startedAt, setStartedAt] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [result, setResult] = useState(null);
  const submittedRef = useRef(false);

  const load = useCallback(() => {
    setState({ status: 'loading' });
    get(`/assessments/${id}`)
      .then((data) => setState({ status: 'ready', data }))
      .catch((err) => setState({ status: 'error', error: err }));
  }, [id]);

  useEffect(load, [load]);

  const data = state.status === 'ready' ? state.data : null;
  const questions = data?.questions || [];
  const answeredCount = useMemo(
    () => questions.filter((q) => answers[q.id] !== undefined && answers[q.id] !== null).length,
    [questions, answers],
  );

  const submit = useCallback(
    async (auto = false) => {
      if (submittedRef.current || !data) return;
      submittedRef.current = true;
      setSubmitting(true);
      setSubmitError(null);
      try {
        const payload = {
          answers: questions.map((q) => ({ questionId: q.id, optionId: answers[q.id] ?? null })),
          startedAt,
          durationSeconds: startedAt ? Math.round((Date.now() - Date.parse(startedAt)) / 1000) : 0,
        };
        const res = await post(`/assessments/${data.assessment.id}/submit`, payload);
        setResult(res);
        setPhase('result');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (err) {
        submittedRef.current = false;
        setSubmitError(
          auto
            ? `${err.message} Your answers are still here — submit again when you are ready.`
            : err.message,
        );
      } finally {
        setSubmitting(false);
      }
    },
    [answers, data, questions, startedAt],
  );

  // Countdown. Time is a guide, not a trap: at zero the attempt is submitted rather
  // than discarded, so no work is lost.
  useEffect(() => {
    if (phase !== 'attempt' || secondsLeft === null) return undefined;
    if (secondsLeft <= 0) {
      submit(true);
      return undefined;
    }
    const t = setTimeout(() => setSecondsLeft((s) => (s === null ? null : s - 1)), 1000);
    return () => clearTimeout(t);
  }, [phase, secondsLeft, submit]);

  const begin = () => {
    setAnswers({});
    setIndex(0);
    setResult(null);
    setSubmitError(null);
    submittedRef.current = false;
    setStartedAt(new Date().toISOString());
    setSecondsLeft((data?.assessment.timeLimitMinutes || 10) * 60);
    setPhase('attempt');
  };

  if (state.status === 'loading') return <Loading label="Loading checkpoint…" />;
  if (state.status === 'error') {
    return (
      <ErrorState
        title="This checkpoint could not be loaded"
        message={state.error.message}
        onRetry={load}
      />
    );
  }

  const { assessment, gate, history, bestScore, passed } = data;

  if (phase === 'intro') {
    return (
      <>
        <PageHead
          eyebrow={assessment.module ? assessment.module.title : assessment.course.title}
          title={assessment.title}
          description={`${questions.length} questions · pass mark ${assessment.passScore}% · ${assessment.timeLimitMinutes} minute guide. Explanations are shown after you submit.`}
          actions={
            <Link className="btn btn--ghost" to={`/courses/${assessment.course.slug}`}>
              <ArrowLeft aria-hidden="true" /> Back to course
            </Link>
          }
        />

        <div className="stack">
          {!gate.open && (
            <div className="callout callout--warning">
              <AlertTriangle aria-hidden="true" />
              <div>
                <strong>Finish the module first.</strong>
                <p className="small" style={{ margin: '4px 0 8px' }}>
                  {gate.completed} of {gate.required} lessons in {assessment.module?.title} are complete. A
                  checkpoint only means something after the material.
                </p>
                <Link className="btn btn--sm" to={`/courses/${assessment.course.slug}`}>
                  Go to the module
                </Link>
              </div>
            </div>
          )}

          {gate.open && (
            <div className="card">
              <div className="card__body stack">
                <div className="row row--between">
                  <div>
                    <div className="tiny muted upper">Your standing</div>
                    <div style={{ fontSize: 22, fontWeight: 600, marginTop: 4 }}>
                      {bestScore === null ? 'Not attempted yet' : `Best ${bestScore} / ${data.maxScore} · ${Math.round((bestScore / data.maxScore) * 100)}%`}
                    </div>
                  </div>
                  {bestScore !== null && (
                    <span className={`badge ${passed ? 'badge--success' : 'badge--warning'}`}>
                      {passed ? 'Passed' : `Below ${assessment.passScore}%`}
                    </span>
                  )}
                </div>
                <p className="small muted" style={{ margin: 0 }}>
                  {history.length === 0
                    ? 'No attempts yet.'
                    : `${history.length} previous ${history.length === 1 ? 'attempt' : 'attempts'} on record.`}{' '}
                  You can retake a checkpoint as often as you like — the best score is what counts.
                </p>
                <div className="row">
                  <button type="button" className="btn btn--primary" onClick={begin}>
                    {history.length ? 'Retake checkpoint' : 'Start checkpoint'}
                    <ChevronRight aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {history.length > 0 && (
            <div className="card">
              <div className="card__head">
                <h2>Previous attempts</h2>
              </div>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Submitted</th>
                      <th>Score</th>
                      <th>Result</th>
                      <th>Time</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h) => (
                      <tr key={h.id}>
                        <td className="small">{formatDate(h.submittedAt)}</td>
                        <td className="mono small">
                          {h.score} / {h.maxScore} · {h.percent}%
                        </td>
                        <td>
                          <span className={`badge ${h.passed ? 'badge--success' : 'badge--warning'}`}>
                            {h.passed ? 'Passed' : 'Not passed'}
                          </span>
                        </td>
                        <td className="small muted">{formatDuration(h.durationSeconds)}</td>
                        <td>
                          <button
                            type="button"
                            className="btn btn--ghost btn--sm"
                            onClick={() => navigate(`/checkpoints/${id}/attempt/${h.id}`)}
                          >
                            Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </>
    );
  }

  if (phase === 'attempt') {
    const q = questions[index];
    const isLast = index === questions.length - 1;
    const low = secondsLeft !== null && secondsLeft <= 60;
    return (
      <>
        <div className="attempt-bar">
          <div className="row row--between">
            <div className="row" style={{ gap: 'var(--space-3)' }}>
              <Link className="btn btn--ghost btn--sm" to={`/courses/${assessment.course.slug}`}>
                <ArrowLeft aria-hidden="true" /> Exit
              </Link>
              <span className="small muted">
                Question {index + 1} of {questions.length}
              </span>
            </div>
            <div className={`attempt-timer ${low ? 'is-low' : ''}`}>
              <Clock aria-hidden="true" />
              <span className="mono">{formatClock(secondsLeft)}</span>
            </div>
          </div>
          <Progress value={(answeredCount / questions.length) * 100} label={`${answeredCount} of ${questions.length} answered`} />
        </div>

        <div className="attempt-grid">
          <div className="card">
            <div className="card__body stack">
              <div className="prose">
                <Markdown source={q.prompt} />
              </div>
              <div className="stack" role="radiogroup" aria-label="Answer options">
                {q.options.map((o, i) => {
                  const picked = answers[q.id] === o.id;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      role="radio"
                      aria-checked={picked}
                      className={`option ${picked ? 'option--picked' : ''}`}
                      onClick={() => setAnswers((a) => ({ ...a, [q.id]: o.id }))}
                    >
                      <span className="option__key">{String.fromCharCode(65 + i)}</span>
                      <span className="option__label">{o.label}</span>
                      {picked && <Check aria-hidden="true" className="option__tick" />}
                    </button>
                  );
                })}
              </div>
              <div className="row row--between" style={{ marginTop: 'var(--space-2)' }}>
                <button
                  type="button"
                  className="btn btn--ghost"
                  disabled={index === 0}
                  onClick={() => setIndex((i) => Math.max(0, i - 1))}
                >
                  <ChevronLeft aria-hidden="true" /> Previous
                </button>
                {isLast ? (
                  <button
                    type="button"
                    className="btn btn--primary"
                    onClick={() => submit(false)}
                    disabled={submitting}
                  >
                    {submitting ? 'Submitting…' : `Submit ${answeredCount < questions.length ? `(${questions.length - answeredCount} unanswered)` : ''}`}
                  </button>
                ) : (
                  <button type="button" className="btn btn--primary" onClick={() => setIndex((i) => i + 1)}>
                    Next <ChevronRight aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <aside className="card attempt-map">
            <div className="card__head">
              <h2>Questions</h2>
            </div>
            <div className="card__body stack">
              <div className="attempt-map__grid">
                {questions.map((item, i) => {
                  const answered = answers[item.id] !== undefined && answers[item.id] !== null;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`attempt-map__cell ${answered ? 'is-answered' : ''} ${i === index ? 'is-current' : ''}`}
                      onClick={() => setIndex(i)}
                      aria-label={`Question ${i + 1}, ${answered ? 'answered' : 'not answered'}`}
                      aria-current={i === index ? 'true' : undefined}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>
              <div className="stack tiny muted" style={{ gap: 6 }}>
                <span className="row" style={{ gap: 6 }}>
                  <span className="legend legend--answered" /> Answered
                </span>
                <span className="row" style={{ gap: 6 }}>
                  <span className="legend" /> Not answered
                </span>
              </div>
              {submitError && (
                <div className="callout callout--danger">
                  <AlertTriangle aria-hidden="true" />
                  <p className="small" style={{ margin: 0 }}>{submitError}</p>
                </div>
              )}
              <button
                type="button"
                className="btn btn--sm"
                onClick={() => submit(false)}
                disabled={submitting}
              >
                {submitting ? 'Submitting…' : 'Submit now'}
              </button>
            </div>
          </aside>
        </div>
      </>
    );
  }

  return <ResultView result={result} onRetake={begin} onReview={(sid) => navigate(`/checkpoints/${id}/attempt/${sid}`)} />;
}

function formatClock(total) {
  if (total === null || total === undefined) return '—';
  const s = Math.max(0, total);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

function ResultView({ result, onRetake, onReview }) {
  const { submission, review, awarded, next } = result;
  return (
    <>
      <PageHead
        eyebrow="Result"
        title={submission.passed ? 'Checkpoint passed' : 'Checkpoint complete'}
        description={`${submission.score} of ${submission.maxScore} correct · ${submission.percent}% · pass mark ${submission.passScore}%`}
      />

      <div className="stack">
        <div className="card">
          <div className="card__body stack">
            <div className="row row--between">
              <div>
                <div className={`score ${submission.passed ? 'score--pass' : 'score--fail'}`}>
                  {submission.percent}%
                </div>
                <p className="small muted" style={{ margin: '6px 0 0' }}>
                  Attempt {submission.attempt} · {formatDuration(submission.durationSeconds)} ·{' '}
                  {formatDate(submission.submittedAt)}
                </p>
              </div>
              <span className={`badge ${submission.passed ? 'badge--success' : 'badge--warning'}`}>
                {submission.passed ? <Award aria-hidden="true" /> : null}
                {submission.passed ? 'Passed' : `Below ${submission.passScore}%`}
              </span>
            </div>
            <Progress value={submission.percent} label={`${submission.score} of ${submission.maxScore} correct`} />
            {!submission.passed && (
              <p className="small muted" style={{ margin: 0 }}>
                Nothing is lost — read the explanations below, then retake when you are ready. The best score
                is the one that counts.
              </p>
            )}
            <div className="row">
              <button type="button" className="btn btn--primary" onClick={onRetake}>
                <RotateCcw aria-hidden="true" /> Retake
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => onReview(submission.id)}
              >
                Open saved attempt
              </button>
            </div>
          </div>
        </div>

        {awarded && awarded.length > 0 && (
          <div className="callout callout--success">
            <Award aria-hidden="true" />
            <p className="small" style={{ margin: 0 }}>
              Achievement unlocked: {awarded.map((a) => a.title).join(', ')}
            </p>
          </div>
        )}

        {next?.lessonSlug && (
          <div className="callout">
            <p className="small" style={{ margin: 0 }}>
              Next up: <Link to={`/courses/${next.courseSlug}/${next.lessonSlug}`}>the next lesson in this course</Link>.
            </p>
          </div>
        )}

        <div className="card">
          <div className="card__head">
            <h2>Answers and explanations</h2>
          </div>
          <div className="card__body stack">
            {review.map((r, i) => (
              <div key={r.questionId} className="review-item">
                <div className="row" style={{ gap: 8 }}>
                  <span className={`review-mark ${r.correct ? 'is-correct' : 'is-wrong'}`}>
                    {r.correct ? <Check aria-hidden="true" /> : <X aria-hidden="true" />}
                  </span>
                  <span className="tiny muted upper">Question {i + 1}</span>
                </div>
                <div className="prose" style={{ marginTop: 8 }}>
                  <Markdown source={r.prompt} />
                </div>
                <ul className="review-options">
                  {r.options.map((o) => (
                    <li
                      key={o.id}
                      className={`review-option ${o.correct ? 'is-correct' : ''} ${r.chosenOptionId === o.id && !o.correct ? 'is-wrong' : ''}`}
                    >
                      <span>{o.label}</span>
                      {o.correct && <span className="tiny muted">correct</span>}
                      {r.chosenOptionId === o.id && !o.correct && <span className="tiny muted">your answer</span>}
                    </li>
                  ))}
                </ul>
                {r.chosenOptionId === null && (
                  <p className="tiny muted" style={{ margin: '4px 0 0' }}>You left this one unanswered.</p>
                )}
                {r.explanation && (
                  <div className="callout" style={{ marginTop: 8 }}>
                    <p className="small" style={{ margin: 0 }}>{r.explanation}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

export { formatClock };
