import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, Circle, ArrowRight, Info, Award, AlertCircle } from 'lucide-react';
import { get, put } from '../lib/api.js';
import { useToast } from '../components/AppShell.jsx';
import { AppShell, PageHead, Loading, ErrorState, Progress } from '../components/AppShell.jsx';

const STATE_LABEL = {
  evidenced: 'Evidenced',
  demonstrated: 'Demonstrated',
  not_demonstrated: 'Not demonstrated',
};
const STATE_HINT = {
  evidenced: 'Two kinds of passed evidence — an assessment plus a project, for example.',
  demonstrated: 'One kind of passed evidence. Another kind would confirm it.',
  not_demonstrated: 'Nothing passed yet. Watching lessons, streaks and tutor chats do not count.',
};

const BAND_LABEL = {
  exploring: 'Exploring',
  developing: 'Developing',
  practising: 'Practising',
  portfolio_ready: 'Portfolio-ready',
};

/** Job-readiness evidence for one course. */
export default function Competencies() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState(null);
  const [repo, setRepo] = useState({});
  const toast = useToast();

  const load = useCallback(() => {
    setError(null);
    Promise.all([get(`/competencies/courses/${slug}`), get(`/competencies/courses/${slug}/projects`)])
      .then(([d, p]) => {
        setData(d);
        setProjects(p.projects);
        setRepo(Object.fromEntries(p.projects.map((x) => [x.slug, x.repoUrl || ''])));
      })
      .catch(setError);
  }, [slug]);

  const saveProject = async (p, patch) => {
    try {
      await put(`/competencies/courses/${slug}/projects/${p.slug}`, { status: p.status, repoUrl: repo[p.slug] || null, ...patch });
      toast.push('Saved. Evidence is recorded from your real results only.', 'success');
      load();
    } catch (err) {
      toast.push(err.message, 'danger');
    }
  };

  useEffect(load, [load]);

  if (error) return <AppShell title="Readiness"><div className="page"><ErrorState error={error} onRetry={load} /></div></AppShell>;
  if (!data) return <AppShell title="Readiness"><div className="page"><Loading rows={3} height={110} /></div></AppShell>;

  const r = data.readiness;

  return (
    <AppShell title="Readiness">
      <div className="page stack stack-6">
        <PageHead
          eyebrow="Evidence, not attendance"
          title={`${data.course.title} — job readiness`}
          sub="A competency counts only when something you did was checked: an assessment you passed, or a project you shipped with a repository link."
          actions={<Link className="btn" to={`/courses/${slug}`}>Course</Link>}
        />

        {!r.available ? (
          <div className="notice" role="status">
            <AlertCircle aria-hidden="true" style={{ width: 16, height: 16, flexShrink: 0 }} />
            <span className="small">{r.reason}</span>
          </div>
        ) : (
          <>
            <div className="grid grid--3">
              <div className="card card--tight">
                <div className="tiny muted">Readiness</div>
                <div className="strong" style={{ fontSize: 26, marginTop: 4 }}>{r.percent}%</div>
                <div className="tiny muted">{BAND_LABEL[r.band]}</div>
                <Progress value={r.percent} />
              </div>
              <div className="card card--tight">
                <div className="tiny muted">Demonstrated</div>
                <div className="strong" style={{ fontSize: 26, marginTop: 4 }}>{r.demonstrated}<span className="muted" style={{ fontSize: 14 }}> / {r.total}</span></div>
                <div className="tiny muted">competencies with at least one passed check</div>
              </div>
              <div className="card card--tight">
                <div className="tiny muted">Evidenced</div>
                <div className="strong" style={{ fontSize: 26, marginTop: 4 }}>{r.evidenced}</div>
                <div className="tiny muted">confirmed by two different kinds of evidence</div>
              </div>
            </div>

            <div className="card card--flush">
              <div style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--border)' }}>
                <div className="card__title">Competencies</div>
                <div className="card__hint">
                  Readiness is weighted: core competencies count double. “Portfolio-ready” is the highest label —
                  it is not a job guarantee.
                </div>
              </div>
              {r.items.map((item) => (
                <div key={item.key} style={{ padding: 'var(--space-3) var(--space-5)', borderBottom: '1px solid var(--border)' }}>
                  <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
                    {item.state === 'not_demonstrated' ? (
                      <Circle aria-hidden="true" style={{ width: 15, height: 15, color: 'var(--border-strong)', flexShrink: 0, marginTop: 3 }} />
                    ) : (
                      <CheckCircle2
                        aria-hidden="true"
                        style={{ width: 16, height: 16, color: item.state === 'evidenced' ? 'var(--success)' : 'var(--accent)', flexShrink: 0, marginTop: 2 }}
                      />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                        <span className="small strong">{item.title}</span>
                        {item.weight === 'core' && <span className="badge">Core</span>}
                        {item.role === 'capstone' && <span className="badge"><Award style={{ width: 11, height: 11 }} aria-hidden="true" /> Capstone</span>}
                      </div>
                      <div className="tiny muted" style={{ marginTop: 2, lineHeight: 1.55 }}>{item.description}</div>
                      <div className="tiny" style={{ marginTop: 4, color: 'var(--text-tertiary)' }}>{STATE_HINT[item.state]}</div>
                    </div>
                    <span className="badge" style={{ flexShrink: 0 }}>{STATE_LABEL[item.state]}</span>
                  </div>
                </div>
              ))}
            </div>

            {projects.length > 0 && (
              <div className="card card--flush">
                <div style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--border)' }}>
                  <div className="card__title">Your projects</div>
                  <div className="card__hint">A finished project counts as evidence only when a repository link is added.</div>
                </div>
                {projects.map((p) => (
                  <div key={p.slug} style={{ padding: 'var(--space-3) var(--space-5)', borderBottom: '1px solid var(--border)' }}>
                    <div className="row row--between" style={{ gap: 10, flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 220 }}>
                        <div className="small strong">{p.title}</div>
                        <div className="tiny muted" style={{ marginTop: 2 }}>{p.estHours}h · {p.difficulty}</div>
                      </div>
                      <span className="badge">{p.status}</span>
                    </div>
                    <div className="row" style={{ gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                      <input
                        className="input"
                        style={{ flex: 1, minWidth: 220 }}
                        placeholder="https://github.com/you/project"
                        value={repo[p.slug] || ''}
                        onChange={(e) => setRepo({ ...repo, [p.slug]: e.target.value })}
                        aria-label={`Repository link for ${p.title}`}
                      />
                      <button className="btn btn--sm" onClick={() => saveProject(p, { status: 'building' })}>Building</button>
                      <button className="btn btn--sm btn--primary" onClick={() => saveProject(p, { status: 'done' })}>Mark done</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="card">
              <div className="card__title row" style={{ gap: 6 }}>
                <Info style={{ width: 15, height: 15 }} aria-hidden="true" /> What does not count
              </div>
              <ul className="small" style={{ margin: '8px 0 0', paddingLeft: '1.05rem', color: 'var(--text-secondary)', display: 'grid', gap: 5 }}>
                <li>Lessons opened, time on the platform, streaks and badges.</li>
                <li>Questions asked in the AI tutor — helpful, but not evidence of skill.</li>
                <li>Projects without a repository link: a project counts when someone can read the code.</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
