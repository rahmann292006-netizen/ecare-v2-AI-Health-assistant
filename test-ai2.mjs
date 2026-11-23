import Database from 'better-sqlite3';
const BASE = 'http://localhost:4180';
// Test account is read from the database so the run does not depend on shell variables.
const TEST_EMAIL = process.env.TEST_EMAIL
  || new Database('server/data/lumen.db', { readonly: true })
       .prepare("SELECT email FROM users WHERE email LIKE 'assess%' ORDER BY id DESC LIMIT 1")
       .get().email;
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'Correct-horse-battery9';
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
// A fresh cookie jar per run. Nothing may precede the login but one CSRF prime,
// because the send() helper attaches the csrf header to the POST.
await call('/catalogue/status');
let r = await call('/auth/login', 'POST', { email: TEST_EMAIL, password: TEST_PASSWORD });
console.log('login', r.status, r.ok, r.error?.message || '');
{ const st = await call('/ai/status'); console.log('status', st.status, JSON.stringify(st.data)); }

// 1. general question, no course
r = await call('/ai/chat', 'POST', { message: 'What is a mutable default argument?' });
console.log('general', r.status, 'grounded', r.data?.grounded, 'cites', r.data?.message?.citations?.length, 'model', r.data?.model);
const convId = r.data?.conversationId;
console.log('  reply head:', (r.data?.message?.content || r.error?.message || '').slice(0, 90).replace(/\n/g, ' '));

// 2. course + lesson specific
r = await call('/ai/chat', 'POST', { message: 'Why does 0.1 + 0.2 not equal 0.3 here?', courseSlug: 'python-programming', lessonSlug: 'types-and-operators' });
console.log('course+lesson', r.status, 'cites', r.data?.message?.citations?.length, 'first', r.data?.message?.citations?.[0]?.lessonSlug, 'ctx', JSON.stringify(r.data?.context));
console.log('  citation snippet:', (r.data?.message?.citations?.[0]?.snippet || '').slice(0, 70));

// 3. follow-up in the same conversation
r = await call('/ai/chat', 'POST', { message: 'And how do I avoid it in a function?', conversationId: convId });
console.log('followup', r.status, 'conv', r.data?.conversationId === convId, 'cites', r.data?.message?.citations?.length);

// 4. coding / debug mode
r = await call('/ai/chat', 'POST', { message: 'My function keeps the old list. Here is my code:\ndef f(x, bucket=[]): bucket.append(x); return bucket', mode: 'debug' });
console.log('debug mode', r.status, 'ok', Boolean(r.data?.message));
r = await call('/ai/chat', 'POST', { message: 'Hint only: how do I reverse a linked list?', mode: 'hint', courseSlug: 'data-structures-algorithms' });
console.log('hint mode', r.status, 'cites', r.data?.message?.citations?.length);

// 5. conversation history persisted
r = await call(`/ai/conversations/${convId}`);
console.log('history', r.status, 'messages', r.data?.messages?.length, 'citations stored', JSON.stringify(r.data?.messages?.[1]?.citations || []).slice(0, 120));

// 6. validation errors
r = await call('/ai/chat', 'POST', { message: 'x' });
console.log('too short', r.status, r.error?.code);
r = await call('/ai/chat', 'POST', { message: 'hello there', mode: 'bogus' });
console.log('bad mode', r.status, r.error?.code);
r = await call('/ai/chat', 'POST', { message: 'hello there', conversationId: 999999 });
console.log('bad conv', r.status, r.error?.code);

// 7. stream
const sres = await fetch(BASE + '/api/ai/chat/stream', { method: 'POST', headers: { 'content-type': 'application/json', cookie: cookieHeader(), 'x-csrf-token': cookies.lumen_csrf }, body: JSON.stringify({ message: 'Stream a grounded answer about truthiness', courseSlug: 'python-programming' }) });
const text = await sres.text();
const events = [...text.matchAll(/^event: (\w+)$/gm)].map((m) => m[1]);
console.log('stream', sres.status, 'events', [...new Set(events)].join(','), 'hasCitations', text.includes('"citations"'), 'STUB text', text.includes('STUB_MODEL_REPLY'));

// 8. unconfigured provider scenario is covered separately
r = await call('/ai/search?q=big%20o%20complexity');
console.log('search', r.status, r.data?.results?.length);
