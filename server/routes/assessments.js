import express from 'express';
import { get, all, run, nowIso } from '../db/index.js';
import { requireUser } from '../lib/context.js';
import { ok, notFound, badRequest, conflict, forbidden, HttpError } from '../lib/http.js';
import { validate } from '../lib/validate.js';
import { limit } from '../lib/rate-limit.js';
import { awardFor } from '../lib/achievements.js';
import { refreshRecommendations } from '../lib/recommendations.js';

/**
 * Checkpoint assessments.
 *
 * Design notes that matter for correctness:
 *  - Correct answers are never sent before submission. The question payload carries
 *    only prompt + options; scoring happens on the server.
 *  - A checkpoint may only be attempted when the lessons of its module are complete,
 *    so a score reflects study rather than guessing.
 *  - Every attempt is stored as a `submissions` row (score, max_score, passed,
 *    answers_json, started_at, duration_seconds) so the same row feeds analytics,
 *    the course page and the dashboard without duplicating state.
 *  - Explanations and correct answers are returned after submission: the checkpoint
 *    is a learning instrument, not a proctored exam.
 */

const router = express.Router();
router.use(requireUser);

const MIN_DURATION_FLOOR_SECONDS = 15;

function assessmentRow(id) {
  return get(
    `SELECT a.*, c.slug AS course_slug, c.title AS course_title, m.slug AS module_slug, m.title AS module_title
       FROM assessments a
       JOIN courses c ON c.id = a.course_id
       LEFT JOIN course_modules m ON m.id = a.module_id
      WHERE a.id = ?`,
    [Number(id)],
  );
}

function questionsFor(assessmentId) {
  const rows = all('SELECT * FROM questions WHERE assessment_id = ? ORDER BY sort_order, id', [assessmentId]);
  return rows.map((q) => ({
    id: q.id,
    prompt: q.prompt,
    explanation: q.explanation,
    options: all('SELECT id, label FROM question_options WHERE question_id = ? ORDER BY sort_order, id', [q.id]),
    correctOptionId: get('SELECT id FROM question_options WHERE question_id = ? AND is_correct = 1 ORDER BY sort_order LIMIT 1', [q.id])?.id ?? null,
  }));
}

/** Progress gate: a checkpoint opens once every lesson in its module is completed. */
function gateFor(assessment, userId) {
  if (!assessment.module_id) return { open: true, required: 0, completed: 0 };
  const total = get(
    'SELECT COUNT(*) AS n FROM lessons WHERE module_id = ?',
    [assessment.module_id],
  ).n;
  const completed = get(
    `SELECT COUNT(*) AS n FROM lesson_progress p JOIN lessons l ON l.id = p.lesson_id
      WHERE l.module_id = ? AND p.user_id = ? AND p.status = 'completed'`,
    [assessment.module_id, userId],
  ).n;
  return { open: total === 0 || completed >= total, required: total, completed };
}

function bestFor(assessmentId, userId) {
  // The best attempt is the row with the highest score; percentages are derived from
  // that same row so the course card and the analytics page always agree.
  const best = get(
    `SELECT score, max_score, passed FROM submissions
      WHERE user_id = ? AND assessment_id = ?
      ORDER BY score DESC, submitted_at DESC LIMIT 1`,
    [userId, assessmentId],
  );
  const attempts = get('SELECT COUNT(*) AS n FROM submissions WHERE user_id = ? AND assessment_id = ?', [userId, assessmentId]).n;
  return {
    bestScore: best ? best.score : null,
    maxScore: best ? best.max_score : null,
    bestPercent: best && best.max_score ? Math.round((best.score / best.max_score) * 100) : null,
    passed: Boolean(best?.passed),
    attempts,
  };
}

function canRevealAnswers(assessment) {
  // Everything here is a learning checkpoint; explanations are part of the value.
  return assessment.kind === 'module' || assessment.kind === 'final';
}

/** GET /api/assessments/course/:slug — checkpoints for a course with the learner's standing. */
router.get('/course/:slug', (req, res) => {
  const course = get('SELECT * FROM courses WHERE slug = ?', [req.params.slug]);
  if (!course) throw notFound('That course does not exist.');
  const rows = all('SELECT * FROM assessments WHERE course_id = ? ORDER BY sort_order, id', [course.id]);
  ok(res, {
    course: { slug: course.slug, title: course.title },
    assessments: rows.map((a) => ({
      id: a.id,
      title: a.title,
      kind: a.kind,
      passScore: a.pass_score,
      timeLimitMinutes: a.time_limit_minutes,
      questionCount: get('SELECT COUNT(*) AS n FROM questions WHERE assessment_id = ?', [a.id]).n,
      gate: gateFor(a, req.user.id),
      ...bestFor(a.id, req.user.id),
    })),
  });
});

