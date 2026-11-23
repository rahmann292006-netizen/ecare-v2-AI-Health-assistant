/** API client: one place for fetch, envelope unwrapping, CSRF and error messages. */

function csrfToken() {
  const match = document.cookie.split('; ').find((c) => c.startsWith('lumen_csrf='));
  return match ? decodeURIComponent(match.slice('lumen_csrf='.length)) : '';
}

export class ApiError extends Error {
  constructor(status, code, message, fields) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields || {};
  }
}

export async function api(path, { method = 'GET', body, signal, raw = false } = {}) {
  const headers = {};
  if (body !== undefined) headers['content-type'] = 'application/json';
  const token = csrfToken();
  if (token && method !== 'GET') headers['x-csrf-token'] = token;

  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers,
      credentials: 'same-origin',
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError(0, 'network_error', 'Could not reach the server. Check your connection and try again.');
  }

  if (raw) return res;

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    throw new ApiError(res.status, 'bad_response', 'The server returned an unexpected response.');
  }

  if (!res.ok || json?.ok === false) {
    const error = json?.error || {};
    throw new ApiError(res.status, error.code || 'request_failed', error.message || 'That request could not be completed.', error.fields);
  }
  return json.data;
}

export const get = (path, opts) => api(path, opts);
export const post = (path, body, opts) => api(path, { ...opts, method: 'POST', body });
export const patch = (path, body, opts) => api(path, { ...opts, method: 'PATCH', body });
export const put = (path, body, opts) => api(path, { ...opts, method: 'PUT', body });
export const del = (path, opts) => api(path, { ...opts, method: 'DELETE' });

/** SSE helper for the AI tutor stream. */
export async function streamChat(payload, { onMeta, onDelta, onDone, onError, signal } = {}) {
  const res = await fetch('/api/ai/chat/stream', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-csrf-token': csrfToken() },
    credentials: 'same-origin',
    body: JSON.stringify(payload),
    signal,
  });

  if (!res.ok) {
    const text = await res.text();
    let message = 'The AI tutor could not answer.';
    let code = 'ai_failed';
    try {
      const json = JSON.parse(text);
      message = json?.error?.message || message;
      code = json?.error?.code || code;
    } catch {
      /* keep defaults */
    }
    throw new ApiError(res.status, code, message);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split('\n\n');
    buffer = frames.pop() || '';
    for (const frame of frames) {
      const eventLine = frame.split('\n').find((l) => l.startsWith('event:'));
      const dataLine = frame.split('\n').find((l) => l.startsWith('data:'));
      if (!dataLine) continue;
      const event = eventLine ? eventLine.slice(6).trim() : 'message';
      let data = {};
      try {
        data = JSON.parse(dataLine.slice(5).trim());
      } catch {
        continue;
      }
      if (event === 'meta') onMeta?.(data);
      else if (event === 'delta') onDelta?.(data.text || '');
      else if (event === 'done') onDone?.(data);
      else if (event === 'error') onError?.(data);
    }
  }
}
