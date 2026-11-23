import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { post } from '../lib/api.js';
import { AuthLayout } from '../components/AuthLayout.jsx';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState({ status: 'idle', message: '', devUrl: '' });

  useEffect(() => {
    document.title = 'Reset your password — Lumen';
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setState({ status: 'busy', message: '', devUrl: '' });
    try {
      const data = await post('/auth/forgot-password', { email });
      setState({ status: 'sent', message: data.message || 'If that email has an account, a reset link is on its way.', devUrl: data.devResetUrl || '' });
    } catch (err) {
      setState({ status: 'error', message: err.message, devUrl: '' });
    }
  };

  return (
    <AuthLayout
      title="Reset your password"
      sub="Enter the email on your account and we will send a single-use reset link."
      footer={<Link to="/login" className="small row" style={{ gap: 6, color: 'var(--accent)' }}><ArrowLeft style={{ width: 14, height: 14 }} /> Back to sign in</Link>}
    >
      <form className="stack stack-4" onSubmit={submit} noValidate>
        {state.status === 'error' && (
          <div className="callout callout--danger" role="alert"><AlertCircle aria-hidden="true" /><span>{state.message}</span></div>
        )}
        {state.status === 'sent' && (
          <div className="callout callout--accent" role="status"><CheckCircle2 aria-hidden="true" /><span>{state.message}</span></div>
        )}
        <div className="field">
          <label className="label" htmlFor="email">Email</label>
          <input id="email" className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
        </div>
        <button className="btn btn--primary btn--lg btn--block" disabled={state.status === 'busy'}>
          {state.status === 'busy' ? 'Sending…' : 'Send reset link'}
        </button>
        {state.devUrl && (
          <div className="callout">
            <CheckCircle2 aria-hidden="true" />
            <div>
              <div className="strong" style={{ marginBottom: 4 }}>Development mode</div>
              <p className="small muted">No SMTP server is configured, so the email was written to the outbox. You can open the link directly:</p>
              <a href={state.devUrl} className="small" style={{ color: 'var(--accent)', wordBreak: 'break-all' }}>{state.devUrl}</a>
            </div>
          </div>
        )}
      </form>
    </AuthLayout>
  );
}
