import express from 'express';
import { get, all, run, nowIso } from '../db/index.js';
import { requireUser } from '../lib/context.js';
import { ok, notFound, badRequest } from '../lib/http.js';
import { limit } from '../lib/rate-limit.js';
import { awardFor } from '../lib/achievements.js';
import { dailyMotivation } from '../lib/motivation.js';
import { refreshRecommendations } from '../lib/recommendations.js';
import { streakInfo, weeklyMinutes } from '../lib/stats.js';

const router = express.Router();
router.use(requireUser);

function courseCard(c, userId) {
  const counts = get(
    `SELECT COUNT(*) AS total FROM lessons l JOIN course_modules m ON m.id = l.module_id WHERE m.course_id = ?`,
    [c.id],
  );
  const done = get(
    `SELECT COUNT(*) AS n FROM lesson_progress p
       JOIN lessons l ON l.id = p.lesson_id
       JOIN course_modules m ON m.id = l.module_id
      WHERE m.course_id = ? AND p.user_id = ? AND p.status = 'completed'`,
    [c.id, userId],
  );
  const enrolled = get('SELECT * FROM enrollments WHERE user_id = ? AND course_id = ?', [userId, c.id]);
  const modules = all('SELECT id, slug, title, summary, level FROM course_modules WHERE course_id = ? ORDER BY sort_order', [c.id]);
  return {
    slug: c.slug,
    title: c.title,
    tagline: c.tagline,
    description: c.description,
    level: c.level,
    durationHours: c.duration_hours,
    category: c.category,
    icon: c.icon,
    outcomes: JSON.parse(c.outcomes_json),
    prereqs: JSON.parse(c.prereqs_json),
    moduleCount: modules.length,
    lessonCount: counts.total,
    lessonsCompleted: done.n,
    progress: counts.total ? Math.round((done.n / counts.total) * 100) : 0,
    enrolled: Boolean(enrolled),
    completedAt: enrolled?.completed_at || null,
  };
}

/** Catalogue. Public for browsing is handled by /api/catalogue; this is the signed-in view. */
router.get('/courses', (req, res) => {
  const rows = all('SELECT * FROM courses WHERE is_published = 1 ORDER BY sort_order');
  const mine = all('SELECT course_id FROM enrollments WHERE user_id = ?', [req.user.id]).map((r) => r.course_id);
  ok(res, {
    courses: rows.map((c) => ({ ...courseCard(c, req.user.id), enrolled: mine.includes(c.id) })),
    categories: [...new Set(rows.map((r) => r.category))],
  });
});

