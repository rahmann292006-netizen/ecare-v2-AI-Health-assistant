/**
 * `/api/lessons/:id/quiz` — the knowledge check at the end of every lesson.
 *
 * The questions live in `.quiz.json` files beside the lesson content, keyed by
 * course / module / lesson slug. They are stored in the existing `questions` /
 * `question_options` tables: the schema already models a question attached to an
 * assessment, and a per-lesson check is an assessment of kind `final` owned by the
 * lesson's course. No new tables.
 *
 * Grading is server-side; the correct option never leaves the server before answer.
 */

import express from 'express';
import { get, all, run, nowIso } from '../db/index.js';
import { requireUser } from '../lib/context.js';
import { ok, notFound, badRequest, HttpError } from '../lib/http.js';
import { validate } from '../lib/validate.js';
import { limit } from '../lib/rate-limit.js';
import { awardFor } from '../lib/achievements.js';

const router = express.Router();
router.use(requireUser);

const KIND = 'lesson_quiz';

function lessonRow(id) {
  return get(
    `SELECT l.*, m.slug AS module_slug, m.title AS module_title, c.slug AS course_slug, c.title AS course_title, c.id AS course_id
       FROM lessons l
       JOIN course_modules m ON m.id = l.module_id
       JOIN courses c ON c.id = m.course_id
      WHERE l.id = ?`,
    [Number(id)],
  );
}

function quizAssessment(lesson) {
  return get('SELECT * FROM assessments WHERE course_id = ? AND title = ? AND kind = ?', [
    lesson.course_id,
    `Lesson check: ${lesson.slug}`,
    KIND,
  ]);
}

/** GET — the questions, with no answers attached. */
router.get('/:id/quiz', (req, res) => {
  const lesson = lessonRow(req.params.id);
  if (!lesson) throw notFound('That lesson does not exist.');
  const assessment = quizAssessment(lesson);
  if (!assessment) throw notFound('This lesson has no knowledge check yet.');

  const questions = all('SELECT id, prompt, sort_order FROM questions WHERE assessment_id = ? ORDER BY sort_order, id', [
    assessment.id,
  ]).map((q) => ({
    id: q.id,
    prompt: q.prompt,
    options: all('SELECT id, label FROM question_options WHERE question_id = ? ORDER BY sort_order, id', [q.id]),
  }));

  const last = get(
    'SELECT score, max_score, passed, submitted_at FROM submissions WHERE user_id = ? AND assessment_id = ? ORDER BY submitted_at DESC LIMIT 1',
    [req.user.id, assessment.id],
  );

  ok(res, {
    lesson: { id: lesson.id, slug: lesson.slug, title: lesson.title },
    questions,
    lastAttempt: last
      ? {
          score: last.score,
          maxScore: last.max_score,
          passed: Boolean(last.passed),
          submittedAt: last.submitted_at,
        }
      : null,
  });
});

