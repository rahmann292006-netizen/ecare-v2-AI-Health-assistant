/**
 * Learning plans — the personalised preparation schedule.
 *
 * Every target comes from a real lesson duration, an assessment time limit or a
 * project estimate. Nothing here marks work complete: completion is read from
 * lesson_progress and submissions by `syncPlanProgress`.
 */
import express from 'express';
import { get, all, run } from '../db/index.js';
import { requireUser } from '../lib/context.js';
import { ok, notFound, badRequest } from '../lib/http.js';
import {
  activePlan,
  generatePlan,
  syncPlanProgress,
  rescheduleMissed,
  planWeek,
  shapePlan,
  shapeTarget,
  estimateFinish,
  remainingWork,
  buildTargetQueue,
  normaliseDays,
  isoDate,
} from '../lib/plan-engine.js';

const router = express.Router();
router.use(requireUser);

function courseOr404(slug) {
  const c = get('SELECT * FROM courses WHERE slug = ?', [slug]);
  if (!c) throw notFound('That course does not exist.');
  return c;
}

/** What a plan would look like at a given pace, without creating one. */
router.get('/courses/:slug/preview', (req, res) => {
  const c = courseOr404(req.params.slug);
  const minutesPerDay = Math.min(480, Math.max(15, Number(req.query.minutesPerDay) || 60));
  const studyDays = normaliseDays(Number(req.query.daysPerWeek) || 5);
  const startDate = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.startDate || '')) ? String(req.query.startDate) : isoDate(Date.now());
  const work = remainingWork(c.id, req.user.id);
  const queue = buildTargetQueue(work);
  const est = estimateFinish({ queue, minutesPerDay, studyDays, startDate });
  const byKind = queue.reduce((acc, q) => {
    acc[q.kind] = (acc[q.kind] || 0) + 1;
    return acc;
  }, {});
  ok(res, {
    course: { slug: c.slug, title: c.title },
    pace: { minutesPerDay, studyDays, startDate },
    remaining: {
      items: queue.length,
      minutes: est.totalMinutes,
      hours: Math.round((est.totalMinutes / 60) * 10) / 10,
      studyDays: est.studyDays,
      finishDate: est.finishDate,
      byKind,
    },
  });
});

router.get('/courses/:slug', (req, res) => {
  const c = courseOr404(req.params.slug);
  const plan = activePlan(req.user.id, c.id);
  if (!plan) return ok(res, { plan: null, course: { slug: c.slug, title: c.title } });
  const synced = syncPlanProgress(plan.id);
  const fresh = get('SELECT * FROM learning_plans WHERE id = ?', [plan.id]);
  ok(res, { plan: shapePlan(fresh), synced, course: { slug: c.slug, title: c.title } });
});

router.post('/courses/:slug', (req, res) => {
  const c = courseOr404(req.params.slug);
  const body = req.body || {};
  const result = generatePlan({ userId: req.user.id, course: c, input: body });
  ok(res, { plan: shapePlan(result.plan), created: result.created, finishDate: result.finish }, 201);
});

router.patch('/courses/:slug', (req, res) => {
  const c = courseOr404(req.params.slug);
  const plan = activePlan(req.user.id, c.id);
  if (!plan) throw notFound('You have no plan for this course.');
  const body = req.body || {};
  const result = generatePlan({
    userId: req.user.id,
    course: c,
    input: {
      minutesPerDay: body.minutesPerDay ?? plan.minutes_per_day,
      daysPerWeek: body.daysPerWeek ?? plan.days_per_week,
      studyDays: body.studyDays ?? JSON.parse(plan.study_days_json || '[]'),
      startDate: body.startDate ?? isoDate(Date.now()),
      targetDate: body.targetDate ?? plan.target_date,
      skillLevel: body.skillLevel ?? plan.skill_level,
      reminderTime: body.reminderTime ?? plan.reminder_time,
      timezone: body.timezone ?? plan.timezone,
    },
  });
  ok(res, { plan: shapePlan(result.plan), recreated: result.created, finishDate: result.finish });
});

router.post('/courses/:slug/pause', (req, res) => {
  const c = courseOr404(req.params.slug);
  const plan = activePlan(req.user.id, c.id);
  if (!plan) throw notFound('You have no plan for this course.');
  ok(res, { plan: setStatus(plan.id, 'paused') });
});

