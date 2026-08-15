import assert from 'node:assert/strict';

const originalFetch = globalThis.fetch;
const originalEnv = {
  RAYA_LLAMA_ENABLED: process.env.RAYA_LLAMA_ENABLED,
  RAYA_LLAMA_URL: process.env.RAYA_LLAMA_URL,
  RAYA_LLAMA_MODEL: process.env.RAYA_LLAMA_MODEL,
  RAYA_LLAMA_TIMEOUT_MS: process.env.RAYA_LLAMA_TIMEOUT_MS,
};

function restoreEnv() {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

try {
  process.env.RAYA_LLAMA_ENABLED = 'true';
  process.env.RAYA_LLAMA_URL = 'http://127.0.0.1:11434/api/chat';
  process.env.RAYA_LLAMA_MODEL = 'llama-test';
  process.env.RAYA_LLAMA_TIMEOUT_MS = 'invalid';

  const { stream, llamaProviderInfo } = await import('./llamaClient.mjs');

  const encoder = new TextEncoder();
  globalThis.fetch = async () => new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('{"message":{"content":"Hel'));
        controller.enqueue(encoder.encode('lo"}}\n{"message":{"content":" world"}}\n{"done":true}\n'));
        controller.close();
      },
    }),
    { status: 200, headers: { 'Content-Type': 'application/x-ndjson' } },
  );

  const tokens = [];
  for await (const token of stream('system', 'user')) tokens.push(token);
  assert.deepEqual(tokens, ['Hello', ' world']);

  const enabledInfo = llamaProviderInfo();
  assert.deepEqual(enabledInfo, { enabled: true, model: 'llama-test' });
  assert.equal('url' in enabledInfo, false);

  process.env.RAYA_LLAMA_ENABLED = 'false';
  assert.deepEqual(llamaProviderInfo(), { enabled: false, model: null });

  console.log('Llama client streaming and disclosure tests passed');
} finally {
  globalThis.fetch = originalFetch;
  restoreEnv();
}
