/**
 * Lumen — server entry point.
 *
 * Modular monolith: one HTTP process, clear module boundaries, one database
 * access layer. Untrusted code never runs here (see server/sandbox).
 */

import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import './db/index.js';
import { seedContent } from './content/seed.js';
import { requestId, loadUser, csrfProtection, issueCsrfCookie } from './lib/context.js';
import { errorMiddleware, ok, fail } from './lib/http.js';
import { cleanupRateLimits } from './lib/rate-limit.js';
import { get } from './db/index.js';
import { runWorkerTick } from './lib/notify.js';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import learningRoutes from './routes/learning.js';
import labRoutes from './routes/lab.js';
import aiRoutes from './routes/ai.js';
import communityRoutes from './routes/community.js';
import aptitudeRoutes from './routes/aptitude.js';
import assessmentRoutes from './routes/assessments.js';
import lessonQuizRoutes from './routes/lesson-quiz.js';
import analyticsRoutes from './routes/analytics.js';
import catalogueRoutes from './routes/catalogue.js';
import roadmapRoutes from './routes/roadmap.js';
import planRoutes from './routes/plans.js';
import competencyRoutes from './routes/competencies.js';
import notificationRoutes from './routes/notifications.js';
import competitionRoutes, { adminRouter as competitionAdminRoutes } from './routes/competitions.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PORT = Number(process.env.PORT || 4180);
const isProd = process.env.NODE_ENV === 'production';

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');

// ── security headers ──
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  const csp = [
    "default-src 'self'",
    // Vite injects inline styles; Monaco uses blob workers.
    "script-src 'self' 'unsafe-inline' blob:",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "worker-src 'self' blob:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
  res.setHeader('Content-Security-Policy', isProd ? csp : csp.replace("script-src 'self' 'unsafe-inline' blob:", "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:"));
  if (isProd) res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  next();
});

app.use(requestId);
app.use(express.json({ limit: '256kb' }));
app.use(express.urlencoded({ extended: false, limit: '64kb' }));
app.use(cookieParser());
app.use(loadUser);

// ── health ──
app.get('/api/health', (_req, res) => {
  let dbOk = false;
  try {
    dbOk = get('SELECT 1 AS ok').ok === 1;
  } catch {
    dbOk = false;
  }
  res.status(dbOk ? 200 : 503).json({
    ok: dbOk,
    data: { status: dbOk ? 'healthy' : 'degraded', database: dbOk ? 'ok' : 'unavailable', uptimeSeconds: Math.round(process.uptime()) },
  });
});

// ── API ──
// Every API request gets a readable CSRF cookie if it does not already have one.
// The client echoes it in the header; issuing it here (not only at login) means a
// fresh jar never has to make a second round trip before its first POST.
app.use('/api', (req, res, next) => {
  issueCsrfCookie(req, res);
  next();
});
app.use('/api', csrfProtection);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/learning', learningRoutes);
app.use('/api/lab', labRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/aptitude', aptitudeRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/lessons', lessonQuizRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/catalogue', catalogueRoutes);
app.use('/api/roadmap', roadmapRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/competencies', competencyRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/competitions', competitionRoutes);
app.use('/api/admin/competitions', competitionAdminRoutes);

app.use('/api', (_req, res) => fail(res, 404, 'not_found', 'No such API endpoint.'));

// ── static client (production build) ──
const dist = path.join(ROOT, 'client', 'dist');
const indexPath = path.join(dist, 'index.html');
if (fs.existsSync(indexPath)) {
  let indexHtml = fs.readFileSync(indexPath, 'utf8');
  app.use(express.static(dist, {
    index: false,
    maxAge: '1h',
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('index.html')) res.setHeader('Cache-Control', 'no-cache');
    },
  }));
  // SPA fallback: read the built shell once and serve it for any non-API path.
  // (res.sendFile's dotfile rules and Express 5 wildcards made this unreliable.)
  app.get('/{*splat}', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    // A stale asset hash after a rebuild must never be answered with the HTML shell:
    // the browser then reports a MIME type error and the app renders nothing.
    if (req.path.startsWith('/assets/')) {
      return res.status(404).type('text/plain').send('Asset not found — reload the page.');
    }
    // Re-read the shell when it changed on disk, so a rebuild does not need a restart.
    try {
      const fresh = fs.readFileSync(indexPath, 'utf8');
      if (fresh !== indexHtml) indexHtml = fresh;
    } catch { /* keep the cached copy */ }
    res.setHeader('Cache-Control', 'no-cache');
    return res.type('html').send(indexHtml);
  });
} else {
  app.get('/{*splat}', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.type('html').send(`<!doctype html><html><head><meta charset="utf-8"><title>Lumen</title>
<style>body{font:16px/1.6 system-ui,sans-serif;max-width:38rem;margin:12vh auto;padding:0 1.5rem;color:#1C1B19;background:#FAF9F6}
code{background:#fff;border:1px solid #E6E3DB;padding:.15rem .4rem;border-radius:4px}</style></head>
<body><h1>Lumen API is running</h1>
<p>The client bundle has not been built yet. Run <code>npm run build</code> and restart, or use <code>npm run dev</code> for the Vite dev server.</p>
<p><a href="/api/health">/api/health</a> · <a href="/api/catalogue/status">/api/catalogue/status</a></p></body></html>`);
  });
}

