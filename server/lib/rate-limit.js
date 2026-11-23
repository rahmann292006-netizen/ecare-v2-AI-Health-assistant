import { run, get } from '../db/index.js';

/**
 * Fixed-window rate limiter persisted in SQLite so it survives restarts
 * and works across processes. Fails open on DB errors (availability first).
 */
export function rateLimit({ key, limit, windowMs }) {
  try {
    const now = Date.now();
    const row = get('SELECT key, window_start, count FROM rate_limits WHERE key = ?', [key]);
    if (!row || now - row.window_start > windowMs) {
      run(
        'INSERT INTO rate_limits (key, window_start, count) VALUES (?,?,1) ON CONFLICT(key) DO UPDATE SET window_start = excluded.window_start, count = 1',
        [key, now],
      );
      return { allowed: true, remaining: limit - 1, retryAfter: 0 };
    }
    if (row.count >= limit) {
      return { allowed: false, remaining: 0, retryAfter: Math.ceil((row.window_start + windowMs - now) / 1000) };
    }
    run('UPDATE rate_limits SET count = count + 1 WHERE key = ?', [key]);
    return { allowed: true, remaining: limit - row.count - 1, retryAfter: 0 };
  } catch {
    return { allowed: true, remaining: limit, retryAfter: 0 };
  }
}

/** Express middleware factory. */
export function limit(name, limit, windowMs, keyFn) {
  return (req, res, next) => {
    const identity = keyFn ? keyFn(req) : (req.user ? `u:${req.user.id}` : `ip:${req.ip}`);
    const result = rateLimit({ key: `${name}:${identity}`, limit, windowMs });
    res.setHeader('X-RateLimit-Limit', String(limit));
    res.setHeader('X-RateLimit-Remaining', String(result.remaining));
    if (!result.allowed) {
      res.setHeader('Retry-After', String(result.retryAfter));
      return res.status(429).json({
        ok: false,
        error: { code: 'rate_limited', message: `Too many requests. Try again in ${result.retryAfter}s.` },
      });
    }
    next();
  };
}

export function cleanupRateLimits() {
  run('DELETE FROM rate_limits WHERE window_start < ?', [Date.now() - 24 * 60 * 60 * 1000]);
}
