import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Editor, { loader } from '@monaco-editor/react';
import {
  Play, Send, Terminal, CheckCircle2, XCircle, AlertTriangle, RotateCcw, Loader2, ListChecks, Info,
} from 'lucide-react';
import { AppShell, PageHead, Loading, ErrorState, useToast } from '../components/AppShell.jsx';
import { useTheme } from '../lib/auth.jsx';
import { get, post } from '../lib/api.js';
import { Markdown } from '../lib/markdown.jsx';
import { relative } from '../lib/format.js';

// Monaco is served from this deployment (client/public/monaco) rather than a CDN:
// the app's Content-Security-Policy forbids remote scripts, and learners should not
// depend on a third-party CDN being reachable.
loader.config({ paths: { vs: '/monaco/vs' } });

const STARTER = {
  python: 'def main():\n    print("Hello from the Lumen lab")\n\n\nif __name__ == "__main__":\n    main()\n',
  javascript: 'function main() {\n  console.log("Hello from the Lumen lab");\n}\n\nmain();\n',
};

function Output({ result, running }) {
  if (running) {
    return (
      <div className="terminal row" style={{ gap: 8, alignItems: 'center' }}>
        <Loader2 className="spin" style={{ width: 14, height: 14 }} /> Running in the sandbox…
      </div>
    );
  }
  if (!result) {
    return (
      <div className="terminal" style={{ color: 'var(--faint)' }}>
        Output appears here. Code runs in an isolated process with no network and no access to this server&apos;s
        secrets.
      </div>
    );
  }
  return (
    <div className="terminal">
      {result.stdout ? <div>{result.stdout}</div> : <div style={{ color: 'var(--faint)' }}>(no output on stdout)</div>}
      {result.stderr && <div className="terminal__err">{result.stderr}</div>}
      <div className="tiny muted" style={{ marginTop: 8, borderTop: '1px solid var(--border)', paddingTop: 6 }}>
        exit {result.exitCode}
        {result.timedOut ? ' · stopped at the time limit' : ''}
        {typeof result.durationMs === 'number' ? ` · ${result.durationMs} ms` : ''}
        {result.truncated ? ' · output truncated' : ''}
      </div>
    </div>
  );
}

