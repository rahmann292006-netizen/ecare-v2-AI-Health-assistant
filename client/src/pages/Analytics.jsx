import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar,
} from 'recharts';
import { BarChart3, Flame, Clock, BookOpen, Terminal, TrendingUp, Compass } from 'lucide-react';
import { AppShell, PageHead, Loading, ErrorState, Progress, Empty } from '../components/AppShell.jsx';
import { useTheme } from '../lib/auth.jsx';
import { get } from '../lib/api.js';
import { minutes, percent } from '../lib/format.js';

function ChartCard({ title, hint, children, action }) {
  return (
    <div className="card">
      <div className="card__head">
        <div>
          <div className="card__title">{title}</div>
          {hint && <div className="card__hint">{hint}</div>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export default function Analytics() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const { resolved } = useTheme();

  const load = useCallback(() => {
    setError(null);
    get('/analytics/overview').then(setData).catch(setError);
  }, []);

  useEffect(() => {
    document.title = 'Analytics — Lumen';
    load();
  }, [load]);

  const axisColor = resolved === 'dark' ? '#9A968F' : '#6B6862';
  const gridColor = resolved === 'dark' ? '#2A2B2E' : '#E6E3DB';
  const accent = resolved === 'dark' ? '#E08A3C' : '#B4561E';
  const tooltipStyle = {
    background: resolved === 'dark' ? '#191A1C' : '#FFFFFF',
    border: `1px solid ${gridColor}`,
    borderRadius: 8,
    fontSize: 12,
    color: resolved === 'dark' ? '#EDEBE7' : '#1C1B19',
  };

  return (
    <AppShell title="Analytics">
      <div className="page">
        <PageHead
          eyebrow="Improve"
          title="Your learning analytics"
          sub="Everything on this page is computed from your own activity — lessons completed, code runs, practice answers and study minutes. Nothing is estimated."
        />

        {error && <ErrorState error={error} onRetry={load} />}
        {!data && !error && <Loading rows={4} height={110} />}

        {data && data.empty && (
          <div className="card">
            <Empty
              icon={BarChart3}
              title="No data yet"
              action={<Link to="/courses" className="btn btn--primary btn--sm">Start a course</Link>}
            >
              Complete a lesson, run some code or take an aptitude set and this page fills in with real numbers.
            </Empty>
          </div>
        )}

        {data && !data.empty && (
          <div className="stack stack-5">
            <div className="grid grid--4">
              <div className="card card--tight">
                <div className="tiny muted" style={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Streak</div>
                <div style={{ fontSize: 'var(--step-3)', fontWeight: 600 }}>{data.streak.current} d</div>
                <div className="tiny muted"><Flame style={{ width: 10, height: 10, display: 'inline' }} /> best {data.streak.longest} d</div>
              </div>
              <div className="card card--tight">
                <div className="tiny muted" style={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>This week</div>
                <div style={{ fontSize: 'var(--step-3)', fontWeight: 600 }}>{minutes(data.week.totalMinutes)}</div>
                <div className="tiny muted"><Clock style={{ width: 10, height: 10, display: 'inline' }} /> goal {minutes(data.week.goalMinutes)}</div>
              </div>
              <div className="card card--tight">
                <div className="tiny muted" style={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Lessons</div>
                <div style={{ fontSize: 'var(--step-3)', fontWeight: 600 }}>{data.totals.lessons}</div>
                <div className="tiny muted"><BookOpen style={{ width: 10, height: 10, display: 'inline' }} /> {data.totals.coursesCompleted} courses finished</div>
              </div>
              <div className="card card--tight">
                <div className="tiny muted" style={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Lab</div>
                <div style={{ fontSize: 'var(--step-3)', fontWeight: 600 }}>{data.lab.runs}</div>
                <div className="tiny muted"><Terminal style={{ width: 10, height: 10, display: 'inline' }} /> {data.lab.solved} exercises solved</div>
              </div>
            </div>

            <ChartCard title="Study minutes" hint={`Last ${data.range.days} days, from completed activity`}>
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.series} margin={{ top: 4, right: 4, bottom: 0, left: -22 }}>
                    <CartesianGrid stroke={gridColor} strokeDasharray="2 4" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: axisColor }} tickLine={false} axisLine={{ stroke: gridColor }} tickFormatter={(d) => d.slice(5)} interval={Math.floor(data.series.length / 6)} />
                    <YAxis tick={{ fontSize: 10, fill: axisColor }} tickLine={false} axisLine={false} width={40} />
                    <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: axisColor }} formatter={(value) => [`${value} min`, 'Studied']} />
                    <Area type="monotone" dataKey="minutes" stroke={accent} strokeWidth={1.6} fill={accent} fillOpacity={resolved === 'dark' ? 0.14 : 0.1} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <div className="dash-grid">
              <div className="stack stack-5">
                <ChartCard title="Course progress" hint="Only courses you are enrolled in">
                  {data.perCourse.length === 0 ? (
                    <p className="small muted">No enrolments yet.</p>
                  ) : (
                    <div className="stack stack-4">
                      {data.perCourse.map((c) => (
                        <div key={c.slug}>
                          <div className="row row--between" style={{ marginBottom: 4 }}>
                            <Link to={`/courses/${c.slug}`} className="small">{c.title}</Link>
                            <span className="tiny muted">{c.completed}/{c.total} · {percent(c.percent)}</span>
                          </div>
                          <Progress value={c.percent} />
                        </div>
                      ))}
                    </div>
                  )}
                </ChartCard>

                <ChartCard title="Aptitude accuracy" hint="Answered questions per topic">
                  {data.aptitude.length === 0 ? (
                    <p className="small muted">No aptitude attempts yet.</p>
                  ) : (
                    <div style={{ height: Math.max(160, data.aptitude.length * 42) }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.aptitude} layout="vertical" margin={{ top: 0, right: 24, bottom: 0, left: 8 }}>
                          <CartesianGrid stroke={gridColor} strokeDasharray="2 4" horizontal={false} />
                          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: axisColor }} tickLine={false} axisLine={false} unit="%" />
                          <YAxis type="category" dataKey="title" tick={{ fontSize: 11, fill: axisColor }} tickLine={false} axisLine={false} width={130} />
                          <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: axisColor }} formatter={(value) => [`${value}%`, 'Accuracy']} />
                          <Bar dataKey="accuracy" fill={accent} radius={[0, 4, 4, 0]} barSize={14} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </ChartCard>
              </div>

              <div className="stack stack-5">
                <ChartCard title="By category" hint="Completion share across enrolled tracks">
                  {data.categories.length === 0 ? (
                    <p className="small muted">Enrol in a course to see this.</p>
                  ) : (
                    <div className="stack stack-3">
                      {data.categories.map((c) => (
                        <div key={c.category}>
                          <div className="row row--between" style={{ marginBottom: 4 }}>
                            <span className="tiny">{c.category}</span>
                            <span className="tiny muted">{percent(c.percent)}</span>
                          </div>
                          <Progress value={c.percent} />
                        </div>
                      ))}
                    </div>
                  )}
                </ChartCard>

                <ChartCard title="Checkpoints" hint="Timed assessments you have taken">
                  {data.assessments.length === 0 ? (
                    <p className="small muted">No checkpoint attempts recorded.</p>
                  ) : (
                    <table className="table">
                      <thead><tr><th>Assessment</th><th>Score</th></tr></thead>
                      <tbody>
                        {data.assessments.slice(0, 8).map((a, i) => (
                          // Each row is a stored submission; `percent` is computed on the server.
                          <tr key={i}>
                            <td>
                              <div className="small">{a.title}</div>
                              <div className="tiny muted">{a.course_title}</div>
                            </td>
                            <td className={a.passed ? '' : 'muted'}>{a.percent}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </ChartCard>

                <div className="card card--tight">
                  <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
                    <TrendingUp aria-hidden="true" style={{ width: 15, height: 15, color: 'var(--accent)', marginTop: 3 }} />
                    <div>
                      <div className="small strong">What to do next</div>
                      <p className="tiny muted" style={{ marginTop: 2 }}>
                        Recommendations on your dashboard are generated from these numbers, each with the reason it
                        appeared.
                      </p>
                      <Link to="/dashboard" className="btn btn--sm" style={{ marginTop: 8 }}><Compass /> Open dashboard</Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
