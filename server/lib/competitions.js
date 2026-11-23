/**
 * Competitions and quizzes.
 *
 * Two formats, one event model:
 *   - `code`  — a timed set of programming challenges, graded by the sandbox
 *   - `quiz`  — a timed set of multiple-choice questions, graded server-side
 *
 * Rules that are enforced here rather than promised in the UI:
 *   - an event is only visible once it is `announced` (or later), never a draft
 *   - a challenge's tests and a quiz's answer key never leave the server
 *   - submissions are only accepted inside the event window, for registered learners
 *   - results exist only after the organiser publishes them; ranks are computed from
 *     real scores, and a learner's best attempt per challenge is what counts
 *   - the competition is a place to practise; it never claims to grant readiness or a job
 */
import { all, get, run } from '../db/index.js';

export const VISIBLE_STATUSES = ['announced', 'live', 'closed', 'published'];

/** Derive the phase of an event from its clock, so the UI cannot drift from the DB. */
export function phaseOf(competition, now = new Date()) {
  const t = now.toISOString();
  if (competition.status === 'draft') return 'draft';
  if (competition.status === 'published') return 'published';
  // the organiser's own lifecycle step wins over the clock: a closed event is closed even
  // if its end time has not arrived yet, and a live one is live as soon as it is opened.
  if (competition.status === 'closed') return 'closed';
  const startsAt = competition.starts_at;
  const endsAt = competition.ends_at;
  // once the event has begun, the run window decides: a stale registration date must not
  // hide an event that is running right now
  if (startsAt && t >= startsAt && (!endsAt || t <= endsAt)) return 'live';
  if (competition.registration_opens_at && t < competition.registration_opens_at) return 'upcoming';
  if (competition.registration_closes_at && t < competition.registration_closes_at) return 'registration';
  if (startsAt && t < startsAt) return 'registered';
  return 'closed';
}

export function registrationOpen(competition, now = new Date()) {
  return phaseOf(competition, now) === 'registration';
}

export function isLive(competition, now = new Date()) {
  return phaseOf(competition, now) === 'live';
}

/** Shapes an event for the API. Never includes challenges' tests or the answer key. */
export function shapeCompetition(c, { userId = null } = {}) {
  const registered = userId
    ? Boolean(get('SELECT 1 AS x FROM competition_registrations WHERE competition_id = ? AND user_id = ? AND withdrawn_at IS NULL', [c.id, userId]))
    : false;
  const regRow = userId
    ? get('SELECT registered_at, withdrawn_at FROM competition_registrations WHERE competition_id = ? AND user_id = ?', [c.id, userId])
    : null;
  const challengeCount = get('SELECT COUNT(*) AS n FROM competition_challenges WHERE competition_id = ?', [c.id]).n;
  const course = c.course_id ? get('SELECT slug, title FROM courses WHERE id = ?', [c.course_id]) : null;
  const mine = userId
    ? get(
        `SELECT COUNT(DISTINCT challenge_id) AS attempted, COALESCE(SUM(score),0) AS score
           FROM competition_submissions WHERE competition_id = ? AND user_id = ?`,
        [c.id, userId],
      )
    : { attempted: 0, score: 0 };
  const result = userId ? get('SELECT score, max_score, rank FROM competition_results WHERE competition_id = ? AND user_id = ?', [c.id, userId]) : null;
  return {
    slug: c.slug,
    title: c.title,
    summary: c.summary,
    description: c.description_md,
    format: c.format,
    status: c.status,
    phase: phaseOf(c),
    course,
    registrationOpensAt: c.registration_opens_at,
    registrationClosesAt: c.registration_closes_at,
    startsAt: c.starts_at,
    endsAt: c.ends_at,
    durationMinutes: c.duration_minutes,
    rules: c.rules_md,
    eligibility: c.eligibility_md,
    maxParticipants: c.max_participants,
    challengeCount,
    registered,
    registeredAt: regRow?.registered_at ?? null,
    participants: get('SELECT COUNT(*) AS n FROM competition_registrations WHERE competition_id = ? AND withdrawn_at IS NULL', [c.id]).n,
    myScore: result ? result.score : mine.score,
    myAttempted: mine.attempted,
    myRank: result ? result.rank : null,
  };
}

