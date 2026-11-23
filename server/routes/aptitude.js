import express from 'express';
import { all, get, run, nowIso } from '../db/index.js';
import { requireUser } from '../lib/context.js';
import { ok, notFound, badRequest, HttpError } from '../lib/http.js';
import { validate } from '../lib/validate.js';
import { limit } from '../lib/rate-limit.js';
import { awardFor } from '../lib/achievements.js';

const router = express.Router();
router.use(requireUser);

/** Topics with the user's own accuracy, so the UI shows real numbers only. */
router.get('/topics', (req, res) => {
  const topics = all('SELECT * FROM aptitude_topics ORDER BY sort_order');
  const stats = all(
    `SELECT q.topic_id, COUNT(*) AS answered, SUM(a.is_correct) AS correct
       FROM aptitude_answers a
       JOIN aptitude_attempts at ON at.id = a.attempt_id
       JOIN aptitude_questions q ON q.id = a.question_id
      WHERE at.user_id = ? GROUP BY q.topic_id`,
    [req.user.id],
  );
  const byTopic = new Map(stats.map((s) => [s.topic_id, s]));
  const counts = all('SELECT topic_id, COUNT(*) AS n FROM aptitude_questions GROUP BY topic_id');
  const countByTopic = new Map(counts.map((c) => [c.topic_id, c.n]));

  ok(res, {
    topics: topics.map((t) => {
      const s = byTopic.get(t.id);
      return {
        slug: t.slug,
        title: t.title,
        category: t.category,
        description: t.description,
        questionCount: countByTopic.get(t.id) || 0,
        answered: s?.answered || 0,
        correct: s?.correct || 0,
        accuracy: s?.answered ? Math.round((s.correct / s.answered) * 100) : null,
      };
    }),
    categories: ['quant', 'logical', 'verbal', 'di', 'placement'],
  });
});

router.get('/topics/:slug', (req, res) => {
  const t = get('SELECT * FROM aptitude_topics WHERE slug = ?', [req.params.slug]);
  if (!t) throw notFound('That topic does not exist.');
  const s = get(
    `SELECT COUNT(*) AS answered, SUM(a.is_correct) AS correct FROM aptitude_answers a
       JOIN aptitude_attempts at ON at.id = a.attempt_id
       JOIN aptitude_questions q ON q.id = a.question_id
      WHERE at.user_id = ? AND q.topic_id = ?`,
    [req.user.id, t.id],
  );
  const attempts = all(
    'SELECT id, kind, score, total, started_at, finished_at, duration_seconds FROM aptitude_attempts WHERE user_id = ? AND topic_id = ? ORDER BY started_at DESC LIMIT 10',
    [req.user.id, t.id],
  );
  ok(res, {
    topic: { slug: t.slug, title: t.title, category: t.category, description: t.description, lesson: t.lesson_md },
    questionCount: get('SELECT COUNT(*) AS n FROM aptitude_questions WHERE topic_id = ?', [t.id]).n,
    performance: { answered: s.answered || 0, correct: s.correct || 0, accuracy: s.answered ? Math.round((s.correct / s.answered) * 100) : null },
    attempts,
  });
});

/**
 * Start a practice set or a timed mock.
 * The question payload never includes correct answers; marking happens server-side.
 */
router.post('/attempts', limit('aptitude-start', 30, 60 * 60 * 1000), (req, res) => {
  const body = validate(req.body, {
    kind: { type: 'enum', values: ['practice', 'mock'], required: true },
    topicSlug: { type: 'string', max: 60 },
    count: { type: 'int', min: 3, max: 40, default: 10 },
    difficulty: { type: 'enum', values: ['easy', 'medium', 'hard', 'mixed'], default: 'mixed' },
  });

  const topic = body.topicSlug ? get('SELECT * FROM aptitude_topics WHERE slug = ?', [body.topicSlug]) : null;
  if (body.topicSlug && !topic) throw notFound('That topic does not exist.');
  if (body.kind === 'practice' && !topic) throw badRequest('Choose a topic for practice.');

  const where = [];
  const params = [];
  if (topic) {
    where.push('q.topic_id = ?');
    params.push(topic.id);
  }
  if (body.difficulty !== 'mixed') {
    where.push('q.difficulty = ?');
    params.push(body.difficulty);
  }
  const pool = all(
    `SELECT q.id, q.prompt, q.options_json, q.difficulty, q.topic_id, t.title AS topic_title, t.slug AS topic_slug
       FROM aptitude_questions q JOIN aptitude_topics t ON t.id = q.topic_id
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY RANDOM() LIMIT ?`,
    [...params, body.count],
  );
  if (!pool.length) throw new HttpError(409, 'no_questions', 'No questions match that selection yet.');

  const info = run(
    'INSERT INTO aptitude_attempts (user_id, kind, topic_id, total, config_json) VALUES (?,?,?,?,?)',
    [req.user.id, body.kind, topic?.id || null, pool.length,
      JSON.stringify({ count: pool.length, difficulty: body.difficulty, questionIds: pool.map((q) => q.id) })],
  );
  const attempt = get('SELECT * FROM aptitude_attempts WHERE id = ?', [info.lastInsertRowid]);
  const minutes = body.kind === 'mock' ? Math.max(10, Math.ceil(pool.length * 1.2)) : null;

  ok(res, {
    attempt: {
      id: attempt.id,
      kind: attempt.kind,
      startedAt: attempt.started_at,
      timeLimitSeconds: minutes ? minutes * 60 : null,
      total: pool.length,
    },
    questions: pool.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      options: JSON.parse(q.options_json),
      difficulty: q.difficulty,
      topic: { slug: q.topic_slug, title: q.topic_title },
    })),
  }, 201);
});

