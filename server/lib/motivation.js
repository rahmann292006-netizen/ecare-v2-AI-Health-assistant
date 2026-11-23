import { all, get, run, localDay, addDays } from '../db/index.js';
import { awardFor } from './achievements.js';

/**
 * Daily motivation.
 *
 * Rules from the brief: rotate daily, never repeat two days in a row for the
 * same user, persist per user+day so the line does not change on reload, and
 * keep the tone practical rather than cheerleading.
 *
 * Selection is deterministic per user+day (hash of user id and day) so two
 * requests on the same day always agree even if the row is missing.
 */
export function dailyMotivation(userId) {
  const day = localDay();
  const existing = get(
    `SELECT m.text, m.author FROM daily_motivations d JOIN motivation_lines m ON m.id = d.line_id
      WHERE d.user_id = ? AND d.day = ?`,
    [userId, day],
  );
  if (existing) return { day, text: existing.text, author: existing.author, fresh: false };

  const yesterday = get(
    `SELECT d.line_id, m.text FROM daily_motivations d JOIN motivation_lines m ON m.id = d.line_id
      WHERE d.user_id = ? AND d.day = ?`,
    [userId, addDays(day, -1)],
  );

  const candidates = all('SELECT id, text, author FROM motivation_lines WHERE id != ? ORDER BY id', [yesterday?.line_id ?? -1]);
  const pool = candidates.length ? candidates : all('SELECT id, text, author FROM motivation_lines ORDER BY id');
  if (!pool.length) {
    return { day, text: 'Today is a good day to learn one thing well.', author: 'Lumen', fresh: false };
  }

  // Deterministic index from user + day, so the same day yields the same line.
  let h = 2166136261;
  for (const ch of `${userId}:${day}`) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  const pick = pool[Math.abs(h) % pool.length];

  run('INSERT OR IGNORE INTO daily_motivations (user_id, day, line_id) VALUES (?,?,?)', [userId, day, pick.id]);
  const stored = get(
    `SELECT m.text, m.author FROM daily_motivations d JOIN motivation_lines m ON m.id = d.line_id
      WHERE d.user_id = ? AND d.day = ?`,
    [userId, day],
  );
  return { day, text: stored?.text || pick.text, author: stored?.author || pick.author, fresh: true };
}

export { awardFor };
