import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Brain, Play, CheckCircle2, XCircle, Clock, ArrowRight, RotateCcw, Loader2, ChevronLeft, Trophy,
} from 'lucide-react';
import { AppShell, PageHead, Loading, ErrorState, Progress, useToast } from '../components/AppShell.jsx';
import { get, post } from '../lib/api.js';
import { relative, minutes } from '../lib/format.js';

const CATEGORY_LABEL = { quant: 'Quantitative', logical: 'Logical reasoning', verbal: 'Verbal', di: 'Data interpretation', placement: 'Placement' };

function Setup({ topics, onStart }) {
  const [selected, setSelected] = useState(topics[0]?.slug || '');
  const [count, setCount] = useState(10);
  const [difficulty, setDifficulty] = useState('mixed');
  const [busy, setBusy] = useState(false);

  const start = async (kind) => {
    setBusy(true);
    await onStart({ kind, topicSlug: kind === 'practice' ? selected : undefined, count, difficulty });
    setBusy(false);
  };

  return (
    <div className="stack stack-5">
      <div className="grid grid--3">
        {topics.map((t) => (
          <button
            key={t.slug}
            type="button"
            onClick={() => setSelected(t.slug)}
            className="card card--tight"
            aria-pressed={selected === t.slug}
            style={{
              textAlign: 'left', cursor: 'pointer',
              borderColor: selected === t.slug ? 'var(--accent)' : undefined,
              background: selected === t.slug ? 'var(--accent-soft)' : undefined,
            }}
          >
            <div className="row row--between" style={{ marginBottom: 4 }}>
              <span className="tiny muted">{CATEGORY_LABEL[t.category] || t.category}</span>
              <span className="tiny muted">{t.questionCount} q</span>
            </div>
            <div className="small strong">{t.title}</div>
            <p className="tiny muted" style={{ marginTop: 4 }}>{t.description}</p>
            {t.accuracy !== null && (
              <div style={{ marginTop: 8 }}>
                <Progress value={t.accuracy} />
                <div className="tiny muted" style={{ marginTop: 4 }}>{t.accuracy}% accuracy over {t.answered} answered</div>
              </div>
            )}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="card__head">
          <div>
            <div className="card__title">Start a set</div>
            <div className="card__hint">Practice is untimed; a mock exam gives you a clock and mixes topics.</div>
          </div>
        </div>
        <div className="row row--wrap" style={{ gap: 12, alignItems: 'flex-end' }}>
          <div className="field" style={{ minWidth: 140 }}>
            <label className="label" htmlFor="count">Questions</label>
            <select id="count" className="select" value={count} onChange={(e) => setCount(Number(e.target.value))}>
              {[5, 10, 15, 20].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="field" style={{ minWidth: 160 }}>
            <label className="label" htmlFor="difficulty">Difficulty</label>
            <select id="difficulty" className="select" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
              <option value="mixed">Mixed</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          <span className="spacer" />
          <button className="btn" onClick={() => start('mock')} disabled={busy}>
            <Clock /> Mock exam
          </button>
          <button className="btn btn--primary" onClick={() => start('practice')} disabled={busy || !selected}>
            {busy ? <Loader2 className="spin" /> : <Play />} Practise {selected ? `“${topics.find((t) => t.slug === selected)?.title}”` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}

function Runner({ attempt, onFinish, onExit }) {
  const [answers, setAnswers] = useState({});
  const [index, setIndex] = useState(0);
  const [remaining, setRemaining] = useState(attempt.timeLimitSeconds);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const question = attempt.questions[index];

  useEffect(() => {
    if (!attempt.timeLimitSeconds) return;
    const timer = setInterval(() => setRemaining((r) => (r === null ? null : Math.max(0, r - 1))), 1000);
    return () => clearInterval(timer);
  }, [attempt.timeLimitSeconds]);

  const submit = useCallback(
    async (auto = false) => {
      setBusy(true);
      try {
        const payload = attempt.questions.map((q) => ({
          questionId: q.id,
          chosenIndex: Number.isInteger(answers[q.id]) ? answers[q.id] : null,
        }));
        const result = await post(`/aptitude/attempts/${attempt.attempt.id}/submit`, { answers: payload });
        if (auto) toast.push('Time is up — the set was submitted.', 'danger');
        onFinish(result);
      } catch (err) {
        toast.push(err.message, 'danger');
      } finally {
        setBusy(false);
      }
    },
    [attempt, answers, onFinish, toast],
  );

  useEffect(() => {
    if (attempt.timeLimitSeconds && remaining === 0 && !busy) submit(true);
  }, [remaining, attempt.timeLimitSeconds, busy, submit]);

  const answered = Object.values(answers).filter(Number.isInteger).length;

  return (
    <div className="stack stack-4">
      <div className="row row--between row--wrap" style={{ gap: 10 }}>
        <div className="row" style={{ gap: 8 }}>
          <span className="badge">{question.topic.title}</span>
          <span className="badge">{question.difficulty}</span>
          <span className="small muted">Question {index + 1} of {attempt.questions.length}</span>
        </div>
        <div className="row" style={{ gap: 10 }}>
          {attempt.timeLimitSeconds && (
            <span className={`badge ${remaining !== null && remaining < 60 ? 'badge--danger' : ''}`}>
              <Clock style={{ width: 11, height: 11 }} />
              {remaining === null ? '—' : `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`}
            </span>
          )}
          <button className="btn btn--ghost btn--sm" onClick={onExit}>Exit</button>
        </div>
      </div>

      <Progress value={(answered / attempt.questions.length) * 100} />

      <div className="card">
        <p style={{ fontSize: 'var(--step-1)', lineHeight: 1.6 }}>{question.prompt}</p>
        <div className="stack stack-2" style={{ marginTop: 'var(--space-4)' }}>
          {question.options.map((option, i) => {
            const chosen = answers[question.id] === i;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setAnswers((a) => ({ ...a, [question.id]: i }))}
                className="row"
                aria-pressed={chosen}
                style={{
                  gap: 10, padding: '10px 12px', width: '100%', textAlign: 'left', cursor: 'pointer',
                  border: `1px solid ${chosen ? 'var(--accent)' : 'var(--border)'}`,
                  background: chosen ? 'var(--accent-soft)' : 'var(--surface)',
                  borderRadius: 'var(--radius)',
                }}
              >
                <span className="badge" style={{ width: 22, height: 22, justifyContent: 'center', padding: 0 }}>{String.fromCharCode(65 + i)}</span>
                <span className="small">{option}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="row row--between">
        <button className="btn" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0}>
          <ChevronLeft /> Previous
        </button>
        <div className="row" style={{ gap: 8 }}>
          {index < attempt.questions.length - 1 ? (
            <button className="btn btn--primary" onClick={() => setIndex((i) => i + 1)}>Next <ArrowRight /></button>
          ) : (
            <button className="btn btn--primary" onClick={() => submit(false)} disabled={busy}>
              {busy ? <Loader2 className="spin" /> : <CheckCircle2 />} Submit set
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Review({ result, onAgain }) {
  return (
    <div className="stack stack-5">
      <div className="card">
        <div className="row row--between row--wrap" style={{ gap: 12 }}>
          <div>
            <div className="page__eyebrow">Result</div>
            <div style={{ fontSize: 'var(--step-4)', fontWeight: 600, letterSpacing: '-0.02em' }}>{result.score} / {result.total}</div>
            <p className="small muted">{result.percent}% correct · {minutes(Math.round(result.durationSeconds / 60))} spent</p>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <span className={`badge ${result.percent >= 70 ? 'badge--success' : result.percent >= 40 ? 'badge--warning' : 'badge--danger'}`}>
              <Trophy style={{ width: 11, height: 11 }} /> {result.percent >= 70 ? 'Strong' : result.percent >= 40 ? 'Getting there' : 'Needs work'}
            </span>
            <button className="btn btn--sm" onClick={onAgain}><RotateCcw /> New set</button>
          </div>
        </div>
        {result.awarded?.length > 0 && (
          <p className="small" style={{ marginTop: 'var(--space-3)', color: 'var(--success)' }}>
            Achievement: {result.awarded.map((a) => a.title).join(', ')}
          </p>
        )}
      </div>

      <div className="stack stack-3">
        {result.review.map((q, index) => (
          <div key={q.questionId} className="card card--tight">
            <div className="row" style={{ gap: 8, marginBottom: 8 }}>
              {q.correct ? (
                <CheckCircle2 aria-hidden="true" style={{ width: 15, height: 15, color: 'var(--success)' }} />
              ) : (
                <XCircle aria-hidden="true" style={{ width: 15, height: 15, color: 'var(--danger)' }} />
              )}
              <span className="tiny muted">Question {index + 1}</span>
              <span className="badge">{q.difficulty}</span>
            </div>
            <p className="small strong">{q.prompt}</p>
            <div className="stack" style={{ gap: 4, marginTop: 8 }}>
              {q.options.map((option, i) => {
                const isCorrect = i === q.correctIndex;
                const isChosen = i === q.chosenIndex;
                return (
                  <div
                    key={i}
                    className="row small"
                    style={{
                      gap: 8, padding: '5px 8px', borderRadius: 'var(--radius-sm)',
                      background: isCorrect ? 'var(--success-soft)' : isChosen ? 'var(--danger-soft)' : 'transparent',
                      color: isCorrect ? 'var(--success)' : isChosen ? 'var(--danger)' : 'var(--text-secondary)',
                    }}
                  >
                    <span className="tiny mono">{String.fromCharCode(65 + i)}</span>
                    <span style={{ flex: 1 }}>{option}</span>
                    {isCorrect && <span className="tiny">correct</span>}
                    {isChosen && !isCorrect && <span className="tiny">your answer</span>}
                  </div>
                );
              })}
            </div>
            {q.explanation && (
              <p className="small muted" style={{ marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                {q.explanation}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Aptitude() {
  const [topics, setTopics] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [result, setResult] = useState(null);
  const toast = useToast();

  const load = useCallback(() => {
    setError(null);
    Promise.all([get('/aptitude/topics'), get('/aptitude/attempts')])
      .then(([t, a]) => {
        setTopics(t.topics);
        setAttempts(a.attempts);
      })
      .catch(setError);
  }, []);

  useEffect(() => {
    document.title = 'Aptitude — Lumen';
    load();
  }, [load]);

  const start = async (payload) => {
    try {
      const data = await post('/aptitude/attempts', payload);
      setAttempt(data);
      setResult(null);
    } catch (err) {
      toast.push(err.message, 'danger');
    }
  };

  const finish = (res) => {
    setResult(res);
    setAttempt(null);
    load();
  };

  const overall = useMemo(() => {
    const done = attempts.filter((a) => a.percent !== null);
    if (!done.length) return null;
    return Math.round(done.reduce((sum, a) => sum + a.percent, 0) / done.length);
  }, [attempts]);

  return (
    <AppShell title="Aptitude">
      <div className="page">
        <PageHead
          eyebrow="Prepare"
          title="Aptitude academy"
          sub="Quantitative, logical, verbal and data interpretation sets with per-question explanations. Every number here comes from attempts you actually completed."
          actions={overall !== null && <span className="badge badge--accent">Average {overall}%</span>}
        />

        {error && <ErrorState error={error} onRetry={load} />}
        {!topics && !error && <Loading rows={3} height={100} />}

        {topics && !attempt && !result && <Setup topics={topics} onStart={start} />}
        {attempt && <Runner attempt={attempt} onFinish={finish} onExit={() => setAttempt(null)} />}
        {result && <Review result={result} onAgain={() => setResult(null)} />}

        {topics && !attempt && !result && attempts.length > 0 && (
          <div className="card" style={{ marginTop: 'var(--space-6)' }}>
            <div className="card__head">
              <div>
                <div className="card__title">Recent attempts</div>
                <div className="card__hint">Your own history, newest first.</div>
              </div>
              <Brain aria-hidden="true" style={{ width: 15, height: 15, color: 'var(--faint)' }} />
            </div>
            <table className="table">
              <thead>
                <tr><th>When</th><th>Type</th><th>Topic</th><th>Score</th><th>Time</th></tr>
              </thead>
              <tbody>
                {attempts.slice(0, 10).map((a) => (
                  <tr key={a.id}>
                    <td className="muted">{relative(a.startedAt)}</td>
                    <td>{a.kind === 'mock' ? 'Mock exam' : 'Practice'}</td>
                    <td className="muted">{a.topic?.title || 'Mixed'}</td>
                    <td>{a.percent === null ? <span className="muted">not finished</span> : <span className="strong">{a.score}/{a.total} · {a.percent}%</span>}</td>
                    <td className="muted">{a.durationSeconds ? minutes(Math.round(a.durationSeconds / 60)) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
