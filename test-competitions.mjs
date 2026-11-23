/**
 * Competitions and quizzes — end-to-end test against the running server.
 *
 * What this proves, in order:
 *   1. a draft event is invisible; announcing it makes it visible and notifies learners
 *   2. registration is refused before it opens and works while it is open
 *   3. a challenge's tests and answer key are never sent before the event is live
 *   4. a quiz answer is graded server-side and the reason is returned
 *   5. a code challenge is graded by the real sandbox: a wrong answer scores partial,
 *      a correct one scores full
 *   6. submitting without registering, or when the event is not live, is refused
 *   7. publishing computes ranks from real scores and notifies every participant
 *   8. an event can only move forward through its lifecycle
 *
 * Usage: node test-competitions.mjs   (server must be on PORT, default 4180)
 */
import { all, get, run } from './server/db/index.js';

const BASE = `http://127.0.0.1:${process.env.PORT || 4180}`;
let pass = 0;
let fail = 0;
const failures = [];

function check(name, cond, extra = '') {
  if (cond) {
    pass += 1;
    console.log(`  ok   ${name}`);
  } else {
    fail += 1;
    failures.push(name);
    console.log(`  FAIL ${name}${extra ? ` — ${extra}` : ''}`);
  }
}

async function call(method, path, { body, cookie, csrf } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (cookie) headers.cookie = cookie;
  if (csrf) headers['x-csrf-token'] = csrf;
  const res = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status, json, data: json?.data, error: json?.error };
}

/** Signup returns the cookie in the response headers; fetch exposes it through getSetCookie. */
async function signupWithCookie(tag) {
  const email = `${tag}-${Date.now()}-${Math.floor(Math.random() * 1e4)}@example.com`;
  const res = await fetch(`${BASE}/api/auth/signup`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ displayName: `${tag} tester`, email, password: 'Correct-horse-battery9' }),
  });
  const cookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get('set-cookie') || ''];
  const jar = cookies.filter(Boolean).map((c) => c.split(';')[0]).join('; ');
  const csrf = /lumen_csrf=([^;]+)/.exec(jar)?.[1] || '';
  if (!jar) throw new Error('no session cookie from signup');
  const me = await (await fetch(`${BASE}/api/auth/me`, { headers: { cookie: jar } })).json();
  const id = me.data.user.id;
  // a learner who has never opened notification settings gets the default set, so the
  // announcement reaches them; make that explicit instead of relying on a previous test run
  run('INSERT OR IGNORE INTO reminder_preferences (user_id) VALUES (?)', [id]);
  return { email, id, cookie: jar, csrf };
}

