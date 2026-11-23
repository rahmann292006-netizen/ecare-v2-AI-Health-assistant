import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="page page--narrow" style={{ paddingTop: 'var(--space-9)' }}>
      <div className="center">
        <Compass aria-hidden="true" style={{ width: 28, height: 28, margin: '0 auto var(--space-4)', color: 'var(--faint)' }} />
        <h1>Page not found</h1>
        <p className="muted" style={{ marginTop: 'var(--space-3)' }}>
          That address does not exist in Lumen. It may have moved, or the link may be incomplete.
        </p>
        <div className="row" style={{ justifyContent: 'center', marginTop: 'var(--space-5)' }}>
          <Link className="btn btn--primary" to="/dashboard">Go to dashboard</Link>
          <Link className="btn" to="/">Back to home</Link>
        </div>
      </div>
    </div>
  );
}
