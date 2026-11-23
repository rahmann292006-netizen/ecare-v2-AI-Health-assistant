import express from 'express';
import { get, run, all, nowIso, localDay } from '../db/index.js';
import { requireUser } from '../lib/context.js';
import { validate } from '../lib/validate.js';
import { ok, notFound, badRequest, HttpError } from '../lib/http.js';
import { limit } from '../lib/rate-limit.js';
import { hashPassword, verifyPassword, passwordProblems } from '../lib/password.js';
import { revokeAllSessions, publicUser, COOKIE } from '../lib/sessions.js';

const router = express.Router();
router.use(requireUser);

const AVATAR_COLORS = ['amber', 'clay', 'moss', 'slate', 'stone', 'sand'];

function fullUser(userId) {
  const user = get('SELECT * FROM users WHERE id = ?', [userId]);
  if (!user) return null;
  const profile = get('SELECT * FROM user_profiles WHERE user_id = ?', [userId]);
  const prefs = get('SELECT * FROM user_preferences WHERE user_id = ?', [userId]);
  const stats = get(
    `SELECT (SELECT COUNT(*) FROM lesson_progress WHERE user_id = ? AND status = 'completed') AS lessonsCompleted,
            (SELECT COUNT(*) FROM enrollments WHERE user_id = ?) AS coursesEnrolled,
            (SELECT COUNT(*) FROM community_posts WHERE author_id = ? AND deleted_at IS NULL) AS posts`,
    [userId, userId, userId],
  );
  return {
    user: publicUser(user),
    profile: {
      displayName: profile?.display_name || 'Learner',
      bio: profile?.bio || '',
      headline: profile?.headline || '',
      location: profile?.location || '',
      website: profile?.website || '',
      avatarColor: profile?.avatar_color || 'amber',
      goal: profile?.goal || '',
      experienceLevel: profile?.experience_level || 'beginner',
      isPublic: Boolean(profile?.is_public ?? 1),
    },
    preferences: {
      theme: prefs?.theme || 'system',
      reducedMotion: Boolean(prefs?.reduced_motion),
      emailDigest: Boolean(prefs?.email_digest ?? 1),
      weeklyGoalMinutes: prefs?.weekly_goal_minutes ?? 180,
      codeFontSize: prefs?.code_font_size ?? 14,
    },
    stats,
  };
}

router.get('/', (req, res) => ok(res, fullUser(req.user.id)));

router.patch('/', (req, res) => {
  const body = validate(req.body, {
    displayName: { type: 'string', min: 2, max: 60, label: 'Name' },
    bio: { type: 'string', max: 400 },
    headline: { type: 'string', max: 120 },
    location: { type: 'string', max: 80 },
    website: { type: 'string', max: 200 },
    avatarColor: { type: 'enum', values: AVATAR_COLORS },
    goal: { type: 'string', max: 160 },
    experienceLevel: { type: 'enum', values: ['beginner', 'some', 'intermediate', 'advanced'] },
    isPublic: { type: 'bool' },
  });

  if (body.website && !/^https?:\/\/[^\s.]+\.[^\s]{2,}$/i.test(body.website)) {
    throw new HttpError(422, 'invalid_input', 'Enter a full URL, for example https://example.com', { website: 'Invalid URL' });
  }

  const map = {
    displayName: 'display_name',
    bio: 'bio',
    headline: 'headline',
    location: 'location',
    website: 'website',
    avatarColor: 'avatar_color',
    goal: 'goal',
    experienceLevel: 'experience_level',
    isPublic: 'is_public',
  };
  const sets = [];
  const values = [];
  for (const [key, column] of Object.entries(map)) {
    if (body[key] !== undefined) {
      sets.push(`${column} = ?`);
      values.push(typeof body[key] === 'boolean' ? (body[key] ? 1 : 0) : body[key]);
    }
  }
  if (sets.length) {
    run(`UPDATE user_profiles SET ${sets.join(', ')}, updated_at = ? WHERE user_id = ?`, [...values, nowIso(), req.user.id]);
  }
  ok(res, fullUser(req.user.id));
});

router.patch('/preferences', (req, res) => {
  const body = validate(req.body, {
    theme: { type: 'enum', values: ['light', 'dark', 'system'] },
    reducedMotion: { type: 'bool' },
    emailDigest: { type: 'bool' },
    weeklyGoalMinutes: { type: 'int', min: 30, max: 3000 },
    codeFontSize: { type: 'int', min: 11, max: 22 },
  });
  const map = {
    theme: 'theme',
    reducedMotion: 'reduced_motion',
    emailDigest: 'email_digest',
    weeklyGoalMinutes: 'weekly_goal_minutes',
    codeFontSize: 'code_font_size',
  };
  const sets = [];
  const values = [];
  for (const [key, column] of Object.entries(map)) {
    if (body[key] !== undefined) {
      sets.push(`${column} = ?`);
      values.push(typeof body[key] === 'boolean' ? (body[key] ? 1 : 0) : body[key]);
    }
  }
  if (sets.length) {
    run(`UPDATE user_preferences SET ${sets.join(', ')}, updated_at = ? WHERE user_id = ?`, [...values, nowIso(), req.user.id]);
  }
  ok(res, fullUser(req.user.id).preferences);
});

