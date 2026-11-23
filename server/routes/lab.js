import express from 'express';
import { all, get, run, nowIso } from '../db/index.js';
import { requireUser } from '../lib/context.js';
import { ok, notFound, HttpError, badRequest } from '../lib/http.js';
import { validate } from '../lib/validate.js';
import { limit } from '../lib/rate-limit.js';
import { execute, runTests, health as sandboxHealth, normaliseOutput } from '../sandbox/index.js';

const router = express.Router();

/** Public: the UI must be able to say honestly whether code execution works. */
router.get('/health', (_req, res) => {
  sandboxHealth().then((h) => ok(res, h));
});

router.use(requireUser);

router.get('/exercises', (req, res) => {
  const rows = all(
    `SELECT e.slug, e.title, e.difficulty, e.language, c.slug AS course_slug, c.title AS course_title
       FROM exercises e JOIN courses c ON c.id = e.course_id ORDER BY c.sort_order, e.sort_order`,
  );
  const passed = new Map(
    all(
      `SELECT exercise_id, MAX(CASE WHEN tests_total > 0 AND tests_passed = tests_total THEN 1 ELSE 0 END) AS ok
         FROM coding_sessions WHERE user_id = ? AND exercise_id IS NOT NULL GROUP BY exercise_id`,
      [req.user.id],
    ).map((r) => [r.exercise_id, r.ok]),
  );
  ok(res, {
    exercises: rows.map((r) => ({ ...r, solved: Boolean(passed.get(r.slug)) })),
  });
});

router.get('/exercises/:slug', (req, res) => {
  const e = get(
    `SELECT e.*, c.slug AS course_slug, c.title AS course_title FROM exercises e
       JOIN courses c ON c.id = e.course_id WHERE e.slug = ?`,
    [req.params.slug],
  );
  if (!e) throw notFound('That exercise does not exist.');
  const tests = JSON.parse(e.test_json);
  const best = get(
    `SELECT MAX(tests_passed) AS passed, MAX(tests_total) AS total, COUNT(*) AS attempts
       FROM coding_sessions WHERE user_id = ? AND exercise_id = ?`,
    [req.user.id, e.id],
  );
  ok(res, {
    exercise: {
      slug: e.slug,
      title: e.title,
      difficulty: e.difficulty,
      language: e.language,
      prompt: e.prompt_md,
      starterCode: e.starter_code,
      course: { slug: e.course_slug, title: e.course_title },
      // Only the shape of the tests is shown; expected outputs stay hidden so the
      // exercise remains a test of understanding rather than of guessing.
      testCount: tests.length,
    },
    best: { passed: best?.passed ?? 0, total: best?.total ?? tests.length, attempts: best?.attempts ?? 0 },
  });
});

router.post('/run', limit('lab-run', 40, 60 * 1000), async (req, res) => {
  const body = validate(req.body, {
    language: { type: 'enum', values: ['python', 'javascript'], required: true },
    source: { type: 'string', required: true, max: 100_000 },
    stdin: { type: 'string', max: 20_000 },
    exerciseSlug: { type: 'string', max: 120 },
  });
  const result = await execute({ language: body.language, source: body.source, stdin: body.stdin || '' });
  if (!result.ok) throw new HttpError(result.error.code === 'sandbox_unavailable' ? 503 : 400, result.error.code, result.error.message);

  const exercise = body.exerciseSlug ? get('SELECT id FROM exercises WHERE slug = ?', [body.exerciseSlug]) : null;
  run(
    `INSERT INTO coding_sessions (user_id, exercise_id, language, code, stdin, stdout, stderr, exit_code, status, duration_ms)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [req.user.id, exercise?.id || null, body.language, body.source, body.stdin || '', result.data.stdout,
      result.data.stderr, result.data.exitCode, result.data.timedOut ? 'timeout' : result.data.exitCode === 0 ? 'ok' : 'error',
      result.data.durationMs],
  );
  run('INSERT INTO activity_events (user_id, kind, ref_type, ref_id) VALUES (?,?,?,?)', [req.user.id, 'code_run', 'lab', null]);
  ok(res, result.data);
});

router.post('/submit', limit('lab-submit', 20, 60 * 1000), async (req, res) => {
  const body = validate(req.body, {
    exerciseSlug: { type: 'string', required: true, max: 120 },
    source: { type: 'string', required: true, max: 100_000 },
  });
  const e = get('SELECT * FROM exercises WHERE slug = ?', [body.exerciseSlug]);
  if (!e) throw notFound('That exercise does not exist.');
  const tests = JSON.parse(e.test_json);
  if (!tests.length) throw badRequest('This exercise has no automated tests.');

  const result = await runTests({ language: e.language, source: body.source, tests });
  if (!result.ok) throw new HttpError(503, result.error.code, result.error.message);

  run(
    `INSERT INTO coding_sessions (user_id, exercise_id, language, code, stdout, stderr, exit_code, status, tests_passed, tests_total, duration_ms)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [req.user.id, e.id, e.language, body.source, result.data.results.map((r) => `# test ${r.passed ? 'passed' : 'failed'}: ${r.actual}`).join('\n'),
      '', result.data.allPassed ? 0 : 1, result.data.allPassed ? 'ok' : 'error', result.data.passed, result.data.total, 0],
  );

  if (result.data.allPassed) {
    run('INSERT INTO activity_events (user_id, kind, ref_type, ref_id) VALUES (?,?,?,?)', [req.user.id, 'exercise_passed', 'exercise', e.id]);
  }
  const { awardFor } = await import('../lib/achievements.js');
  const awarded = awardFor(req.user.id);
  ok(res, { ...result.data, awarded });
});

router.get('/history', (req, res) => {
  const rows = all(
    `SELECT s.id, s.language, s.status, s.tests_passed, s.tests_total, s.created_at, e.slug AS exercise_slug, e.title AS exercise_title
       FROM coding_sessions s LEFT JOIN exercises e ON e.id = s.exercise_id
      WHERE s.user_id = ? ORDER BY s.created_at DESC LIMIT 30`,
    [req.user.id],
  );
  ok(res, { history: rows });
});

export { normaliseOutput };
export default router;
