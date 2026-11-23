import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../lib/auth.jsx';
import { AuthLayout } from '../components/AuthLayout.jsx';

const LEVELS = [
  { id: 'beginner', label: 'Just starting' },
  { id: 'some', label: 'Some basics' },
  { id: 'intermediate', label: 'Comfortable coding' },
  { id: 'advanced', label: 'Experienced' },
];

function passwordScore(pw) {
  let score = 0;
  if (pw.length >= 10) score += 1;
  if (pw.length >= 14) score += 1;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score += 1;
  if (/\d/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;
  return Math.min(score, 4);
}

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ displayName: '', email: '', password: '', goal: '', experienceLevel: 'beginner' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = 'Create your account — Lumen';
  }, []);

  const score = passwordScore(form.password);

  const submit = async (event) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signup(form);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Create your free account"
      sub="Takes under a minute. Everything on Lumen stays free."
      footer={
        <p className="small muted center">
          Already have an account? <Link to="/login" style={{ color: 'var(--accent)' }}>Sign in</Link>
        </p>
      }
    >
      <form className="stack stack-4" onSubmit={submit} noValidate>
        {error && (
          <div className="callout callout--danger" role="alert">
            <AlertCircle aria-hidden="true" />
            <span>{error.message}</span>
          </div>
        )}

        <div className="field">
          <label className="label" htmlFor="name">Name</label>
          <input
            id="name"
            className={`input ${error?.fields?.displayName ? 'input--error' : ''}`}
            value={form.displayName}
            onChange={(e) => setForm({ ...form, displayName: e.target.value })}
            autoComplete="name"
            required
            minLength={2}
            placeholder="How should we address you?"
          />
          {error?.fields?.displayName && <span className="error-text">{error.fields.displayName}</span>}
        </div>

        <div className="field">
          <label className="label" htmlFor="email">Email</label>
          <input
            id="email"
            className={`input ${error?.fields?.email ? 'input--error' : ''}`}
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            autoComplete="email"
            required
            placeholder="you@example.com"
          />
          {error?.fields?.email && <span className="error-text">{error.fields.email}</span>}
        </div>

        <div className="field">
          <label className="label" htmlFor="password">Password</label>
          <input
            id="password"
            className={`input ${error?.fields?.password ? 'input--error' : ''}`}
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            autoComplete="new-password"
            required
            minLength={10}
            aria-describedby="pw-hint"
          />
          <div className="row" style={{ gap: 4, marginTop: 2 }} aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                style={{
                  height: 3,
                  flex: 1,
                  borderRadius: 999,
                  background: i < score ? (score <= 1 ? 'var(--danger)' : score === 2 ? 'var(--warning)' : 'var(--success)') : 'var(--border)',
                  transition: 'background 140ms ease',
                }}
              />
            ))}
          </div>
          <span className="hint" id="pw-hint">At least 10 characters, including a letter and a digit.</span>
          {error?.fields?.password && <span className="error-text">{error.fields.password}</span>}
        </div>

        <div className="field">
          <label className="label" htmlFor="goal">What do you want to learn first? <span className="muted">(optional)</span></label>
          <input
            id="goal"
            className="input"
            value={form.goal}
            onChange={(e) => setForm({ ...form, goal: e.target.value })}
            maxLength={120}
            placeholder="e.g. Python for data work, or backend engineering"
          />
        </div>

        <div className="field">
          <span className="label">Your current level</span>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
            {LEVELS.map((level) => {
              const active = form.experienceLevel === level.id;
              return (
                <button
                  key={level.id}
                  type="button"
                  onClick={() => setForm({ ...form, experienceLevel: level.id })}
                  className="btn"
                  aria-pressed={active}
                  style={active ? { borderColor: 'var(--accent)', background: 'var(--accent-soft)', color: 'var(--accent)' } : undefined}
                >
                  {active && <CheckCircle2 aria-hidden="true" />}
                  {level.label}
                </button>
              );
            })}
          </div>
        </div>

        <button className="btn btn--primary btn--lg btn--block" type="submit" disabled={busy}>
          {busy ? 'Creating account…' : 'Create account'} {!busy && <ArrowRight />}
        </button>
        <p className="tiny muted center">
          We store a salted hash of your password, never the password itself.
        </p>
      </form>
    </AuthLayout>
  );
}
