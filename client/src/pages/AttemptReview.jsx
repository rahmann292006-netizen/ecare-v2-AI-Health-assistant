import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Check, X, ArrowLeft } from 'lucide-react';
import { get } from '../lib/api.js';
import { Markdown } from '../lib/markdown.jsx';
import { PageHead, Loading, ErrorState, Progress } from '../components/AppShell.jsx';
import { formatDate, formatDuration } from '../lib/format.js';

/** A saved assessment attempt, read back from the database — the same review the result screen shows. */
export default function AttemptReview() {
  const { id, submissionId } = useParams();
  const [state, setState] = useState({ status: 'loading' });

  const load = useCallback(() => {
    setState({ status: 'loading' });
    get(`/assessments/submissions/${submissionId}`)
      .then((data) => setState({ status: 'ready', data }))
      .catch((err) => setState({ status: 'error', error: err }));
  }, [submissionId]);

  useEffect(load, [load]);

  if (state.status === 'loading') return <Loading label="Loading attempt…" />;
  if (state.status === 'error') {
    return <ErrorState title="This attempt could not be loaded" message={state.error.message} onRetry={load} />;
  }

  const { submission, review } = state.data;

  return (
    <>
      <PageHead
        eyebrow={submission.course.title}
        title={submission.title}
        description={`Saved attempt · ${formatDate(submission.submittedAt)} · ${formatDuration(submission.durationSeconds)}`}
        actions={
          <Link className="btn btn--ghost" to={`/checkpoints/${id}`}>
            <ArrowLeft aria-hidden="true" /> Back to checkpoint
          </Link>
        }
      />

      <div className="stack">
        <div className="card">
          <div className="card__body stack">
            <div className="row row--between">
              <div className={`score ${submission.passed ? 'score--pass' : 'score--fail'}`}>{submission.percent}%</div>
              <span className={`badge ${submission.passed ? 'badge--success' : 'badge--warning'}`}>
                {submission.passed ? 'Passed' : `Below ${submission.passScore}%`}
              </span>
            </div>
            <Progress value={submission.percent} label={`${submission.score} of ${submission.maxScore} correct`} />
          </div>
        </div>

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
                  <p className="tiny muted" style={{ margin: '4px 0 0' }}>Left unanswered.</p>
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