/** GET /api/assessments/mine — every attempt, newest first (analytics + profile). */
router.get('/mine', (req, res) => {
  const rows = all(
    `SELECT s.id, s.score, s.max_score, s.passed, s.submitted_at, s.duration_seconds,
            a.title, a.pass_score, c.slug AS course_slug, c.title AS course_title
       FROM submissions s
       JOIN assessments a ON a.id = s.assessment_id
       JOIN courses c ON c.id = a.course_id
      WHERE s.user_id = ? ORDER BY s.submitted_at DESC LIMIT 50`,
    [req.user.id],
  );
  ok(res, {
    attempts: rows.map((r) => ({
      id: r.id,
      title: r.title,
      course: { slug: r.course_slug, title: r.course_title },
      score: r.score,
      maxScore: r.max_score,
      percent: r.max_score ? Math.round((r.score / r.max_score) * 100) : 0,
      passed: Boolean(r.passed),
      passScore: r.pass_score,
      submittedAt: r.submitted_at,
      durationSeconds: r.duration_seconds,
    })),
  });
});

/** GET /api/assessments/:id — the attempt payload. Correct answers are not included. */
router.get('/:id', (req, res) => {
  const assessment = assessmentRow(req.params.id);
  if (!assessment) throw notFound('That checkpoint does not exist.');
  const questions = questionsFor(assessment.id);
  if (!questions.length) throw new HttpError(409, 'empty_assessment', 'This checkpoint has no questions yet.');

  const gate = gateFor(assessment, req.user.id);
  const history = all(
    `SELECT id, score, max_score, passed, submitted_at, duration_seconds
       FROM submissions WHERE user_id = ? AND assessment_id = ? ORDER BY submitted_at DESC LIMIT 10`,
    [req.user.id, assessment.id],
  );

  ok(res, {
    assessment: {
      id: assessment.id,
      title: assessment.title,
      kind: assessment.kind,
      passScore: assessment.pass_score,
      timeLimitMinutes: assessment.time_limit_minutes,
      course: { slug: assessment.course_slug, title: assessment.course_title },
      module: assessment.module_slug ? { slug: assessment.module_slug, title: assessment.module_title } : null,
    },
    gate,
    // Options are shuffled per request so position is not a clue; the ids travel with them.
    questions: questions.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      options: shuffle(q.options.map((o) => ({ id: o.id, label: o.label }))),
    })),
    history: history.map((h) => ({
      id: h.id,
      score: h.score,
      maxScore: h.max_score,
      passed: Boolean(h.passed),
      submittedAt: h.submitted_at,
      durationSeconds: h.duration_seconds,
      percent: h.max_score ? Math.round((h.score / h.max_score) * 100) : 0,
    })),
    ...bestFor(assessment.id, req.user.id),
  });
});

function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * POST /api/assessments/:id/submit
 * body: { answers: [{ questionId, optionId }], startedAt?: ISO, durationSeconds?: number }
 */
