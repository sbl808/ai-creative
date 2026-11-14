import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { AUDIO_CONTRACT_VERSION } from '../worker/src/media-production/contracts/audio.contract.js';
import { createSharedAudioEngine } from '../worker/src/media-production/audio/engine.js';
import { createSubtitleAudioAdapter } from '../worker/src/media-adapters/subtitle/audio.adapter.js';
import { handleSubtitleStudioRoutes } from '../worker/src/routes/studios/subtitle.routes.js';

const PRIVATE_AUDIO = 'UFJJVkFURV9BVURJT19TRU5USU5FTA==';
const PRIVATE_KEY = 'PRIVATE_SUBTITLE_PROVIDER_KEY';
const PRIVATE_TEXT = 'PRIVATE_SUBTITLE_TRANSCRIPT';

function makeRequest(body = { audioBase64: PRIVATE_AUDIO, apiKey: PRIVATE_KEY }) {
  return new Request('https://test.local/api/studio/subtitle/transcribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-token' },
    body: JSON.stringify(body),
  });
}

function makeDeps(overrides = {}) {
  const state = { rateCalls: [], transcribeCalls: [], usageCalls: 0 };
  const deps = {
    bearer: () => 'test-token',
    verifyTokenSafe: async () => ({ sub: 'verified-user-123' }),
    json: (data, status, headers = {}) => new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers },
    }),
    resolvePlan: async () => 'FREE',
    requireFeature: async (_env, feature, plan, type) => {
      assert.equal(feature, 'subtitle.transcribe');
      assert.equal(plan, 'FREE');
      assert.equal(type, '1');
      return null;
    },
    transcribeSubtitleAudio: async (_env, input) => {
      state.transcribeCalls.push(input);
      return { text: PRIVATE_TEXT };
    },
    trackUsageSafe: async () => { state.usageCalls += 1; },
    ...overrides,
  };
  return { deps, state };
}

// Shared engine: Subtitle uses its own task mapping and Browser BYOK context.
{
  const calls = [];
  const engine = createSharedAudioEngine({
    resolveModel: async (...args) => {
      calls.push({ kind: 'resolveModel', args });
      return 'transcribe-model';
    },
    generateMultimodal: async (_env, args) => {
      calls.push({ kind: 'generateMultimodal', args });
      return PRIVATE_TEXT;
    },
  });
  const response = await engine({}, {
    contractVersion: AUDIO_CONTRACT_VERSION,
    studioId: 'subtitle',
    operation: 'transcribe',
    input: { audioBase64: PRIVATE_AUDIO, mimeType: 'audio/webm' },
  }, { apiKey: PRIVATE_KEY, plan: 'FREE', model: 'chosen-model', prompt: 'subtitle prompt' });
  assert.deepEqual(response.result, { text: PRIVATE_TEXT });
  assert.deepEqual(calls[0].args, [{}, 'transcribe', 'FREE', 'chosen-model', 'subtitle.transcribe']);
  assert.equal(calls[1].args.task, 'subtitle.transcribe');
  assert.equal(calls[1].args.apiKey, PRIVATE_KEY);
  assert.equal(calls[1].args.images[0].base64, PRIVATE_AUDIO);
  assert.equal(calls[1].args.prompt, 'subtitle prompt');
  assert.equal(JSON.stringify(response).includes(PRIVATE_KEY), false);
}

// Subtitle adapter keeps its own Studio ID and excludes credentials from the contract.
{
  const calls = [];
  const adapter = createSubtitleAudioAdapter(async (...args) => {
    calls.push(args);
    return { result: { text: PRIVATE_TEXT } };
  });
  const result = await adapter.transcribe({}, {
    audioBase64: PRIVATE_AUDIO,
    mimeType: 'audio/webm',
    apiKey: PRIVATE_KEY,
    model: 'chosen-model',
    plan: 'FREE',
    prompt: 'subtitle prompt',
  });
  assert.deepEqual(result, { text: PRIVATE_TEXT });
  assert.equal(calls[0][1].studioId, 'subtitle');
  assert.equal(calls[0][1].operation, 'transcribe');
  assert.equal(JSON.stringify(calls[0][1]).includes(PRIVATE_KEY), false);
  await assert.rejects(
    () => adapter.tts({}, { text: 'not supported', apiKey: PRIVATE_KEY }),
    (error) => error.message === 'unsupported_audio_adapter_operation',
  );
}

// Authentication and feature gates run before rate limiting or transcription.
{
  const { deps, state } = makeDeps({ bearer: () => '' });
  const response = await handleSubtitleStudioRoutes(makeRequest(), {}, {}, deps);
  assert.equal(response.status, 401);
  assert.equal(state.rateCalls.length, 0);
  assert.equal(state.transcribeCalls.length, 0);
}

// Missing binding fails closed.
{
  const { deps, state } = makeDeps();
  const response = await handleSubtitleStudioRoutes(makeRequest(), {}, {}, deps);
  assert.equal(response.status, 503);
  assert.equal(state.transcribeCalls.length, 0);
}

// Verified user subject is used as the rate-limit key; denied requests never reach AI.
{
  const { deps, state } = makeDeps();
  const env = {
    SUBTITLE_RATE_LIMITER: {
      limit: async (args) => {
        state.rateCalls.push(args);
        return { success: false };
      },
    },
  };
  const response = await handleSubtitleStudioRoutes(makeRequest(), env, {}, deps);
  assert.equal(response.status, 429);
  assert.deepEqual(state.rateCalls, [{ key: 'verified-user-123' }]);
  assert.equal(state.transcribeCalls.length, 0);
}

// Rate-limit provider errors also fail closed.
{
  const { deps, state } = makeDeps();
  const env = { SUBTITLE_RATE_LIMITER: { limit: async () => { throw new Error('private error'); } } };
  const response = await handleSubtitleStudioRoutes(makeRequest(), env, {}, deps);
  assert.equal(response.status, 503);
  assert.equal((await response.text()).includes('private error'), false);
}

// Successful request is transient, no-store, Browser BYOK, and does not track usage.
{
  const { deps, state } = makeDeps();
  const env = {
    SUBTITLE_RATE_LIMITER: {
      limit: async (args) => {
        state.rateCalls.push(args);
        return { success: true };
      },
    },
  };
  const response = await handleSubtitleStudioRoutes(makeRequest(), env, {}, deps);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.deepEqual(state.rateCalls, [{ key: 'verified-user-123' }]);
  assert.equal(state.transcribeCalls.length, 1);
  assert.equal(state.transcribeCalls[0].audioBase64, PRIVATE_AUDIO);
  assert.equal(state.transcribeCalls[0].apiKey, PRIVATE_KEY);
  assert.equal(state.usageCalls, 0);
  assert.equal(JSON.stringify(body).includes(PRIVATE_AUDIO), false);
  assert.equal(JSON.stringify(body).includes(PRIVATE_KEY), false);
  assert.equal(JSON.stringify(body).includes(PRIVATE_TEXT), true);
}

// Route source must not add user-content persistence, usage tracking, or logging.
{
  const route = await readFile(new URL('../worker/src/routes/studios/subtitle.routes.js', import.meta.url), 'utf8');
  const guard = await readFile(new URL('../worker/src/middleware/requestGuards.js', import.meta.url), 'utf8');
  assert.equal(route.includes('trackUsageSafe'), false);
  assert.equal(route.includes('console.'), false);
  assert.equal(route.includes('env.DB'), false);
  assert.equal(guard.includes('subtitle'), false);
}

console.log('Subtitle Audio → Text Route Contracts: PASS');
