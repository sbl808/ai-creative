import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { readFile } from 'node:fs/promises';
import { handleVoiceStudioRoutes } from '../worker/src/routes/studios/voice.routes.js';
import {
  base64DecodedByteLength,
  handleSubtitleStudioRoutes,
} from '../worker/src/routes/studios/subtitle.routes.js';
import { HELPERS_SCRIPT } from '../worker/src/frontend/studios/subtitle/helpers.js';

const MAX_AUDIO_BYTES = 5 * 1024 * 1024;
const smallAudio = Buffer.from('test-audio').toString('base64');

function makeRequest(path, body) {
  return new Request('https://test.local' + path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer test-token',
    },
    body: JSON.stringify(body),
  });
}

function makeDeps(featureResponse = null) {
  const state = { features: [], transcriptions: [], planCalls: 0 };
  return {
    state,
    deps: {
      bearer: () => 'test-token',
      verifyTokenSafe: async () => ({ sub: 'verified-user' }),
      json: (data, status = 200, headers = {}) => new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers },
      }),
      resolvePlan: async () => { state.planCalls += 1; return 'FREE'; },
      requireFeature: async (_env, feature, plan, type) => {
        state.features.push({ feature, plan, type });
        return featureResponse;
      },
      friendlyError: () => 'Safe error',
      ndjsonResponse: () => new Response(null),
    },
  };
}

// Subtitle transcription is owned by the Subtitle route and uses the Subtitle feature gate.
{
  const { deps, state } = makeDeps();
  deps.transcribeSubtitleAudio = async (_env, input) => {
    state.transcriptions.push(input);
    return { text: 'မြန်မာစာ စမ်းသပ်ချက်' };
  };
  const response = await handleSubtitleStudioRoutes(
    makeRequest('/api/studio/subtitle/transcribe', {
      audioBase64: smallAudio, mimeType: 'audio/webm', type: '1', apiKey: 'browser-byok-test-key',
    }),
    {}, {}, deps,
  );
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.text, 'မြန်မာစာ စမ်းသပ်ချက်');
  assert.deepEqual(state.features, [{ feature: 'subtitle.transcribe', plan: 'FREE', type: '1' }]);
  assert.equal(state.transcriptions.length, 1);
  assert.equal(state.transcriptions[0].audioBase64, smallAudio);
  assert.equal(state.transcriptions[0].apiKey, 'browser-byok-test-key');
  assert.equal(state.transcriptions[0].mimeType, 'audio/webm');
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
}

// Subtitle audio byte limit is consistent for transcription and SRT generation.
{
  const exactLimit = Buffer.alloc(MAX_AUDIO_BYTES).toString('base64');
  const overLimit = Buffer.alloc(MAX_AUDIO_BYTES + 1).toString('base64');
  assert.equal(base64DecodedByteLength(exactLimit), MAX_AUDIO_BYTES);
  assert.equal(base64DecodedByteLength(overLimit), MAX_AUDIO_BYTES + 1);
  assert.equal(base64DecodedByteLength('not-base64'), -1);
  assert.equal(base64DecodedByteLength('!!!!'), -1);
  const malformedLarge = exactLimit.slice(0, -2) + '!' + exactLimit.slice(-1);
  assert.equal(base64DecodedByteLength(malformedLarge), -1);

  const accepted = makeDeps(new Response(null, { status: 204 }));
  const acceptedResponse = await handleSubtitleStudioRoutes(
    makeRequest('/api/studio/subtitle/transcribe', { audioBase64: exactLimit }),
    {}, {}, accepted.deps,
  );
  assert.equal(acceptedResponse.status, 204);
  assert.equal(accepted.state.planCalls, 1);

  const rejected = makeDeps();
  const rejectedResponse = await handleSubtitleStudioRoutes(
    makeRequest('/api/studio/subtitle/transcribe', { audioBase64: overLimit }),
    {}, {}, rejected.deps,
  );
  assert.equal(rejectedResponse.status, 413);
  assert.equal((await rejectedResponse.json()).error, 'audio_too_large');
  assert.equal(rejected.state.planCalls, 0);
  assert.equal(rejected.state.features.length, 0);

  const malformed = makeDeps();
  const malformedResponse = await handleSubtitleStudioRoutes(
    makeRequest('/api/studio/subtitle/transcribe', { audioBase64: 'not-base64' }),
    {}, {}, malformed.deps,
  );
  assert.equal(malformedResponse.status, 400);
  assert.equal((await malformedResponse.json()).error, 'invalid_audio');
  assert.equal(malformed.state.planCalls, 0);
}

