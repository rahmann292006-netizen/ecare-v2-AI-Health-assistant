import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { get, post } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { useToast } from '../components/AppShell.jsx';
import { formatDate } from '../lib/format.js';

const PHASE_LABEL = {
  upcoming: 'Registration opens soon',
  registration: 'Registration open',
  registered: 'Registered · opens soon',
  live: 'Live now',
  closed: 'Closed · results pending',
  published: 'Results published',
};

function Countdown({ target }) {
  const [left, setLeft] = useState(() => new Date(target).getTime() - Date.now());
  useEffect(() => {
    const id = setInterval(() => setLeft(new Date(target).getTime() - Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);
  if (left <= 0) return <span className="mono">starting now</span>;
  const s = Math.floor(left / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return (
    <span className="mono">
      {d > 0 ? `${d}d ` : ''}
      {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}:{String(sec).padStart(2, '0')}
    </span>
  );
}

export default function Events() {
  const { user } = useAuth();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    get('/competitions').then((d) => setData(d)).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function register(slug) {
    try {
      await post(`/competitions/${slug}/register`, {});
      toast.push('You are registered.', 'success');
      load();
    } catch (e) {
      toast.push(e.message, 'error');
    }
  }

  if (error) return <div className="page"><div className="empty"><h2>Events could not load</h2><p>{error}</p></div></div>;
  if (!data) return <div className="page"><div className="skeleton-block" /></div>;

  const groups = [
    { key: 'live', title: 'Live now', items: data.live },
    { key: 'open', title: 'Registration open', items: data.open },
    {
      key: 'other',
      title: 'Coming up and finished',
      items: data.events.filter((e) => !data.live.includes(e) && !data.open.includes(e)),
    },
  ].filter((g) => g.items.length);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Events</h1>
          <p className="muted">
            Timed quizzes and coding competitions. Everything is graded automatically and ranked on
            what you actually scored.
          </p>
        </div>
      </header>

      {!data.events.length && (
        <div className="empty">
          <h2>No events are open right now</h2>
          <p>New quizzes and competitions are announced here and in your notifications.</p>
        </div>
      )}

      {groups.map((group) => (
        <section key={group.key} className="stack">
          <h2 className="section-title">{group.title}</h2>
          <div className="card-grid">
            {group.items.map((e) => (
              <article key={e.slug} className="card event-card">
                <div className="event-card-top">
                  <span className={`pill pill-${e.phase === 'live' ? 'accent' : 'quiet'}`}>{PHASE_LABEL[e.phase] || e.phase}</span>
                  <span className="pill pill-quiet">{e.format === 'quiz' ? 'Quiz' : 'Code'}</span>
                </div>
                <h3>
                  <Link to={`/events/${e.slug}`}>{e.title}</Link>
                </h3>
                <p className="muted small">{e.summary}</p>
                <dl className="event-meta">
                  <div>
                    <dt>Starts</dt>
                    <dd>{e.startsAt ? formatDate(e.startsAt) : '—'}</dd>
                  </div>
                  <div>
                    <dt>Challenges</dt>
                    <dd>{e.challengeCount}</dd>
                  </div>
                  <div>
                    <dt>Registered</dt>
                    <dd>{e.participants}</dd>
                  </div>
                </dl>
                <div className="event-card-foot">
                  {e.phase === 'live' && e.startsAt && (
                    <span className="muted small">
                      closes in <Countdown target={e.endsAt} />
                    </span>
                  )}
                  {e.registered ? (
                    <span className="pill pill-ok">Registered</span>
                  ) : e.phase === 'registration' && user ? (
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => register(e.slug)}>
                      Register
                    </button>
                  ) : e.phase === 'registration' ? (
                    <Link className="btn btn-sm" to="/signin">
                      Sign in to register
                    </Link>
                  ) : null}
                  <Link className="btn btn-ghost btn-sm" to={`/events/${e.slug}`}>
                    Details
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export { Countdown, PHASE_LABEL };