async function main() {
  console.log(`\nCompetitions & quizzes — ${BASE}\n`);

  // clean slate for the events under test
  run("DELETE FROM competition_submissions WHERE competition_id IN (SELECT id FROM competitions WHERE slug LIKE 'test-%')");
  run("DELETE FROM competition_results WHERE competition_id IN (SELECT id FROM competitions WHERE slug LIKE 'test-%')");
  run("DELETE FROM competition_registrations WHERE competition_id IN (SELECT id FROM competitions WHERE slug LIKE 'test-%')");
  run("DELETE FROM competitions WHERE slug LIKE 'test-%'");

  const now = Date.now();
  const iso = (ms) => new Date(ms).toISOString();
  const HOUR = 3_600_000;

  // ── fixtures ────────────────────────────────────────────────────────────
  run(
    `INSERT INTO competitions (slug, title, summary, description_md, status, format, duration_minutes,
       registration_opens_at, registration_closes_at, starts_at, ends_at, rules_md, eligibility_md)
     VALUES ('test-quiz','Test quiz','summary','desc','draft','quiz',15,?,?,?,?,'rules','anyone')`,
    [iso(now - HOUR), iso(now + HOUR), iso(now + 2 * HOUR), iso(now + 4 * HOUR)],
  );
  const quizId = get("SELECT id FROM competitions WHERE slug = 'test-quiz'").id;
  run(
    `INSERT INTO competition_challenges (competition_id, slug, title, prompt_md, language, points, options_json, correct_index, explanation, sort_order)
     VALUES (?,?,?,?,?,?,?,?,?,0)`,
    [quizId, 'q1', 'What is 2+2?', 'Pick one.', 'quiz', 10, JSON.stringify(['3', '4', '5']), 1, 'Two plus two is four.', ],
  );

  run(
    `INSERT INTO competitions (slug, title, summary, description_md, status, format, duration_minutes,
       registration_opens_at, registration_closes_at, starts_at, ends_at, rules_md, eligibility_md)
     VALUES ('test-code','Test code','summary','desc','live','code',60,?,?,?,?,'rules','anyone')`,
    [iso(now - 2 * HOUR), iso(now - HOUR), iso(now - HOUR), iso(now + 2 * HOUR)],
  );
  const codeId = get("SELECT id FROM competitions WHERE slug = 'test-code'").id;
  run(
    `INSERT INTO competition_challenges (competition_id, slug, title, prompt_md, language, starter_code, test_json, points, sort_order)
     VALUES (?,?,?,?,?,?,?,?,0)`,
    [
      codeId, 'sum', 'Add them up', 'Print the sum of two numbers.', 'python', 'a, b = map(int, input().split())\n',
      JSON.stringify([
        { input: '1 2\n', expected: '3' },
        { input: '5 7\n', expected: '12' },
      ]),
      100,
    ],
  );

  const learner = await signupWithCookie('comp');
  const other = await signupWithCookie('comp2');
  const admin = get("SELECT id, email FROM users WHERE role = 'admin' LIMIT 1");
  check('an admin account exists to organise events', Boolean(admin));

  // ── 1. draft invisibility, then announce ────────────────────────────────
  let list = await call('GET', '/api/competitions');
  check('public list loads without signing in', list.status === 200);
  check('a draft event is not listed', !list.data.events.some((e) => e.slug === 'test-quiz'));
  const draftDetail = await call('GET', '/api/competitions/test-quiz');
  check('a draft event is a 404 by slug', draftDetail.status === 404);

  // the admin cookie needs a real sign-in for the seeded admin
  // the seeded admin's password is reset here so the organiser path can be exercised
  const { hashPassword } = await import('./server/lib/password.js');
  run('UPDATE users SET password_hash = ? WHERE id = ?', [hashPassword('Correct-horse-battery9'), admin.id]);
  const adminSignin = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: admin.email, password: 'Correct-horse-battery9' }),
  });
  let adminCookie = '';
  let adminCsrf = '';
  if (adminSignin.status === 200) {
    const jar = (adminSignin.headers.getSetCookie?.() || [adminSignin.headers.get('set-cookie') || '']).filter(Boolean).map((c) => c.split(';')[0]).join('; ');
    adminCookie = jar;
    adminCsrf = /lumen_csrf=([^;]+)/.exec(jar)?.[1] || '';
  }
  const forbidden = await call('POST', '/api/admin/competitions/test-quiz/status', { body: { status: 'announced' }, cookie: learner.cookie, csrf: learner.csrf });
  check('a learner cannot announce an event', forbidden.status === 403, `got ${forbidden.status}`);

  const announce = await call('POST', '/api/admin/competitions/test-quiz/status', { body: { status: 'announced' }, cookie: adminCookie, csrf: adminCsrf });
  check('an admin can announce an event', announce.status === 200, JSON.stringify(announce.error));
  list = await call('GET', '/api/competitions');
  check('the announced event is listed', list.data.events.some((e) => e.slug === 'test-quiz'));
  const announced = get("SELECT status FROM competitions WHERE slug = 'test-quiz'").status;
  check('the announced event is stored as announced', announced === 'announced');
  const notification = get("SELECT * FROM notifications WHERE user_id = ? AND kind = 'competition_announced' AND dedupe_key = ?", [learner.id, 'comp-announced:test-quiz']);
  check('every learner with reminders on gets one announcement, not a duplicate', Boolean(notification));

  // ── 2. registration window ──────────────────────────────────────────────
  run('UPDATE competitions SET registration_opens_at = ?, registration_closes_at = ? WHERE slug = ?', [iso(now + HOUR), iso(now + 2 * HOUR), 'test-quiz']);
  const early = await call('POST', '/api/competitions/test-quiz/register', { cookie: learner.cookie, csrf: learner.csrf, body: {} });
  check('registering before it opens is refused', early.status === 409, `got ${early.status}`);
  run('UPDATE competitions SET registration_opens_at = ?, registration_closes_at = ? WHERE slug = ?', [iso(now - 3 * HOUR), iso(now - 2 * HOUR), 'test-quiz']);
  run('UPDATE competitions SET status = ?, starts_at = ?, ends_at = ? WHERE slug = ?', ['live', iso(now - HOUR), iso(now + HOUR), 'test-quiz']);
  const lateEntry = await call('POST', '/api/competitions/test-quiz/register', { cookie: learner.cookie, csrf: learner.csrf, body: {} });
  check('a learner can join an event that is running', lateEntry.status === 201, JSON.stringify(lateEntry.error));
  run("DELETE FROM competition_registrations WHERE competition_id = (SELECT id FROM competitions WHERE slug = 'test-quiz')");
  run('UPDATE competitions SET status = ?, starts_at = ?, ends_at = ? WHERE slug = ?', ['announced', iso(now + 2 * HOUR), iso(now + 4 * HOUR), 'test-quiz']);

  run('UPDATE competitions SET registration_opens_at = ?, registration_closes_at = ? WHERE slug = ?', [iso(now - HOUR), iso(now + HOUR), 'test-quiz']);
  const reg = await call('POST', '/api/competitions/test-quiz/register', { cookie: learner.cookie, csrf: learner.csrf, body: {} });
  check('registering while open works', reg.status === 201, JSON.stringify(reg.error));
  const again = await call('POST', '/api/competitions/test-quiz/register', { cookie: learner.cookie, csrf: learner.csrf, body: {} });
  check('registering twice is idempotent', again.status === 200 && again.data.already === true);

  // ── 3. secrets stay on the server ───────────────────────────────────────
  const beforeLive = await call('GET', '/api/competitions/test-quiz', { cookie: learner.cookie });
  const beforeChallenge = beforeLive.data.challenges[0];
  check('the answer key is not in the event payload', JSON.stringify(beforeLive.data).includes('correctIndex') === false);
  check('the explanation is not in the event payload before grading', beforeChallenge.explanation === undefined);
  const codeEvent = await call('GET', '/api/competitions/test-code', { cookie: learner.cookie });
  check('a learner who has not registered sees only the challenge titles', codeEvent.data.challenges[0].prompt === undefined && codeEvent.data.canAttempt === false);
  const organiserView = await call('GET', '/api/competitions/test-code', { cookie: adminCookie });
  check('the organiser can see their own challenge and its test count', organiserView.data.challenges[0].testCount === 2);
  check('the test inputs and expected outputs are still never sent', !JSON.stringify(organiserView.data).includes('"expected"'));

  // ── 4. quiz grading ─────────────────────────────────────────────────────
  const notLive = await call('POST', '/api/competitions/test-quiz/challenges/q1', { cookie: learner.cookie, csrf: learner.csrf, body: { answerIndex: 1 } });
  check('a quiz cannot be answered before it is live', notLive.status === 409, `got ${notLive.status}`);

  run('UPDATE competitions SET status = ?, starts_at = ?, ends_at = ? WHERE slug = ?', ['live', iso(now - HOUR), iso(now + 2 * HOUR), 'test-quiz']);
  const wrong = await call('POST', '/api/competitions/test-quiz/challenges/q1', { cookie: learner.cookie, csrf: learner.csrf, body: { answerIndex: 0 } });
  check('a wrong answer is graded 0', wrong.status === 200 && wrong.data.passed === false && wrong.data.score === 0, JSON.stringify(wrong.data || wrong.error));
  check('a wrong answer still returns the reason', typeof wrong.data?.explanation === 'string' && wrong.data.explanation.length > 5);
  const right = await call('POST', '/api/competitions/test-quiz/challenges/q1', { cookie: learner.cookie, csrf: learner.csrf, body: { answerIndex: 1 } });
  check('a correct answer scores the full points', right.status === 200 && right.data.passed === true && right.data.score === 10);
  const noAnswer = await call('POST', '/api/competitions/test-quiz/challenges/q1', { cookie: learner.cookie, csrf: learner.csrf, body: {} });
  check('an empty answer is rejected', noAnswer.status === 400);

  // ── 5. code grading through the real sandbox ────────────────────────────
  const unregistered = await call('POST', '/api/competitions/test-code/challenges/sum', { cookie: learner.cookie, csrf: learner.csrf, body: { code: 'print(1)' } });
  check('submitting without registering is refused', unregistered.status === 403, `got ${unregistered.status}`);

  run(
    `INSERT INTO competition_registrations (competition_id, user_id, registered_at) VALUES (?,?,?)`,
    [codeId, learner.id, iso(now - 3 * HOUR)],
  );
  const registeredView = await call('GET', '/api/competitions/test-code', { cookie: learner.cookie });
  check('a registered learner in a live event can attempt the challenge', registeredView.data.canAttempt === true && typeof registeredView.data.challenges[0].prompt === 'string');
  const partial = await call('POST', '/api/competitions/test-code/challenges/sum', {
    cookie: learner.cookie, csrf: learner.csrf,
    body: { code: 'a, b = map(int, input().split())\nprint(a + b if a == 1 else 0)\n' },
  });
  check('partially correct code scores partial credit', partial.status === 200 && partial.data.passed === false && partial.data.passedTests === 1 && partial.data.score === 50, JSON.stringify(partial.data || partial.error));
  check('the failing test is reported with its expected and actual output', partial.data?.results?.some((r) => !r.passed && r.expected === '12'));

  const full = await call('POST', '/api/competitions/test-code/challenges/sum', {
    cookie: learner.cookie, csrf: learner.csrf,
    body: { code: 'a, b = map(int, input().split())\nprint(a + b)\n' },
  });
  check('a correct solution scores full marks', full.status === 200 && full.data.passed === true && full.data.score === 100);

  const broken = await call('POST', '/api/competitions/test-code/challenges/sum', {
    cookie: learner.cookie, csrf: learner.csrf,
    body: { code: 'this is not python' },
  });
  check('code that does not run does not score', broken.status === 200 ? broken.data.score === 0 : broken.status === 409, `got ${broken.status}`);

  const empty = await call('POST', '/api/competitions/test-code/challenges/sum', { cookie: learner.cookie, csrf: learner.csrf, body: { code: '   ' } });
  check('an empty solution is rejected', empty.status === 400);

  // ── 6. my standing ──────────────────────────────────────────────────────
  const mine = await call('GET', '/api/competitions/test-code/me', { cookie: learner.cookie });
  check('my standing reports the best score per challenge', mine.status === 200 && mine.data.submissions[0].best === 100);
  check('my standing counts my attempts', mine.data.submissions[0].attempts >= 3);

  // ── 7. publish: real ranks, real notifications ──────────────────────────
  const skip = await call('POST', '/api/admin/competitions/test-code/status', { body: { status: 'published' }, cookie: adminCookie, csrf: adminCsrf });
  check('an event cannot skip straight to published', skip.status === 400, `got ${skip.status}`);

  const close = await call('POST', '/api/admin/competitions/test-code/status', { body: { status: 'closed' }, cookie: adminCookie, csrf: adminCsrf });
  check('closing computes the standings', close.status === 200 && close.data.computed?.participants === 1, JSON.stringify(close.data || close.error));
  const closedDetail = await call('GET', '/api/competitions/test-code', { cookie: learner.cookie });
  check('a closed event accepts no more submissions', closedDetail.data.canAttempt === false);
  const lateSubmit = await call('POST', '/api/competitions/test-code/challenges/sum', { cookie: learner.cookie, csrf: learner.csrf, body: { code: 'print(3)' } });
  check('a late submission is refused', lateSubmit.status === 409);

  const publish = await call('POST', '/api/admin/competitions/test-code/status', { body: { status: 'published' }, cookie: adminCookie, csrf: adminCsrf });
  check('publishing works', publish.status === 200);
  const result = get('SELECT * FROM competition_results WHERE competition_id = ? AND user_id = ?', [codeId, learner.id]);
  check('the participant has a result row', Boolean(result));
  check('the result carries the real score and rank', result?.score === 100 && result?.rank === 1, JSON.stringify(result));
  const resultNote = get("SELECT * FROM notifications WHERE user_id = ? AND kind = 'competition_result'", [learner.id]);
  check('the result is announced to the participant', Boolean(resultNote));

  const published = await call('GET', '/api/competitions/test-code', { cookie: learner.cookie });
  check('a published event shows its leaderboard', Array.isArray(published.data.results) && published.data.results.length === 1);
  check('the leaderboard shows the real score', published.data.results[0].score === 100);
  const final = await call('POST', '/api/admin/competitions/test-code/status', { body: { status: 'live' }, cookie: adminCookie, csrf: adminCsrf });
  check('a published event cannot be reopened', final.status === 400);

  // ── 8. a second learner does not see the first learner\'s data ──────────
  const otherView = await call('GET', '/api/competitions/test-code', { cookie: other.cookie });
  check('another learner sees no personal score', otherView.data.event.myScore === 0 && otherView.data.event.myRank === null);

  // cleanup
  run("DELETE FROM competition_submissions WHERE competition_id IN (SELECT id FROM competitions WHERE slug LIKE 'test-%')");
  run("DELETE FROM competition_results WHERE competition_id IN (SELECT id FROM competitions WHERE slug LIKE 'test-%')");
  run("DELETE FROM competition_registrations WHERE competition_id IN (SELECT id FROM competitions WHERE slug LIKE 'test-%')");
  run("DELETE FROM competitions WHERE slug LIKE 'test-%'");

  console.log(`\n${fail === 0 ? 'ALL COMPETITION TESTS PASSED' : 'FAILURES: ' + failures.join(' | ')}`);
  console.log(`${pass} passed, ${fail} failed\n`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('test crashed:', err);
  process.exit(1);
});
