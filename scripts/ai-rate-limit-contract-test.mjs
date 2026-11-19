import assert from 'node:assert/strict';
import { enforceSharedAiRateLimit, isAiGenerationRoute } from '../worker/src/middleware/requestGuards.js';
import { buildCors } from '../worker/src/middleware/cors.js';
import { readFileSync } from 'node:fs';

const CLIENT_ID = '123e4567-e89b-42d3-a456-426614174000';
const PATH = '/api/studio/voice/transcribe';

function makeRequest(path = PATH, clientId = CLIENT_ID, token = 'test-token') {
  const headers = {};
  if (clientId) headers['X-AICS-Client-ID'] = clientId;
  if (token) headers.Authorization = 'Bearer ' + token;
  return new Request('https://test.local' + path, { method: 'POST', headers });
}

function makeDeps(overrides = {}) {
  return {
    cookieToken: () => '',
    verifyTokenSafe: async () => ({ sub: 'verified-account-id' }),
    json: (data, status, headers = {}) => new Response(JSON.stringify(data), { status, headers }),
    ...overrides,
  };
}

assert.equal(isAiGenerationRoute('/api/studio/voice/transcribe', 'POST'), true);
assert.equal(isAiGenerationRoute('/api/ai/test', 'POST'), true);
assert.equal(isAiGenerationRoute('/api/ai/test', 'GET'), false);
assert.equal(isAiGenerationRoute('/api/studio/subtitle/transcribe', 'POST'), true);
assert.equal(isAiGenerationRoute('/api/studio/voice/transcribe', 'GET'), false);
assert.equal(isAiGenerationRoute('/api/users/me', 'POST'), false);
const aiRouteSource = readFileSync(new URL('../worker/src/routes/ai.routes.js', import.meta.url), 'utf8');
assert.equal(aiRouteSource.includes('api_test_limits'), false, 'AI connection-test route must not use the legacy D1 counter');
const corsHeaders = buildCors(new Request('https://test.local', { headers: { Origin: 'https://aics-frontend-dev.pages.dev' } }), { ALLOWED_ORIGINS: 'https://aics-frontend-dev.pages.dev' });
assert.match(corsHeaders['Access-Control-Allow-Headers'], /X-AICS-Client-ID/);

// Browser-generated ID, not the authenticated account ID, is the only limiter key.
{
  const calls = [];
  const env = {
    AI_RATE_LIMITER: { limit: async (args) => { calls.push(args); return { success: true }; } },
    get DB() { throw new Error('D1 must not be accessed by the rate limiter'); },
  };
  const result = await enforceSharedAiRateLimit(makeRequest(), env, PATH, makeDeps());
  assert.equal(result, null);
  assert.deepEqual(calls, [{ key: CLIENT_ID }]);
}

// Missing browser identity fails closed before AI processing.
{
  const calls = [];
  const env = { AI_RATE_LIMITER: { limit: async (args) => { calls.push(args); return { success: true }; } } };
  const result = await enforceSharedAiRateLimit(makeRequest(PATH, ''), env, PATH, makeDeps());
  assert.equal(result.status, 400);
  assert.equal((await result.json()).error, 'client_id_required');
  assert.equal(calls.length, 0);
}

// Missing binding and provider failure fail closed without exposing provider details.
{
  const missing = await enforceSharedAiRateLimit(makeRequest(), {}, PATH, makeDeps());
  assert.equal(missing.status, 503);
  assert.equal((await missing.json()).error, 'rate_limit_unavailable');

  const broken = await enforceSharedAiRateLimit(makeRequest(), {
    AI_RATE_LIMITER: { limit: async () => { throw new Error('private provider detail'); } },
  }, PATH, makeDeps());
  assert.equal(broken.status, 503);
  assert.equal((await broken.text()).includes('private provider detail'), false);
}

// Denied requests use the selected 3 requests / 60 seconds policy.
{
  const result = await enforceSharedAiRateLimit(makeRequest(), {
    AI_RATE_LIMITER: { limit: async () => ({ success: false }) },
  }, PATH, makeDeps());
  assert.equal(result.status, 429);
  assert.equal(result.headers.get('Retry-After'), '60');
  assert.deepEqual(await result.json(), { error: 'rate_limited', limit: 3, window_seconds: 60 });
}

// Invalid sessions retain route-owned authentication responses; unrelated routes bypass the guard.
{
  const unauthenticated = await enforceSharedAiRateLimit(makeRequest(), {
    AI_RATE_LIMITER: { limit: async () => { throw new Error('must not be called'); } },
  }, PATH, makeDeps({ verifyTokenSafe: async () => null }));
  assert.equal(unauthenticated, null);

  const unrelated = await enforceSharedAiRateLimit(makeRequest('/api/users/me'), {
    AI_RATE_LIMITER: { limit: async () => { throw new Error('must not be called'); } },
  }, '/api/users/me', makeDeps());
  assert.equal(unrelated, null);
}

console.log('Shared AI Rate Limit contracts: PASS');
