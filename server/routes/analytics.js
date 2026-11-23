import express from 'express';
import { all, get, run, nowIso, localDay, addDays } from '../db/index.js';
import { requireUser } from '../lib/context.js';
import { ok, notFound, badRequest } from '../lib/http.js';
import { validate } from '../lib/validate.js';
import { streakInfo, weeklyMinutes } from '../lib/stats.js';
import { refreshRecommendations, dismissRecommendation } from '../lib/recommendations.js';

const router = express.Router();
router.use(requireUser);

/** Everything on the analytics page, computed from stored rows only. */
router.get('/overview', (req, res) => {
  const userId = req.user.id;
  const days = 30;
  const today = localDay();
  const start = addDays(today, -(days - 1));

  const events = all(
    `SELECT kind, ref_type, minutes, substr(created_at, 1, 10) AS day FROM activity_events
      WHERE user_id = ? AND created_at >= ? ORDER BY created_at`,
    [userId, `${start}T00:00:00`],
  );

  const minutesByDay = new Map();
  const lessonsByDay = new Map();
  for (const e of events) {
    minutesByDay.set(e.day, (minutesByDay.get(e.day) || 0) + (e.minutes || 0));
    if (e.kind === 'lesson_completed') lessonsByDay.set(e.day, (lessonsByDay.get(e.day) || 0) + 1);
  }
  const series = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = addDays(today, -i);
    series.push({ day, minutes: minutesByDay.get(day) || 0, lessons: lessonsByDay.get(day) || 0 });
  }

  const perCourse = all(
    `SELECT c.slug, c.title,
            (SELECT COUNT(*) FROM lessons l JOIN course_modules m ON m.id = l.module_id WHERE m.course_id = c.id) AS total,
            (SELECT COUNT(*) FROM lesson_progress p JOIN lessons l ON l.id = p.lesson_id
               JOIN course_modules m ON m.id = l.module_id
              WHERE m.course_id = c.id AND p.user_id = ? AND p.status = 'completed') AS completed
       FROM courses c JOIN enrollments e ON e.course_id = c.id AND e.user_id = ?
      ORDER BY completed DESC`,
    [userId, userId],
  );

  const aptitude = all(
    `SELECT t.slug, t.title, COUNT(a.id) AS answered, SUM(a.is_correct) AS correct
       FROM aptitude_answers a
       JOIN aptitude_attempts at ON at.id = a.attempt_id
       JOIN aptitude_questions q ON q.id = a.question_id
       JOIN aptitude_topics t ON t.id = q.topic_id
      WHERE at.user_id = ? GROUP BY t.id HAVING answered > 0 ORDER BY answered DESC`,
    [userId],
  );

  const assessments = all(
    `SELECT s.assessment_id, a.title, c.title AS course_title, s.score, s.max_score, s.passed, s.submitted_at
       FROM submissions s JOIN assessments a ON a.id = s.assessment_id JOIN courses c ON c.id = a.course_id
      WHERE s.user_id = ? ORDER BY s.submitted_at DESC LIMIT 20`,
    [userId],
  );

  const lab = get(
    `SELECT COUNT(*) AS runs,
            SUM(CASE WHEN status = 'ok' THEN 1 ELSE 0 END) AS successful,
            SUM(CASE WHEN tests_total > 0 AND tests_passed = tests_total THEN 1 ELSE 0 END) AS solved
       FROM coding_sessions WHERE user_id = ?`,
    [userId],
  );

  const totals = get(
    `SELECT (SELECT COUNT(*) FROM lesson_progress WHERE user_id = ? AND status = 'completed') AS lessons,
            (SELECT COUNT(*) FROM enrollments WHERE user_id = ?) AS courses,
            (SELECT COUNT(*) FROM enrollments WHERE user_id = ? AND completed_at IS NOT NULL) AS coursesCompleted,
            (SELECT COUNT(*) FROM user_achievements WHERE user_id = ?) AS achievements`,
    [userId, userId, userId, userId],
  );

  const week = weeklyMinutes(userId);
  const streak = streakInfo(userId);

  // Skill breakdown: completion share per course category, from real progress.
  const categories = all(
    `SELECT c.category,
            SUM((SELECT COUNT(*) FROM lessons l JOIN course_modules m ON m.id = l.module_id WHERE m.course_id = c.id)) AS total,
            SUM((SELECT COUNT(*) FROM lesson_progress p JOIN lessons l ON l.id = p.lesson_id
                   JOIN course_modules m ON m.id = l.module_id
                  WHERE m.course_id = c.id AND p.user_id = ? AND p.status = 'completed')) AS completed
       FROM courses c JOIN enrollments e ON e.course_id = c.id AND e.user_id = ?
      GROUP BY c.category`,
    [userId, userId],
  );

  ok(res, {
    range: { from: start, to: today, days },
    series,
    streak,
    week,
    totals,
    perCourse: perCourse.map((c) => ({ ...c, percent: c.total ? Math.round((c.completed / c.total) * 100) : 0 })),
    aptitude: aptitude.map((a) => ({ ...a, accuracy: a.answered ? Math.round((a.correct / a.answered) * 100) : null })),
    assessments: assessments.map((a) => ({ ...a, percent: a.max_score ? Math.round((a.score / a.max_score) * 100) : 0 })),
    lab: { runs: lab.runs || 0, successful: lab.successful || 0, solved: lab.solved || 0 },
    categories: categories.map((c) => ({ category: c.category, total: c.total, completed: c.completed, percent: c.total ? Math.round((c.completed / c.total) * 100) : 0 })),
    empty: totals.lessons === 0 && totals.courses === 0 && (lab.runs || 0) === 0,
  });
});

