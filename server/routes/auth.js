import express from 'express';
import { run, get, nowIso, tx } from '../db/index.js';
import { hashPassword, verifyPassword, passwordProblems, randomToken, sha256 } from '../lib/password.js';
import { createSession, cookieOptions, COOKIE, revokeSession, revokeAllSessions, publicUser } from '../lib/sessions.js';
import { validate } from '../lib/validate.js';
import { limit } from '../lib/rate-limit.js';
import { sendMail, smtpConfigured } from '../lib/mailer.js';
import { authorizeUrl, exchangeCode, providerConfig, redirectBase } from '../lib/oauth.js';
import { avatarFor, seedNewUser } from '../lib/onboarding.js';
import { issueCsrfCookie } from '../lib/context.js';

const router = express.Router();
const isDev = process.env.NODE_ENV !== 'production';

function appUrl() {
  return process.env.PUBLIC_URL || process.env.APP_URL || `http://localhost:${process.env.PORT || 4180}`;
}

async function issueToken(userId, kind, ttlMs) {
  const token = randomToken(32);
  run('INSERT INTO auth_tokens (user_id, kind, token_hash, expires_at) VALUES (?,?,?,?)', [
    userId, kind, sha256(token), new Date(Date.now() + ttlMs).toISOString(),
  ]);
  return token;
}

router.post('/signup', limit('signup', 8, 60 * 60 * 1000), async (req, res) => {
  const body = validate(req.body, {
    email: { type: 'email', required: true },
    password: { type: 'string', required: true, min: 10, max: 200 },
    displayName: { type: 'string', required: true, min: 2, max: 60, label: 'Name' },
    goal: { type: 'string', max: 120 },
    experienceLevel: { type: 'enum', values: ['beginner', 'some', 'intermediate', 'advanced'], default: 'beginner' },
  });

  const problems = passwordProblems(body.password);
  if (problems.length) {
    return res.status(422).json({ ok: false, error: { code: 'invalid_input', message: problems[0], fields: { password: problems[0] } } });
  }

  const existing = get('SELECT id FROM users WHERE lower(email) = lower(?)', [body.email]);
  if (existing) {
    return res.status(409).json({ ok: false, error: { code: 'email_taken', message: 'An account with this email already exists.' } });
  }

  const passwordHash = hashPassword(body.password);
  const user = tx(() => {
    const info = run('INSERT INTO users (email, password_hash) VALUES (?,?)', [body.email.toLowerCase(), passwordHash]);
    const userId = info.lastInsertRowid;
    run('INSERT INTO user_profiles (user_id, display_name, avatar_color, goal, experience_level) VALUES (?,?,?,?,?)', [
      userId, body.displayName, avatarFor(body.displayName), body.goal || null, body.experienceLevel,
    ]);
    run('INSERT INTO user_preferences (user_id) VALUES (?)', [userId]);
    // every learner starts with the default reminder settings, so event announcements
    // reach them without having to open the settings page first
    run('INSERT OR IGNORE INTO reminder_preferences (user_id) VALUES (?)', [userId]);
    return get('SELECT * FROM users WHERE id = ?', [userId]);
  });

  seedNewUser(user.id);

  const token = await issueToken(user.id, 'verify_email', 24 * 3600 * 1000);
  const verifyUrl = `${appUrl()}/verify-email?token=${token}`;
  const mail = await sendMail({
    to: user.email,
    subject: 'Verify your Lumen account',
    text: `Welcome to Lumen.\n\nConfirm your email to unlock the community: ${verifyUrl}\n\nThis link expires in 24 hours.`,
  });

  const { token: sessionToken, expires } = createSession(user.id, req);
  res.cookie(COOKIE, sessionToken, cookieOptions(expires));
  issueCsrfCookie(req, res);
  run('UPDATE users SET last_seen_at = ? WHERE id = ?', [nowIso(), user.id]);

  res.status(201).json({
    ok: true,
    data: {
      user: publicUser(get('SELECT * FROM users WHERE id = ?', [user.id])),
      profile: get('SELECT * FROM user_profiles WHERE user_id = ?', [user.id]),
      mail: { delivered: mail.delivered, reason: mail.reason || null },
      devVerifyUrl: isDev && !mail.delivered ? verifyUrl : undefined,
    },
  });
});

