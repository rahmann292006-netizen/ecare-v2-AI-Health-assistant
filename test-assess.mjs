const BASE = 'http://localhost:4180';
let cookies = {};
function store(res) {
  const raw = res.headers.getSetCookie?.() || [];
  for (const c of raw) { const [pair] = c.split(';'); const i = pair.indexOf('='); cookies[pair.slice(0, i)] = pair.slice(i + 1).trim(); }
}
const cookieHeader = () => Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
async function call(path, method = 'GET', body) {
  const headers = { cookie: cookieHeader() };
  if (body) headers['content-type'] = 'application/json';
  if (method !== 'GET') headers['x-csrf-token'] = cookies.lumen_csrf;
  const res = await fetch(BASE + '/api' + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  store(res);
  const json = await res.json().catch(() => ({}));
  return { status: res.status, ...json };
}
const email = `assess${Date.now()}@example.com`;
// prime the CSRF cookie with a GET first
await call('/catalogue/status');
let r = await call('/auth/signup', 'POST', { displayName: "Test Learner", email, password: 'Correct-horse-battery9' });
console.log('signup', r.status, r.ok, r.error?.fields || r.error?.message || '');
r = await call('/assessments/course/python-programming');
console.log('course list', r.status, r.data?.assessments?.length, JSON.stringify(r.data?.assessments?.[0]));
const id = r.data.assessments[0].id;
r = await call(`/assessments/${id}`);
console.log('payload', r.status, 'questions', r.data?.questions?.length, 'gate', JSON.stringify(r.data?.gate), 'leaksAnswer', JSON.stringify(r.data?.questions?.[0]).includes('correctOptionId'));
// submit blocked by gate
r = await call(`/assessments/${id}/submit`, 'POST', { answers: [] });
console.log('gated submit', r.status, r.error?.code, r.error?.message?.slice(0, 60));
// complete the module's lessons
const course = await call('/learning/courses/python-programming');
const firstModule = course.data.modules[0];
for (const l of firstModule.lessons) {
  const rr = await call(`/learning/lessons/python-programming/${l.slug}/complete`, 'POST', { completed: true });
  if (!rr.ok) console.log('complete fail', l.slug, rr.status, rr.error?.message);
}
console.log('module lessons', firstModule.lessons.length);
r = await call(`/assessments/${id}`);
console.log('gate after', JSON.stringify(r.data.gate));
// correct answers: pick the first option of each; compare with server review to compute expected
const questions = r.data.questions;
const startedAt = new Date(Date.now() - 120000).toISOString();
r = await call(`/assessments/${id}/submit`, 'POST', {
  answers: questions.map((q) => ({ questionId: q.id, optionId: q.options[0].id })),
  startedAt,
});
console.log('submit', r.status, JSON.stringify({ score: r.data?.submission?.score, max: r.data?.submission?.maxScore, pct: r.data?.submission?.percent, passed: r.data?.submission?.passed, dur: r.data?.submission?.durationSeconds }));
console.log('review has explanations', r.data?.review?.every((x) => typeof x.explanation === 'string' && x.explanation.length > 10));
console.log('review marks correct', r.data?.review?.filter((x) => x.correct).length === r.data?.submission?.score);
const subId = r.data.submission.id;
// perfect attempt: choose the correct option id from the review
const perfect = r.data.review.map((x) => ({ questionId: x.questionId, optionId: x.correctOptionId }));
r = await call(`/assessments/${id}/submit`, 'POST', { answers: perfect, durationSeconds: 200 });
console.log('perfect', r.status, r.data?.submission?.percent, 'passed', r.data?.submission?.passed, 'attempt', r.data?.submission?.attempt, 'awarded', JSON.stringify(r.data?.awarded?.map((a) => a.slug)));
// empty answers attempt
r = await call(`/assessments/${id}/submit`, 'POST', { answers: [], durationSeconds: 30 });
console.log('empty', r.status, r.data?.submission?.score, r.data?.answeredCount);
// bad option id
r = await call(`/assessments/${id}/submit`, 'POST', { answers: [{ questionId: questions[0].id, optionId: 999999 }] });
console.log('bad option', r.status, r.error?.code);
// saved attempt read back
r = await call(`/assessments/submissions/${subId}`);
console.log('readback', r.status, r.data?.submission?.percent, r.data?.review?.length);
// mine
r = await call('/assessments/mine');
console.log('mine', r.status, r.data?.attempts?.length, 'auth-cookie', Boolean(cookies.lumen_session));
// analytics + course page reflect it
r = await call('/analytics/overview');
console.log('analytics assessments', r.data?.assessments?.length, 'first', JSON.stringify(r.data?.assessments?.[0]));
r = await call('/learning/courses/python-programming');
console.log('course assessments', JSON.stringify(r.data.assessments[0]));
// other user cannot read the submission
const c2 = { ...cookies }; cookies = {};
await call('/auth/logout', 'POST', {});
cookies = {};
await call('/catalogue/status');
await call('/auth/signup', 'POST', { displayName: "Other", email: `other${Date.now()}@example.com`, password: 'Correct-horse-battery9' });
r = await call(`/assessments/submissions/${subId}`);
console.log('cross-user read', r.status, r.error?.code);
cookies = c2;
// unauth
const saved = { ...cookies }; cookies = {};
r = await call(`/assessments/${id}`);
console.log('unauth', r.status, r.error?.code);