router.post('/:id/submit', limit('assessment-submit', 20, 60 * 60 * 1000), (req, res) => {
  const assessment = assessmentRow(req.params.id);
  if (!assessment) throw notFound('That checkpoint does not exist.');

  const body = validate(req.body, {
    answers: { type: 'array', required: true, max: 200 },
    startedAt: { type: 'string', max: 40 },
    durationSeconds: { type: 'int', min: 0, max: 86_400 },
  });

  const gate = gateFor(assessment, req.user.id);
  if (!gate.open) {
    throw forbidden(
      `Finish this checkpoint's lessons first — ${gate.completed} of ${gate.required} are complete.`,
    );
  }

  const questions = questionsFor(assessment.id);
  if (!questions.length) throw new HttpError(409, 'empty_assessment', 'This checkpoint has no questions yet.');

  const byQuestion = new Map(questions.map((q) => [q.id, q]));
  const chosen = new Map();
  for (const answer of body.answers) {
    const questionId = Number(answer?.questionId);
    const optionId = answer?.optionId === null || answer?.optionId === undefined ? null : Number(answer.optionId);
    if (!byQuestion.has(questionId)) continue;
    if (optionId !== null && !byQuestion.get(questionId).options.some((o) => o.id === optionId)) {
      throw badRequest('One of the submitted answers does not belong to this checkpoint.');
    }
    chosen.set(questionId, optionId);
  }

  let score = 0;
  const review = questions.map((q) => {
    const picked = chosen.get(q.id) ?? null;
    const correct = picked !== null && picked === q.correctOptionId;
    if (correct) score += 1;
    return {
      questionId: q.id,
      prompt: q.prompt,
      explanation: canRevealAnswers(assessment) ? q.explanation : null,
      options: q.options.map((o) => ({ id: o.id, label: o.label, correct: o.id === q.correctOptionId })),
      chosenOptionId: picked,
      correctOptionId: canRevealAnswers(assessment) ? q.correctOptionId : null,
      correct,
    };
  });

  const maxScore = questions.length;
  const percent = maxScore ? Math.round((score / maxScore) * 100) : 0;
  const passed = percent >= assessment.pass_score;

  const startedAt = body.startedAt && !Number.isNaN(Date.parse(body.startedAt)) ? body.startedAt : null;
  let duration = body.durationSeconds;
  if (duration === undefined) {
    duration = startedAt ? Math.max(0, Math.round((Date.now() - Date.parse(startedAt)) / 1000)) : 0;
  }
  // A submission that arrives faster than a person can read the questions is treated
  // as zero time, so study minutes are never inflated.
  if (duration < MIN_DURATION_FLOOR_SECONDS && questions.length > 1) duration = 0;

  const answersJson = JSON.stringify(
    Object.fromEntries([...chosen.entries()].map(([questionId, optionId]) => [String(questionId), optionId])),
  );

  const info = run(
    `INSERT INTO submissions (user_id, assessment_id, score, max_score, passed, answers_json, started_at, submitted_at, duration_seconds)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [req.user.id, assessment.id, score, maxScore, passed ? 1 : 0, answersJson, startedAt, nowIso(), duration],
  );

  run('INSERT OR IGNORE INTO enrollments (user_id, course_id) VALUES (?,?)', [req.user.id, assessment.course_id]);
  run(
    'INSERT INTO activity_events (user_id, kind, ref_type, ref_id, minutes) VALUES (?,?,?,?,?)',
    [req.user.id, passed ? 'assessment_passed' : 'assessment_submitted', 'assessment', assessment.id,
      Math.max(0, Math.round(duration / 60))],
  );

  const awarded = awardFor(req.user.id);
  refreshRecommendations(req.user.id);

  const submission = get('SELECT * FROM submissions WHERE id = ?', [info.lastInsertRowid]);
  const attemptsSoFar = get(
    'SELECT COUNT(*) AS n FROM submissions WHERE user_id = ? AND assessment_id = ?',
    [req.user.id, assessment.id],
  ).n;

  ok(
    res,
    {
      submission: {
        id: submission.id,
        assessmentId: assessment.id,
        score,
        maxScore,
        percent,
        passed,
        passScore: assessment.pass_score,
        submittedAt: submission.submitted_at,
        durationSeconds: duration,
        attempt: attemptsSoFar,
      },
      review,
      answeredCount: [...chosen.values()].filter((v) => v !== null).length,
      ...bestFor(assessment.id, req.user.id),
      awarded,
      // What this attempt changed for the learner's path.
      next: {
        courseSlug: assessment.course_slug,
        lessonSlug: nextLessonSlug(assessment, req.user.id),
      },
    },
    201,
  );
});

function nextLessonSlug(assessment, userId) {
  const row = get(
    `SELECT l.slug FROM lessons l JOIN course_modules m ON m.id = l.module_id
      WHERE m.course_id = ?
        AND l.id NOT IN (SELECT lesson_id FROM lesson_progress WHERE user_id = ? AND status = 'completed')
      ORDER BY m.sort_order, l.sort_order LIMIT 1`,
    [assessment.course_id, userId],
  );
  return row?.slug || null;
}

/** GET /api/assessments/submissions/:id — one stored attempt, with its review. */
router.get('/submissions/:id', (req, res) => {
  const submission = get('SELECT * FROM submissions WHERE id = ? AND user_id = ?', [Number(req.params.id), req.user.id]);
  if (!submission) throw notFound('That attempt does not exist.');
  const assessment = assessmentRow(submission.assessment_id);
  if (!assessment) throw notFound('That checkpoint no longer exists.');

  const answers = JSON.parse(submission.answers_json || '{}');
  const questions = questionsFor(assessment.id);
  const review = questions.map((q) => {
    const picked = answers[String(q.id)] ?? null;
    return {
      questionId: q.id,
      prompt: q.prompt,
      explanation: canRevealAnswers(assessment) ? q.explanation : null,
      options: q.options.map((o) => ({ id: o.id, label: o.label, correct: o.id === q.correctOptionId })),
      chosenOptionId: picked,
      correctOptionId: canRevealAnswers(assessment) ? q.correctOptionId : null,
      correct: picked !== null && picked === q.correctOptionId,
    };
  });

  ok(res, {
    submission: {
      id: submission.id,
      assessmentId: assessment.id,
      title: assessment.title,
      course: { slug: assessment.course_slug, title: assessment.course_title },
      score: submission.score,
      maxScore: submission.max_score,
      percent: submission.max_score ? Math.round((submission.score / submission.max_score) * 100) : 0,
      passed: Boolean(submission.passed),
      passScore: assessment.pass_score,
      submittedAt: submission.submitted_at,
      durationSeconds: submission.duration_seconds,
    },
    review,
  });
});

export default router;
