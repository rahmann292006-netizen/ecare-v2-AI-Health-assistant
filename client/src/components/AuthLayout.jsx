import { Link } from 'react-router-dom';
import { BookOpen, Terminal, Sparkles, CheckCircle2 } from 'lucide-react';
import { ThemeSwitch } from './AppShell.jsx';

const POINTS = [
  { icon: BookOpen, text: '12 course tracks, 77 lessons, exercises and projects' },
  { icon: Terminal, text: 'A sandboxed lab that runs your code and your tests' },
  { icon: Sparkles, text: 'An AI tutor that cites the lesson it answers from' },
];

export function AuthLayout({ title, sub, children, footer }) {
  return (
    <div className="auth">
      <div className="auth__card">
        <div style={{ width: '100%', maxWidth: 380 }}>
          <div className="row row--between" style={{ marginBottom: 'var(--space-6)' }}>
            <Link to="/" className="row" style={{ gap: 10 }}>
              <span className="brand-mark">L</span>
              <span className="brand-name">Lumen</span>
            </Link>
            <ThemeSwitch compact />
          </div>
          <h1 style={{ fontSize: 'var(--step-3)' }}>{title}</h1>
          {sub && <p className="small muted" style={{ marginTop: 'var(--space-2)', marginBottom: 'var(--space-5)' }}>{sub}</p>}
          <div style={{ marginTop: 'var(--space-5)' }}>{children}</div>
          {footer && <div style={{ marginTop: 'var(--space-5)' }}>{footer}</div>}
        </div>
      </div>
      <aside className="auth__aside">
        <div className="page__eyebrow">The platform</div>
        <h2 style={{ fontSize: 'var(--step-3)', maxWidth: '24ch', lineHeight: 1.25 }}>
          Everything you need to go from curious to competent.
        </h2>
        <div className="stack stack-4" style={{ marginTop: 'var(--space-4)' }}>
          {POINTS.map((p) => {
            const Icon = p.icon;
            return (
              <div className="row" key={p.text} style={{ gap: 12, alignItems: 'flex-start' }}>
                <span className="badge" style={{ width: 26, height: 26, borderRadius: 7, justifyContent: 'center', padding: 0, flexShrink: 0 }}>
                  <Icon aria-hidden="true" style={{ width: 14, height: 14 }} />
                </span>
                <span className="small" style={{ color: 'var(--text-secondary)' }}>{p.text}</span>
              </div>
            );
          })}
        </div>
        <div className="callout" style={{ marginTop: 'var(--space-6)' }}>
          <CheckCircle2 aria-hidden="true" />
          <span className="small">Free to use. No card, no trial clock, no locked lessons.</span>
        </div>
      </aside>
    </div>
  );
}
