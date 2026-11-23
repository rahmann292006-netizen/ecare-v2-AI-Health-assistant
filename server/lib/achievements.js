import { all, get, run, nowIso, localDay, addDays } from '../db/index.js';

/** Metrics used by achievement criteria. Computed from real rows only. */
export function userMetrics(userId) {
  const lessons = get("SELECT COUNT(*) AS n FROM lesson_progress WHERE user_id = ? AND status = 'completed'", [userId]).n;
  const runs = get('SELECT COUNT(*) AS n FROM coding_sessions WHERE user_id = ?', [userId]).n;
  const exercisePassed = get(
    "SELECT COUNT(DISTINCT exercise_id) AS n FROM coding_sessions WHERE user_id = ? AND exercise_id IS NOT NULL AND tests_total > 0 AND tests_passed = tests_total",
    [userId],
  ).n;
  const assessmentPassed = get('SELECT COUNT(*) AS n FROM submissions WHERE user_id = ? AND passed = 1', [userId]).n;
  const aptitudeAttempts = get('SELECT COUNT(*) AS n FROM aptitude_attempts WHERE user_id = ?', [userId]).n;
  const mockAttempts = get("SELECT COUNT(*) AS n FROM aptitude_attempts WHERE user_id = ? AND kind = 'mock'", [userId]).n;
  const communityPosts = get('SELECT COUNT(*) AS n FROM community_posts WHERE author_id = ? AND is_removed = 0', [userId]).n;
  const acceptedAnswers = get(
    `SELECT COUNT(*) AS n FROM community_posts p WHERE p.author_id = ? AND p.accepted_comment_id IN
       (SELECT id FROM community_comments WHERE author_id = ?)`,
    [userId, userId],
  ).n;
  const coursesCompleted = get('SELECT COUNT(*) AS n FROM enrollments WHERE user_id = ? AND completed_at IS NOT NULL', [userId]).n;
  const aiMessages = get(
    'SELECT COUNT(*) AS n FROM ai_messages m JOIN ai_conversations c ON c.id = m.conversation_id WHERE c.user_id = ? AND m.role = ?',
    [userId, 'user'],
  ).n;
  const streak = streakInfo(userId).current;

  return {
    lessons_completed: lessons,
    code_runs: runs,
    exercise_passed: exercisePassed,
    assessment_passed: assessmentPassed,
    aptitude_attempts: aptitudeAttempts,
    mock_attempts: mockAttempts,
    community_posts: communityPosts,
    accepted_answers: acceptedAnswers,
    courses_completed: coursesCompleted,
    ai_messages: aiMessages,
    streak,
  };
}

/** Consecutive days with at least one learning event, counting back from today. */
export function streakInfo(userId) {
  const days = new Set(
    all('SELECT DISTINCT substr(created_at, 1, 10) AS day FROM activity_events WHERE user_id = ?', [userId]).map((r) => r.day),
  );
  const today = localDay();
  let current = 0;
  let cursor = today;
  // A streak survives today not being started yet: start counting from yesterday if needed.
  if (!days.has(cursor)) cursor = addDays(cursor, -1);
  while (days.has(cursor)) {
    current += 1;
    cursor = addDays(cursor, -1);
  }
  let best = 0;
  const sorted = [...days].sort();
  let run0 = 0;
  let prev = null;
  for (const day of sorted) {
    run0 = prev && addDays(prev, 1) === day ? run0 + 1 : 1;
    best = Math.max(best, run0);
    prev = day;
  }
  return { current, best, activeToday: days.has(today), lastActiveDay: sorted.length ? sorted[sorted.length - 1] : null };
}

/** Minutes learned in the last 7 days (Mon-based week), from recorded activity minutes. */
export function weeklyMinutes(userId) {
  const days = [];
  const today = localDay();
  for (let i = 6; i >= 0; i--) days.push(addDays(today, -i));
  const rows = all(
    `SELECT substr(created_at, 1, 10) AS day, SUM(minutes) AS minutes
       FROM activity_events WHERE user_id = ? AND created_at >= ? GROUP BY day`,
    [userId, `${days[0]}T00:00:00`],
  );
  const byDay = new Map(rows.map((r) => [r.day, r.minutes || 0]));
  const series = days.map((day) => ({ day, minutes: byDay.get(day) || 0 }));
  const total = series.reduce((n, d) => n + d.minutes, 0);
  const goal = get('SELECT weekly_goal_minutes FROM user_preferences WHERE user_id = ?', [userId])?.weekly_goal_minutes || 180;
  return { series, total, goal, percent: goal ? Math.min(100, Math.round((total / goal) * 100)) : 0 };
}

/** Awards any achievement whose criteria the user now meets. Returns the newly awarded list. */
export function awardFor(userId) {
  const metrics = userMetrics(userId);
  const owned = new Set(all('SELECT achievement_id FROM user_achievements WHERE user_id = ?', [userId]).map((r) => r.achievement_id));
  const newly = [];
  for (const a of all('SELECT * FROM achievements')) {
    if (owned.has(a.id)) continue;
    let criteria;
    try {
      criteria = JSON.parse(a.criteria_json);
    } catch {
      continue;
    }
    const value = metrics[criteria.type];
    if (typeof value === 'number' && value >= criteria.value) {
      run('INSERT OR IGNORE INTO user_achievements (user_id, achievement_id) VALUES (?,?)', [userId, a.id]);
      run('INSERT INTO activity_events (user_id, kind, ref_type, ref_id) VALUES (?,?,?,?)', [userId, 'achievement', 'achievement', a.id]);
      newly.push({ slug: a.slug, title: a.title, description: a.description, icon: a.icon, awardedAt: nowIso() });
    }
  }
  return newly;
}
