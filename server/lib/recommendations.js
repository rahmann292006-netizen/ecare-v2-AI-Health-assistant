import { all, get, run, nowIso } from '../db/index.js';

/**
 * Rule-based recommendations. Every reason is derived from a real row in the
 * database — nothing here is invented to look clever.
 *
 * Kinds:
 *   next_lesson      continue an enrolled course
 *   start_course     a course matching the user's stated goal / level
 *   practice         an exercise in a course the user is studying
 *   revise_weakness  an aptitude topic with a low accuracy
 *   assessment       a module assessment not yet passed
 *   community        a group matching the user's current course
 */
export function refreshRecommendations(userId) {
  const rows = [];
  const push = (kind, targetType, targetId, targetSlug, title, reason, score) => {
    rows.push({ kind, targetType, targetId, targetSlug, title, reason, score });
  };

  const enrolled = all(
    `SELECT c.id, c.slug, c.title FROM enrollments e JOIN courses c ON c.id = e.course_id WHERE e.user_id = ?`,
    [userId],
  );
  const enrolledIds = new Set(enrolled.map((c) => c.id));

  // 1. Continue where you left off.
  for (const c of enrolled) {
    const next = get(
      `SELECT l.slug, l.title, m.title AS module_title
         FROM lessons l JOIN course_modules m ON m.id = l.module_id
        WHERE m.course_id = ?
          AND l.id NOT IN (SELECT lesson_id FROM lesson_progress WHERE user_id = ? AND status = 'completed')
        ORDER BY m.sort_order, l.sort_order LIMIT 1`,
      [c.id, userId],
    );
    if (next) {
      push('next_lesson', 'lesson', null, `${c.slug}/${next.slug}`, `${next.title}`,
        `Next unfinished lesson in ${c.title} — ${next.module_title}.`, 10);
    }
  }

  // 2. Weak aptitude topics (accuracy below 60% with at least 3 answers).
  const weak = all(
    `SELECT t.id, t.slug, t.title, SUM(a.is_correct) AS correct, COUNT(*) AS answered
       FROM aptitude_answers a
       JOIN aptitude_attempts at ON at.id = a.attempt_id
       JOIN aptitude_questions q ON q.id = a.question_id
       JOIN aptitude_topics t ON t.id = q.topic_id
      WHERE at.user_id = ?
      GROUP BY t.id HAVING answered >= 3 AND (1.0 * correct / answered) < 0.6
      ORDER BY (1.0 * correct / answered) ASC LIMIT 2`,
    [userId],
  );
  for (const t of weak) {
    push('revise_weakness', 'aptitude_topic', t.id, t.slug, `Revise ${t.title}`,
      `You answered ${t.correct} of ${t.answered} correctly (${Math.round((t.correct / t.answered) * 100)}%) in this topic.`, 8);
  }

  // 3. Unpassed assessments in enrolled courses.
  const unpassed = all(
    `SELECT a.id, a.title, c.slug AS course_slug, c.title AS course_title
       FROM assessments a JOIN courses c ON c.id = a.course_id
      WHERE a.course_id IN (${enrolled.length ? enrolled.map(() => '?').join(',') : 'NULL'})
        AND a.id NOT IN (SELECT assessment_id FROM submissions WHERE user_id = ? AND passed = 1)
      LIMIT 2`,
    [...enrolled.map((c) => c.id), userId],
  );
  for (const a of unpassed) {
    push('assessment', 'assessment', a.id, a.course_slug, `Take: ${a.title}`,
      `Not yet passed in ${a.course_title}.`, 6);
  }

  // 4. Practice an exercise in a course already being studied.
  if (enrolled.length) {
    const ex = get(
      `SELECT e.slug, e.title, c.title AS course_title
         FROM exercises e JOIN courses c ON c.id = e.course_id
        WHERE e.course_id IN (${enrolled.map(() => '?').join(',')})
          AND e.id NOT IN (
            SELECT exercise_id FROM coding_sessions
             WHERE user_id = ? AND exercise_id IS NOT NULL AND tests_total > 0 AND tests_passed = tests_total)
        ORDER BY e.sort_order LIMIT 1`,
      [...enrolled.map((c) => c.id), userId],
    );
    if (ex) push('practice', 'exercise', null, ex.slug, `Practise: ${ex.title}`, `An unsolved exercise in ${ex.course_title}.`, 5);
  }

  // 5. Start a course matching the stated goal or level.
  const profile = get('SELECT goal, experience_level FROM user_profiles WHERE user_id = ?', [userId]);
  const candidates = all(
    `SELECT c.id, c.slug, c.title, c.tagline, c.level FROM courses c WHERE c.is_published = 1 ORDER BY c.sort_order`,
  ).filter((c) => !enrolledIds.has(c.id));
  const goalText = String(profile?.goal || '').toLowerCase();
  const matched = goalText
    ? candidates.filter((c) => `${c.title} ${c.tagline}`.toLowerCase().split(/\W+/).some((w) => w.length > 3 && goalText.includes(w)))
    : [];
  const starter = matched[0] || candidates.find((c) => /beginner/i.test(c.level)) || candidates[0];
  if (starter) {
    push('start_course', 'course', starter.id, starter.slug, `Start ${starter.title}`,
      matched[0] ? 'Matches the goal you set on your profile.' : 'A good next course for your current level.', 4);
  }

  // 6. Community group for an enrolled course category.
  const group = get(
    `SELECT g.slug, g.name FROM community_groups g
      WHERE g.category IN (SELECT category FROM courses WHERE id IN (${enrolled.length ? enrolled.map(() => '?').join(',') : 'NULL'}))
      LIMIT 1`,
    enrolled.map((c) => c.id),
  );
  if (group) push('community', 'group', null, group.slug, `Join the ${group.name} group`, 'Others studying your courses ask and answer here.', 2);

  // Persist: replace open recommendations, keep dismissed ones dismissed.
  for (const r of rows) {
    run(
      `INSERT INTO learning_recommendations (user_id, kind, target_type, target_id, target_slug, title, reason, score)
       VALUES (?,?,?,?,?,?,?,?)
       ON CONFLICT(user_id, kind, target_type, target_id) DO UPDATE SET title = excluded.title, reason = excluded.reason, score = excluded.score`,
      [userId, r.kind, r.targetType, r.targetId, r.targetSlug, r.title, r.reason, r.score],
    );
  }
  run("DELETE FROM learning_recommendations WHERE user_id = ? AND status = 'open' AND kind NOT IN (" +
    (rows.length ? rows.map(() => '?').join(',') : "''") + ')', [userId, ...rows.map((r) => r.kind)]);
  return rows.length;
}

export function dismissRecommendation(userId, id) {
  run("UPDATE learning_recommendations SET status = 'dismissed' WHERE user_id = ? AND id = ?", [userId, id]);
  return nowIso();
}
