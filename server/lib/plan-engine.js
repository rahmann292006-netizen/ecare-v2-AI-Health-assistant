/**
 * The preparation engine: turns a course roadmap and a learner's real availability
 * into dated, checkable work.
 *
 * Design rules (these are the requirements, not preferences):
 *   - targets are generated from ACTUAL lesson durations, assessment time limits and
 *     project hours — never from a lesson count multiplied by a guess
 *   - a target is marked done only when the underlying lesson is completed or the
 *     assessment is passed; nothing is auto-completed
 *   - regenerating the schedule keeps completed history and re-dates only the future
 *   - only study days are used, and quiet hours are respected for reminders
 */
import { get, all, run, tx } from '../db/index.js';
import { badRequest, notFound } from './http.js';

const DAY_MS = 86_400_000;

export function isoDate(d) {
  return new Date(d).toISOString().slice(0, 10);
}

function addDays(dateStr, n) {
  return isoDate(new Date(`${dateStr}T00:00:00Z`).getTime() + n * DAY_MS);
}

/** Default study days: the first N weekdays, or an explicit list (0 = Sunday). */
export function normaliseDays(daysPerWeek, explicit) {
  if (Array.isArray(explicit) && explicit.length) {
    const cleaned = [...new Set(explicit.map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort();
    if (cleaned.length) return cleaned;
  }
  const weekdayFirst = [1, 2, 3, 4, 5, 6, 0];
  return weekdayFirst.slice(0, Math.min(7, Math.max(1, Number(daysPerWeek) || 5))).sort();
}

/** Hours a course still needs, from the work that is actually left. */
export function remainingWork(courseId, userId) {
  const lessons = all(
    `SELECT l.id, l.slug, l.title, l.duration_minutes, l.kind, m.id AS module_id, m.slug AS module_slug, m.title AS module_title,
            m.sort_order AS module_order, l.sort_order AS lesson_order,
            COALESCE(p.status, 'not_started') AS status
       FROM lessons l
       JOIN course_modules m ON m.id = l.module_id
       LEFT JOIN lesson_progress p ON p.lesson_id = l.id AND p.user_id = ?
      WHERE m.course_id = ?
      ORDER BY m.sort_order, l.sort_order`,
    [userId, courseId],
  );
  const assessments = all(
    `SELECT a.id, a.title, a.kind, a.time_limit_minutes, a.module_id, m.slug AS module_slug, m.sort_order AS module_order
       FROM assessments a LEFT JOIN course_modules m ON m.id = a.module_id
      WHERE a.course_id = ? AND a.kind != 'lesson_quiz'
      ORDER BY m.sort_order, a.sort_order`,
    [courseId],
  );
  const best = new Map(
    all('SELECT assessment_id, MAX(passed) AS passed FROM submissions WHERE user_id = ? GROUP BY assessment_id', [userId]).map((r) => [
      r.assessment_id,
      Boolean(r.passed),
    ]),
  );
  const projects = all('SELECT id, slug, title, est_hours, difficulty FROM projects WHERE course_id = ?', [courseId]);
  const doneProjects = new Set(
    all("SELECT project_id FROM user_projects WHERE user_id = ? AND status = 'done'", [userId]).map((r) => r.project_id),
  );
  return { lessons, assessments, projects, best, doneProjects };
}

/**
 * Build a target list for the work that is not finished yet.
 * Each target is a single lesson, an assessment, a revision block or a project.
 */
export function buildTargetQueue({ lessons, assessments, projects, best, doneProjects }) {
  const queue = [];
  for (const l of lessons) {
    if (l.status === 'completed') continue;
    queue.push({
      kind: 'lesson',
      lessonId: l.id,
      lessonSlug: l.slug,
      title: l.title,
      minutes: Math.max(10, l.duration_minutes || 20),
      moduleOrder: l.module_order,
      lessonOrder: l.lesson_order,
      moduleSlug: l.module_slug,
      moduleTitle: l.module_title,
    });
  }

  // a short revision block after every third lesson of the same module
  const spaced = [];
  const seen = new Map();
  for (const t of queue) {
    spaced.push(t);
    if (t.kind !== 'lesson') continue;
    const n = (seen.get(t.moduleSlug) || 0) + 1;
    seen.set(t.moduleSlug, n);
    if (n % 3 === 0) {
      spaced.push({
        kind: 'revision',
        title: `Revise the last three lessons of ${t.moduleTitle || 'this module'}`,
        minutes: 15,
        moduleOrder: t.moduleOrder,
        lessonOrder: t.lessonOrder + 0.5,
        moduleSlug: t.moduleSlug,
      });
    }
  }
  queue.length = 0;
  queue.push(...spaced);

  for (const a of assessments) {
    if (best.get(a.id)) continue;
    queue.push({
      kind: a.kind === 'final' ? 'assessment' : 'assessment',
      assessmentId: a.id,
      title: `Assessment: ${a.title}`,
      minutes: Math.max(15, a.time_limit_minutes || 15),
      moduleOrder: a.module_order ?? 99,
      lessonOrder: 900,
      moduleSlug: a.module_slug,
    });
  }

  for (const p of projects) {
    if (doneProjects.has(p.id)) continue;
    queue.push({
      kind: 'project',
      title: `Project: ${p.title}`,
      minutes: Math.max(60, (p.est_hours || 8) * 60),
      moduleOrder: 98,
      lessonOrder: 800,
      projectSlug: p.slug,
    });
  }

  queue.sort((a, b) => a.moduleOrder - b.moduleOrder || a.lessonOrder - b.lessonOrder);
  return queue;
}

/**
 * Distribute a queue over study days, honouring the daily minute budget.
 * Long items (a project) are split into consecutive blocks so a single day never
 * asks for eight hours.
 */
export function distribute(queue, { minutesPerDay, studyDays, startDate, maxDays = 400 }) {
  const perDay = Math.max(15, Number(minutesPerDay) || 60);
  const targets = [];
  let dayIndex = 0;
  let used = 0;
  let currentDate = startDate;

  const advanceToStudyDay = () => {
    for (let guard = 0; guard < 14; guard += 1) {
      const dow = new Date(`${currentDate}T00:00:00Z`).getUTCDay();
      if (studyDays.includes(dow)) return true;
      currentDate = addDays(currentDate, 1);
    }
    return false;
  };

  if (!advanceToStudyDay()) throw badRequest('No valid study days were selected.');

  const push = (item) => {
    if (used + item.minutes > perDay && used > 0) {
      // left-over minutes in the day are carried forward, never dropped
      const carry = Math.max(0, perDay - used);
      dayIndex += 1;
      used = 0;
      currentDate = addDays(currentDate, 1);
      if (!advanceToStudyDay()) return false;
      if (carry > 0) used = carry;
      if (used + item.minutes > perDay) used = 0;
    }
    targets.push({ ...item, scheduledFor: currentDate });
    used += item.minutes;
    return true;
  };

  for (const item of queue) {
    if (targets.length > 2000 || dayIndex > maxDays) break;
    let remaining = item.minutes;
    let part = 1;
    const parts = item.minutes > perDay * 1.5 ? Math.ceil(item.minutes / perDay) : 1;
    const chunk = Math.ceil(item.minutes / parts);
    while (remaining > 0) {
      const minutes = Math.min(chunk, remaining);
      const ok = push({
        ...item,
        minutes,
        title: parts > 1 ? `${item.title} (part ${part} of ${parts})` : item.title,
      });
      if (!ok) break;
      remaining -= minutes;
      part += 1;
    }
  }
  return targets;
}

/** Estimated finish date for a queue at the given pace (no plan row needed). */
export function estimateFinish({ queue, minutesPerDay, studyDays, startDate }) {
  const total = queue.reduce((n, q) => n + q.minutes, 0);
  const days = Math.max(1, Math.ceil(total / Math.max(15, minutesPerDay)));
  let counted = 0;
  let date = startDate;
  for (let guard = 0; guard < 3650; guard += 1) {
    const dow = new Date(`${date}T00:00:00Z`).getUTCDay();
    if (studyDays.includes(dow)) {
      counted += 1;
      if (counted >= days) return { finishDate: date, studyDays: counted, totalMinutes: total };
    }
    date = addDays(date, 1);
  }
  return { finishDate: null, studyDays: counted, totalMinutes: total };
}

/* ─────────────────────────── plan CRUD ─────────────────────────── */

export function activePlan(userId, courseId) {
  return get("SELECT * FROM learning_plans WHERE user_id = ? AND course_id = ? AND status IN ('active','paused')", [userId, courseId]);
}

/**
 * Create or refresh a plan. Completed targets are kept; pending ones are re-dated.
 */
export function generatePlan({ userId, course, input }) {
  const minutesPerDay = Math.min(480, Math.max(15, Number(input.minutesPerDay) || 60));
  const daysPerWeek = Math.min(7, Math.max(1, Number(input.daysPerWeek) || 5));
  const studyDays = normaliseDays(daysPerWeek, input.studyDays);
  const startDate = /^\d{4}-\d{2}-\d{2}$/.test(input.startDate || '') ? input.startDate : isoDate(Date.now());
  const reminderTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(input.reminderTime || '') ? input.reminderTime : '19:00';
  const timezone = typeof input.timezone === 'string' && input.timezone.length < 64 ? input.timezone : 'Asia/Kolkata';
  const skillLevel = ['beginner', 'intermediate', 'advanced'].includes(input.skillLevel) ? input.skillLevel : 'beginner';
  const targetDate = /^\d{4}-\d{2}-\d{2}$/.test(input.targetDate || '') ? input.targetDate : null;

  const work = remainingWork(course.id, userId);
  const queue = buildTargetQueue(work);
  const targets = distribute(queue, { minutesPerDay, studyDays, startDate });
  const totalMinutes = targets.reduce((n, t) => n + t.minutes, 0);
  const finish = targets.length ? targets[targets.length - 1].scheduledFor : startDate;

  return tx(() => {
    let plan = activePlan(userId, course.id);
    if (plan) {
      run(
        `UPDATE learning_plans SET minutes_per_day = ?, days_per_week = ?, study_days_json = ?, start_date = ?,
                target_date = ?, skill_level = ?, reminder_time = ?, timezone = ?, total_minutes = ?, updated_at = ?
          WHERE id = ?`,
        [
          minutesPerDay, daysPerWeek, JSON.stringify(studyDays), startDate, targetDate || finish, skillLevel,
          reminderTime, timezone, totalMinutes, new Date().toISOString(), plan.id,
        ],
      );
      // keep history: only unfinished future targets are replaced
      run("DELETE FROM learning_plan_targets WHERE plan_id = ? AND status = 'pending'", [plan.id]);
    } else {
      run(
        `INSERT INTO learning_plans (user_id, course_id, status, minutes_per_day, days_per_week, study_days_json,
                start_date, target_date, skill_level, reminder_time, timezone, total_minutes)
         VALUES (?,?,'active',?,?,?,?,?,?,?,?,?)`,
        [
          userId, course.id, minutesPerDay, daysPerWeek, JSON.stringify(studyDays), startDate,
          targetDate || finish, skillLevel, reminderTime, timezone, totalMinutes,
        ],
      );
      plan = activePlan(userId, course.id);
    }

    const existingDone = new Set(
      all("SELECT lesson_id FROM learning_plan_targets WHERE plan_id = ? AND status = 'done' AND lesson_id IS NOT NULL", [plan.id]).map((r) =>
        String(r.lesson_id),
      ),
    );
    const existingDoneAssessments = new Set(
      all("SELECT assessment_id FROM learning_plan_targets WHERE plan_id = ? AND status = 'done' AND assessment_id IS NOT NULL", [plan.id]).map((r) =>
        String(r.assessment_id),
      ),
    );

    let created = 0;
    for (const t of targets) {
      if (t.lessonId && existingDone.has(String(t.lessonId))) continue;
      if (t.assessmentId && existingDoneAssessments.has(String(t.assessmentId))) continue;
      run(
        `INSERT INTO learning_plan_targets (plan_id, scheduled_for, kind, lesson_id, assessment_id, project_slug, title, minutes)
         VALUES (?,?,?,?,?,?,?,?)`,
        [plan.id, t.scheduledFor, t.kind, t.lessonId ?? null, t.assessmentId ?? null, t.projectSlug ?? null, t.title, t.minutes],
      );
      created += 1;
    }

    syncPlanProgress(plan.id);
    return { plan: get('SELECT * FROM learning_plans WHERE id = ?', [plan.id]), created, finish };
  });
}

/**
 * Reconcile targets with reality. A lesson target becomes done only when the lesson
 * is completed; an assessment target only when it is passed. Overdue pending targets
 * are marked missed (never done).
 */
export function syncPlanProgress(planId, today = isoDate(Date.now())) {
  const plan = get('SELECT * FROM learning_plans WHERE id = ?', [planId]);
  if (!plan) return null;

  const targets = all('SELECT * FROM learning_plan_targets WHERE plan_id = ?', [planId]);
  let changed = 0;

  for (const t of targets) {
    if (t.status === 'done') continue;
    let complete = false;
    if (t.lesson_id) {
      const p = get("SELECT status FROM lesson_progress WHERE user_id = ? AND lesson_id = ?", [plan.user_id, t.lesson_id]);
      complete = p?.status === 'completed';
    } else if (t.assessment_id) {
      const s = get('SELECT MAX(passed) AS passed FROM submissions WHERE user_id = ? AND assessment_id = ?', [plan.user_id, t.assessment_id]);
      // a checkpoint must be PASSED; a practice set is complete once attempted
      complete = t.kind === 'practice' ? Boolean(s) : Boolean(s?.passed);
    } else if (t.kind === 'project') {
      const row = get(
        "SELECT 1 AS done FROM user_projects WHERE user_id = ? AND project_id = (SELECT id FROM projects WHERE slug = ?) AND status = 'done'",
        [plan.user_id, t.project_slug],
      );
      complete = Boolean(row);
    } else if (t.kind === 'revision') {
      complete = false;
    }
    if (complete) {
      run("UPDATE learning_plan_targets SET status = 'done', completed_at = ? WHERE id = ?", [new Date().toISOString(), t.id]);
      changed += 1;
    } else if (t.scheduled_for < today && t.status === 'pending') {
      run("UPDATE learning_plan_targets SET status = 'missed' WHERE id = ?", [t.id]);
      changed += 1;
    }
  }

  const done = get("SELECT COALESCE(SUM(minutes),0) AS m, COUNT(*) AS n FROM learning_plan_targets WHERE plan_id = ? AND status = 'done'", [planId]);
  const total = get('SELECT COALESCE(SUM(minutes),0) AS m, COUNT(*) AS n FROM learning_plan_targets WHERE plan_id = ?', [planId]);
  run('UPDATE learning_plans SET completed_minutes = ?, total_minutes = ?, updated_at = ? WHERE id = ?', [
    done.m,
    total.m,
    new Date().toISOString(),
    planId,
  ]);
  if (total.n > 0 && done.n === total.n) {
    run("UPDATE learning_plans SET status = 'completed', updated_at = ? WHERE id = ?", [new Date().toISOString(), planId]);
  }
  return { changed, doneMinutes: done.m, totalMinutes: total.m, doneCount: done.n, totalCount: total.n };
}

/** Move every pending target forward so a missed day does not pile up. */
export function rescheduleMissed(planId, today = isoDate(Date.now())) {
  const plan = get('SELECT * FROM learning_plans WHERE id = ?', [planId]);
  if (!plan) return null;
  const studyDays = JSON.parse(plan.study_days_json || '[1,2,3,4,5]');
  const missed = all("SELECT * FROM learning_plan_targets WHERE plan_id = ? AND status IN ('pending','missed') ORDER BY scheduled_for, id", [planId]);

  let cursor = today;
  const usedByDay = new Map();
  let moved = 0;

  for (const t of missed) {
    // find the next study day with room
    for (let guard = 0; guard < 30; guard += 1) {
      const dow = new Date(`${cursor}T00:00:00Z`).getUTCDay();
      const used = usedByDay.get(cursor) || 0;
      if (studyDays.includes(dow) && used + t.minutes <= plan.minutes_per_day) break;
      if (!studyDays.includes(dow) || used + t.minutes > plan.minutes_per_day) {
        cursor = addDays(cursor, 1);
        continue;
      }
    }
    usedByDay.set(cursor, (usedByDay.get(cursor) || 0) + t.minutes);
    if (t.scheduled_for !== cursor) {
      run("UPDATE learning_plan_targets SET scheduled_for = ?, status = 'pending', moved_from = COALESCE(moved_from, ?) WHERE id = ?", [
        cursor,
        t.scheduled_for,
        t.id,
      ]);
      moved += 1;
    } else if (t.status === 'missed') {
      run("UPDATE learning_plan_targets SET status = 'pending' WHERE id = ?", [t.id]);
    }
  }
  return { moved, from: today };
}

/** A week of work for the plan, with real completion state. */
export function planWeek(planId, startDate) {
  const plan = get('SELECT * FROM learning_plans WHERE id = ?', [planId]);
  if (!plan) return null;
  const end = addDays(startDate, 6);
  const targets = all(
    `SELECT t.*, l.slug AS lesson_slug FROM learning_plan_targets t
       LEFT JOIN lessons l ON l.id = t.lesson_id
      WHERE t.plan_id = ? AND t.scheduled_for BETWEEN ? AND ? ORDER BY t.scheduled_for, t.id`,
    [planId, startDate, end],
  );
  const days = [];
  for (let i = 0; i < 7; i += 1) {
    const date = addDays(startDate, i);
    const items = targets.filter((t) => t.scheduled_for === date);
    days.push({
      date,
      isStudyDay: JSON.parse(plan.study_days_json || '[]').includes(new Date(`${date}T00:00:00Z`).getUTCDay()),
      minutes: items.reduce((n, t) => n + t.minutes, 0),
      done: items.filter((t) => t.status === 'done').length,
      targets: items.map(shapeTarget),
    });
  }
  return { plan: shapePlan(plan), days };
}

export function shapePlan(plan) {
  const counts = get(
    `SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) AS done,
            SUM(CASE WHEN status = 'missed' THEN 1 ELSE 0 END) AS missed,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
            COALESCE(SUM(minutes), 0) AS minutes
       FROM learning_plan_targets WHERE plan_id = ?`,
    [plan.id],
  );
  return {
    id: plan.id,
    status: plan.status,
    minutesPerDay: plan.minutes_per_day,
    daysPerWeek: plan.days_per_week,
    studyDays: JSON.parse(plan.study_days_json || '[]'),
    startDate: plan.start_date,
    targetDate: plan.target_date,
    skillLevel: plan.skill_level,
    reminderTime: plan.reminder_time,
    timezone: plan.timezone,
    completedMinutes: plan.completed_minutes,
    totalMinutes: plan.total_minutes,
    targets: { total: counts.total || 0, done: counts.done || 0, missed: counts.missed || 0, pending: counts.pending || 0 },
    percent: counts.total ? Math.round(((counts.done || 0) / counts.total) * 100) : 0,
  };
}

export function shapeTarget(t) {
  return {
    id: t.id,
    date: t.scheduled_for,
    kind: t.kind,
    title: t.title,
    minutes: t.minutes,
    status: t.status,
    lessonId: t.lesson_id,
    lessonSlug: t.lesson_slug || null,
    assessmentId: t.assessment_id,
    projectSlug: t.project_slug || null,
    movedFrom: t.moved_from,
  };
}
