/**
 * Server-side error logging + client-safe error envelope.
 * Internal details are logged, never returned.
 */

export class HttpError extends Error {
  constructor(status, code, message, fields) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export const badRequest = (message, fields) => new HttpError(400, 'invalid_request', message, fields);
export const unauthorized = (message = 'You need to sign in to continue.') => new HttpError(401, 'unauthenticated', message);
export const forbidden = (message = 'You do not have access to this.') => new HttpError(403, 'forbidden', message);
export const notFound = (message = 'Not found.') => new HttpError(404, 'not_found', message);
export const conflict = (message, code = 'conflict') => new HttpError(409, code, message);
export const tooMany = (message = 'Too many attempts. Please wait and try again.', retryAfter) =>
  Object.assign(new HttpError(429, 'rate_limited', message), { retryAfter });
export const notConfigured = (message) => new HttpError(503, 'not_configured', message);

export function logError(err, req) {
  const stamp = new Date().toISOString();
  const where = req ? `${req.method} ${req.originalUrl} req=${req.id || '-'}` : 'startup';
  if (err instanceof HttpError && err.status < 500) {
    console.warn(`[${stamp}] ${where} → ${err.status} ${err.code}: ${err.message}`);
    return;
  }
  console.error(`[${stamp}] ${where} → ${err && err.message ? err.message : err}`);
  if (err && err.stack) console.error(err.stack.split('\n').slice(1, 6).join('\n'));
}

/** Wrap an async route so rejections reach the error middleware. */
export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export const ok = (res, data, status = 200) => res.status(status).json({ ok: true, data });
export const fail = (res, status, code, message, fields) =>
  res.status(status).json({ ok: false, error: { code, message, ...(fields ? { fields } : {}) } });

export function errorMiddleware(err, req, res, _next) {
  logError(err, req);
  if (res.headersSent) return;
  if (process.env.DEBUG_ERRORS) console.error('[error-middleware]', err && (err.stack || err));
  if (err instanceof HttpError) {
    if (err.retryAfter) res.set('Retry-After', String(err.retryAfter));
    return fail(res, err.status, err.code, err.message, err.fields);
  }
  // Errors raised with an explicit status (HttpError, AiError, ValidationError) keep it.
  if (err && Number.isInteger(err.status) && err.status >= 400 && err.status < 600) {
    return fail(res, err.status, err.code || 'request_failed', err.message || 'The request could not be completed.', err.fields);
  }
  if (err && err.type === 'entity.too.large') {
    return fail(res, 413, 'payload_too_large', 'That request was too large.');
  }
  if (err && err.type === 'entity.parse.failed') {
    return fail(res, 400, 'invalid_json', 'The request body was not valid JSON.');
  }
  return fail(res, 500, 'internal_error', 'Something went wrong on our side. Please try again.');
}
