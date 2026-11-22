import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { readFile } from 'node:fs/promises';
import {
  base64DecodedByteLength,
  handleVoiceStudioRoutes,
} from '../worker/src/routes/studios/voice.routes.js';
import { handleSubtitleStudioRoutes } from '../worker/src/routes/studios/subtitle.routes.js';
import { HELPERS_SCRIPT } from '../worker/src/frontend/studios/subtitle/helpers.js';

const MAX_AUDIO_BYTES = 5 * 1024 * 1024;
const smallAudio = Buffer.from('test-audio').toString('base64');

function makeRequest(body) {
  return new Request('https://test.local/api/studio/voice/transcribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer test-token',
    },
    body: JSON.stringify(body),
  });
}

function makeSubtitleSrtRequest(audioBase64) {
  return new Request('https://test.local/api/studio/subtitle/srt', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer test-token',
    },
    body: JSON.stringify({ audioBase64 }),
  });
}

function makeDeps(featureResponse = null) {
  const state = {
    features: [],
    transcriptions: [],
    planCalls: 0,
  };
  return {
    state,
    deps: {
      bearer: () => 'test-token',
      verifyTokenSafe: async () => ({ sub: 'verified-user' }),
      json: (data, status = 200, headers = {}) => new Response(JSON.stringify(data), {
        status,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
          ...headers,
        },
      }),
      resolvePlan: async () => {
        state.planCalls += 1;
        return 'FREE';
      },
      requireFeature: async (_env, feature, plan, type) => {
        state.features.push({ feature, plan, type });
        return featureResponse;
      },
      friendlyError: () => 'Safe error',
      transcribeSubtitleAudio: async (_env, input) => {
        state.transcriptions.push(input);
        return { text: 'မြန်မာစာ စမ်းသပ်ချက်' };
      },
    },
  };
}

// Subtitle transcription uses the shared Voice endpoint but keeps its own feature gate.
{
  const { deps, state } = makeDeps();
  const response = await handleVoiceStudioRoutes(
    makeRequest({
      studio: 'subtitle',
      audioBase64: smallAudio,
      mimeType: 'audio/webm',
      type: '1',
      apiKey: 'browser-byok-test-key',
    }),
    {},
    {},
    deps,
  );
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.text, 'မြန်မာစာ စမ်းသပ်ချက်');
  assert.deepEqual(state.features, [{ feature: 'subtitle.transcribe', plan: 'FREE', type: '1' }]);
  assert.equal(state.transcriptions.length, 1);
  assert.equal(state.transcriptions[0].audioBase64, smallAudio);
  assert.equal(state.transcriptions[0].apiKey, 'browser-byok-test-key');
}

// Exact 5 MiB is accepted; a payload one byte larger is rejected before AI work.
{
  const exactLimit = Buffer.alloc(MAX_AUDIO_BYTES).toString('base64');
  const overLimit = Buffer.alloc(MAX_AUDIO_BYTES + 1).toString('base64');
  assert.equal(base64DecodedByteLength(exactLimit), MAX_AUDIO_BYTES);
  assert.equal(base64DecodedByteLength(overLimit), MAX_AUDIO_BYTES + 1);
  assert.ok(base64DecodedByteLength('A'.repeat(MAX_AUDIO_BYTES * 2)) > MAX_AUDIO_BYTES);

  const { deps, state } = makeDeps();
  const response = await handleVoiceStudioRoutes(
    makeRequest({ studio: 'subtitle', audioBase64: overLimit, type: '1' }),
    {},
    {},
    deps,
  );
  const body = await response.json();
  assert.equal(response.status, 413);
  assert.equal(body.error, 'audio_too_large');
  assert.equal(state.planCalls, 0);
  assert.equal(state.features.length, 0);
  assert.equal(state.transcriptions.length, 0);
}

