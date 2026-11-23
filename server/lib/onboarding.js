import { run, get, localDay } from '../db/index.js';

const COLORS = ['sand', 'sage', 'slate', 'clay', 'moss', 'stone'];

export function avatarFor(seed) {
  const s = String(seed || 'lumen');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 997;
  return COLORS[h % COLORS.length];
}

/** Called once per new account: creates the daily motivation row and seeds recommendations lazily. */
export function seedNewUser(userId) {
  const day = localDay();
  const line = get('SELECT id FROM motivation_lines ORDER BY id ASC LIMIT 1');
  if (line) {
    run('INSERT OR IGNORE INTO daily_motivations (user_id, day, line_id) VALUES (?,?,?)', [userId, day, line.id]);
  }
  run('INSERT INTO activity_events (user_id, kind, minutes) VALUES (?,?,0)', [userId, 'account_created']);
}
