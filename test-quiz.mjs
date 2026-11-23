import Database from 'better-sqlite3';
const BASE = 'http://localhost:4180';
const TEST_EMAIL = new Database('server/data/lumen.db', { readonly: true })
  .prepare("SELECT email FROM users WHERE email LIKE 'assess%' ORDER BY id DESC LIMIT 1").get().email;
let cookies = {};
const store = (res) => { for (const c of res.headers.getSetCookie?.() || []) { const [p] = c.split(';'); const i = p.indexOf('='); cookies[p.slice(0, i)] = p.slice(i + 1).trim(); } };
const ch = () => Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
async function call(path, method = 'GET', body) {
  const headers = { cookie: ch() };
  if (body) headers['content-type'] = 'application/json';
  if (method !== 'GET') headers['x-csrf-token'] = cookies.lumen_csrf;
  const res = await fetch(BASE + '/api' + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  store(res);
  return { status: res.status, ...(await res.json().catch(() => ({}))) };
}
await call('/catalogue/status');
let r = await call('/auth/login', 'POST', { email: TEST_EMAIL, password: 'Correct-horse-battery9' });
console.log('login', r.status, r.ok);
// lesson 1 has the upgraded content
r = await call('/learning/lessons/python-programming/how-python-runs');
console.log('lesson', r.status, 'title:', r.data?.lesson?.title, '| body chars', r.data?.lesson?.body?.length, '| quiz?', Boolean(r.data?.quiz));
// quiz fetch must not leak the answer
r = await call('/lessons/1/quiz');
const leaked = JSON.stringify(r.data || {}).includes('is_correct') || JSON.stringify(r.data || {}).includes('isCorrect');
console.log('quiz get', r.status, 'questions', r.data?.questions?.length, 'options', r.data?.questions?.[0]?.options?.length, 'leaks answer', leaked);
const qs = r.data.questions;
// wrong answers
r = await call('/lessons/1/quiz', 'POST', { answers: qs.map((q) => ({ questionId: q.id, optionId: q.options[0].id })) });
console.log('submit wrong', r.status, r.data?.score, '/', r.data?.maxScore, 'passed', r.data?.passed, 'explanations', r.data?.review?.every((x) => x.explanation?.length > 10));
// perfect
const correct = r.data.review.map((x) => ({ questionId: x.questionId, optionId: x.correct }));
r = await call('/lessons/1/quiz', 'POST', { answers: correct });
console.log('submit perfect', r.status, r.data?.score, '/', r.data?.maxScore, 'passed', r.data?.passed);
// empty
r = await call('/lessons/1/quiz', 'POST', { answers: [] });
console.log('empty', r.status, r.data?.score);
// foreign option
r = await call('/lessons/1/quiz', 'POST', { answers: [{ questionId: qs[0].id, optionId: 999999 }] });
console.log('foreign option', r.status, r.error?.code);
// lesson without a quiz
r = await call('/lessons/2/quiz');
console.log('no quiz lesson', r.status, r.error?.code);
// unauth
const saved = { ...cookies }; cookies = {};
r = await call('/lessons/1/quiz');
console.log('unauth', r.status, r.error?.code);
cookies = saved;
// lesson detail still works and checkpoint list is unaffected (lesson_quiz rows must not appear)
r = await call('/learning/courses/python-programming');
console.log('course assessments (excludes lesson checks):', r.data?.assessments?.map((a) => a.title).join(', '));