// Subtitle SRT endpoint accepts exactly 5 MiB and rejects larger audio before plan/AI work.
{
  const exactLimit = Buffer.alloc(MAX_AUDIO_BYTES).toString('base64');
  const overLimit = Buffer.alloc(MAX_AUDIO_BYTES + 1).toString('base64');
  const acceptedGateResponse = new Response(null, { status: 204 });

  const accepted = makeDeps(acceptedGateResponse);
  const acceptedResponse = await handleSubtitleStudioRoutes(
    makeSubtitleSrtRequest(exactLimit),
    {},
    {},
    accepted.deps,
  );
  assert.equal(acceptedResponse.status, 204);
  assert.equal(accepted.state.planCalls, 1);
  assert.deepEqual(accepted.state.features, [
    { feature: 'subtitle.srt', plan: 'FREE', type: '2' },
  ]);

  const rejected = makeDeps();
  const rejectedResponse = await handleSubtitleStudioRoutes(
    makeSubtitleSrtRequest(overLimit),
    {},
    {},
    rejected.deps,
  );
  const rejectedBody = await rejectedResponse.json();
  assert.equal(rejectedResponse.status, 413);
  assert.equal(rejectedBody.error, 'audio_too_large');
  assert.equal(rejectedBody.max_bytes, MAX_AUDIO_BYTES);
  assert.equal(rejected.state.planCalls, 0);
  assert.equal(rejected.state.features.length, 0);
}

// Unknown Studio selectors are rejected rather than silently treated as Voice.
{
  const { deps, state } = makeDeps();
  const response = await handleVoiceStudioRoutes(
    makeRequest({ studio: 'other', audioBase64: smallAudio }),
    {},
    {},
    deps,
  );
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error, 'invalid_studio');
  assert.equal(state.features.length, 0);
}

// The old duplicate transcription endpoint is no longer registered; SRT/translation stay separate.
{
  const response = await handleSubtitleStudioRoutes(
    new Request('https://test.local/api/studio/subtitle/transcribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audioBase64: smallAudio }),
    }),
    {},
    {},
    {},
  );
  assert.equal(response, null);
}


// SRT cue numbers must be unique; duplicate numbers invalidate the whole document.
{
  const sandbox = {};
  runInNewContext(HELPERS_SCRIPT, sandbox);
  const validSrt = [
    '1',
    '00:00:01,000 --> 00:00:02,000',
    'ပထမစာကြောင်း',
    '',
    '2',
    '00:00:02,000 --> 00:00:03,000',
    'ဒုတိယစာကြောင်း',
  ].join('\n');
  const duplicateSrt = validSrt.replace(
    '2\n00:00:02,000',
    '1\\n00:00:02,000',
  );
  assert.equal(sandbox.subtitleValidateSrt(validSrt).valid, true);
  const duplicateResult = sandbox.subtitleValidateSrt(duplicateSrt);
  assert.equal(duplicateResult.valid, false);
  assert.ok(duplicateResult.errors.some((error) => error.includes('Subtitle Number 1 ထပ်နေပါသည်။')));
}

const actions = await readFile(new URL('../worker/src/frontend/studios/subtitle/actions.js', import.meta.url), 'utf8');
const subtitleRoutes = await readFile(new URL('../worker/src/routes/studios/subtitle.routes.js', import.meta.url), 'utf8');
const subtitleBrain = await readFile(new URL('../worker/src/studios/subtitle.js', import.meta.url), 'utf8');
const voiceRoutes = await readFile(new URL('../worker/src/routes/studios/voice.routes.js', import.meta.url), 'utf8');

assert.match(actions, /\/api\/studio\/voice\/transcribe/);
assert.match(actions, /studio:\s*'subtitle'/);
assert.equal((actions.match(/code === 'pro_only'/g) || []).length, 2);
assert.match(actions, /Pro Plan လိုအပ်ပါသည်။/);
assert.doesNotMatch(actions, /\/api\/studio\/subtitle\/transcribe/);
assert.doesNotMatch(subtitleRoutes, /\/api\/studio\/subtitle\/transcribe/);
assert.match(subtitleRoutes, /SUBTITLE_SRT_MAX_AUDIO_BYTES = 5 \* 1024 \* 1024/);
assert.match(subtitleBrain, /const CMS_STUDIO = 'SUBTITLE'/);
assert.match(subtitleBrain, /Audio ကို Text အဖြစ် တိကျစွာ Transcribe လုပ်ပါ/);
assert.doesNotMatch(voiceRoutes, /trackUsageSafe|console\.(?:log|error|warn)|env\.DB/);

console.log('Subtitle shared Voice API contract tests: PASS');
