import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Mail, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '../lib/auth.jsx';
import { AuthLayout } from '../components/AuthLayout.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = 'Sign in — Lumen';
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(form);
      navigate(location.state?.from || '/dashboard', { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout title="Sign in to Lumen" sub="Pick up where you stopped. Your progress, notes and streak are waiting.">
      <form className="stack stack-4" onSubmit={submit} noValidate>
        {error && (
          <div className="callout callout--danger" role="alert">
            <AlertCircle aria-hidden="true" />
            <span>{error.message}</span>
          </div>
        )}

        <div className="field">
          <label className="label" htmlFor="email">Email</label>
          <div style={{ position: 'relative' }}>
            <Mail aria-hidden="true" style={{ position: 'absolute', left: 10, top: 11, width: 15, height: 15, color: 'var(--faint)' }} />
            <input
              id="email"
              className={`input ${error?.fields?.email ? 'input--error' : ''}`}
              type="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              style={{ paddingLeft: 32 }}
              placeholder="you@example.com"
            />
          </div>
          {error?.fields?.email && <span className="error-text">{error.fields.email}</span>}
        </div>

        <div className="field">
          <div className="row row--between">
            <label className="label" htmlFor="password">Password</label>
            <Link to="/forgot-password" className="tiny" style={{ color: 'var(--accent)' }}>Forgot password?</Link>
          </div>
          <div style={{ position: 'relative' }}>
            <Lock aria-hidden="true" style={{ position: 'absolute', left: 10, top: 11, width: 15, height: 15, color: 'var(--faint)' }} />
            <input
              id="password"
              className={`input ${error?.fields?.password ? 'input--error' : ''}`}
              type="password"
              autoComplete="current-password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              style={{ paddingLeft: 32 }}
              placeholder="Your password"
            />
          </div>
          {error?.fields?.password && <span className="error-text">{error.fields.password}</span>}
        </div>

        <button className="btn btn--primary btn--lg btn--block" type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'} {!busy && <ArrowRight />}
        </button>

        <p className="small muted center">
          New to Lumen? <Link to="/signup" style={{ color: 'var(--accent)' }}>Create a free account</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
