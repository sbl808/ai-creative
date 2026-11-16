import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { handleAiRoutes } from '../worker/src/routes/ai.routes.js';

function request(body = { prompt: 'ping' }) {
  return new Request('https://test.local/api/ai/test', {
    method: 'POST',
    headers: { Authorization: 'Bearer verified-token', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
function deps() {
  return {
    bearer: (req) => (req.headers.get('Authorization') || '').replace(/^Bearer /, ''),
    verifyTokenSafe: async () => ({ sub: 'verified-user-abc' }),
    json: (data, status, headers = {}) => new Response(JSON.stringify(data), {
      status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers },
    }),
    friendlyError: () => 'safe error',
  };
}

// A successful binding decision uses the verified subject and does not need D1.
{
  const calls = [];
  const env = { DB: null, AI_TEST_RATE_LIMITER: { limit: async (input) => {
    calls.push(input); return { success: true };
  } } };
  const response = await handleAiRoutes(request(null), env, {}, deps());
  assert.deepEqual(calls, [{ key: 'verified-user-abc' }]);
  assert.equal(response.status, 400); // allowed by limiter; malformed body is rejected afterwards
  assert.deepEqual(await response.json(), { error: 'bad_request' });
}

// A denied binding decision returns 429 with the selected policy.
{
  const env = { AI_TEST_RATE_LIMITER: { limit: async () => ({ success: false }) } };
  const response = await handleAiRoutes(request(), env, {}, deps());
  assert.equal(response.status, 429);
  assert.equal(response.headers.get('Retry-After'), '60');
  assert.deepEqual(await response.json(), {
    error: 'rate_limited', limit: 5, window_seconds: 60,
  });
}

// Missing binding fails closed; there is no D1 fallback.
{
  const env = { DB: { prepare: () => { throw new Error('D1 must not be called'); } } };
  const response = await handleAiRoutes(request(), env, {}, deps());
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: 'rate_limit_unavailable' });
}

// Binding errors fail closed without leaking runtime details or the user identifier.
{
  const env = { AI_TEST_RATE_LIMITER: { limit: async () => {
    throw new Error('private-runtime-detail');
  } } };
  const response = await handleAiRoutes(request(), env, {}, deps());
  assert.equal(response.status, 503);
  const body = await response.text();
  assert.equal(body.includes('private-runtime-detail'), false);
  assert.equal(body.includes('verified-user-abc'), false);
}

// Runtime source has no D1 counter access or user-data logging.
{
  const route = await readFile(new URL('../worker/src/routes/ai.routes.js', import.meta.url), 'utf8');
  assert.equal(/api_test_limits|env\.DB/.test(route), false);
  assert.equal(/console\./.test(route), false);
}
console.log('AI Test Rate Limit Contracts: PASS');