/** Leaderboard for a published event: real scores, best attempt per challenge. */
export function leaderboard(competitionId, limit = 50) {
  const rows = all(
    `SELECT r.rank, r.score, r.max_score, u.id AS user_id
       FROM competition_results r JOIN users u ON u.id = r.user_id
      WHERE r.competition_id = ?
      ORDER BY COALESCE(r.rank, 999999), r.score DESC LIMIT ?`,
    [competitionId, limit],
  );
  const names = all(
    `SELECT up.user_id, up.display_name FROM user_profiles up WHERE up.user_id IN (${rows.map(() => '?').join(',') || 'NULL'})`,
    rows.map((r) => r.user_id),
  );
  const byId = new Map(names.map((n) => [n.user_id, n.display_name]));
  return rows.map((r) => ({
    rank: r.rank,
    score: r.score,
    maxScore: r.max_score,
    name: byId.get(r.user_id) || 'Learner',
  }));
}

/**
 * Recompute standings. Called when the organiser publishes, and safe to call twice.
 * Score = sum of the best score per challenge; rank = order by score, then earliest
 * first submission (an earlier solve breaks a tie).
 */
export function computeResults(competitionId) {
  const competition = get('SELECT * FROM competitions WHERE id = ?', [competitionId]);
  if (!competition) return null;
  const challenges = all('SELECT id, points FROM competition_challenges WHERE competition_id = ?', [competitionId]);
  const maxScore = challenges.reduce((n, c) => n + c.points, 0);
  const participants = all('SELECT user_id FROM competition_registrations WHERE competition_id = ? AND withdrawn_at IS NULL', [competitionId]);

  const rows = [];
  for (const p of participants) {
    let score = 0;
    let earliest = null;
    for (const ch of challenges) {
      const best = get(
        'SELECT MAX(score) AS score, MIN(submitted_at) AS at FROM competition_submissions WHERE competition_id = ? AND challenge_id = ? AND user_id = ? AND passed = 1',
        [competitionId, ch.id, p.user_id],
      );
      if (best && best.score) {
        score += Math.min(best.score, ch.points);
        if (best.at && (!earliest || best.at < earliest)) earliest = best.at;
      }
    }
    rows.push({ userId: p.user_id, score, earliest });
  }

  rows.sort((a, b) => b.score - a.score || String(a.earliest || '9').localeCompare(String(b.earliest || '9')));
  const now = new Date().toISOString();
  let rank = 0;
  let lastScore = null;
  let lastRank = 0;
  rows.forEach((r, i) => {
    rank = lastScore === r.score ? lastRank : i + 1;
    lastScore = r.score;
    lastRank = rank;
    run(
      `INSERT INTO competition_results (competition_id, user_id, score, max_score, rank, published_at)
       VALUES (?,?,?,?,?,?)
       ON CONFLICT(competition_id, user_id) DO UPDATE SET
         score = excluded.score, max_score = excluded.max_score, rank = excluded.rank, published_at = excluded.published_at`,
      [competitionId, r.userId, r.score, maxScore, rank, competition.status === 'published' ? now : null],
    );
  });
  run('UPDATE competitions SET updated_at = ? WHERE id = ?', [now, competitionId]);
  return { participants: rows.length, maxScore };
}

/** Register a learner. Honest about every reason it can fail. */
export function register(competition, userId) {
  const now = new Date();
  const phase = phaseOf(competition, now);
  if (phase === 'draft') return { ok: false, code: 'not_open', message: 'This event has not been announced yet.' };
  if (phase === 'upcoming' || phase === 'registered') return { ok: false, code: 'not_open', message: 'Registration has not opened yet.' };
  // Once the event has begun, a learner who has not registered yet may still join while
  // the run window is open — a quiz or sprint is worth taking part in late.
  const lateEntry = phase === 'live' && Boolean(competition.ends_at) && now.toISOString() < competition.ends_at;
  if (phase !== 'registration' && !lateEntry) return { ok: false, code: 'closed', message: 'Registration for this event is closed.' };
  if (competition.max_participants) {
    const n = get('SELECT COUNT(*) AS n FROM competition_registrations WHERE competition_id = ? AND withdrawn_at IS NULL', [competition.id]).n;
    if (n >= competition.max_participants) return { ok: false, code: 'full', message: 'This event is full.' };
  }
  const existing = get('SELECT * FROM competition_registrations WHERE competition_id = ? AND user_id = ?', [competition.id, userId]);
  if (existing && !existing.withdrawn_at) return { ok: true, already: true };
  run(
    `INSERT INTO competition_registrations (competition_id, user_id) VALUES (?,?)
     ON CONFLICT(competition_id, user_id) DO UPDATE SET withdrawn_at = NULL, registered_at = ?`,
    [competition.id, userId, now.toISOString()],
  );
  return { ok: true, already: false };
}