router.get('/courses/:slug', (req, res) => {
  const c = get('SELECT * FROM courses WHERE slug = ? AND is_published = 1', [req.params.slug]);
  if (!c) throw notFound('That course does not exist.');
  const modules = all('SELECT * FROM course_modules WHERE course_id = ? ORDER BY sort_order', [c.id]);
  const progress = all(
    `SELECT p.lesson_id, p.status, p.seconds_spent, p.completed_at
       FROM lesson_progress p WHERE p.user_id = ?`,
    [req.user.id],
  );
  const progressByLesson = new Map(progress.map((p) => [p.lesson_id, p]));
  const bookmarks = new Set(all('SELECT lesson_id FROM bookmarks WHERE user_id = ?', [req.user.id]).map((b) => b.lesson_id));

  const shapeModules = modules.map((m) => {
    const lessons = all('SELECT * FROM lessons WHERE module_id = ? ORDER BY sort_order', [m.id]);
    return {
      slug: m.slug,
      title: m.title,
      summary: m.summary,
      level: m.level,
      lessons: lessons.map((l) => ({
        slug: l.slug,
        title: l.title,
        kind: l.kind,
        minutes: l.duration_minutes,
        status: progressByLesson.get(l.id)?.status || 'not_started',
        completedAt: progressByLesson.get(l.id)?.completed_at || null,
        bookmarked: bookmarks.has(l.id),
      })),
    };
  });

  const exercises = all('SELECT slug, title, difficulty, language FROM exercises WHERE course_id = ? ORDER BY sort_order', [c.id]);
  const projects = all('SELECT slug, title, difficulty, est_hours FROM projects WHERE course_id = ?', [c.id]);
  // Per-lesson knowledge checks are stored as assessments too; they belong on the
  // lesson, not in the course's checkpoint list.
  const assessments = all(
    "SELECT id, title, kind, pass_score, time_limit_minutes FROM assessments WHERE course_id = ? AND kind != 'lesson_quiz' ORDER BY sort_order",
    [c.id],
  );
  const best = new Map(
    all('SELECT assessment_id, MAX(score) AS best, MAX(passed) AS passed FROM submissions WHERE user_id = ? GROUP BY assessment_id', [req.user.id])
      .map((r) => [r.assessment_id, r]),
  );

  const enrolled = get('SELECT * FROM enrollments WHERE user_id = ? AND course_id = ?', [req.user.id, c.id]);
  const total = shapeModules.reduce((n, m) => n + m.lessons.length, 0);
  const done = shapeModules.reduce((n, m) => n + m.lessons.filter((l) => l.status === 'completed').length, 0);

  ok(res, {
    course: {
      slug: c.slug,
      title: c.title,
      tagline: c.tagline,
      description: c.description,
      level: c.level,
      durationHours: c.duration_hours,
      category: c.category,
      icon: c.icon,
      outcomes: JSON.parse(c.outcomes_json),
      prereqs: JSON.parse(c.prereqs_json),
    },
    modules: shapeModules,
    exercises,
    projects: projects.map((p) => ({ slug: p.slug, title: p.title, difficulty: p.difficulty, estHours: p.est_hours })),
    assessments: assessments.map((a) => ({
      id: a.id, title: a.title, kind: a.kind, passScore: a.pass_score, timeLimitMinutes: a.time_limit_minutes,
      bestScore: best.get(a.id)?.best ?? null, passed: Boolean(best.get(a.id)?.passed),
    })),
    enrolled: Boolean(enrolled),
    enrolledAt: enrolled?.enrolled_at || null,
    progress: { total, completed: done, percent: total ? Math.round((done / total) * 100) : 0 },
  });
});

router.post('/courses/:slug/enroll', (req, res) => {
  const c = get('SELECT * FROM courses WHERE slug = ?', [req.params.slug]);
  if (!c) throw notFound('That course does not exist.');
  run('INSERT OR IGNORE INTO enrollments (user_id, course_id) VALUES (?,?)', [req.user.id, c.id]);
  run('INSERT INTO activity_events (user_id, kind, ref_type, ref_id) VALUES (?,?,?,?)', [req.user.id, 'enrolled', 'course', c.id]);
  refreshRecommendations(req.user.id);
  ok(res, { enrolled: true, slug: c.slug });
});

router.delete('/courses/:slug/enroll', (req, res) => {
  const c = get('SELECT * FROM courses WHERE slug = ?', [req.params.slug]);
  if (!c) throw notFound('That course does not exist.');
  run('DELETE FROM enrollments WHERE user_id = ? AND course_id = ?', [req.user.id, c.id]);
  ok(res, { enrolled: false });
});

