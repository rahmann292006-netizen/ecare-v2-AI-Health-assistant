/**
 * Competitions API — events, registration, timed attempts, grading and results.
 *
 * Nothing here is simulated: a code challenge is graded by the sandbox that runs real
 * processes, a quiz answer key never leaves the server, and results appear only when
 * the organiser publishes them.
 */
import express from 'express';
import { all, get, run } from '../db/index.js';
import { requireUser } from '../lib/context.js';
import { ok, notFound, badRequest, forbidden, conflict } from '../lib/http.js';
import { limit } from '../lib/rate-limit.js';
import { runTests } from '../sandbox/index.js';
import {
  VISIBLE_STATUSES,
  shapeCompetition,
  phaseOf,
  isLive,
  register,
  computeResults,
  leaderboard,
} from '../lib/competitions.js';
import { notify } from '../lib/notify.js';

const router = express.Router();

function eventRow(slug) {
  const c = get('SELECT * FROM competitions WHERE slug = ?', [slug]);
  if (!c) throw notFound('That event does not exist.');
  if (!VISIBLE_STATUSES.includes(c.status)) throw notFound('That event does not exist.');
  return c;
}

/** List events. Public: a learner can see what is coming before signing in. */
router.get('/', (req, res) => {
  const now = new Date();
  const rows = all(
    `SELECT * FROM competitions WHERE status IN (${VISIBLE_STATUSES.map(() => '?').join(',')})
      ORDER BY COALESCE(starts_at, registration_opens_at, created_at) DESC`,
    VISIBLE_STATUSES,
  );
  const shaped = rows.map((c) => shapeCompetition(c, { userId: req.user?.id ?? null }));
  ok(res, {
    events: shaped,
    open: shaped.filter((e) => e.phase === 'registration'),
    live: shaped.filter((e) => e.phase === 'live'),
    now: now.toISOString(),
  });
});

/** One event with its challenges. Tests and answer keys are stripped. */
router.get('/:slug', (req, res) => {
  const c = eventRow(req.params.slug);
  const shaped = shapeCompetition(c, { userId: req.user?.id ?? null });
  const challenges = all(
    'SELECT id, slug, title, prompt_md, language, starter_code, points, options_json, test_json, sort_order FROM competition_challenges WHERE competition_id = ? ORDER BY sort_order',
    [c.id],
  );

  // Who may see the full challenge: the organiser at any time (they wrote it), and a
  // registered learner while the event is running. Everyone else sees titles only.
  const isOrganiser = req.user?.role === 'admin' || req.user?.role === 'moderator';
  const canAttempt = Boolean(req.user) && shaped.registered && shaped.phase === 'live';
  const canSeeContent = canAttempt || isOrganiser;
  const mySubs = req.user
    ? all(
        'SELECT challenge_id, MAX(score) AS score, MAX(passed) AS passed, COUNT(*) AS attempts FROM competition_submissions WHERE competition_id = ? AND user_id = ? GROUP BY challenge_id',
        [c.id, req.user.id],
      )
    : [];
  const byChallenge = new Map(mySubs.map((s) => [s.challenge_id, s]));

  ok(res, {
    event: shaped,
    canAttempt,
    challenges: challenges.map((ch) => {
      const mine = byChallenge.get(ch.id);
      const base = {
        slug: ch.slug,
        title: ch.title,
        points: ch.points,
        language: ch.language,
        order: ch.sort_order,
        answered: Boolean(mine),
        myScore: mine?.score ?? null,
        myAttempts: mine?.attempts ?? 0,
      };
      if (!canSeeContent) {
        // before the event opens: the title is enough to know what is coming
        return base;
      }
      if (c.format === 'quiz') {
        const options = JSON.parse(ch.options_json || '[]');
        return { ...base, prompt: ch.prompt_md, options };
      }
      return { ...base, prompt: ch.prompt_md, starterCode: ch.starter_code, testCount: JSON.parse(ch.test_json || '[]').length };
    }),
    results: shaped.phase === 'published' ? leaderboard(c.id) : null,
  });
});

