/**
 * AI provider abstraction.
 *
 * The platform must never pretend an AI answered. If no provider key is
 * configured, /api/ai/status reports `configured: false` and /api/ai/chat
 * returns 503 with a setup hint. The UI renders a setup card, not a fake answer.
 *
 * Supported transports (all OpenAI-compatible chat completions):
 *   OpenAI, Azure OpenAI (base url differs), OpenRouter, Groq, Together,
 *   Ollama / LM Studio locally, and Anthropic via its messages API.
 */

const PROVIDER = (process.env.AI_PROVIDER || 'openai').toLowerCase();
const OPENAI_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_BASE = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || '';
const MODEL = process.env.AI_MODEL || (PROVIDER === 'anthropic' ? 'claude-sonnet-4-5' : 'gpt-4o-mini');
const TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS || 45_000);

/**
 * Result of the last real provider call. A key that is present but rejected
 * (expired, revoked, wrong account) must be reported as unavailable, not as
 * working. This is set by chat()/chatStream() and read by aiHealth().
 */
let lastFailure = null;
let lastSuccessAt = null;

export function aiHealth() {
  const base = aiStatus();
  if (!base.configured) return { ...base, verified: false, ready: false };
  if (lastFailure && (!lastSuccessAt || lastFailure.at > lastSuccessAt)) {
    return {
      ...base,
      // The key exists, but the provider rejected it: report it as not usable so the
      // UI shows a configuration error instead of a chat that always fails.
      ready: false,
      verified: true,
      rejected: true,
      reason: `The configured AI key was rejected by the provider: ${lastFailure.message}`,
      lastFailure: { message: lastFailure.message, at: lastFailure.at },
    };
  }
  // No call has succeeded yet in this process. The key may still be good, so the
  // tutor stays open and reports the provider's own error if it is not.
  return { ...base, verified: Boolean(lastSuccessAt), ready: true, lastSuccessAt };
}

export function aiStatus() {
  if (PROVIDER === 'anthropic') {
    return {
      configured: Boolean(ANTHROPIC_KEY),
      provider: 'anthropic',
      model: MODEL,
      reason: ANTHROPIC_KEY ? undefined : 'ANTHROPIC_API_KEY is not set on the server.',
    };
  }
  if (PROVIDER === 'none' || PROVIDER === 'disabled') {
    return { configured: false, provider: 'none', model: null, reason: 'AI is disabled by configuration.' };
  }
  return {
    configured: Boolean(OPENAI_KEY),
    provider: PROVIDER,
    model: MODEL,
    reason: OPENAI_KEY ? undefined : 'OPENAI_API_KEY is not set on the server.',
  };
}

export class AiError extends Error {
  constructor(code, message, status = 502) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function postJson(url, headers, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      /* non-json error body */
    }
    if (!res.ok) {
      const detail = json?.error?.message || json?.message || text.slice(0, 300) || `HTTP ${res.status}`;
        // Any auth-class refusal means the key is unusable — report that honestly and
      // keep reporting it until a call succeeds.
      if (res.status === 401 || res.status === 403 || /api key|unauthor|invalid_api_key|expired/i.test(detail)) {
        lastFailure = { at: Date.now(), message: detail };
        throw new AiError('ai_key_rejected', `The configured AI key was rejected by the provider: ${detail} Put a valid key in OPENAI_API_KEY (or ANTHROPIC_API_KEY) and restart the server to enable the tutor.`, 503);
      }
      throw new AiError('provider_error', `The AI provider rejected the request: ${detail}`, res.status === 429 ? 429 : 502);
    }
    return json;
  } catch (err) {
    if (err instanceof AiError) throw err;
    if (err.name === 'AbortError') throw new AiError('provider_timeout', 'The AI provider took too long to respond.', 504);
    throw new AiError('provider_unreachable', `Could not reach the AI provider: ${err.message}`, 502);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * @param {{system:string, messages:{role:'user'|'assistant', content:string}[], temperature?:number, maxTokens?:number}} opts
 * @returns {Promise<{text:string, model:string, usage?:object}>}
 */
export async function chat({ system, messages, temperature = 0.3, maxTokens = 900 }) {
  const status = aiStatus();
  if (!status.configured) {
    throw new AiError('ai_not_configured', status.reason || 'No AI provider is configured.', 503);
  }

  if (status.provider === 'anthropic') {
    const json = await postJson(
      'https://api.anthropic.com/v1/messages',
      { 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01' },
      { model: MODEL, max_tokens: maxTokens, temperature, system, messages },
    );
    const text = (json?.content || []).filter((p) => p.type === 'text').map((p) => p.text).join('\n').trim();
    if (!text) throw new AiError('empty_response', 'The AI provider returned an empty answer.');
    lastSuccessAt = Date.now();
    lastFailure = null;
    return { text, model: json?.model || MODEL, usage: json?.usage };
  }

  const json = await postJson(
    `${OPENAI_BASE}/chat/completions`,
    { authorization: `Bearer ${OPENAI_KEY}` },
    { model: MODEL, temperature, max_tokens: maxTokens, messages: [{ role: 'system', content: system }, ...messages] },
  );
  const text = (json?.choices?.[0]?.message?.content || '').trim();
  if (!text) throw new AiError('empty_response', 'The AI provider returned an empty answer.');
  lastSuccessAt = Date.now();
  lastFailure = null;
  return { text, model: json?.model || MODEL, usage: json?.usage };
}

/**
 * Streaming variant. Yields text deltas. Used by /api/ai/chat/stream.
 * Falls back to a single chunk when the provider does not stream.
 */
export async function* chatStream({ system, messages, temperature = 0.3, maxTokens = 900 }) {
  const status = aiStatus();
  if (!status.configured) {
    throw new AiError('ai_not_configured', status.reason || 'No AI provider is configured.', 503);
  }
  if (status.provider === 'anthropic') {
    // Keep one code path for both providers: emit the full answer as one delta.
    const r = await chat({ system, messages, temperature, maxTokens });
    yield r.text;
    return;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${OPENAI_KEY}` },
      body: JSON.stringify({
        model: MODEL, temperature, max_tokens: maxTokens, stream: true,
        messages: [{ role: 'system', content: system }, ...messages],
      }),
      signal: controller.signal,
    });
    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => '');
      throw new AiError('provider_error', `The AI provider rejected the request: ${text.slice(0, 300) || res.status}`, 502);
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === '[DONE]') return;
        try {
          const json = JSON.parse(payload);
          const delta = json?.choices?.[0]?.delta?.content;
          if (delta) yield delta;
        } catch {
          /* ignore keep-alive fragments */
        }
      }
    }
  } catch (err) {
    if (err instanceof AiError) throw err;
    if (err.name === 'AbortError') throw new AiError('provider_timeout', 'The AI provider took too long to respond.', 504);
    throw new AiError('provider_unreachable', `Could not reach the AI provider: ${err.message}`, 502);
  } finally {
    clearTimeout(timer);
  }
}