router.post('/courses/:slug/resume', (req, res) => {
  const c = courseOr404(req.params.slug);
  const plan = activePlan(req.user.id, c.id);
  if (!plan) throw notFound('You have no plan for this course.');
  const moved = rescheduleMissed(plan.id);
  ok(res, { plan: setStatus(plan.id, 'active'), rescheduled: moved });
});

router.post('/courses/:slug/restart', (req, res) => {
  const c = courseOr404(req.params.slug);
  const plan = activePlan(req.user.id, c.id);
  if (plan) setStatus(plan.id, 'abandoned');
  const result = generatePlan({ userId: req.user.id, course: c, input: req.body || {} });
  ok(res, { plan: shapePlan(result.plan), created: result.created });
});

router.post('/courses/:slug/reschedule', (req, res) => {
  const c = courseOr404(req.params.slug);
  const plan = activePlan(req.user.id, c.id);
  if (!plan) throw notFound('You have no plan for this course.');
  const moved = rescheduleMissed(plan.id);
  ok(res, { rescheduled: moved, plan: shapePlan(get('SELECT * FROM learning_plans WHERE id = ?', [plan.id])) });
});

/** This week's targets for one plan, or for every active plan. */
router.get('/week', (req, res) => {
  const start = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.start || '')) ? String(req.query.start) : startOfWeek();
  const slug = String(req.query.course || '');
  const plans = slug
    ? [activePlan(req.user.id, courseOr404(slug).id)].filter(Boolean)
    : all("SELECT * FROM learning_plans WHERE user_id = ? AND status = 'active'", [req.user.id]);
  const out = plans.map((p) => {
    syncPlanProgress(p.id);
    const course = get('SELECT slug, title FROM courses WHERE id = ?', [p.course_id]);
    return { course: { slug: course.slug, title: course.title }, ...planWeek(p.id, start) };
  });
  ok(res, { start, plans: out });
});

router.get('/today', (req, res) => {
  const today = isoDate(Date.now());
  const plans = all("SELECT * FROM learning_plans WHERE user_id = ? AND status = 'active'", [req.user.id]);
  const items = [];
  for (const p of plans) {
    syncPlanProgress(p.id);
    const rows = all(
      `SELECT t.*, l.slug AS lesson_slug FROM learning_plan_targets t LEFT JOIN lessons l ON l.id = t.lesson_id
        WHERE t.plan_id = ? AND t.scheduled_for <= ? ORDER BY t.scheduled_for, t.id LIMIT 12`,
      [p.id, today],
    );
    const course = get('SELECT slug, title FROM courses WHERE id = ?', [p.course_id]);
    for (const t of rows) items.push({ ...shapeTarget(t), courseSlug: course.slug, courseTitle: course.title });
  }
  ok(res, { date: today, items, pending: items.filter((i) => i.status !== 'done').length });
});

router.get('/targets', (req, res) => {
  const plan = activePlan(req.user.id, courseOr404(req.params.slug || '').id);
  if (!plan) throw notFound('You have no plan for this course.');
  const rows = all(
    `SELECT t.*, l.slug AS lesson_slug FROM learning_plan_targets t LEFT JOIN lessons l ON l.id = t.lesson_id
      WHERE t.plan_id = ? ORDER BY t.scheduled_for, t.id`,
    [plan.id],
  );
  ok(res, { targets: rows.map(shapeTarget) });
});

/** Learner explicitly skips a target (recorded, never marked done). */
router.post('/targets/:id/skip', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw badRequest('Invalid target.');
  const t = get(
    `SELECT t.* FROM learning_plan_targets t JOIN learning_plans p ON p.id = t.plan_id
      WHERE t.id = ? AND p.user_id = ?`,
    [id, req.user.id],
  );
  if (!t) throw notFound('That target is not yours.');
  setTargetStatus(t.id, 'skipped');
  ok(res, { target: shapeTarget(get('SELECT * FROM learning_plan_targets WHERE id = ?', [id])) });
});

function setStatus(planId, status) {
  run("UPDATE learning_plans SET status = ?, updated_at = ? WHERE id = ?", [status, new Date().toISOString(), planId]);
  return shapePlan(get('SELECT * FROM learning_plans WHERE id = ?', [planId]));
}

function setTargetStatus(targetId, status) {
  run("UPDATE learning_plan_targets SET status = ? WHERE id = ?", [status, targetId]);
}

function startOfWeek() {
  const now = new Date();
  const dow = now.getUTCDay();
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - ((dow + 6) % 7) * 86400000);
  return monday.toISOString().slice(0, 10);
}

export default router;
