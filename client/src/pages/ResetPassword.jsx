import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { post } from '../lib/api.js';
import { AuthLayout } from '../components/AuthLayout.jsx';
import { useAuth } from '../lib/auth.jsx';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const { refresh } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Choose a new password — Lumen';
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setError(null);
    if (form.password !== form.confirm) {
      setError({ message: 'The two passwords do not match.' });
      return;
    }
    setBusy(true);
    try {
      await post('/auth/reset-password', { token, password: form.password });
      setDone(true);
      await refresh();
      setTimeout(() => navigate('/dashboard', { replace: true }), 1200);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <AuthLayout title="Reset link missing" sub="This page needs a reset token from your email.">
        <div className="callout callout--warning"><AlertCircle aria-hidden="true" /><span>Open the link from your reset email, or request a new one.</span></div>
        <Link to="/forgot-password" className="btn btn--block" style={{ marginTop: 'var(--space-4)' }}>Request a new link</Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Choose a new password" sub="Pick something you have not used elsewhere.">
      <form className="stack stack-4" onSubmit={submit} noValidate>
        {error && <div className="callout callout--danger" role="alert"><AlertCircle aria-hidden="true" /><span>{error.message}</span></div>}
        {done && <div className="callout callout--accent" role="status"><CheckCircle2 aria-hidden="true" /><span>Password updated. Taking you to your dashboard…</span></div>}
        <div className="field">
          <label className="label" htmlFor="password">New password</label>
          <input id="password" className="input" type="password" required minLength={10} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="new-password" />
          <span className="hint">At least 10 characters, including a letter and a digit.</span>
        </div>
        <div className="field">
          <label className="label" htmlFor="confirm">Confirm new password</label>
          <input id="confirm" className="input" type="password" required value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} autoComplete="new-password" />
        </div>
        <button className="btn btn--primary btn--lg btn--block" disabled={busy}>{busy ? 'Updating…' : 'Update password'}</button>
      </form>
    </AuthLayout>
  );
}
