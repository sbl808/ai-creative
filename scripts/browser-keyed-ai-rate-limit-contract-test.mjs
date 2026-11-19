import assert from 'node:assert/strict';
import { enforceSharedAiRateLimit, isAiGenerationRoute } from '../worker/src/middleware/requestGuards.js';
import { buildCors } from '../worker/src/middleware/cors.js';

const CLIENT_ID = '123e4567-e89b-42d3-a456-426614174000';
const PATH = '/api/studio/voice/tts';

function makeRequest(path = PATH, clientId = CLIENT_ID, token = 'test-token') {
  const headers = {};
  if (clientId) headers['X-AICS-Client-ID'] = clientId;
  if (token) headers.Authorization = 'Bearer ' + token;
  return new Request('https://studio.test' + path, { method: 'POST', headers });
}

function makeDeps(overrides = {}) {
  return {
    cookieToken: () => '',
    verifyTokenSafe: async () => ({ sub: 'account-987' }),
    json(data, status = 200, headers = {}) {
      return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json', ...headers },
      });
    },
    ...overrides,
  };
}

assert.equal(isAiGenerationRoute(PATH, 'POST'), true);
assert.equal(isAiGenerationRoute(PATH, 'GET'), false);
assert.equal(isAiGenerationRoute('/api/users/me', 'POST'), false);

// The limiter key must be the browser-generated ID, never the account subject.
{
  const calls = [];
  const env = {
    AI_GENERATION_RATE_LIMITER: {
      limit: async (args) => { calls.push(args); return { success: true }; },
    },
  };
  const response = await enforceSharedAiRateLimit(makeRequest(), env, PATH, makeDeps());
  assert.equal(response, null);
  assert.deepEqual(calls, [{ key: CLIENT_ID }]);
}

// Missing or malformed browser IDs are rejected before calling the limiter.
for (const invalidId of ['', 'not-a-uuid']) {
  const calls = [];
  const response = await enforceSharedAiRateLimit(
    makeRequest(PATH, invalidId),
    { AI_GENERATION_RATE_LIMITER: { limit: async () => { calls.push(true); return { success: true }; } } },
    PATH,
    makeDeps(),
  );
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error, 'client_id_required');
  assert.equal(calls.length, 0);
}

// Missing binding and provider failures fail closed without exposing details.
{
  const missing = await enforceSharedAiRateLimit(makeRequest(), {}, PATH, makeDeps());
  assert.equal(missing.status, 503);
  assert.equal((await missing.json()).error, 'rate_limit_unavailable');

  const broken = await enforceSharedAiRateLimit(makeRequest(), {
    AI_GENERATION_RATE_LIMITER: { limit: async () => { throw new Error('private provider detail'); } },
  }, PATH, makeDeps());
  assert.equal(broken.status, 503);
  assert.equal((await broken.json()).error, 'rate_limit_unavailable');
}

// A denied request includes the selected retry interval.
{
  const denied = await enforceSharedAiRateLimit(makeRequest(), {
    AI_GENERATION_RATE_LIMITER: { limit: async () => ({ success: false }) },
  }, PATH, makeDeps());
  assert.equal(denied.status, 429);
  assert.equal(denied.headers.get('Retry-After'), '60');
  assert.deepEqual(await denied.json(), {
    error: 'rate_limited',
    limit: 3,
    window_seconds: 60,
  });
}

// Unauthenticated requests keep route-owned auth responses; unrelated paths bypass.
{
  const unauthenticated = await enforceSharedAiRateLimit(makeRequest(), {
    AI_GENERATION_RATE_LIMITER: { limit: async () => { throw new Error('must not run'); } },
  }, PATH, makeDeps({ verifyTokenSafe: async () => null }));
  assert.equal(unauthenticated, null);

  const unrelated = await enforceSharedAiRateLimit(makeRequest('/api/users/me'), {
    AI_GENERATION_RATE_LIMITER: { limit: async () => { throw new Error('must not run'); } },
  }, '/api/users/me', makeDeps());
  assert.equal(unrelated, null);
}

const corsHeaders = buildCors(
  new Request('https://studio.test', { headers: { Origin: 'https://frontend.test' } }),
  { ALLOWED_ORIGINS: 'https://frontend.test' },
);
assert.match(corsHeaders['Access-Control-Allow-Headers'], /X-AICS-Client-ID/);

console.log('Browser-keyed AI rate-limit contract tests passed.');
