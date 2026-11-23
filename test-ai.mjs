const BASE = 'http://localhost:4180';
let cookies = {};
function store(res) { for (const c of res.headers.getSetCookie?.() || []) { const [pair] = c.split(';'); const i = pair.indexOf('='); cookies[pair.slice(0, i)] = pair.slice(i + 1).trim(); } }
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
await call('/catalogue/status');
let r = await call('/ai/status');
console.log('status (public)', r.status, JSON.stringify(r.data));
r = await call('/auth/login', 'POST', { email: process.env.TEST_EMAIL, password: 'Correct-horse-battery9' });
console.log('login', r.status, r.ok);
if (!r.ok) { r = await call('/auth/login', 'POST', { email: process.env.TEST_EMAIL, password: 'Correct-horse-battery9' }); console.log('login2', r.status, r.error?.message); }
r = await call('/ai/chat', 'POST', { message: 'What is the mutable default argument bug in Python?', courseSlug: 'python-programming', lessonSlug: 'functions-arguments-and-scope' });
console.log('chat', r.status, r.error?.code, '|', (r.error?.message || '').slice(0, 120));
r = await call('/ai/search?q=mutable%20default%20argument&courseSlug=python-programming');
console.log('search', r.status, r.data?.results?.length, JSON.stringify(r.data?.results?.[0])?.slice(0, 220));
