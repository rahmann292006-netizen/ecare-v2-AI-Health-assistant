import { useCallback, useEffect, useState } from 'react';
import { Check, X, HelpCircle, RotateCcw, Trophy } from 'lucide-react';
import { get, post } from '../lib/api.js';
import { useToast } from '../components/AppShell.jsx';

/**
 * The knowledge check at the end of a lesson.
 *
 * Grading is server-side (`POST /api/lessons/:id/quiz`); this component only collects
 * answers and shows the explanations the server returns. Answers are never sent to
 * the browser before submission, so the check cannot be read off the page source.
 */
export default function LessonQuiz({ lessonId }) {
  const [state, setState] = useState({ status: 'loading' });
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const load = useCallback(() => {
    if (!lessonId) return;
    setState({ status: 'loading' });
    get(`/lessons/${lessonId}/quiz`)
      .then((data) => setState({ status: 'ready', data }))
      .catch((err) => setState({ status: err.code === 'not_found' ? 'absent' : 'error', error: err }));
  }, [lessonId]);

  useEffect(load, [load]);

  if (!lessonId || state.status === 'absent') return null;
  if (state.status === 'loading') {
    return (
      <div className="card card--tight">
        <div className="skeleton" style={{ height: 90 }} />
      </div>
    );
  }
  if (state.status === 'error') {
    return (
      <div className="card card--tight">
        <div className="row row--between">
          <span className="small muted">The knowledge check could not be loaded: {state.error.message}</span>
          <button className="btn btn--sm" onClick={load}>
            <RotateCcw aria-hidden="true" /> Retry
          </button>
        </div>
      </div>
    );
  }

  const { questions, lastAttempt } = state.data;
  const answeredCount = questions.filter((q) => answers[q.id] !== undefined).length;
  const reviewById = new Map((result?.review || []).map((r) => [r.questionId, r]));

  const submit = async () => {
    setSubmitting(true);
    try {
      const res = await post(`/lessons/${lessonId}/quiz`, {
        answers: questions.map((q) => ({ questionId: q.id, optionId: answers[q.id] ?? null })),
      });
      setResult(res);
      if (res.awarded?.length) toast.push(`Achievement unlocked: ${res.awarded.map((a) => a.title).join(', ')}`, 'success');
    } catch (err) {
      toast.push(err.message, 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setAnswers({});
    setResult(null);
  };

  return (
    <div className="card">
      <div className="card__head">
        <div>
          <div className="card__title">
            <HelpCircle aria-hidden="true" style={{ width: 15, height: 15, display: 'inline', marginRight: 6 }} />
            Check yourself
          </div>
          <div className="card__hint">
            {questions.length} question{questions.length === 1 ? '' : 's'} · explanations after you answer
            {lastAttempt && ` · last attempt ${lastAttempt.score}/${lastAttempt.maxScore}`}
          </div>
        </div>
        {result && (
          <span className={`badge ${result.passed ? 'badge--success' : 'badge--warning'}`}>
            {result.passed ? <Trophy aria-hidden="true" /> : null}
            {result.score}/{result.maxScore}
          </span>
        )}
      </div>

      <div className="stack stack-5">
        {questions.map((q, qi) => {
          const review = reviewById.get(q.id);
          return (
            <div key={q.id} className="quiz-item">
              <div className="row" style={{ gap: 8, alignItems: 'flex-start' }}>
                <span className="quiz-item__n">{qi + 1}</span>
                <div className="small strong" style={{ flex: 1 }}>{q.prompt}</div>
                {review && (
                  <span className={`review-mark ${review.isCorrect ? 'is-correct' : 'is-wrong'}`}>
                    {review.isCorrect ? <Check aria-hidden="true" /> : <X aria-hidden="true" />}
                  </span>
                )}
              </div>
              <div className="stack" style={{ gap: 6, marginTop: 8 }} role="radiogroup" aria-label={`Question ${qi + 1}`}>
                {q.options.map((o) => {
                  const picked = answers[q.id] === o.id;
                  const isCorrectOption = review?.options?.find((x) => x.id === o.id)?.isCorrect;
                  const cls = review
                    ? isCorrectOption
                      ? 'quiz-option is-correct'
                      : picked
                        ? 'quiz-option is-wrong'
                        : 'quiz-option'
                    : `quiz-option ${picked ? 'is-picked' : ''}`;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      role="radio"
                      aria-checked={picked}
                      className={cls}
                      disabled={Boolean(result)}
                      onClick={() => setAnswers((a) => ({ ...a, [q.id]: o.id }))}
                    >
                      <span className="quiz-option__label">{o.label}</span>
                      {review && isCorrectOption && <span className="tiny">correct</span>}
                      {review && picked && !isCorrectOption && <span className="tiny">your answer</span>}
                    </button>
                  );
                })}
              </div>
              {review?.explanation && (
                <p className="small muted" style={{ margin: '8px 0 0' }}>{review.explanation}</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="row row--between" style={{ marginTop: 'var(--space-4)' }}>
        <span className="tiny muted">
          {result ? (result.passed ? 'All correct — well done.' : 'Read the explanations, then try again.') : `${answeredCount} of ${questions.length} answered`}
        </span>
        {result ? (
          <button type="button" className="btn btn--sm" onClick={reset}>
            <RotateCcw aria-hidden="true" /> Try again
          </button>
        ) : (
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={submit}
            disabled={submitting || answeredCount === 0}
          >
            {submitting ? 'Checking…' : 'Check answers'}
          </button>
        )}
      </div>
    </div>
  );
}