/** POST — grade it, reveal the explanations, store the attempt. */
router.post('/:id/quiz', limit('lesson-quiz', 60, 60 * 60 * 1000), (req, res) => {
  const lesson = lessonRow(req.params.id);
  if (!lesson) throw notFound('That lesson does not exist.');
  const assessment = quizAssessment(lesson);
  if (!assessment) throw notFound('This lesson has no knowledge check yet.');

  const body = validate(req.body, {
    answers: { type: 'array', required: true, max: 50 },
  });

  const questions = all('SELECT * FROM questions WHERE assessment_id = ? ORDER BY sort_order, id', [assessment.id]);
  const byId = new Map(questions.map((q) => [q.id, q]));
  const chosen = new Map();
  for (const a of body.answers) {
    const qid = Number(a?.questionId);
    const oid = a?.optionId === null || a?.optionId === undefined ? null : Number(a.optionId);
    if (!byId.has(qid)) continue;
    if (oid !== null && !get('SELECT id FROM question_options WHERE id = ? AND question_id = ?', [oid, qid])) {
      throw badRequest('One of the answers does not belong to this knowledge check.');
    }
    chosen.set(qid, oid);
  }

  let score = 0;
  const review = questions.map((q) => {
    const options = all('SELECT * FROM question_options WHERE question_id = ? ORDER BY sort_order, id', [q.id]);
    const correct = options.find((o) => o.is_correct === 1)?.id ?? null;
    const picked = chosen.get(q.id) ?? null;
    const isCorrect = picked !== null && picked === correct;
    if (isCorrect) score += 1;
    return {
      questionId: q.id,
      prompt: q.prompt,
      explanation: q.explanation,
      picked,
      correct,
      isCorrect,
      options: options.map((o) => ({ id: o.id, label: o.label, isCorrect: o.is_correct === 1 })),
    };
  });

  const maxScore = questions.length;
  const passed = maxScore > 0 && score === maxScore;

  run(
    `INSERT INTO submissions (user_id, assessment_id, score, max_score, passed, answers_json, submitted_at, duration_seconds)
     VALUES (?,?,?,?,?,?,?,0)`,
    [req.user.id, assessment.id, score, maxScore, passed ? 1 : 0, JSON.stringify(Object.fromEntries(chosen)), nowIso()],
  );
  run('INSERT INTO activity_events (user_id, kind, ref_type, ref_id) VALUES (?,?,?,?)', [
    req.user.id,
    'lesson_quiz',
    'lesson',
    lesson.id,
  ]);

  const awarded = awardFor(req.user.id);
  ok(res, { score, maxScore, passed, review, awarded }, 201);
});

/** Seed helper: attach a quiz to a lesson from a `.quiz.json` definition. */
export function seedLessonQuiz({ courseSlug, moduleSlug, lessonSlug, questions }) {
  const lesson = get(
    `SELECT l.id, c.id AS course_id FROM lessons l
       JOIN course_modules m ON m.id = l.module_id JOIN courses c ON c.id = m.course_id
      WHERE c.slug = ? AND m.slug = ? AND l.slug = ?`,
    [courseSlug, moduleSlug, lessonSlug],
  );
  if (!lesson) throw new HttpError(404, 'no_lesson', `No lesson ${courseSlug}/${moduleSlug}/${lessonSlug}`);
  const title = `Lesson check: ${lessonSlug}`;
  let assessment = get('SELECT * FROM assessments WHERE course_id = ? AND title = ? AND kind = ?', [lesson.course_id, title, KIND]);
  if (!assessment) {
    const info = run(
      'INSERT INTO assessments (course_id, module_id, title, kind, pass_score, time_limit_minutes, sort_order) VALUES (?,?,?,?,?,?,?)',
      [lesson.course_id, null, title, KIND, 100, 5, 900],
    );
    assessment = get('SELECT * FROM assessments WHERE id = ?', [info.lastInsertRowid]);
  }
  run('DELETE FROM questions WHERE assessment_id = ?', [assessment.id]);
  questions.forEach((q, qi) => {
    // Content authors may write options as plain strings or as [label, isCorrect] pairs.
    const options = q.options.map((o) => (Array.isArray(o) ? { label: o[0], correct: Boolean(o[1]) } : { label: o, correct: false }));
    if (options.length < 2) throw new Error(`quiz question ${qi} needs at least two options`);
    if (q.correct !== undefined && (q.correct < 0 || q.correct >= options.length)) {
      throw new Error(`quiz question ${qi} points at a missing option`);
    }
    if (!options.some((o) => o.correct) && q.correct === undefined) {
      throw new Error(`quiz question ${qi} has no correct option`);
    }
    if (q.correct !== undefined) options.forEach((o, oi) => { o.correct = oi === q.correct; });
    const info = run('INSERT INTO questions (assessment_id, prompt, explanation, sort_order) VALUES (?,?,?,?)', [
      assessment.id,
      q.prompt,
      q.explanation || '',
      qi,
    ]);
    const qid = info.lastInsertRowid;
    options.forEach((option, oi) => {
      run('INSERT INTO question_options (question_id, label, is_correct, sort_order) VALUES (?,?,?,?)', [
        qid,
        option.label,
        option.correct ? 1 : 0,
        oi,
      ]);
    });
  });
  return assessment.id;
}

export default router;