// Subtitle SRT endpoint keeps the same 5 MiB boundary.
{
  const exactLimit = Buffer.alloc(MAX_AUDIO_BYTES).toString('base64');
  const overLimit = Buffer.alloc(MAX_AUDIO_BYTES + 1).toString('base64');
  const accepted = makeDeps(new Response(null, { status: 204 }));
  const acceptedResponse = await handleSubtitleStudioRoutes(
    makeRequest('/api/studio/subtitle/srt', { audioBase64: exactLimit }),
    {}, {}, accepted.deps,
  );
  assert.equal(acceptedResponse.status, 204);
  assert.deepEqual(accepted.state.features, [{ feature: 'subtitle.srt', plan: 'FREE', type: '2' }]);

  const rejected = makeDeps();
  const rejectedResponse = await handleSubtitleStudioRoutes(
    makeRequest('/api/studio/subtitle/srt', { audioBase64: overLimit }),
    {}, {}, rejected.deps,
  );
  assert.equal(rejectedResponse.status, 413);
  assert.equal((await rejectedResponse.json()).max_bytes, MAX_AUDIO_BYTES);
  assert.equal(rejected.state.planCalls, 0);
}

// Voice Studio owns TTS only; transcription/SRT/translation belong to Subtitle Studio.
{
  const { deps, state } = makeDeps();
  deps.generateVoiceAudio = async (_env, input) => {
    state.transcriptions.push(input);
    return { data: 'dGVzdA==', mimeType: 'audio/wav' };
  };
  const response = await handleVoiceStudioRoutes(
    makeRequest('/api/studio/voice/tts', { text: 'မင်္ဂလာပါ', voiceName: 'Kore', type: '1' }),
    {}, {}, deps,
  );
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.data, 'dGVzdA==');
  assert.deepEqual(state.features, [{ feature: 'voice.tts', plan: 'FREE', type: '1' }]);
  assert.equal(state.transcriptions.length, 1);
  assert.equal(state.transcriptions[0].text, 'မင်္ဂလာပါ');

  for (const endpoint of ['transcribe', 'srt', 'translate-srt']) {
    const response = await handleVoiceStudioRoutes(
      makeRequest('/api/studio/voice/' + endpoint, { audioBase64: smallAudio, srtText: '1' }),
      {}, {}, deps,
    );
    assert.equal(response, null, 'Voice route must not expose ' + endpoint);
  }
  deps.transcribeSubtitleAudio = async () => ({ text: 'Subtitle transcript' });
  const subtitleTranscribe = await handleSubtitleStudioRoutes(
    makeRequest('/api/studio/subtitle/transcribe', { audioBase64: smallAudio }),
    {}, {}, deps,
  );
  assert.equal(subtitleTranscribe.status, 200);
}
// SRT cue numbers must be unique; duplicate numbers invalidate the whole document.
{
  const sandbox = {};
  runInNewContext(HELPERS_SCRIPT, sandbox);
  const validSrt = [
    '1', '00:00:01,000 --> 00:00:02,000', 'ပထမစာကြောင်း', '',
    '2', '00:00:02,000 --> 00:00:03,000', 'ဒုတိယစာကြောင်း',
  ].join('\n');
  const duplicateSrt = validSrt.replace('2\n00:00:02,000', '1\n00:00:02,000');
  assert.equal(sandbox.subtitleValidateSrt(validSrt).valid, true);
  const duplicateResult = sandbox.subtitleValidateSrt(duplicateSrt);
  assert.equal(duplicateResult.valid, false);
  assert.ok(duplicateResult.errors.some((error) => error.includes('Subtitle Number 1 ထပ်နေပါသည်။')));
}

const actions = await readFile(new URL('../worker/src/frontend/studios/subtitle/actions.js', import.meta.url), 'utf8');
const subtitleRoutes = await readFile(new URL('../worker/src/routes/studios/subtitle.routes.js', import.meta.url), 'utf8');
const subtitleBrain = await readFile(new URL('../worker/src/studios/subtitle.js', import.meta.url), 'utf8');
const voiceRoutes = await readFile(new URL('../worker/src/routes/studios/voice.routes.js', import.meta.url), 'utf8');
const voiceActions = await readFile(new URL('../worker/src/frontend/studios/voice/actions.js', import.meta.url), 'utf8');
const voiceBrain = await readFile(new URL('../worker/src/studios/voice.js', import.meta.url), 'utf8');

assert.match(actions, /\/api\/studio\/subtitle\/transcribe/);
assert.doesNotMatch(actions, /\/api\/studio\/voice\/transcribe/);
assert.doesNotMatch(actions, /studio:\s*'subtitle'/);
assert.match(subtitleRoutes, /subtitle\.transcribe/);
assert.match(subtitleRoutes, /SUBTITLE_SRT_MAX_AUDIO_BYTES = 5 \* 1024 \* 1024/);
assert.match(subtitleBrain, /const CMS_STUDIO = 'SUBTITLE'/);
assert.match(subtitleBrain, /Audio ကို Text အဖြစ် တိကျစွာ Transcribe လုပ်ပါ/);
assert.doesNotMatch(voiceRoutes, /transcribeSubtitleAudio|subtitle\.transcribe|studioId/);
assert.doesNotMatch(voiceRoutes, /trackUsageSafe|console\.(?:log|error|warn)|env\.DB/);

console.log('Subtitle API consolidation contract tests: PASS');