router.get('/lessons/:courseSlug/:lessonSlug', (req, res) => {
  const c = get('SELECT * FROM courses WHERE slug = ?', [req.params.courseSlug]);
  if (!c) throw notFound('Course not found.');
  const row = get(
    `SELECT l.*, m.slug AS module_slug, m.title AS module_title, m.course_id, m.sort_order AS module_order
       FROM lessons l JOIN course_modules m ON m.id = l.module_id
      WHERE m.course_id = ? AND l.slug = ?`,
    [c.id, req.params.lessonSlug],
  );
  if (!row) throw notFound('Lesson not found.');

  const siblings = all(
    `SELECT l.id, l.slug, l.title, l.sort_order FROM lessons l
       JOIN course_modules m ON m.id = l.module_id
      WHERE m.course_id = ? ORDER BY m.sort_order, l.sort_order`,
    [c.id],
  );
  const idx = siblings.findIndex((s) => s.id === row.id);
  const progress = get('SELECT * FROM lesson_progress WHERE user_id = ? AND lesson_id = ?', [req.user.id, row.id]);
  const note = get('SELECT body FROM notes WHERE user_id = ? AND lesson_id = ?', [req.user.id, row.id]);
  const resources = all('SELECT title, url, provider, kind, license_note FROM learning_resources WHERE lesson_id = ?', [row.id]);
  const exercises = all(
    'SELECT slug, title, difficulty, language, prompt_md, starter_code FROM exercises WHERE course_id = ? AND lesson_id IS NULL ORDER BY sort_order',
    [c.id],
  );

  const quiz = get(
    "SELECT id FROM assessments WHERE course_id = ? AND kind = 'lesson_quiz' AND title = ?",
    [c.id, `Lesson check: ${row.slug}`],
  );

  ok(res, {
    course: { slug: c.slug, title: c.title },
    module: { slug: row.module_slug, title: row.module_title },
    lessonId: row.id,
    quiz: quiz ? { assessmentId: quiz.id } : null,
    lesson: {
      slug: row.slug,
      title: row.title,
      kind: row.kind,
      minutes: row.duration_minutes,
      objectives: JSON.parse(row.objectives_json),
      body: row.body_md,
      code: JSON.parse(row.code_json),
    },
    resources: resources.map((r) => ({ title: r.title, url: r.url, provider: r.provider, kind: r.kind, licenseNote: r.license_note })),
    progress: { status: progress?.status || 'not_started', secondsSpent: progress?.seconds_spent || 0, completedAt: progress?.completed_at || null },
    note: note?.body || '',
    prev: idx > 0 ? { slug: siblings[idx - 1].slug, title: siblings[idx - 1].title } : null,
    next: idx >= 0 && idx < siblings.length - 1 ? { slug: siblings[idx + 1].slug, title: siblings[idx + 1].title } : null,
    position: { index: idx + 1, total: siblings.length },
    relatedExercises: exercises.slice(0, 3),
  });
});

router.post('/lessons/:courseSlug/:lessonSlug/complete', (req, res) => {
  const c = get('SELECT * FROM courses WHERE slug = ?', [req.params.courseSlug]);
  if (!c) throw notFound('Course not found.');
  const row = get(
    `SELECT l.* FROM lessons l JOIN course_modules m ON m.id = l.module_id WHERE m.course_id = ? AND l.slug = ?`,
    [c.id, req.params.lessonSlug],
  );
  if (!row) throw notFound('Lesson not found.');
  const existing = get('SELECT * FROM lesson_progress WHERE user_id = ? AND lesson_id = ?', [req.user.id, row.id]);
  if (existing?.status === 'completed') return ok(res, { status: 'completed', alreadyDone: true });

  run(
    `INSERT INTO lesson_progress (user_id, lesson_id, status, completed_at, updated_at)
     VALUES (?,?, 'completed', ?, ?)
     ON CONFLICT(user_id, lesson_id) DO UPDATE SET status = 'completed', completed_at = excluded.completed_at, updated_at = excluded.updated_at`,
    [req.user.id, row.id, nowIso(), nowIso()],
  );
  run('INSERT OR IGNORE INTO enrollments (user_id, course_id) VALUES (?,?)', [req.user.id, c.id]);
  run('INSERT INTO activity_events (user_id, kind, ref_type, ref_id, minutes) VALUES (?,?,?,?,?)',
    [req.user.id, 'lesson_completed', 'lesson', row.id, row.duration_minutes]);

  // Course completion
  const total = get('SELECT COUNT(*) AS n FROM lessons l JOIN course_modules m ON m.id = l.module_id WHERE m.course_id = ?', [c.id]).n;
  const done = get(
    `SELECT COUNT(*) AS n FROM lesson_progress p JOIN lessons l ON l.id = p.lesson_id
       JOIN course_modules m ON m.id = l.module_id WHERE m.course_id = ? AND p.user_id = ? AND p.status = 'completed'`,
    [c.id, req.user.id],
  ).n;
  if (total > 0 && done === total) {
    run('UPDATE enrollments SET completed_at = ? WHERE user_id = ? AND course_id = ? AND completed_at IS NULL', [nowIso(), req.user.id, c.id]);
    run('INSERT INTO activity_events (user_id, kind, ref_type, ref_id) VALUES (?,?,?,?)', [req.user.id, 'course_completed', 'course', c.id]);
  }
  const awarded = awardFor(req.user.id);
  refreshRecommendations(req.user.id);
  ok(res, { status: 'completed', progress: { total, completed: done, percent: total ? Math.round((done / total) * 100) : 0 }, awarded });
});

