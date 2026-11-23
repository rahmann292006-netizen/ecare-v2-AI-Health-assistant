import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { post } from '../lib/api.js';
import { AuthLayout } from '../components/AuthLayout.jsx';
import { useAuth } from '../lib/auth.jsx';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [state, setState] = useState({ status: token ? 'busy' : 'missing', message: '' });
  const { refresh, isAuthed } = useAuth();

  useEffect(() => {
    document.title = 'Verify your email — Lumen';
    if (!token) return;
    post('/auth/verify-email', { token })
      .then((data) => {
        setState({ status: 'done', message: data.message || 'Your email is confirmed.' });
        refresh();
      })
      .catch((err) => setState({ status: 'error', message: err.message }));
  }, [token, refresh]);

  return (
    <AuthLayout title="Email verification" sub="Confirming the address on your account.">
      <div className="stack stack-4">
        {state.status === 'busy' && (
          <div className="callout"><Loader2 aria-hidden="true" className="spin" /><span>Confirming your link…</span></div>
        )}
        {state.status === 'done' && (
          <div className="callout callout--accent"><CheckCircle2 aria-hidden="true" /><span>{state.message}</span></div>
        )}
        {state.status === 'error' && (
          <div className="callout callout--danger"><AlertCircle aria-hidden="true" /><span>{state.message}</span></div>
        )}
        {state.status === 'missing' && (
          <div className="callout callout--warning"><AlertCircle aria-hidden="true" /><span>This page needs a verification token from your email.</span></div>
        )}
        <Link to={isAuthed ? '/dashboard' : '/login'} className="btn btn--primary btn--block">
          {isAuthed ? 'Go to dashboard' : 'Go to sign in'}
        </Link>
      </div>
    </AuthLayout>
  );
}