router.post('/login', limit('login', 12, 15 * 60 * 1000), (req, res) => {
  const body = validate(req.body, {
    email: { type: 'email', required: true },
    password: { type: 'string', required: true, max: 200 },
  });
  const user = get('SELECT * FROM users WHERE lower(email) = lower(?)', [body.email]);
  const generic = { ok: false, error: { code: 'invalid_credentials', message: 'Email or password is incorrect.' } };
  if (!user) return res.status(401).json(generic);
  if (!verifyPassword(body.password, user.password_hash)) return res.status(401).json(generic);
  if (user.status !== 'active') {
    return res.status(403).json({ ok: false, error: { code: 'account_disabled', message: 'This account has been disabled.' } });
  }
  const { token, expires } = createSession(user.id, req);
  res.cookie(COOKIE, token, cookieOptions(expires));
  issueCsrfCookie(req, res);
  run('UPDATE users SET last_seen_at = ? WHERE id = ?', [nowIso(), user.id]);
  issueCsrfCookie(req, res);
  res.json({
    ok: true,
    data: {
      user: publicUser(user),
      profile: get('SELECT * FROM user_profiles WHERE user_id = ?', [user.id]),
      preferences: get('SELECT * FROM user_preferences WHERE user_id = ?', [user.id]),
    },
  });
});

router.post('/logout', (req, res) => {
  revokeSession(req.cookies?.[COOKIE]);
  res.clearCookie(COOKIE, { path: '/' });
  res.json({ ok: true, data: { loggedOut: true } });
});

router.get('/me', (req, res) => {
  if (!req.user) return res.status(401).json({ ok: false, error: { code: 'unauthenticated', message: 'Sign in to continue.' } });
  issueCsrfCookie(req, res);
  res.json({
    ok: true,
    data: {
      user: publicUser(req.user),
      profile: get('SELECT * FROM user_profiles WHERE user_id = ?', [req.user.id]),
      preferences: get('SELECT * FROM user_preferences WHERE user_id = ?', [req.user.id]),
    },
  });
});

router.post('/verify-email', limit('verify', 20, 60 * 60 * 1000), (req, res) => {
  const body = validate(req.body, { token: { type: 'string', required: true, min: 10, max: 200 } });
  const row = get("SELECT * FROM auth_tokens WHERE token_hash = ? AND kind = 'verify_email'", [sha256(body.token)]);
  if (!row) return res.status(400).json({ ok: false, error: { code: 'invalid_token', message: 'This verification link is not valid.' } });
  if (row.used_at) return res.status(400).json({ ok: false, error: { code: 'used_token', message: 'This link was already used.' } });
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return res.status(400).json({ ok: false, error: { code: 'expired_token', message: 'This link has expired. Request a new one.' } });
  }
  run('UPDATE auth_tokens SET used_at = ? WHERE id = ?', [nowIso(), row.id]);
  run('UPDATE users SET email_verified_at = ? WHERE id = ?', [nowIso(), row.user_id]);
  res.json({ ok: true, data: { verified: true } });
});

router.post('/resend-verification', limit('resend', 4, 60 * 60 * 1000), async (req, res) => {
  if (!req.user) return res.status(401).json({ ok: false, error: { code: 'unauthenticated', message: 'Sign in to continue.' } });
  if (req.user.email_verified_at) return res.json({ ok: true, data: { alreadyVerified: true } });
  const token = await issueToken(req.user.id, 'verify_email', 24 * 3600 * 1000);
  const verifyUrl = `${appUrl()}/verify-email?token=${token}`;
  const mail = await sendMail({ to: req.user.email, subject: 'Verify your Lumen account', text: `Confirm your email: ${verifyUrl}` });
  res.json({ ok: true, data: { sent: true, delivered: mail.delivered, devVerifyUrl: isDev && !mail.delivered ? verifyUrl : undefined } });
});