router.post('/lessons/:courseSlug/:lessonSlug/reopen', (req, res) => {
  const c = get('SELECT * FROM courses WHERE slug = ?', [req.params.courseSlug]);
  const row = c && get(`SELECT l.id FROM lessons l JOIN course_modules m ON m.id = l.module_id WHERE m.course_id = ? AND l.slug = ?`, [c.id, req.params.lessonSlug]);
  if (!row) throw notFound('Lesson not found.');
  run("UPDATE lesson_progress SET status = 'in_progress', completed_at = NULL, updated_at = ? WHERE user_id = ? AND lesson_id = ?", [nowIso(), req.user.id, row.id]);
  ok(res, { status: 'in_progress' });
});

router.post('/lessons/:courseSlug/:lessonSlug/note', limit('notes', 120, 60 * 60 * 1000), (req, res) => {
  const body = String(req.body?.body ?? '').slice(0, 20_000);
  const c = get('SELECT * FROM courses WHERE slug = ?', [req.params.courseSlug]);
  const row = c && get(`SELECT l.id FROM lessons l JOIN course_modules m ON m.id = l.module_id WHERE m.course_id = ? AND l.slug = ?`, [c.id, req.params.lessonSlug]);
  if (!row) throw notFound('Lesson not found.');
  if (!body.trim()) {
    run('DELETE FROM notes WHERE user_id = ? AND lesson_id = ?', [req.user.id, row.id]);
    return ok(res, { body: '' });
  }
  run(
    `INSERT INTO notes (user_id, lesson_id, body, updated_at) VALUES (?,?,?,?)
     ON CONFLICT(user_id, lesson_id) DO UPDATE SET body = excluded.body, updated_at = excluded.updated_at`,
    [req.user.id, row.id, body, nowIso()],
  );
  ok(res, { body });
});

router.post('/lessons/:courseSlug/:lessonSlug/bookmark', (req, res) => {
  const c = get('SELECT * FROM courses WHERE slug = ?', [req.params.courseSlug]);
  const row = c && get(`SELECT l.id FROM lessons l JOIN course_modules m ON m.id = l.module_id WHERE m.course_id = ? AND l.slug = ?`, [c.id, req.params.lessonSlug]);
  if (!row) throw notFound('Lesson not found.');
  const exists = get('SELECT 1 AS x FROM bookmarks WHERE user_id = ? AND lesson_id = ?', [req.user.id, row.id]);
  if (exists) {
    run('DELETE FROM bookmarks WHERE user_id = ? AND lesson_id = ?', [req.user.id, row.id]);
    return ok(res, { bookmarked: false });
  }
  run('INSERT INTO bookmarks (user_id, lesson_id) VALUES (?,?)', [req.user.id, row.id]);
  ok(res, { bookmarked: true });
});

