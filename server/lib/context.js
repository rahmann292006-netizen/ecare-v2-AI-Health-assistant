/**
 * Request context: request id, authenticated user resolution, CSRF protection.
 *
 * Sessions are opaque, hashed, HttpOnly cookies. Because the cookie is sent
 * automatically by browsers, every state-changing request must also carry a
 * CSRF token (double-submit cookie + header) — except the auth endpoints,
 * which are protected by SameSite=Lax and origin checks.
 */

import { randomToken, sha256 } from './password.js';
import { resolveSession, COOKIE } from './sessions.js';
import { get, run } from '../db/index.js';
import { forbidden, unauthorized } from './http.js';

export const CSRF_COOKIE = 'lumen_csrf';
export const CSRF_HEADER = 'x-csrf-token';

export function requestId(req, res, next) {
  req.id = randomToken(8);
  res.setHeader('X-Request-Id', req.id);
  next();
}

export function loadUser(req, res, next) {
  const token = req.cookies?.[COOKIE];
  const session = token ? resolveSession(token) : null;
  if (session) {
    req.user = session;
    req.sessionId = session.session_id;
    const profile = get('SELECT display_name, avatar_color FROM user_profiles WHERE user_id = ?', [session.user_id]);
    const prefs = get('SELECT theme FROM user_preferences WHERE user_id = ?', [session.user_id]);
    req.user.displayName = profile?.display_name || 'Learner';
    req.user.avatarColor = profile?.avatar_color || 'amber';
    req.user.theme = prefs?.theme || 'system';
    req.lastSeenAt = session.last_seen_at;
    // touch activity at most once a minute to avoid write amplification
    if (!req.lastSeenAt || Date.now() - new Date(req.lastSeenAt).getTime() > 60_000) {
      run('UPDATE sessions SET last_seen_at = ? WHERE id = ?', [new Date().toISOString(), session.session_id]);
    }
  }
  res.locals.user = req.user || null;
  next();
}

export function requireUser(req, res, next) {
  if (!req.user) return next(unauthorized());
  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) return next(forbidden());
    next();
  };
}

/** Double-submit CSRF: cookie value must equal header value. */
export function csrfProtection(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  // Auth endpoints authenticate by credentials, not by cookie, and are rate limited.
  if (req.path.startsWith('/auth/')) return next();
  const cookie = req.cookies?.[CSRF_COOKIE];
  const header = req.get(CSRF_HEADER);
  if (!cookie || !header || cookie.length < 20 || cookie !== header) {
    return next(forbidden('Your session token was missing or invalid. Reload the page and try again.'));
  }
  next();
}

export function issueCsrfCookie(req, res) {
  // Read the token straight off the request: on a cookie-parsing edge case
  // req.cookies can be empty while the browser still holds a valid token, and
  // issuing a second cookie makes the browser send two values for one name —
  // which the comparison below then rejects.
  const existing = req.cookies?.[CSRF_COOKIE] || readCookie(req.headers.cookie, CSRF_COOKIE);

  if (existing) return existing;
  const token = randomToken(24);
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false, // must be readable by the client to echo it in a header
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 30 * 24 * 3600 * 1000,
  });
  return token;
}

function readCookie(header, name) {
  if (!header) return '';
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return '';
}

export const tokenHash = sha256;
