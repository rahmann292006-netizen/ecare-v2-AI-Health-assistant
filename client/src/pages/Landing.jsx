import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen, Terminal, Sparkles, MessagesSquare, Brain, BarChart3, ArrowRight, ShieldCheck,
  CheckCircle2, Layers, Compass, FolderGit2,
} from 'lucide-react';
import { ThemeSwitch } from '../components/AppShell.jsx';
import { get } from '../lib/api.js';

const FEATURES = [
  {
    icon: BookOpen,
    title: 'Structured courses',
    body: 'Twelve technology tracks written as real curricula — modules, lessons, objectives, worked code and checkpoints. No filler, no video walls.',
  },
  {
    icon: Terminal,
    title: 'A coding lab that runs code',
    body: 'Write Python and JavaScript in the browser, run it in an isolated sandbox, and see real output and real test results against exercise suites.',
  },
  {
    icon: Sparkles,
    title: 'AI tutor grounded in the lesson',
    body: 'Ask a question and the tutor answers from the course material it was taught to cite, with the sources shown. If no model key is configured it says so instead of guessing.',
  },
  {
    icon: Brain,
    title: 'Aptitude and placement drills',
    body: 'Quantitative, logical and verbal sets with per-question explanations, timed attempts and a topic-level accuracy breakdown.',
  },
  {
    icon: MessagesSquare,
    title: 'A community that keeps context',
    body: 'Ask in a course-linked discussion, mark the answer that solved it, and keep the thread attached to the lesson it came from.',
  },
  {
    icon: BarChart3,
    title: 'Analytics you can act on',
    body: 'Study minutes, streak, completion, weak topics and a weekly plan — measured from what you actually did, never invented.',
  },
];

const JOURNEY = [
  { icon: Compass, label: 'Learn', body: 'Follow a path with clear objectives.' },
  { icon: Layers, label: 'Understand', body: 'Read the reasoning, not just the syntax.' },
  { icon: Terminal, label: 'Practise', body: 'Solve exercises with instant tests.' },
  { icon: FolderGit2, label: 'Build', body: 'Ship the project each track ends with.' },
  { icon: Brain, label: 'Evaluate', body: 'Checkpoints and aptitude attempts.' },
  { icon: BarChart3, label: 'Improve', body: 'Weak spots become next week’s plan.' },
];

