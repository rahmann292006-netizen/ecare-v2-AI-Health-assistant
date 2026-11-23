import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, BookOpen, ArrowRight, Filter } from 'lucide-react';
import { AppShell, PageHead, Progress, Loading, ErrorState, Empty } from '../components/AppShell.jsx';
import { get } from '../lib/api.js';
import { minutes, percent } from '../lib/format.js';

const LEVELS = ['All levels', 'Beginner', 'Intermediate', 'Advanced'];

export default function Courses() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [level, setLevel] = useState('All levels');

  const load = useCallback(() => {
    setError(null);
    get('/learning/courses').then(setData).catch(setError);
  }, []);

  useEffect(() => {
    document.title = 'Courses — Lumen';
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.courses.filter((c) => {
      if (category !== 'All' && c.category !== category) return false;
      if (level !== 'All levels' && c.level.toLowerCase() !== level.toLowerCase()) return false;
      if (!q) return true;
      return (
        c.title.toLowerCase().includes(q) ||
        c.tagline.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.outcomes.some((o) => o.toLowerCase().includes(q))
      );
    });
  }, [data, query, category, level]);

  const categories = data ? ['All', ...data.categories] : ['All'];

  return (
    <AppShell title="Courses">
      <div className="page">
        <PageHead
          eyebrow="Catalogue"
          title="Course tracks"
          sub="Twelve tracks written as real curricula. Every lesson, exercise and project is open — enrolment only records your progress."
        />

        {error && <ErrorState error={error} onRetry={load} />}
        {!data && !error && <Loading rows={4} height={110} />}

        {data && (
          <div className="stack stack-5">
            <div className="row row--wrap" style={{ gap: 10 }}>
              <div style={{ position: 'relative', flex: '1 1 260px' }}>
                <Search aria-hidden="true" style={{ position: 'absolute', left: 10, top: 11, width: 15, height: 15, color: 'var(--faint)' }} />
                <input
                  id="course-search"
                  className="input"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by topic, outcome or title"
                  aria-label="Search courses"
                  style={{ paddingLeft: 32 }}
                />
              </div>
              <label className="row small muted" style={{ gap: 8 }}>
                <Filter aria-hidden="true" style={{ width: 14, height: 14 }} />
                <select className="select" value={level} onChange={(e) => setLevel(e.target.value)} aria-label="Filter by level" style={{ width: 150 }}>
                  {LEVELS.map((l) => <option key={l}>{l}</option>)}
                </select>
              </label>
            </div>

            <div className="row row--wrap" style={{ gap: 6 }}>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`btn btn--sm ${category === cat ? 'btn--primary' : ''}`}
                  aria-pressed={category === cat}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="row row--between">
              <span className="small muted">
                {filtered.length} of {data.courses.length} courses
              </span>
              {(query || category !== 'All' || level !== 'All levels') && (
                <button className="btn btn--ghost btn--sm" onClick={() => { setQuery(''); setCategory('All'); setLevel('All levels'); }}>
                  Clear filters
                </button>
              )}
            </div>

            {filtered.length === 0 ? (
              <div className="card">
                <Empty
                  icon={BookOpen}
                  title="No course matches those filters"
                  action={<button className="btn btn--sm" onClick={() => { setQuery(''); setCategory('All'); setLevel('All levels'); }}>Clear filters</button>}
                >
                  Try a broader term, or clear the category and level filters.
                </Empty>
              </div>
            ) : (
              <div className="grid grid--2">
                {filtered.map((course) => (
                  <article key={course.slug} className="card card--interactive" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    <div className="row row--between" style={{ alignItems: 'flex-start' }}>
                      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                        <span className="badge badge--accent">{course.category}</span>
                        <span className="badge">{course.level}</span>
                        <span className="badge">{minutes(course.durationHours * 60)}</span>
                      </div>
                      {course.enrolled && <span className="badge badge--success"><span className="dot" /> Enrolled</span>}
                    </div>

                    <div>
                      <Link to={`/courses/${course.slug}`}>
                        <h3 style={{ fontSize: 'var(--step-2)' }}>{course.title}</h3>
                      </Link>
                      <p className="small muted" style={{ marginTop: 6 }}>{course.tagline}</p>
                    </div>

                    <ul className="small muted" style={{ margin: 0, paddingLeft: '1.1rem', display: 'grid', gap: 4 }}>
                      {course.outcomes.slice(0, 3).map((outcome) => <li key={outcome}>{outcome}</li>)}
                    </ul>

                    <div className="row row--between tiny muted">
                      <span>{course.moduleCount} modules · {course.lessonCount} lessons</span>
                      {course.enrolled && <span>{percent(course.progress)} complete</span>}
                    </div>

                    {course.enrolled && <Progress value={course.progress} />}

                    <div className="row" style={{ marginTop: 'auto', paddingTop: 'var(--space-2)' }}>
                      <Link className="btn btn--sm" to={`/courses/${course.slug}`}>
                        {course.enrolled ? 'Continue' : 'View track'} <ArrowRight />
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