router.post('/:slug/register', requireUser, (req, res) => {
  const c = eventRow(req.params.slug);
  const result = register(c, req.user.id);
  if (!result.ok) throw conflict(result.message, result.code);
  notify({
    userId: req.user.id,
    kind: 'competition_registration',
    category: 'event',
    title: `You are registered for ${c.title}`,
    body: c.starts_at ? `It starts ${c.starts_at}. We will remind you the day before.` : 'It opens soon.',
    link: `/events/${c.slug}`,
    dedupeKey: `comp-reg:${c.slug}`,
  });
  ok(res, { registered: true, already: result.already }, result.already ? 200 : 201);
});

router.delete('/:slug/register', requireUser, (req, res) => {
  const c = eventRow(req.params.slug);
  const row = get('SELECT * FROM competition_registrations WHERE competition_id = ? AND user_id = ?', [c.id, req.user.id]);
  if (!row || row.withdrawn_at) throw notFound('You are not registered for this event.');
  if (phaseOf(c) !== 'registration') throw conflict('You can only withdraw before registration closes.', 'too_late');
  run('UPDATE competition_registrations SET withdrawn_at = ? WHERE id = ?', [new Date().toISOString(), row.id]);
  ok(res, { withdrawn: true });
});

/** Submit one challenge (code or quiz answer). Graded immediately, server-side. */
router.post('/:slug/challenges/:challengeSlug', requireUser, limit('competition-submit', 30, 60 * 1000), async (req, res) => {
  const c = eventRow(req.params.slug);
  const shaped = shapeCompetition(c, { userId: req.user.id });
  if (!shaped.registered) throw forbidden('Register for this event before submitting.');
  if (!isLive(c)) throw conflict('This event is not open for submissions right now.', 'not_live');

  const challenge = get('SELECT * FROM competition_challenges WHERE competition_id = ? AND slug = ?', [c.id, req.params.challengeSlug]);
  if (!challenge) throw notFound('That challenge does not exist.');

  const body = req.body || {};

  if (c.format === 'quiz') {
    const chosen = Number(body.answerIndex);
    if (!Number.isInteger(chosen) || chosen < 0) throw badRequest('Choose one of the options.', { answerIndex: 'Required.' });
    const correct = Number(challenge.correct_index) === chosen;
    const score = correct ? challenge.points : 0;
    run(
      `INSERT INTO competition_submissions (competition_id, challenge_id, user_id, code, language, score, max_score, passed, status, detail_json)
       VALUES (?,?,?,?,?,?,?,?,'graded',?)`,
      [c.id, challenge.id, req.user.id, String(chosen), 'quiz', score, challenge.points, correct ? 1 : 0, JSON.stringify([{ chosen, correct }])],
    );
    return ok(res, {
      graded: true,
      passed: correct,
      score,
      maxScore: challenge.points,
      correctIndex: chosen === Number(challenge.correct_index) ? undefined : Number(challenge.correct_index),
      explanation: challenge.explanation,
    });
  }

  const source = typeof body.code === 'string' ? body.code : '';
  if (!source.trim()) throw badRequest('Write your solution first.', { code: 'Required.' });
  if (source.length > 20_000) throw badRequest('That solution is too long.', { code: 'Keep it under 20,000 characters.' });

  const tests = JSON.parse(challenge.test_json || '[]');
  if (!tests.length) throw conflict('This challenge has no tests yet.', 'no_tests');

  const result = await runTests({ language: challenge.language, source, tests });
  if (!result.ok) {
    run(
      `INSERT INTO competition_submissions (competition_id, challenge_id, user_id, code, language, score, max_score, passed, status, detail_json)
       VALUES (?,?,?,?,?,0,?,0,'error',?)`,
      [c.id, challenge.id, req.user.id, source, challenge.language, challenge.points, JSON.stringify([{ error: result.error }])],
    );
    throw conflict(result.error.message || 'The code could not be run.', 'sandbox_error');
  }

  const { results, passed, total } = result.data;
  const passedAll = passed === total;
  const score = passedAll ? challenge.points : Math.round((passed / total) * challenge.points);

  run(
    `INSERT INTO competition_submissions (competition_id, challenge_id, user_id, code, language, score, max_score, passed, status, detail_json)
     VALUES (?,?,?,?,?,?,?,?,'graded',?)`,
    [c.id, challenge.id, req.user.id, source, challenge.language, score, challenge.points, passedAll ? 1 : 0, JSON.stringify(results.map((r) => ({ passed: r.passed, input: r.input, expected: r.expected, actual: r.actual, stderr: r.stderr })))],
  );

  ok(res, {
    graded: true,
    passed: passedAll,
    passedTests: passed,
    totalTests: total,
    score,
    maxScore: challenge.points,
    // the tests are shown after grading: they are the feedback, not a secret
    results: results.map((r) => ({ passed: r.passed, input: r.input, expected: r.expected, actual: r.actual, stderr: r.stderr })),
  });
});