export default function Landing() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    document.title = 'Lumen — Learn technology properly';
    get('/catalogue/stats').then(setStats).catch(() => setStats(null));
  }, []);

  return (
    <div className="marketing">
      <nav className="mnav">
        <Link to="/" className="row" style={{ gap: 10 }}>
          <span className="brand-mark">L</span>
          <span className="brand-name">Lumen</span>
        </Link>
        <div className="mnav__links">
          <a href="#features">Platform</a>
          <a href="#journey">How it works</a>
          <a href="#free">What’s free</a>
        </div>
        <span className="spacer" />
        <ThemeSwitch compact />
        <Link className="btn btn--ghost btn--sm" to="/login">Sign in</Link>
        <Link className="btn btn--primary btn--sm" to="/signup">Create account</Link>
      </nav>

      <header className="hero">
        <div className="badge badge--accent" style={{ margin: '0 auto var(--space-5)' }}>
          <span className="dot" /> Every essential feature is free
        </div>
        <h1>
          Learn technology the way it is
          <br className="hero__break" /> actually practised — then prove it.
        </h1>
        <p className="hero__sub">
          Lumen is one place to study structured curricula, run real code, ask an AI tutor that cites your lesson,
          drill aptitude, build projects and track the whole journey. No paywall on the learning.
        </p>
        <div className="hero__cta">
          <Link className="btn btn--primary btn--lg" to="/signup">
            Start learning free <ArrowRight />
          </Link>
          <Link className="btn btn--lg" to="/login">
            Sign in
          </Link>
        </div>
        <p className="tiny muted" style={{ marginTop: 'var(--space-4)' }}>
          Email and password only. No card, no trial clock.
        </p>
      </header>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="stat-strip">
          <div className="stat">
            <div className="stat__value">{stats ? stats.courses : '—'}</div>
            <div className="stat__label">Courses</div>
          </div>
          <div className="stat">
            <div className="stat__value">{stats ? stats.lessons : '—'}</div>
            <div className="stat__label">Lessons</div>
          </div>
          <div className="stat">
            <div className="stat__value">{stats ? stats.exercises : '—'}</div>
            <div className="stat__label">Coding exercises</div>
          </div>
          <div className="stat">
            <div className="stat__value">{stats ? stats.aptitudeQuestions : '—'}</div>
            <div className="stat__label">Aptitude questions</div>
          </div>
          <div className="stat">
            <div className="stat__value">{stats ? stats.projects : '—'}</div>
            <div className="stat__label">Guided projects</div>
          </div>
        </div>
        <p className="tiny muted" style={{ marginTop: 'var(--space-3)' }}>
          Counts are read live from the course catalogue in this deployment.
        </p>
      </section>

      <section className="section" id="features">
        <h2 className="section__title">One platform, the whole loop</h2>
        <p className="section__sub" style={{ marginBottom: 'var(--space-6)' }}>
          Most learners lose months stitching together a course site, a code playground, an AI chat window and a
          spreadsheet of progress. Lumen keeps them in one place and shares the context between them.
        </p>
        <div className="grid grid--3">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div className="feature" key={f.title}>
                <Icon aria-hidden="true" />
                <div className="feature__title">{f.title}</div>
                <p className="feature__body">{f.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="section" id="journey">
        <h2 className="section__title">Learn → Understand → Practise → Build → Evaluate → Improve</h2>
        <p className="section__sub" style={{ marginBottom: 'var(--space-6)' }}>
          The six stages are the product structure, not a slogan: each course module moves through them, and your
          analytics feed the last one back into the first.
        </p>
        <div className="grid grid--3">
          {JOURNEY.map((step, index) => {
            const Icon = step.icon;
            return (
              <div className="card card--tight" key={step.label}>
                <div className="row" style={{ gap: 10, marginBottom: 8 }}>
                  <span className="badge">{String(index + 1).padStart(2, '0')}</span>
                  <Icon aria-hidden="true" style={{ width: 16, height: 16, color: 'var(--accent)' }} />
                  <span className="strong">{step.label}</span>
                </div>
                <p className="small muted">{step.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="section" id="free">
        <div className="card" style={{ padding: 'var(--space-7)' }}>
          <div className="grid grid--2" style={{ alignItems: 'center', gap: 'var(--space-6)' }}>
            <div>
              <h2 className="section__title">Free means the learning features</h2>
              <p className="section__sub" style={{ marginTop: 'var(--space-3)' }}>
                All twelve courses, the coding lab, the AI tutor, aptitude practice, community discussions, projects
                and your analytics are available without payment. There is no locked lesson and no watermark on your
                progress.
              </p>
              <div className="stack stack-2" style={{ marginTop: 'var(--space-5)' }}>
                {[
                  'Twelve full course tracks with exercises and projects',
                  'Sandboxed code execution with real test results',
                  'AI tutor that cites the lesson it answers from',
                  'Aptitude sets with explanations and timing',
                  'Community threads with accepted answers',
                  'Personal analytics, streak and weekly plan',
                ].map((line) => (
                  <div className="row" key={line} style={{ gap: 10, alignItems: 'flex-start' }}>
                    <CheckCircle2 aria-hidden="true" style={{ width: 16, height: 16, color: 'var(--success)', marginTop: 3, flexShrink: 0 }} />
                    <span className="small">{line}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="stack stack-4">
              <div className="callout">
                <ShieldCheck aria-hidden="true" />
                <div>
                  <div className="strong" style={{ marginBottom: 4 }}>Honest by design</div>
                  <p className="small muted">
                    When a dependency is not configured — an AI provider key, an SMTP server, a stronger sandbox — the
                    product tells you on screen. It never fakes a successful answer.
                  </p>
                </div>
              </div>
              <Link className="btn btn--primary btn--lg btn--block" to="/signup">
                Create your free account <ArrowRight />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="mfooter">
        <div className="row row--between row--wrap" style={{ maxWidth: 'var(--content-max)', margin: '0 auto' }}>
          <span>Lumen — a free technology learning platform.</span>
          <span className="row" style={{ gap: 'var(--space-4)' }}>
            <Link to="/login">Sign in</Link>
            <Link to="/signup">Create account</Link>
            <a href="#features">Platform</a>
          </span>
        </div>
      </footer>
    </div>
  );
}
