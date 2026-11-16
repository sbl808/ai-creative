import assert from 'node:assert/strict';
import { enforceSharedAiRateLimit, isAiGenerationRoute } from '../worker/src/middleware/requestGuards.js';
import { sidebarScript } from '../worker/src/frontend/shared.js';

const clientId = 'a'.repeat(32);
const makeRequest = (path, headers = {}) => new Request('https://aics.test' + path, {
  method: 'POST',
  headers: Object.assign({ Authorization: 'Bearer valid-session' }, headers)
});
const deps = {
  cookieToken: () => '',
  verifyTokenSafe: async (_env, token) => token === 'valid-session' ? { sub: 'test-user' } : null,
  json: (body, status, headers) => new Response(JSON.stringify(body), { status, headers }),
  friendlyError: () => {}
};

assert.equal(isAiGenerationRoute('/api/ai/test', 'POST'), true);
assert.equal(isAiGenerationRoute('/api/ai/test', 'GET'), false);
assert.equal(isAiGenerationRoute('/api/ideas/generate', 'POST'), true);
assert.equal(isAiGenerationRoute('/api/studio/subtitle/translate-srt', 'POST'), true);
assert.equal(isAiGenerationRoute('/api/studio/voice/tts', 'POST'), true);
assert.equal(isAiGenerationRoute('/api/studio/voice/tts', 'GET'), false);
assert.equal(isAiGenerationRoute('/api/studio/unknown/generate', 'POST'), false);

let receivedKey = null;
const allowed = await enforceSharedAiRateLimit(
  makeRequest('/api/ai/test', { 'X-AICS-Client-ID': clientId }),
  { AI_RATE_LIMITER: { limit: async ({ key }) => { receivedKey = key; return { success: true }; } } },
  '/api/ai/test',
  deps
);
assert.equal(allowed, null);
assert.equal(receivedKey, clientId, 'only the browser random identity is used as the rate-limit key');

const missingIdentity = await enforceSharedAiRateLimit(
  makeRequest('/api/studio/story/generate'),
  { AI_RATE_LIMITER: { limit: async () => ({ success: true }) } },
  '/api/studio/story/generate',
  deps
);
assert.equal(missingIdentity.status, 400);
assert.equal((await missingIdentity.json()).error, 'rate_limit_identity_required');

const denied = await enforceSharedAiRateLimit(
  makeRequest('/api/studio/story/generate', { 'X-AICS-Client-ID': clientId }),
  { AI_RATE_LIMITER: { limit: async () => ({ success: false }) } },
  '/api/studio/story/generate',
  deps
);
assert.equal(denied.status, 429);
assert.equal(denied.headers.get('Retry-After'), '60');
assert.deepEqual(await denied.json(), { error: 'rate_limited', limit: 3, window_seconds: 60 });

const unavailable = await enforceSharedAiRateLimit(
  makeRequest('/api/studio/story/generate', { 'X-AICS-Client-ID': clientId }),
  {},
  '/api/studio/story/generate',
  deps
);
assert.equal(unavailable.status, 503);

let friendlyErrorCalled = false;
const failed = await enforceSharedAiRateLimit(
  makeRequest('/api/studio/story/generate', { 'X-AICS-Client-ID': clientId }),
  { AI_RATE_LIMITER: { limit: async () => { throw new Error('internal'); } } },
  '/api/studio/story/generate',
  Object.assign({}, deps, { friendlyError: () => { friendlyErrorCalled = true; } })
);
assert.equal(failed.status, 503);
assert.equal(friendlyErrorCalled, true);

const unauthenticated = await enforceSharedAiRateLimit(
  makeRequest('/api/studio/story/generate', { Authorization: 'Bearer invalid-session' }),
  { AI_RATE_LIMITER: { limit: async () => ({ success: true }) } },
  '/api/studio/story/generate',
  deps
);
assert.equal(unauthenticated, null, 'route authentication keeps its existing unauthenticated response');

const html = sidebarScript();
assert.match(html, /path === '\/api\/ai\/test'/);
assert.match(html, /X-AICS-Client-ID/);
assert.match(html, /AICS_RATE_LIMIT_IDENTITY\.get/);
assert.match(html, /rate_limit_identity/);
console.log('AI Rate Limit Binding contract tests passed.');