router.post('/attempts/:id/submit', (req, res) => {
  const attempt = get('SELECT * FROM aptitude_attempts WHERE id = ? AND user_id = ?', [Number(req.params.id), req.user.id]);
  if (!attempt) throw notFound('That attempt does not exist.');
  if (attempt.finished_at) throw badRequest('This attempt was already submitted.');

  const config = JSON.parse(attempt.config_json);
  const answers = Array.isArray(req.body?.answers) ? req.body.answers : [];
  const questionIds = new Set(config.questionIds || []);
  const startedMs = new Date(attempt.started_at).getTime();
  const durationSeconds = Math.max(0, Math.round((Date.now() - startedMs) / 1000));

  let score = 0;
  const review = [];
  for (const answer of answers) {
    const qid = Number(answer?.questionId);
    if (!questionIds.has(qid)) continue;
    const q = get('SELECT * FROM aptitude_questions WHERE id = ?', [qid]);
    if (!q) continue;
    const chosen = Number.isInteger(answer.chosenIndex) ? answer.chosenIndex : null;
    const isCorrect = chosen !== null && chosen === q.correct_index;
    if (isCorrect) score += 1;
    run(
      `INSERT INTO aptitude_answers (attempt_id, question_id, chosen_index, is_correct, time_ms) VALUES (?,?,?,?,?)
       ON CONFLICT(attempt_id, question_id) DO UPDATE SET chosen_index = excluded.chosen_index, is_correct = excluded.is_correct`,
      [attempt.id, qid, chosen, isCorrect ? 1 : 0, Number(answer.timeMs) || 0],
    );
    review.push({
      questionId: qid,
      prompt: q.prompt,
      options: JSON.parse(q.options_json),
      chosenIndex: chosen,
      correctIndex: q.correct_index,
      correct: isCorrect,
      explanation: q.explanation,
      difficulty: q.difficulty,
    });
  }

  run('UPDATE aptitude_attempts SET finished_at = ?, score = ?, duration_seconds = ? WHERE id = ?',
    [nowIso(), score, durationSeconds, attempt.id]);
  run('INSERT INTO activity_events (user_id, kind, ref_type, ref_id, minutes) VALUES (?,?,?,?,?)',
    [req.user.id, attempt.kind === 'mock' ? 'mock_exam' : 'aptitude_practice', 'aptitude_attempt', attempt.id, Math.round(durationSeconds / 60)]);
  const awarded = awardFor(req.user.id);

  ok(res, {
    attemptId: attempt.id,
    score,
    total: attempt.total,
    percent: attempt.total ? Math.round((score / attempt.total) * 100) : 0,
    durationSeconds,
    review,
    awarded,
  });
});

router.get('/attempts', (req, res) => {
  const rows = all(
    `SELECT a.*, t.title AS topic_title, t.slug AS topic_slug FROM aptitude_attempts a
       LEFT JOIN aptitude_topics t ON t.id = a.topic_id
      WHERE a.user_id = ? ORDER BY a.started_at DESC LIMIT 30`,
    [req.user.id],
  );
  ok(res, {
    attempts: rows.map((r) => ({
      id: r.id, kind: r.kind, topic: r.topic_slug ? { slug: r.topic_slug, title: r.topic_title } : null,
      score: r.score, total: r.total, startedAt: r.started_at, finishedAt: r.finished_at, durationSeconds: r.duration_seconds,
      percent: r.total && r.finished_at ? Math.round((r.score / r.total) * 100) : null,
    })),
  });
});

router.get('/attempts/:id', (req, res) => {
  const attempt = get('SELECT * FROM aptitude_attempts WHERE id = ? AND user_id = ?', [Number(req.params.id), req.user.id]);
  if (!attempt) throw notFound('That attempt does not exist.');
  const answers = all(
    `SELECT a.*, q.prompt, q.options_json, q.correct_index, q.explanation FROM aptitude_answers a
       JOIN aptitude_questions q ON q.id = a.question_id WHERE a.attempt_id = ? ORDER BY a.id`,
    [attempt.id],
  );
  ok(res, {
    attempt: {
      id: attempt.id, kind: attempt.kind, score: attempt.score, total: attempt.total,
      startedAt: attempt.started_at, finishedAt: attempt.finished_at, durationSeconds: attempt.duration_seconds,
    },
    review: answers.map((a) => ({
      questionId: a.question_id, prompt: a.prompt, options: JSON.parse(a.options_json),
      chosenIndex: a.chosen_index, correctIndex: a.correct_index, correct: Boolean(a.is_correct), explanation: a.explanation,
    })),
  });
});

export default router;