router.post('/password', limit('change-password', 6, 60 * 60 * 1000), (req, res) => {
  const body = validate(req.body, {
    currentPassword: { type: 'string', required: true, min: 1, max: 200 },
    newPassword: { type: 'string', required: true, min: 10, max: 200 },
  });
  const user = get('SELECT * FROM users WHERE id = ?', [req.user.id]);
  if (!user.password_hash || !verifyPassword(body.currentPassword, user.password_hash)) {
    throw new HttpError(422, 'invalid_input', 'Your current password is not correct.', { currentPassword: 'Incorrect password' });
  }
  const problems = passwordProblems(body.newPassword);
  if (problems.length) throw new HttpError(422, 'invalid_input', problems[0], { newPassword: problems[0] });
  if (verifyPassword(body.newPassword, user.password_hash)) {
    throw new HttpError(422, 'invalid_input', 'Choose a password you have not used here before.', { newPassword: 'Same as current password' });
  }
  run('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?', [hashPassword(body.newPassword), nowIso(), req.user.id]);
  // keep this session, drop the rest
  revokeAllSessions(req.user.id, req.cookies?.[COOKIE]);
  ok(res, { changed: true });
});

router.get('/sessions', (req, res) => {
  const rows = all(
    `SELECT id, user_agent, ip, created_at, last_seen_at, expires_at
       FROM sessions WHERE user_id = ? AND revoked_at IS NULL AND expires_at > ?
      ORDER BY COALESCE(last_seen_at, created_at) DESC`,
    [req.user.id, nowIso()],
  );
  ok(res, {
    current: req.sessionId,
    sessions: rows.map((r) => ({
      id: r.id,
      userAgent: r.user_agent,
      ip: r.ip,
      createdAt: r.created_at,
      lastSeenAt: r.last_seen_at,
      expiresAt: r.expires_at,
      current: r.id === req.sessionId,
    })),
  });
});

router.delete('/sessions/:id', (req, res) => {
  const id = Number(req.params.id);
  const row = get('SELECT * FROM sessions WHERE id = ? AND user_id = ?', [id, req.user.id]);
  if (!row) throw notFound('That session no longer exists.');
  if (row.id === req.sessionId) throw badRequest('Use sign out to end your current session.');
  run('UPDATE sessions SET revoked_at = ? WHERE id = ?', [nowIso(), id]);
  ok(res, { revoked: id });
});

router.get('/activity', (req, res) => {
  const limitN = Math.min(Number(req.query.limit) || 30, 100);
  const rows = all(
    `SELECT kind, ref_type, ref_id, meta_json, created_at FROM activity_events
      WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`,
    [req.user.id, limitN],
  );
  ok(res, {
    activity: rows.map((r) => ({
      kind: r.kind,
      refType: r.ref_type,
      refId: r.ref_id,
      meta: r.meta_json ? JSON.parse(r.meta_json) : null,
      at: r.created_at,
    })),
  });
});

router.get('/export', (req, res) => {
  const userId = req.user.id;
  const data = {
    exportedAt: nowIso(),
    account: publicUser(get('SELECT * FROM users WHERE id = ?', [userId])),
    profile: get('SELECT * FROM user_profiles WHERE user_id = ?', [userId]),
    preferences: get('SELECT * FROM user_preferences WHERE user_id = ?', [userId]),
    enrollments: all('SELECT * FROM enrollments WHERE user_id = ?', [userId]),
    lessonProgress: all('SELECT * FROM lesson_progress WHERE user_id = ?', [userId]),
    submissions: all('SELECT * FROM submissions WHERE user_id = ?', [userId]),
    aptitudeAttempts: all('SELECT * FROM aptitude_attempts WHERE user_id = ?', [userId]),
    notes: all('SELECT * FROM notes WHERE user_id = ?', [userId]),
    bookmarks: all('SELECT * FROM bookmarks WHERE user_id = ?', [userId]),
    activity: all('SELECT * FROM activity_events WHERE user_id = ? ORDER BY created_at DESC LIMIT 2000', [userId]),
  };
  res.setHeader('Content-Disposition', `attachment; filename="lumen-export-${localDay()}.json"`);
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(data, null, 2));
});

export default router;