// Final error handler. Registered last so every route error reaches it.
app.use((err, req, res, next) => {
  console.error('[lumen] error middleware reached:', err && err.code, err && err.message);
  return errorMiddleware(err, req, res, next);
});

// Anything thrown before the error middleware (inside a route that streams, or a
// middleware registered after the handler) still gets logged rather than vanishing.
process.on('uncaughtException', (err) => {
  console.error('[lumen] UNCAUGHT:', err && err.stack ? err.stack.split('\n').slice(0, 8).join('\n') : err);
});
process.on('unhandledRejection', (err) => {
  console.error('[lumen] unhandled rejection:', err && err.stack ? err.stack.split('\n').slice(0, 5).join('\n') : err);
});

// ── startup ──
if (process.env.SEED_ON_START !== 'false') {
  const stats = seedContent();
  if (stats.courses) console.log(`[seed] added ${stats.courses} courses, ${stats.lessons} lessons, ${stats.chunks} retrieval chunks`);
}

cleanupRateLimits();
setInterval(cleanupRateLimits, 6 * 60 * 60 * 1000).unref();

/**
 * Notification worker: a server-side interval, so reminders do not depend on a
 * browser tab being open. It only queues work that exists and records every
 * delivery outcome; see server/lib/notify.js.
 */
const NOTIFY_INTERVAL_MS = Number(process.env.NOTIFY_INTERVAL_MS || 5 * 60 * 1000);
let notifyTimer = null;
app.locals.notifyWorker = { running: false, intervalMs: NOTIFY_INTERVAL_MS, lastRunAt: null, lastReport: null };
if (process.env.NOTIFY_WORKER !== 'off') {
  const tick = () => {
    try {
      const report = runWorkerTick();
      app.locals.notifyWorker = { running: true, intervalMs: NOTIFY_INTERVAL_MS, lastRunAt: new Date().toISOString(), lastReport: report };
      if (report.sent || report.failed) console.log('[notify]', JSON.stringify(report));
    } catch (err) {
      console.error('[notify] tick failed:', err.message);
      app.locals.notifyWorker = { ...app.locals.notifyWorker, running: false, lastError: String(err.message).slice(0, 200) };
    }
  };
  app.locals.notifyWorker.running = true;
  notifyTimer = setInterval(tick, NOTIFY_INTERVAL_MS);
  notifyTimer.unref();
  setTimeout(tick, 15_000).unref();
}

const server = app.listen(PORT, () => {
  console.log(`[lumen] listening on http://localhost:${PORT} (${isProd ? 'production' : 'development'})`);
});

function shutdown(signal) {
  console.log(`[lumen] ${signal} received, closing`);
  if (notifyTimer) clearInterval(notifyTimer);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 8000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default app;
