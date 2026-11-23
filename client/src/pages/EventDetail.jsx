import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Editor, { loader } from '@monaco-editor/react';
import { get, post, del } from '../lib/api.js';
import { useAuth, useTheme } from '../lib/auth.jsx';
import { useToast } from '../components/AppShell.jsx';
import { Markdown } from '../lib/markdown.jsx';

// Monaco is served from this deployment, not a CDN (the CSP forbids remote scripts).
loader.config({ paths: { vs: '/monaco/vs' } });
import { formatDate, timeOf } from '../lib/format.js';
import { Countdown, PHASE_LABEL } from './Events.jsx';

const MONACO_LANG = { python: 'python', javascript: 'javascript', java: 'java', c: 'c', cpp: 'cpp', sql: 'sql' };

function Timer({ endsAt }) {
  return (
    <div className="event-timer">
      <span className="muted small">Time left</span>
      <Countdown target={endsAt} />
    </div>
  );
}

export default function EventDetail() {
  const { slug } = useParams();
  const { user } = useAuth();
  const { resolved: theme } = useTheme();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [active, setActive] = useState(null);

  const load = useCallback(() => {
    get(`/competitions/${slug}`)
      .then((d) => {
        setData(d);
        if (d.canAttempt && d.challenges.length) {
          setActive((cur) => cur ?? d.challenges.find((c) => !c.answered)?.slug ?? d.challenges[0].slug);
        }
      })
      .catch((e) => setError(e.message));
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  async function register() {
    try {
      await post(`/competitions/${slug}/register`, {});
      toast.push('You are registered. The challenges open when the event starts.', 'success');
      load();
    } catch (e) {
      toast.push(e.message, 'error');
    }
  }

  async function withdraw() {
    try {
      await del(`/competitions/${slug}/register`);
      toast.push('You withdrew from this event.', 'success');
      load();
    } catch (e) {
      toast.push(e.message, 'error');
    }
  }

  if (error) {
    return (
      <div className="page">
        <div className="empty">
          <h2>Event not available</h2>
          <p>{error}</p>
          <Link className="btn" to="/events">All events</Link>
        </div>
      </div>
    );
  }
  if (!data) return <div className="page"><div className="skeleton-block" /></div>;

  const e = data.event;
  const challenge = data.challenges.find((c) => c.slug === active) || null;
  // one "join" control, whatever the phase: before the start it is an early registration,
  // while it runs it is a late entry, and once it is closed there is nothing to join.
  const canJoin = !e.registered && (e.phase === 'registration' || e.phase === 'live');

  return (
    <div className="page">
      <nav className="breadcrumb">
        <Link to="/events">Events</Link>
        <span>/</span>
        <span>{e.title}</span>
      </nav>

      <header className="page-head">
        <div>
          <span className={`pill pill-${e.phase === 'live' ? 'accent' : 'quiet'}`}>{PHASE_LABEL[e.phase] || e.phase}</span>
          <h1>{e.title}</h1>
          <p className="muted">{e.summary}</p>
          <div className="event-meta">
            <div>
              <dt>Starts</dt>
              <dd>{e.startsAt ? `${formatDate(e.startsAt)}, ${timeOf(e.startsAt)}` : '—'}</dd>
            </div>
            <div>
              <dt>Closes</dt>
              <dd>{e.endsAt ? `${formatDate(e.endsAt)}, ${timeOf(e.endsAt)}` : '—'}</dd>
            </div>
            <div>
              <dt>Length</dt>
              <dd>{e.durationMinutes} min</dd>
            </div>
            <div>
              <dt>Format</dt>
              <dd>{e.format === 'quiz' ? 'Quiz' : 'Coding'}</dd>
            </div>
            {e.course && (
              <div>
                <dt>Course</dt>
                <dd><Link to={`/courses/${e.course.slug}`}>{e.course.title}</Link></dd>
              </div>
            )}
          </div>
        </div>
        <div className="page-actions">
          {canJoin && user && (
            <button type="button" className="btn btn-primary" onClick={register}>
              {e.phase === 'live' ? 'Join now and start' : 'Register for this event'}
            </button>
          )}
          {canJoin && !user && (
            <Link className="btn btn-primary" to="/signin">Sign in to take part</Link>
          )}
          {e.registered && e.phase === 'registration' && (
            <button type="button" className="btn btn-ghost" onClick={withdraw}>Withdraw</button>
          )}
          {e.registered && <span className="pill pill-ok">You are registered</span>}
        </div>
      </header>

      {e.phase === 'live' && (
        <div className="notice notice-info">
          <strong>This event is live.</strong>{' '}
          {e.registered
            ? 'Submit your solutions below — you can improve a score by resubmitting.'
            : 'Registration has closed; the results will be published here.'}
        </div>
      )}

      <section className="stack">
        <h2 className="section-title">About this event</h2>
        <div className="card prose-card">
          <Markdown source={e.description} />
          <h3>Rules</h3>
          <Markdown source={e.rules} />
          <h3>Who can take part</h3>
          <Markdown source={e.eligibility} />
        </div>
      </section>

      <section className="stack">
        <h2 className="section-title">
          Challenges <span className="muted small">{data.challenges.length} · {data.challenges.reduce((n, c) => n + c.points, 0)} points</span>
        </h2>

        {!data.canAttempt && (
          <div className="notice">
            {!user
              ? 'Sign in and register to take part. The challenge details appear when the event is live.'
              : !e.registered
                ? 'Register to take part.'
                : e.phase === 'live'
                  ? ''
                  : 'The challenges open when the event starts.'}
          </div>
        )}

        <div className="event-workspace">
          <ol className="event-challenge-list">
            {data.challenges.map((c) => (
              <li key={c.slug}>
                <button
                  type="button"
                  className={`event-challenge ${active === c.slug ? 'is-active' : ''}`}
                  onClick={() => setActive(c.slug)}
                  disabled={!data.canAttempt}
                >
                  <span className="event-challenge-title">{c.title}</span>
                  <span className="muted small">
                    {c.answered ? `best ${c.myScore}/${c.points}` : `${c.points} pts`}
                  </span>
                </button>
              </li>
            ))}
          </ol>

          {data.canAttempt && challenge ? (
            <div className="event-stage">
              {e.phase === 'live' && e.endsAt && <Timer endsAt={e.endsAt} />}
              {e.format === 'quiz' ? (
                <QuizChallenge key={challenge.slug} slug={slug} challenge={challenge} onDone={load} />
              ) : (
                <CodeChallenge key={challenge.slug} slug={slug} challenge={challenge} theme={theme} onDone={load} />
              )}
            </div>
          ) : null}
        </div>
      </section>

      {e.phase === 'published' && data.results && (
        <section className="stack">
          <h2 className="section-title">Results</h2>
          {data.results.length ? (
            <div className="card">
              <table className="table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Learner</th>
                    <th>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {data.results.map((r, i) => (
                    <tr key={`${r.rank}-${i}`}>
                      <td className="mono">{r.rank ?? '—'}</td>
                      <td>{r.name}</td>
                      <td className="mono">{r.score} / {r.maxScore}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty"><p>No one submitted before this event closed.</p></div>
          )}
        </section>
      )}
    </div>
  );
}

function QuizChallenge({ slug, challenge, onDone }) {
  const toast = useToast();
  const [choice, setChoice] = useState(null);
  const [result, setResult] = useState(null);
  const [answered, setAnswered] = useState(challenge.answered);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (choice === null) return;
    setBusy(true);
    try {
      const r = await post(`/competitions/${slug}/challenges/${challenge.slug}`, { answerIndex: choice });
      setResult(r);
      setAnswered(true);
      onDone?.();
    } catch (err) {
      toast.push(err.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card quiz-challenge">
      <h3>{challenge.title}</h3>
      <div className="prose-card">
        <Markdown source={challenge.prompt} />
      </div>
      <div className="option-list" role="radiogroup" aria-label="Answer options">
        {challenge.options.map((label, i) => (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={choice === i}
            className={`option ${choice === i ? 'is-selected' : ''}`}
            onClick={() => setChoice(i)}
            disabled={busy}
          >
            <span className="option__key">{String.fromCharCode(65 + i)}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>
      <div className="row">
        <button type="button" className="btn btn-primary" onClick={submit} disabled={choice === null || busy}>
          {busy ? 'Checking…' : answered ? 'Submit again' : 'Submit answer'}
        </button>
        <span className="muted small">
          {challenge.points} points · your best score counts{answered ? ' · answered' : ''}
        </span>
      </div>
      {result && (
        <div className={`notice ${result.passed ? 'notice-ok' : 'notice-warn'}`}>
          <strong>{result.passed ? 'Correct.' : 'Not quite.'}</strong> {result.explanation}
          <div className="muted small">
            Scored {result.score} of {result.maxScore} points. Your best score counts.
          </div>
        </div>
      )}
    </div>
  );
}

function CodeChallenge({ slug, challenge, theme, onDone }) {
  const toast = useToast();
  const [code, setCode] = useState(challenge.starterCode || '');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  async function submit() {
    setBusy(true);
    setResult(null);
    try {
      const r = await post(`/competitions/${slug}/challenges/${challenge.slug}`, { code });
      setResult(r);
      toast.push(r.passed ? 'All tests passed.' : `${r.passedTests} of ${r.totalTests} tests passed.`, r.passed ? 'success' : 'error');
      onDone?.();
    } catch (err) {
      toast.push(err.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card code-challenge">
      <h3>{challenge.title}</h3>
      <div className="prose-card">
        <Markdown source={challenge.prompt} />
      </div>
      <div className="editor-wrap">
        <Editor
          height="320px"
          language={MONACO_LANG[challenge.language] || 'python'}
          theme={theme === 'dark' ? 'vs-dark' : 'light'}
          value={code}
          onChange={(v) => setCode(v ?? '')}
          options={{ fontSize: 13, minimap: { enabled: false }, scrollBeyondLastLine: false, tabSize: 4 }}
        />
      </div>
      <div className="row">
        <button type="button" className="btn btn-primary" onClick={submit} disabled={busy || !code.trim()}>
          {busy ? 'Grading…' : 'Submit solution'}
        </button>
        <span className="muted small">
          {challenge.testCount} tests · {challenge.points} points · partial credit per test
        </span>
      </div>
      {result && (
        <div className="test-results">
          <div className={`notice ${result.passed ? 'notice-ok' : 'notice-warn'}`}>
            <strong>{result.passed ? 'Passed all tests.' : `${result.passedTests} of ${result.totalTests} tests passed.`}</strong>{' '}
            Scored {result.score} of {result.maxScore} points.
          </div>
          <table className="table table-compact">
            <thead>
              <tr>
                <th>Test</th>
                <th>Input</th>
                <th>Expected</th>
                <th>Your output</th>
              </tr>
            </thead>
            <tbody>
              {result.results.map((r, i) => (
                <tr key={i} className={r.passed ? '' : 'row-fail'}>
                  <td className="mono">{r.passed ? 'pass' : 'fail'}</td>
                  <td className="mono small">{JSON.stringify(r.input)}</td>
                  <td className="mono small">{JSON.stringify(r.expected)}</td>
                  <td className="mono small">{JSON.stringify(r.actual)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