router.post('/forgot-password', limit('forgot', 6, 60 * 60 * 1000), async (req, res) => {
  const body = validate(req.body, { email: { type: 'email', required: true } });
  const user = get('SELECT * FROM users WHERE lower(email) = lower(?)', [body.email]);
  let devResetUrl;
  if (user) {
    const token = await issueToken(user.id, 'reset_password', 60 * 60 * 1000);
    const url = `${appUrl()}/reset-password?token=${token}`;
    const mail = await sendMail({ to: user.email, subject: 'Reset your Lumen password', text: `Reset your password (valid 60 minutes): ${url}` });
    if (isDev && !mail.delivered) devResetUrl = url;
  }
  // Always the same answer: no account enumeration.
  res.json({ ok: true, data: { sent: true, devResetUrl } });
});

router.post('/reset-password', limit('reset', 10, 60 * 60 * 1000), (req, res) => {
  const body = validate(req.body, {
    token: { type: 'string', required: true, min: 10, max: 200 },
    password: { type: 'string', required: true, min: 10, max: 200 },
  });
  const problems = passwordProblems(body.password);
  if (problems.length) return res.status(422).json({ ok: false, error: { code: 'invalid_input', message: problems[0], fields: { password: problems[0] } } });
  const row = get("SELECT * FROM auth_tokens WHERE token_hash = ? AND kind = 'reset_password'", [sha256(body.token)]);
  if (!row || row.used_at) return res.status(400).json({ ok: false, error: { code: 'invalid_token', message: 'This reset link is not valid.' } });
  if (new Date(row.expires_at).getTime() < Date.now()) return res.status(400).json({ ok: false, error: { code: 'expired_token', message: 'This reset link has expired.' } });
  run('UPDATE auth_tokens SET used_at = ? WHERE id = ?', [nowIso(), row.id]);
  run('UPDATE users SET password_hash = ? WHERE id = ?', [hashPassword(body.password), row.user_id]);
  revokeAllSessions(row.user_id);
  res.json({ ok: true, data: { reset: true } });
});

/* ─────────────── OAuth (integration-ready) ─────────────── */
router.get('/providers', (_req, res) => res.json({ ok: true, data: providerConfig() }));

router.get('/oauth/:provider', (req, res) => {
  const providers = providerConfig();
  if (!providers[req.params.provider]) {
    return res.status(501).json({ ok: false, error: { code: 'oauth_not_configured', message: `${req.params.provider} sign-in is not configured on this deployment.` } });
  }
  const state = randomToken(16);
  res.cookie('lumen_oauth_state', state, { httpOnly: true, sameSite: 'lax', maxAge: 10 * 60 * 1000, path: '/' });
  res.redirect(authorizeUrl(req.params.provider, state));
});

router.get('/oauth/:provider/callback', async (req, res) => {
  const providers = providerConfig();
  const provider = req.params.provider;
  const fail = (msg) => res.redirect(`${redirectBase()}/login?oauth_error=${encodeURIComponent(msg)}`);
  if (!providers[provider]) return fail('Provider not configured');
  if (!req.query.code || req.query.state !== req.cookies?.lumen_oauth_state) return fail('Sign-in state did not match');
  try {
    const profile = await exchangeCode(provider, req.query.code);
    let user = get('SELECT * FROM users WHERE lower(email) = lower(?)', [profile.email]);
    if (!user) {
      const info = run('INSERT INTO users (email, password_hash, email_verified_at) VALUES (?,?,?)', [
        profile.email.toLowerCase(), `oauth$${randomToken(24)}`, nowIso(),
      ]);
      const id = info.lastInsertRowid;
      run('INSERT INTO user_profiles (user_id, display_name, avatar_color) VALUES (?,?,?)', [id, profile.name, avatarFor(profile.name)]);
      run('INSERT INTO user_preferences (user_id) VALUES (?)', [id]);
      seedNewUser(id);
      user = get('SELECT * FROM users WHERE id = ?', [id]);
    }
    run('INSERT OR IGNORE INTO oauth_accounts (user_id, provider, subject) VALUES (?,?,?)', [user.id, provider, profile.subject]);
    const { token, expires } = createSession(user.id, req);
    res.cookie(COOKIE, token, cookieOptions(expires));
    issueCsrfCookie(req, res);
    res.redirect(`${redirectBase()}/dashboard`);
  } catch (err) {
    fail(err.message || 'Sign-in failed');
  }
});

router.get('/config', (_req, res) => {
  res.json({
    ok: true,
    data: {
      providers: providerConfig(),
      smtpConfigured,
      devMode: isDev,
      registrationOpen: true,
    },
  });
});

export default router;