/** Dashboard payload: the one request the home screen needs. */
router.get('/dashboard', (req, res) => {
  const userId = req.user.id;
  const enrolled = all(
    `SELECT c.*, e.enrolled_at, e.last_accessed_at
       FROM enrollments e JOIN courses c ON c.id = e.course_id
      WHERE e.user_id = ? ORDER BY COALESCE(e.last_accessed_at, e.enrolled_at) DESC`,
    [userId],
  );

  const continueLearning = enrolled
    .map((c) => {
      const card = courseCard(c, userId);
      const nextLesson = get(
        `SELECT l.slug, l.title, m.slug AS module_slug
           FROM lessons l JOIN course_modules m ON m.id = l.module_id
          WHERE m.course_id = ?
            AND l.id NOT IN (SELECT lesson_id FROM lesson_progress WHERE user_id = ? AND status = 'completed')
          ORDER BY m.sort_order, l.sort_order LIMIT 1`,
        [c.id, userId],
      );
      return { ...card, nextLesson: nextLesson || null };
    })
    .filter((c) => c.progress < 100);

  const streak = streakInfo(userId);
  const week = weeklyMinutes(userId);
  const achievements = all(
    `SELECT a.slug, a.title, a.description, a.icon, ua.awarded_at FROM user_achievements ua
       JOIN achievements a ON a.id = ua.achievement_id WHERE ua.user_id = ? ORDER BY ua.awarded_at DESC LIMIT 6`,
    [userId],
  );
  const recent = all(
    `SELECT kind, ref_type, ref_id, created_at FROM activity_events WHERE user_id = ? ORDER BY created_at DESC LIMIT 8`,
    [userId],
  );
  const recommendations = all(
    "SELECT kind, target_type, target_slug, title, reason FROM learning_recommendations WHERE user_id = ? AND status = 'open' ORDER BY score DESC LIMIT 4",
    [userId],
  );
  const counts = get(
    `SELECT (SELECT COUNT(*) FROM lesson_progress WHERE user_id = ? AND status = 'completed') AS lessons,
            (SELECT COUNT(*) FROM coding_sessions WHERE user_id = ?) AS runs,
            (SELECT COUNT(*) FROM submissions WHERE user_id = ?) AS assessments,
            (SELECT COUNT(*) FROM aptitude_attempts WHERE user_id = ?) AS aptitudeAttempts`,
    [userId, userId, userId, userId],
  );

  ok(res, {
    greetingName: req.user.displayName,
    motivation: dailyMotivation(userId),
    streak,
    week,
    continueLearning: continueLearning.slice(0, 3),
    enrolledCount: enrolled.length,
    achievements,
    recentActivity: recent,
    recommendations,
    counts,
  });
});

router.get('/motivation/today', (req, res) => ok(res, dailyMotivation(req.user.id)));

router.get('/achievements', (req, res) => {
  const allA = all('SELECT * FROM achievements ORDER BY id');
  const mine = new Map(all('SELECT achievement_id, awarded_at FROM user_achievements WHERE user_id = ?', [req.user.id]).map((r) => [r.achievement_id, r.awarded_at]));
  ok(res, {
    achievements: allA.map((a) => ({
      slug: a.slug, title: a.title, description: a.description, icon: a.icon,
      awardedAt: mine.get(a.id) || null, earned: mine.has(a.id),
    })),
  });
});

router.get('/bookmarks', (req, res) => {
  const rows = all(
    `SELECT c.slug AS course_slug, c.title AS course_title, l.slug AS lesson_slug, l.title AS lesson_title, b.created_at
       FROM bookmarks b JOIN lessons l ON l.id = b.lesson_id
       JOIN course_modules m ON m.id = l.module_id JOIN courses c ON c.id = m.course_id
      WHERE b.user_id = ? ORDER BY b.created_at DESC`,
    [req.user.id],
  );
  ok(res, { bookmarks: rows });
});

router.get('/notes', (req, res) => {
  const rows = all(
    `SELECT c.slug AS course_slug, c.title AS course_title, l.slug AS lesson_slug, l.title AS lesson_title, n.body, n.updated_at
       FROM notes n JOIN lessons l ON l.id = n.lesson_id
       JOIN course_modules m ON m.id = l.module_id JOIN courses c ON c.id = m.course_id
      WHERE n.user_id = ? ORDER BY n.updated_at DESC`,
    [req.user.id],
  );
  ok(res, { notes: rows });
});

export default router;
