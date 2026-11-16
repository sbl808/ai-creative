import assert from 'node:assert/strict';
import { enforceSharedAiRateLimit, isAiGenerationRoute } from '../worker/src/middleware/requestGuards.js';

const makeRequest = (path = '/api/studio/story/generate', method = 'POST') =>
  new Request('https://test.local' + path, {
    method,
    headers: { Authorization: 'Bearer test-token' },
  });

const deps = {
  cookieToken: () => '',
  verifyTokenSafe: async (_env, token) => token === 'test-token' ? { sub: 'verified-user-1' } : null,
  json: (body, status = 200, headers = {}) => new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  }),
};

assert.equal(isAiGenerationRoute('/api/studio/story/generate', 'POST'), true);
assert.equal(isAiGenerationRoute('/api/studio/story/generate', 'GET'), false);
assert.equal(isAiGenerationRoute('/api/users/me', 'POST'), false);

let receivedKey;
const allowed = await enforceSharedAiRateLimit(
  makeRequest(),
  {
    SHARED_AI_RATE_LIMITER: {
      async limit(input) {
        receivedKey = input.key;
        return { success: true };
      },
    },
    DB: new Proxy({}, { get() { throw new Error('D1 must not be accessed by rate limiting'); } }),
  },
  '/api/studio/story/generate',
  deps,
);
assert.equal(allowed, null);
assert.equal(receivedKey, 'verified-user-1', 'only the verified token subject is used as the limiter key');

const denied = await enforceSharedAiRateLimit(
  makeRequest(),
  { SHARED_AI_RATE_LIMITER: { limit: async () => ({ success: false }) } },
  '/api/studio/story/generate',
  deps,
);
assert.equal(denied.status, 429);
assert.deepEqual(await denied.json(), { error: 'rate_limited', limit: 10, window_seconds: 60 });
assert.equal(denied.headers.get('Retry-After'), '60');

const missingBinding = await enforceSharedAiRateLimit(
  makeRequest(),
  {},
  '/api/studio/story/generate',
  deps,
);
assert.equal(missingBinding.status, 503);
assert.deepEqual(await missingBinding.json(), { error: 'rate_limit_unavailable' });

const failedBinding = await enforceSharedAiRateLimit(
  makeRequest(),
  { SHARED_AI_RATE_LIMITER: { limit: async () => { throw new Error('runtime detail must not leak'); } } },
  '/api/studio/story/generate',
  deps,
);
assert.equal(failedBinding.status, 503);
assert.deepEqual(await failedBinding.json(), { error: 'rate_limit_unavailable' });

let verificationCalls = 0;
const unauthenticated = await enforceSharedAiRateLimit(
  new Request('https://test.local/api/studio/story/generate', { method: 'POST' }),
  {},
  '/api/studio/story/generate',
  { ...deps, verifyTokenSafe: async () => { verificationCalls += 1; return null; } },
);
assert.equal(unauthenticated, null, 'route authentication retains responsibility for unauthenticated requests');
assert.equal(verificationCalls, 0);

const nonAi = await enforceSharedAiRateLimit(
  makeRequest('/api/users/me'),
  {},
  '/api/users/me',
  { ...deps, verifyTokenSafe: async () => { throw new Error('must not verify non-AI route'); } },
);
assert.equal(nonAi, null);

console.log('Shared AI Rate Limit contract tests passed.');
