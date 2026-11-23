import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Flame, Target, Clock, BookOpen, Terminal, Brain, Sparkles, Award,
  TrendingUp, Compass, CalendarDays, Quote,
} from 'lucide-react';
import { AppShell, PageHead, Progress, Loading, ErrorState, Empty } from '../components/AppShell.jsx';
import { useAuth } from '../lib/auth.jsx';
import { get } from '../lib/api.js';
import { minutes, relative, weekdayLabel, percent } from '../lib/format.js';

function greeting() {
  const hour = new Date().getHours();
  if (hour < 5) return 'Still up';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Good evening';
}

function StatCard({ icon: Icon, label, value, hint }) {
  return (
    <div className="card card--tight">
      <div className="row row--between" style={{ marginBottom: 6 }}>
        <span className="tiny muted" style={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{label}</span>
        <Icon aria-hidden="true" style={{ width: 15, height: 15, color: 'var(--faint)' }} />
      </div>
      <div style={{ fontSize: 'var(--step-3)', fontWeight: 600, letterSpacing: '-0.02em' }}>{value}</div>
      {hint && <div className="tiny muted" style={{ marginTop: 2 }}>{hint}</div>}
    </div>
  );
}

function WeekChart({ week }) {
  const days = week?.days || [];
  const max = Math.max(1, ...days.map((d) => d.minutes));
  const goal = week?.goalMinutes || 300;
  return (
    <div>
      <div className="row" style={{ alignItems: 'flex-end', gap: 8, height: 108 }}>
        {days.map((d) => {
          const height = Math.round((d.minutes / max) * 84);
          return (
            <div key={d.day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <span className="tiny muted" style={{ fontSize: 10 }}>{d.minutes ? d.minutes : ''}</span>
              <div
                title={`${d.minutes} minutes on ${d.day}`}
                style={{
                  width: '100%', height: Math.max(3, height), borderRadius: 4,
                  background: d.minutes ? 'var(--accent)' : 'var(--bg-subtle)',
                  transition: 'height 240ms var(--ease)',
                }}
              />
              <span className="tiny muted" style={{ fontSize: 10 }}>{weekdayLabel(d.day).slice(0, 2)}</span>
            </div>
          );
        })}
      </div>
      <div className="row row--between" style={{ marginTop: 'var(--space-4)' }}>
        <span className="tiny muted">{minutes(week?.totalMinutes || 0)} this week</span>
        <span className="tiny muted">Goal {minutes(goal)}</span>
      </div>
      <div style={{ marginTop: 6 }}>
        <Progress value={Math.min(100, ((week?.totalMinutes || 0) / goal) * 100)} success={(week?.totalMinutes || 0) >= goal} />
      </div>
    </div>
  );
}

const ACTIVITY_LABEL = {
  lesson_completed: 'Completed a lesson',
  exercise_run: 'Ran code in the lab',
  exercise_submitted: 'Submitted an exercise',
  assessment_submitted: 'Took a checkpoint',
  aptitude_attempt: 'Practised aptitude',
  post_created: 'Posted in the community',
  answer_accepted: 'Had an answer accepted',
  enrolled: 'Enrolled in a course',
  ai_question: 'Asked the AI tutor',
};

export default function Dashboard() {
  const { profile } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setError(null);
    get('/learning/dashboard').then(setData).catch(setError);
  }, []);

  useEffect(() => {
    document.title = 'Dashboard — Lumen';
    load();
  }, [load]);

  return (
    <AppShell title="Dashboard">
      <div className="page">
        {error && <ErrorState error={error} onRetry={load} />}
        {!data && !error && <Loading rows={4} height={90} />}

        {data && (
          <div className="stack stack-6">
            <div>
              <div className="page__eyebrow">{new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</div>
              <h1 className="page__title">
                {greeting()}, {String(data.greetingName || profile?.displayName || '').split(' ')[0]}
              </h1>
              <p className="page__sub">
                {data.continueLearning.length
                  ? 'Your next lesson is ready. Pick up where you stopped.'
                  : 'You are enrolled in nothing yet — the catalogue is open, and every course is free.'}
              </p>
            </div>

            {/* daily motivation */}
            {data.motivation && (
              <div className="card" style={{ borderLeft: '3px solid var(--accent)' }}>
                <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
                  <Quote aria-hidden="true" style={{ width: 16, height: 16, color: 'var(--accent)', marginTop: 4, flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: 'var(--step-1)', lineHeight: 1.6, color: 'var(--text)' }}>{data.motivation.text}</p>
                    <div className="tiny muted" style={{ marginTop: 8 }}>
                      {data.motivation.author ? `— ${data.motivation.author}` : 'Daily note'}
                      {data.motivation.tone ? ` · ${data.motivation.tone}` : ''}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* stats */}
            <div className="grid grid--4">
              <StatCard icon={Flame} label="Streak" value={`${data.streak.current || 0} ${data.streak.current === 1 ? 'day' : 'days'}`} hint={data.streak.longest ? `Best ${data.streak.longest} days` : 'Study today to start it'} />
              <StatCard icon={Clock} label="This week" value={minutes(data.week.totalMinutes || 0)} hint={`Goal ${minutes(data.week.goalMinutes || 300)}`} />
              <StatCard icon={BookOpen} label="Lessons done" value={data.counts.lessons} hint={`${data.enrolledCount} course${data.enrolledCount === 1 ? '' : 's'} enrolled`} />
              <StatCard icon={Terminal} label="Lab runs" value={data.counts.runs} hint={`${data.counts.assessments} checkpoints taken`} />
            </div>

            <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1.55fr) minmax(0, 1fr)', alignItems: 'start' }}>
              {/* continue learning */}
              <div className="stack stack-5">
                <div className="card">
                  <div className="card__head">
                    <div>
                      <div className="card__title">Continue learning</div>
                      <div className="card__hint">Where you left off, most recent first.</div>
                    </div>
                    <Link to="/courses" className="btn btn--sm">Catalogue <ArrowRight /></Link>
                  </div>

                  {data.continueLearning.length === 0 ? (
                    <Empty
                      icon={Compass}
                      title="No course in progress"
                      action={<Link to="/courses" className="btn btn--primary btn--sm">Browse the catalogue</Link>}
                    >
                      Twelve tracks are open — Python, DSA, full stack, GenAI, agentic AI, ML, deep learning,
                      cybersecurity, cloud, data science, databases and system design.
                    </Empty>
                  ) : (
                    <div className="stack stack-4">
                      {data.continueLearning.map((course) => (
                        <div key={course.slug} className="card card--tight card--interactive" style={{ background: 'var(--surface-2)' }}>
                          <div className="row row--between" style={{ alignItems: 'flex-start', gap: 12 }}>
                            <div style={{ minWidth: 0 }}>
                              <div className="row" style={{ gap: 8, marginBottom: 4 }}>
                                <span className="badge">{course.category}</span>
                                <span className="badge">{course.level}</span>
                              </div>
                              <Link to={`/courses/${course.slug}`} className="strong" style={{ fontSize: 'var(--step-1)' }}>{course.title}</Link>
                              {course.nextLesson && (
                                <p className="tiny muted" style={{ marginTop: 4 }}>
                                  Next: {course.nextLesson.title}
                                </p>
                              )}
                            </div>
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              <div className="small strong">{percent(course.progress)}</div>
                              <div className="tiny muted">{course.lessonsCompleted}/{course.lessonCount} lessons</div>
                            </div>
                          </div>
                          <div style={{ marginTop: 'var(--space-3)' }}>
                            <Progress value={course.progress} />
                          </div>
                          <div className="row" style={{ marginTop: 'var(--space-3)', gap: 8 }}>
                            {course.nextLesson ? (
                              <Link className="btn btn--primary btn--sm" to={`/courses/${course.slug}/${course.nextLesson.slug}`}>
                                Continue <ArrowRight />
                              </Link>
                            ) : (
                              <Link className="btn btn--sm" to={`/courses/${course.slug}`}>Open course</Link>
                            )}
                            <Link className="btn btn--ghost btn--sm" to={`/courses/${course.slug}`}>Course overview</Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* recommendations */}
                <div className="card">
                  <div className="card__head">
                    <div>
                      <div className="card__title">Recommended next</div>
                      <div className="card__hint">Built from what you have actually done — no guesswork.</div>
                    </div>
                    <Sparkles aria-hidden="true" style={{ width: 16, height: 16, color: 'var(--faint)' }} />
                  </div>
                  {data.recommendations.length === 0 ? (
                    <Empty icon={Sparkles} title="Nothing to recommend yet">
                      Finish a lesson or run some code and Lumen will suggest the next step with a reason.
                    </Empty>
                  ) : (
                    <div className="stack stack-3">
                      {data.recommendations.map((rec) => (
                        <div key={`${rec.kind}-${rec.target_slug}`} className="row" style={{ gap: 12, alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                          <TrendingUp aria-hidden="true" style={{ width: 15, height: 15, color: 'var(--accent)', marginTop: 3, flexShrink: 0 }} />
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <Link
                              to={rec.target_type === 'course' ? `/courses/${rec.target_slug}` : `/courses/${rec.target_slug}`}
                              className="small strong"
                            >
                              {rec.title}
                            </Link>
                            <p className="tiny muted" style={{ marginTop: 2 }}>{rec.reason}</p>
                          </div>
                          <ArrowRight aria-hidden="true" style={{ width: 14, height: 14, color: 'var(--faint)', marginTop: 4 }} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* right column */}
              <div className="stack stack-5">
                <div className="card">
                  <div className="card__head">
                    <div className="card__title">This week</div>
                    <CalendarDays aria-hidden="true" style={{ width: 15, height: 15, color: 'var(--faint)' }} />
                  </div>
                  <WeekChart week={data.week} />
                </div>

                <div className="card">
                  <div className="card__head">
                    <div className="card__title">Achievements</div>
                    <Award aria-hidden="true" style={{ width: 15, height: 15, color: 'var(--faint)' }} />
                  </div>
                  {data.achievements.length === 0 ? (
                    <Empty icon={Award} title="None yet">
                      Complete your first lesson to earn the first one.
                    </Empty>
                  ) : (
                    <div className="stack stack-3">
                      {data.achievements.map((a) => (
                        <div key={a.slug} className="row" style={{ gap: 10 }}>
                          <span className="badge badge--accent" style={{ width: 26, height: 26, justifyContent: 'center', padding: 0, borderRadius: 7 }}>
                            <Award aria-hidden="true" style={{ width: 13, height: 13 }} />
                          </span>
                          <div style={{ minWidth: 0 }}>
                            <div className="small strong">{a.title}</div>
                            <div className="tiny muted">{relative(a.awarded_at)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="card">
                  <div className="card__head">
                    <div className="card__title">Recent activity</div>
                    <Target aria-hidden="true" style={{ width: 15, height: 15, color: 'var(--faint)' }} />
                  </div>
                  {data.recentActivity.length === 0 ? (
                    <Empty icon={Target} title="No activity yet">
                      Your lessons, lab runs and practice will show up here.
                    </Empty>
                  ) : (
                    <div className="stack" style={{ gap: 10 }}>
                      {data.recentActivity.map((event, index) => (
                        <div key={index} className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
                          <span className="dot" style={{ marginTop: 7, color: 'var(--accent)' }} />
                          <div style={{ minWidth: 0 }}>
                            <div className="small">{ACTIVITY_LABEL[event.kind] || event.kind.replace(/_/g, ' ')}</div>
                            <div className="tiny muted">{relative(event.created_at)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="card card--tight">
                  <div className="stack stack-3">
                    <Link className="btn btn--block btn--sm" to="/aptitude"><Brain /> Practise aptitude</Link>
                    <Link className="btn btn--block btn--sm" to="/lab"><Terminal /> Open the coding lab</Link>
                    <Link className="btn btn--block btn--sm" to="/tutor"><Sparkles /> Ask the AI tutor</Link>
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
