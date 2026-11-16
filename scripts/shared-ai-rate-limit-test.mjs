import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  enforceSharedAiRateLimit,
  isAiGenerationRoute,
} from '../worker/src/middleware/requestGuards.js';

function makeRequest(path = '/api/studio/story/generate', method = 'POST', token = 'verified-token') {
  return new Request('https://test.local' + path, {
    method,
    headers: token ? { Authorization: 'Bearer ' + token } : {},
  });
}

function makeDeps(overrides = {}) {
  const state = { verifiedTokens: [], cookieCalls: 0 };
  const deps = {
    cookieToken: () => {
      state.cookieCalls += 1;
      return 'cookie-token';
    },
    verifyTokenSafe: async (_env, token) => {
      state.verifiedTokens.push(token);
      return { sub: 'verified-user-123' };
    },
    json: (data, status, headers = {}) => new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers },
    }),
    ...overrides,
  };
  return { deps, state };
}

// Route selection: supported generation routes are covered; non-generation methods/routes are skipped.
{
  assert.equal(isAiGenerationRoute('/api/studio/story/generate', 'POST'), true);
  assert.equal(isAiGenerationRoute('/api/studio/content/revise', 'POST'), true);
  assert.equal(isAiGenerationRoute('/api/studio/voice/tts', 'POST'), true);
  assert.equal(isAiGenerationRoute('/api/studio/subtitle/transcribe', 'POST'), false);
  assert.equal(isAiGenerationRoute('/api/studio/story/generate', 'GET'), false);
  assert.equal(isAiGenerationRoute('/api/users/me', 'POST'), false);
}

// Successful request uses the verified token subject as the binding key and needs no D1 binding.
{
  const calls = [];
  const { deps, state } = makeDeps();
  const env = {
    SHARED_AI_RATE_LIMITER: {
      limit: async (args) => {
        calls.push(args);
        return { success: true };
      },
    },
  };
  const response = await enforceSharedAiRateLimit(makeRequest(), env, '/api/studio/story/generate', deps);
  assert.equal(response, null);
  assert.deepEqual(calls, [{ key: 'verified-user-123' }]);
  assert.deepEqual(state.verifiedTokens, ['verified-token']);
}

// A denied request returns 429 and does not expose the verified subject.
{
  const { deps } = makeDeps();
  const env = {
    SHARED_AI_RATE_LIMITER: { limit: async () => ({ success: false }) },
  };
  const response = await enforceSharedAiRateLimit(makeRequest(), env, '/api/studio/story/generate', deps);
  assert.equal(response.status, 429);
  const body = await response.text();
  assert.deepEqual(JSON.parse(body), {
    error: 'rate_limited',
    limit: 10,
    window_seconds: 60,
  });
  assert.equal(response.headers.get('Retry-After'), '60');
  assert.equal(body.includes('verified-user-123'), false);
}

// Missing binding fails closed with 503; no D1 fallback is attempted.
{
  const { deps } = makeDeps();
  const response = await enforceSharedAiRateLimit(makeRequest(), {}, '/api/studio/story/generate', deps);
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: 'rate_limit_unavailable' });
}

// Binding errors fail closed and do not expose provider/runtime error text.
{
  const { deps } = makeDeps();
  const env = {
    SHARED_AI_RATE_LIMITER: {
      limit: async () => { throw new Error('private-runtime-detail'); },
    },
  };
  const response = await enforceSharedAiRateLimit(makeRequest(), env, '/api/studio/story/generate', deps);
  assert.equal(response.status, 503);
  const body = await response.text();
  assert.equal(body.includes('private-runtime-detail'), false);
  assert.equal(body.includes('verified-user-123'), false);
}

// Cookie session is used only when the Authorization bearer token is absent.
{
  const { deps, state } = makeDeps();
  const env = { SHARED_AI_RATE_LIMITER: { limit: async () => ({ success: true }) } };
  const response = await enforceSharedAiRateLimit(
    makeRequest('/api/studio/story/generate', 'POST', ''),
    env,
    '/api/studio/story/generate',
    deps,
  );
  assert.equal(response, null);
  assert.equal(state.cookieCalls, 1);
  assert.deepEqual(state.verifiedTokens, ['cookie-token']);
}

// Missing verified subject leaves the established route authentication response in control.
{
  const { deps } = makeDeps({ verifyTokenSafe: async () => null });
  const env = { SHARED_AI_RATE_LIMITER: { limit: async () => { throw new Error('must not be called'); } } };
  const response = await enforceSharedAiRateLimit(makeRequest(), env, '/api/studio/story/generate', deps);
  assert.equal(response, null);
}

// Non-generation routes never verify a token or call the binding.
{
  const { deps, state } = makeDeps();
  const env = { SHARED_AI_RATE_LIMITER: { limit: async () => { throw new Error('must not be called'); } } };
  const response = await enforceSharedAiRateLimit(makeRequest('/api/users/me'), env, '/api/users/me', deps);
  assert.equal(response, null);
  assert.deepEqual(state.verifiedTokens, []);
}

// Static guard: no D1 usage persistence or user-data logging remains in this shared limiter.
{
  const source = await readFile(new URL('../worker/src/middleware/requestGuards.js', import.meta.url), 'utf8');
  assert.equal(source.includes('api_generation_limits'), false);
  assert.equal(source.includes('env.DB'), false);
  assert.equal(source.includes('console.'), false);
  assert.equal(source.includes('SHARED_AI_RATE_LIMIT = 10'), true);
  assert.equal(source.includes('SHARED_AI_RATE_WINDOW_SECONDS = 60'), true);
}

console.log('Shared AI Rate Limit Contracts: PASS');
