/**
 * Thin client for a local Ollama / llama.cpp HTTP server.
 *
 * All model calls stay server-side; keys and endpoints are never exposed to
 * the browser bundle.  Controlled by three env vars:
 *
 *   RAYA_LLAMA_ENABLED   – 'true' to activate (default false)
 *   RAYA_LLAMA_URL       – Ollama chat endpoint (default http://127.0.0.1:11434/api/chat)
 *   RAYA_LLAMA_MODEL     – Model tag (default llama3.2)
 *   RAYA_LLAMA_TIMEOUT_MS– Per-request timeout ms (default 30 000)
 *
 * When disabled or unreachable, callers receive a LlamaDisabledError they can
 * catch to fall back to the existing rule-based agent.
 */

export class LlamaDisabledError extends Error {
  constructor(reason) {
    super(`Llama integration is disabled: ${reason}`);
    this.name = 'LlamaDisabledError';
    this.code = 'llama_disabled';
  }
}

export class LlamaError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = 'LlamaError';
    this.code = 'llama_error';
    this.cause = cause;
  }
}

function config() {
  const configuredTimeout = Number(process.env.RAYA_LLAMA_TIMEOUT_MS || 30_000);
  return {
    enabled: String(process.env.RAYA_LLAMA_ENABLED || 'false').toLowerCase() === 'true',
    url: String(process.env.RAYA_LLAMA_URL || 'http://127.0.0.1:11434/api/chat'),
    model: String(process.env.RAYA_LLAMA_MODEL || 'llama3.2'),
    timeoutMs: Number.isFinite(configuredTimeout) ? Math.max(5_000, configuredTimeout) : 30_000,
  };
}

/**
 * Send a chat request to Ollama and return the full response text.
 *
 * @param {string} systemPrompt  – System / context message
 * @param {string} userMessage   – User turn
 * @param {{ stream?: false }} [opts]
 * @returns {Promise<string>}
 */
export async function ask(systemPrompt, userMessage, opts = {}) {
  const cfg = config();
  if (!cfg.enabled) {
    throw new LlamaDisabledError('RAYA_LLAMA_ENABLED is not true');
  }

  const body = JSON.stringify({
    model: cfg.model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    stream: false,
    options: opts.options || {},
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), cfg.timeoutMs);

  let res;
  try {
    res = await fetch(cfg.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    throw new LlamaError(`Llama request failed: ${err.message}`, err);
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new LlamaError(`Llama returned HTTP ${res.status}: ${text}`);
  }

  const data = await res.json();
  const text = data?.message?.content || data?.response || '';
  if (!text) throw new LlamaError('Llama returned an empty response');
  return text;
}

/**
 * Stream a chat request to Ollama, yielding text chunks as they arrive.
 *
 * @param {string} systemPrompt
 * @param {string} userMessage
 * @returns {AsyncGenerator<string>}
 */
export async function* stream(systemPrompt, userMessage) {
  const cfg = config();
  if (!cfg.enabled) {
    throw new LlamaDisabledError('RAYA_LLAMA_ENABLED is not true');
  }

  const body = JSON.stringify({
    model: cfg.model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    stream: true,
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), cfg.timeoutMs);

  let res;
  try {
    res = await fetch(cfg.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    throw new LlamaError(`Llama stream failed: ${err.message}`, err);
  }

  if (!res.ok) {
    clearTimeout(timeout);
    const text = await res.text().catch(() => '');
    throw new LlamaError(`Llama stream returned HTTP ${res.status}: ${text}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.trim()) continue;
        let chunk;
        try { chunk = JSON.parse(line); } catch { continue; }
        const token = chunk?.message?.content || chunk?.response || '';
        if (token) yield token;
        if (chunk?.done) return;
      }
    }
    buffer += decoder.decode();
    if (buffer.trim()) {
      try {
        const chunk = JSON.parse(buffer);
        const token = chunk?.message?.content || chunk?.response || '';
        if (token) yield token;
      } catch {
        // Ignore a trailing incomplete provider frame.
      }
    }
  } finally {
    clearTimeout(timeout);
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

/**
 * Returns basic status info for the health endpoint.
 */
export function llamaProviderInfo() {
  const cfg = config();
  return {
    enabled: cfg.enabled,
    model: cfg.enabled ? cfg.model : null,
  };
}