export default function Lab() {
  const [params, setParams] = useSearchParams();
  const exerciseSlug = params.get('exercise') || '';
  const [health, setHealth] = useState(null);
  const [exercises, setExercises] = useState(null);
  const [exercise, setExercise] = useState(null);
  const [listError, setListError] = useState(null);
  const [language, setLanguage] = useState('python');
  const [source, setSource] = useState(STARTER.python);
  const [result, setResult] = useState(null);
  const [tests, setTests] = useState(null);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState([]);
  const { resolved } = useTheme();
  const toast = useToast();

  const loadLists = useCallback(() => {
    setListError(null);
    Promise.all([get('/lab/health'), get('/lab/exercises'), get('/lab/history')])
      .then(([h, e, hist]) => {
        setHealth(h);
        setExercises(e.exercises);
        setHistory(hist.history);
      })
      .catch(setListError);
  }, []);

  useEffect(() => {
    document.title = 'Coding lab — Lumen';
    loadLists();
  }, [loadLists]);

  useEffect(() => {
    if (!exerciseSlug) {
      setExercise(null);
      return;
    }
    get(`/lab/exercises/${exerciseSlug}`)
      .then((data) => {
        setExercise(data.exercise);
        setLanguage(data.exercise.language);
        setSource(data.exercise.starterCode || STARTER[data.exercise.language] || STARTER.python);
        setTests(null);
        setResult(null);
      })
      .catch((err) => toast.push(err.message, 'danger'));
  }, [exerciseSlug, toast]);

  const run = async () => {
    setRunning(true);
    setResult(null);
    try {
      const data = await post('/lab/run', { language, source, exerciseSlug: exerciseSlug || undefined });
      setResult(data);
    } catch (err) {
      setResult({ stdout: '', stderr: err.message, exitCode: -1 });
      toast.push(err.message, 'danger');
    } finally {
      setRunning(false);
    }
  };

  const submit = async () => {
    if (!exercise) return;
    setSubmitting(true);
    setTests(null);
    try {
      const data = await post('/lab/submit', { exerciseSlug: exercise.slug, source });
      setTests(data);
      if (data.allPassed) toast.push(`All ${data.total} tests passed.`, 'success');
      else toast.push(`${data.passed} of ${data.total} tests passed.`, 'danger');
      get('/lab/history').then((h) => setHistory(h.history)).catch(() => {});
    } catch (err) {
      toast.push(err.message, 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setSource(exercise?.starterCode || STARTER[language]);
    setResult(null);
    setTests(null);
  };

  const changeLanguage = (lang) => {
    setLanguage(lang);
    if (!exercise) setSource(STARTER[lang]);
  };

  const editorOptions = useMemo(
    () => ({
      minimap: { enabled: false },
      fontSize: 13,
      lineHeight: 20,
      fontFamily: "ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, Consolas, monospace",
      scrollBeyondLastLine: false,
      padding: { top: 12, bottom: 12 },
      renderLineHighlight: 'none',
      smoothScrolling: true,
      tabSize: 4,
      automaticLayout: true,
      wordWrap: 'on',
    }),
    [],
  );

  return (
    <AppShell title="Coding lab">
      <div className="page">
        <PageHead
          eyebrow="Practise"
          title="Coding lab"
          sub="Write Python or JavaScript, run it in an isolated sandbox, and submit against the exercise's test suite."
          actions={
            health && (
              <span className={`badge ${health.ready ? 'badge--success' : 'badge--warning'}`}>
                <span className="dot" />
                {health.ready ? `Sandbox ready · ${health.languages.filter((l) => l.ready).map((l) => l.label).join(', ')}` : 'Sandbox unavailable'}
              </span>
            )
          }
        />

        {listError && <ErrorState error={listError} onRetry={loadLists} />}
        {!exercises && !listError && <Loading rows={3} height={90} />}

        {health && !health.ready && (
          <div className="callout callout--warning" style={{ marginBottom: 'var(--space-5)' }}>
            <AlertTriangle aria-hidden="true" />
            <div>
              <div className="strong" style={{ marginBottom: 2 }}>Code execution is not available in this deployment</div>
              <p className="small muted">{health.reason || health.isolation || 'No supported runtime was found on the server.'}</p>
            </div>
          </div>
        )}
        {health && health.ready && !health.productionReady && (
          <div className="callout" style={{ marginBottom: 'var(--space-5)' }}>
            <Info aria-hidden="true" />
            <div>
              <div className="strong" style={{ marginBottom: 2 }}>Sandbox level: {health.label}</div>
              <p className="small muted">{health.isolation}</p>
            </div>
          </div>
        )}

        {exercises && (
          <div className="lab-grid">
            <div className="stack stack-4" style={{ minWidth: 0 }}>
              <div className="card card--flush">
                <div className="row row--between" style={{ padding: 'var(--space-3) var(--space-4)', borderBottom: '1px solid var(--border)' }}>
                  <div className="row" style={{ gap: 6 }}>
                    {['python', 'javascript'].map((lang) => (
                      <button
                        key={lang}
                        className={`btn btn--sm ${language === lang ? 'btn--primary' : 'btn--ghost'}`}
                        onClick={() => changeLanguage(lang)}
                        aria-pressed={language === lang}
                        disabled={Boolean(exercise) && exercise.language !== lang}
                      >
                        {lang === 'python' ? 'Python 3' : 'JavaScript'}
                      </button>
                    ))}
                  </div>
                  <div className="row" style={{ gap: 6 }}>
                    <button className="btn btn--ghost btn--sm" onClick={reset} title="Reset to starter code"><RotateCcw /> Reset</button>
                    <button className="btn btn--sm" onClick={run} disabled={running || !health?.ready}>
                      {running ? <Loader2 className="spin" /> : <Play />} Run
                    </button>
                    {exercise && (
                      <button className="btn btn--primary btn--sm" onClick={submit} disabled={submitting || !health?.ready}>
                        {submitting ? <Loader2 className="spin" /> : <Send />} Submit tests
                      </button>
                    )}
                  </div>
                </div>
                <div className="editor-frame" style={{ borderRadius: 0, border: 0, height: 380 }}>
                  <Editor
                    path={`lab-${language}.${language === 'python' ? 'py' : 'js'}`}
                    language={language}
                    value={source}
                    onChange={(v) => setSource(v ?? '')}
                    theme={resolved === 'dark' ? 'vs-dark' : 'light'}
                    options={editorOptions}
                    loading={<div className="row" style={{ padding: 16, gap: 8 }}><Loader2 className="spin" style={{ width: 14, height: 14 }} /> Loading editor…</div>}
                  />
                </div>
              </div>

              <div className="stack stack-3">
                <div className="row row--between">
                  <span className="small strong">Output</span>
                  {history.length > 0 && <span className="tiny muted">{history.length} recent runs</span>}
                </div>
                <Output result={result} running={running} />
              </div>

              {tests && (
                <div className="card">
                  <div className="card__head">
                    <div className="row" style={{ gap: 8 }}>
                      <ListChecks aria-hidden="true" style={{ width: 15, height: 15, color: 'var(--faint)' }} />
                      <span className="card__title">Test results</span>
                    </div>
                    <span className={`badge ${tests.allPassed ? 'badge--success' : 'badge--danger'}`}>
                      {tests.passed}/{tests.total} passed
                    </span>
                  </div>
                  <div className="stack stack-2">
                    {tests.results.map((t, index) => (
                      <div key={index} className="row" style={{ gap: 10, alignItems: 'flex-start', padding: '8px 0', borderBottom: index === tests.results.length - 1 ? 0 : '1px solid var(--border)' }}>
                        {t.passed ? (
                          <CheckCircle2 aria-hidden="true" style={{ width: 15, height: 15, color: 'var(--success)', marginTop: 2, flexShrink: 0 }} />
                        ) : (
                          <XCircle aria-hidden="true" style={{ width: 15, height: 15, color: 'var(--danger)', marginTop: 2, flexShrink: 0 }} />
                        )}
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div className="small mono">{t.input ? t.input : '(no input)'}</div>
                          {!t.passed && (
                            <div className="tiny muted mono" style={{ marginTop: 2 }}>
                              expected <span style={{ color: 'var(--success)' }}>{t.expected}</span> · got <span style={{ color: 'var(--danger)' }}>{t.actual || '(nothing)'}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {tests.allPassed && tests.awarded?.length > 0 && (
                    <p className="small" style={{ marginTop: 'var(--space-3)', color: 'var(--success)' }}>
                      Achievement unlocked: {tests.awarded.map((a) => a.title).join(', ')}
                    </p>
                  )}
                </div>
              )}
            </div>

            <aside className="stack stack-4" style={{ minWidth: 0 }}>
              {exercise ? (
                <div className="card">
                  <div className="row row--between" style={{ marginBottom: 8 }}>
                    <span className="badge badge--accent">{exercise.difficulty}</span>
                    <button className="btn btn--ghost btn--sm" onClick={() => { setParams({}); }}>Close</button>
                  </div>
                  <div className="card__title">{exercise.title}</div>
                  <p className="tiny muted" style={{ marginTop: 2 }}>{exercise.course.title}</p>
                  <div style={{ marginTop: 'var(--space-4)', fontSize: 'var(--step--1)' }}>
                    <Markdown source={exercise.prompt} />
                  </div>
                  <div className="callout" style={{ marginTop: 'var(--space-4)' }}>
                    <Info aria-hidden="true" />
                    <span className="small">
                      {exercise.testCount} hidden test{exercise.testCount === 1 ? '' : 's'} will check your function.
                      Expected outputs stay hidden so this tests understanding, not guessing.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="card">
                  <div className="card__title" style={{ marginBottom: 4 }}>Exercises</div>
                  <div className="card__hint" style={{ marginBottom: 'var(--space-3)' }}>Pick one to load its brief and tests.</div>
                  <div className="stack stack-2" style={{ maxHeight: 420, overflowY: 'auto' }}>
                    {exercises.map((ex) => (
                      <button
                        key={ex.slug}
                        onClick={() => setParams({ exercise: ex.slug })}
                        className="row"
                        style={{
                          gap: 8, padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                          background: 'var(--surface)', textAlign: 'left', cursor: 'pointer', width: '100%',
                        }}
                      >
                        {ex.solved ? (
                          <CheckCircle2 aria-hidden="true" style={{ width: 14, height: 14, color: 'var(--success)', flexShrink: 0 }} />
                        ) : (
                          <Terminal aria-hidden="true" style={{ width: 14, height: 14, color: 'var(--faint)', flexShrink: 0 }} />
                        )}
                        <span style={{ minWidth: 0, flex: 1 }}>
                          <span className="small strong" style={{ display: 'block' }}>{ex.title}</span>
                          <span className="tiny muted">{ex.course_title}</span>
                        </span>
                        <span className="badge">{ex.difficulty}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {history.length > 0 && (
                <div className="card">
                  <div className="card__title" style={{ marginBottom: 10 }}>Recent runs</div>
                  <div className="stack" style={{ gap: 8 }}>
                    {history.slice(0, 8).map((h) => (
                      <div key={h.id} className="row" style={{ gap: 8, alignItems: 'flex-start' }}>
                        <span
                          className="dot"
                          style={{ marginTop: 6, color: h.status === 'ok' ? 'var(--success)' : h.status === 'timeout' ? 'var(--warning)' : 'var(--danger)' }}
                        />
                        <div style={{ minWidth: 0 }}>
                          <div className="small">{h.exercise_title || `${h.language} snippet`}</div>
                          <div className="tiny muted">
                            {h.tests_total ? `${h.tests_passed}/${h.tests_total} tests · ` : ''}
                            {relative(h.created_at)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </aside>
          </div>
        )}
      </div>
    </AppShell>
  );
}