router.get('/recommendations', (req, res) => {
  refreshRecommendations(req.user.id);
  const rows = all(
    "SELECT id, kind, target_type, target_slug, title, reason, score FROM learning_recommendations WHERE user_id = ? AND status = 'open' ORDER BY score DESC",
    [req.user.id],
  );
  ok(res, { recommendations: rows });
});

router.post('/recommendations/:id/dismiss', (req, res) => {
  const row = get('SELECT id FROM learning_recommendations WHERE id = ? AND user_id = ?', [Number(req.params.id), req.user.id]);
  if (!row) throw notFound('That suggestion no longer exists.');
  dismissRecommendation(req.user.id, row.id);
  ok(res, { dismissed: row.id });
});

router.get('/goals', (req, res) => {
  const rows = all("SELECT * FROM goals WHERE user_id = ? AND status != 'archived' ORDER BY created_at DESC", [req.user.id]);
  ok(res, { goals: rows });
});

router.post('/goals', (req, res) => {
  const body = validate(req.body, {
    title: { type: 'string', required: true, min: 3, max: 120 },
    targetType: { type: 'enum', values: ['lessons', 'minutes', 'courses'], default: 'lessons' },
    targetValue: { type: 'int', min: 1, max: 5000, default: 5 },
    targetDate: { type: 'string', max: 10 },
  });
  const info = run('INSERT INTO goals (user_id, title, target_type, target_value, target_date) VALUES (?,?,?,?,?)',
    [req.user.id, body.title, body.targetType, body.targetValue, body.targetDate || null]);
  ok(res, { goal: get('SELECT * FROM goals WHERE id = ?', [info.lastInsertRowid]) }, 201);
});

router.delete('/goals/:id', (req, res) => {
  const row = get('SELECT * FROM goals WHERE id = ? AND user_id = ?', [Number(req.params.id), req.user.id]);
  if (!row) throw notFound('That goal does not exist.');
  run("UPDATE goals SET status = 'archived' WHERE id = ?", [row.id]);
  ok(res, { archived: row.id });
});

export default router;