/** My own standing in one event, including results once published. */
router.get('/:slug/me', requireUser, (req, res) => {
  const c = eventRow(req.params.slug);
  const shaped = shapeCompetition(c, { userId: req.user.id });
  const subs = all(
    `SELECT s.challenge_id, ch.slug, ch.title, MAX(s.score) AS best, COUNT(*) AS attempts, MAX(s.passed) AS passed
       FROM competition_submissions s JOIN competition_challenges ch ON ch.id = s.challenge_id
      WHERE s.competition_id = ? AND s.user_id = ? GROUP BY s.challenge_id`,
    [c.id, req.user.id],
  );
  ok(res, {
    event: shaped,
    submissions: subs.map((s) => ({ challenge: s.slug, title: s.title, best: s.best, attempts: s.attempts, passed: Boolean(s.passed) })),
    results: shaped.phase === 'published' ? leaderboard(c.id) : null,
  });
});

export default router;

/* ─────────────────────── organiser (admin) routes ─────────────────────── */

export const adminRouter = express.Router();

function requireAdmin(req, res, next) {
  if (!req.user) return next(forbidden('Sign in first.'));
  if (req.user.role !== 'admin') return next(forbidden('Only an administrator can manage events.'));
  next();
}

adminRouter.use(requireUser, requireAdmin);

/** Move an event through its lifecycle. Publishing computes the standings. */
adminRouter.post('/:slug/status', (req, res) => {
  const c = get('SELECT * FROM competitions WHERE slug = ?', [req.params.slug]);
  if (!c) throw notFound('That event does not exist.');
  const next = String(req.body?.status || '');
  const allowed = {
    draft: ['announced'],
    announced: ['live', 'draft'],
    live: ['closed'],
    closed: ['published'],
    published: [],
  };
  if (!(allowed[c.status] || []).includes(next)) {
    throw badRequest(`An event cannot move from ${c.status} to ${next || 'nothing'}.`, { status: `Allowed: ${(allowed[c.status] || []).join(', ') || 'none'}` });
  }
  run('UPDATE competitions SET status = ?, updated_at = ? WHERE id = ?', [next, new Date().toISOString(), c.id]);

  if (next === 'announced') {
    // announce to every learner who has reminder preferences — a real notification, once
    const users = all('SELECT user_id FROM reminder_preferences');
    let sent = 0;
    for (const u of users) {
      if (notify({
        userId: u.user_id,
        kind: 'competition_announced',
        category: 'event',
        title: `New ${c.format === 'quiz' ? 'quiz' : 'competition'}: ${c.title}`,
        body: c.summary,
        link: `/events/${c.slug}`,
        dedupeKey: `comp-announced:${c.slug}`,
      })) sent += 1;
    }
    return ok(res, { status: next, announcedTo: sent });
  }
  if (next === 'closed') {
    const computed = computeResults(c.id);
    return ok(res, { status: next, computed });
  }
  if (next === 'published') {
    const computed = computeResults(c.id);
    const rows = all('SELECT user_id, rank, score FROM competition_results WHERE competition_id = ?', [c.id]);
    let sent = 0;
    for (const r of rows) {
      if (notify({
        userId: r.user_id,
        kind: 'competition_result',
        category: 'event',
        title: `${c.title} results are out`,
        body: r.rank ? `You finished ${r.rank} with ${r.score} points.` : `You scored ${r.score} points.`,
        link: `/events/${c.slug}`,
        dedupeKey: `comp-result:${c.slug}`,
      })) sent += 1;
    }
    return ok(res, { status: next, computed, notified: sent });
  }
  ok(res, { status: next });
});
