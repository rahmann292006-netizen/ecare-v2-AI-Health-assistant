import { get, run } from '../db/index.js';
import { randomToken, sha256 } from './password.js';

export const COOKIE = 'lumen_session';
export const SESSION_DAYS = 30;

export function createSession(userId, req) {
  const token = randomToken(32);
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 3600 * 1000).toISOString();
  run(
    'INSERT INTO sessions (token_hash, user_id, user_agent, ip, expires_at) VALUES (?,?,?,?,?)',
    [sha256(token), userId, String(req.headers['user-agent'] || '').slice(0, 250), req.ip || '', expires],
  );
  return { token, expires };
}

export function cookieOptions(expires) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: new Date(expires),
  };
}

export function resolveSession(token) {
  if (!token) return null;
  const row = get(
    `SELECT s.id AS session_id, s.expires_at, s.revoked_at, u.*
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ?`,
    [sha256(token)],
  );
  if (!row) return null;
  if (row.revoked_at) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) return null;
  if (row.status !== 'active') return null;
  return row;
}

export function revokeSession(token) {
  if (!token) return;
  run('UPDATE sessions SET revoked_at = ? WHERE token_hash = ?', [new Date().toISOString(), sha256(token)]);
}

export function revokeAllSessions(userId, exceptToken) {
  if (exceptToken) {
    run('UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND token_hash != ?', [new Date().toISOString(), userId, sha256(exceptToken)]);
  } else {
    run('UPDATE sessions SET revoked_at = ? WHERE user_id = ?', [new Date().toISOString(), userId]);
  }
}

export function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    emailVerified: Boolean(row.email_verified_at),
    createdAt: row.created_at,
  };
}
