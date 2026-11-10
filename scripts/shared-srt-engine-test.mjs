import assert from 'node:assert/strict';
import { SRT_CONTRACT_VERSION } from '../worker/src/media-production/contracts/srt.contract.js';
import { createSharedSrtEngine } from '../worker/src/media-production/srt/engine.js';

const API_KEY = 'PRIVATE_SRT_API_KEY_SENTINEL_5a2c';
const AUDIO = 'YXVkaW8=';
const USER_TEXT = 'PRIVATE_SRT_USER_TEXT_SENTINEL_90bd';
const VALID_SRT = '1\n00:00:00,000 --> 00:00:02,000\nမင်္ဂလာပါ';

function makeServices(overrides = {}) {
  const calls = [];
  const services = {
    resolveModel: async (...args) => {
      calls.push({ type: 'resolveModel', args });
      return 'resolved-transcribe-model';
    },
    generateMultimodal: async (_env, args) => {
      calls.push({ type: 'generateMultimodal', args });
      return VALID_SRT;
    },
    ...overrides,
  };
  return { calls, generate: createSharedSrtEngine(services) };
}

const env = {};
const request = {
  contractVersion: SRT_CONTRACT_VERSION,
  studioId: 'voice',
  operation: 'audio-to-srt',
  input: { audioBase64: AUDIO, mimeType: 'audio/webm;codecs=opus' },
};
const executionContext = {
  apiKey: API_KEY,
  plan: 'PRO',
  model: 'selected-transcribe-model',
  prompt: 'VOICE_CMS_INSTRUCTION',
};

// Voice Audio -> SRT uses the existing Voice task and preserves the supplied prompt.
{
  const { calls, generate } = makeServices();
  const response = await generate(env, request, executionContext);
  const modelCall = calls.find((call) => call.type === 'resolveModel');
  const providerCall = calls.find((call) => call.type === 'generateMultimodal');

  assert.deepEqual(modelCall.args, [
    env, 'transcribe', 'PRO', 'selected-transcribe-model', 'voice.transcribe',
  ]);
  assert.equal(providerCall.args.task, 'voice.transcribe');
  assert.equal(providerCall.args.model, 'resolved-transcribe-model');
  assert.equal(providerCall.args.prompt, 'VOICE_CMS_INSTRUCTION');
  assert.equal(providerCall.args.apiKey, API_KEY);
  assert.deepEqual(providerCall.args.images, [{
    mimeType: 'audio/webm;codecs=opus',
    base64: AUDIO,
  }]);
  assert.deepEqual(response, {
    contractVersion: SRT_CONTRACT_VERSION,
    studioId: 'voice',
    operation: 'audio-to-srt',
    result: { srt: VALID_SRT },
  });
}

// Content Audio -> SRT uses the existing Content task mapping.
{
  const { calls, generate } = makeServices();
  await generate(env, {
    ...request,
    studioId: 'content',
    input: { audioBase64: AUDIO, mimeType: 'audio/mpeg' },
  }, { ...executionContext, prompt: 'CONTENT_CMS_INSTRUCTION' });
  const modelCall = calls.find((call) => call.type === 'resolveModel');
  const providerCall = calls.find((call) => call.type === 'generateMultimodal');
  assert.equal(modelCall.args[4], 'content.transcribe');
  assert.equal(providerCall.args.task, 'content.transcribe');
  assert.equal(providerCall.args.prompt, 'CONTENT_CMS_INSTRUCTION');
}

// Missing browser BYOK must fail before model resolution or provider calls.
{
  const { calls, generate } = makeServices();
  await assert.rejects(
    () => generate(env, request, { prompt: 'instruction' }),
    (error) => error.code === 'missing_api_key' && error.message === 'missing_api_key',
  );
  assert.equal(calls.length, 0);
}

// Missing Studio prompt must fail safely before calling the provider.
{
  const { calls, generate } = makeServices();
  await assert.rejects(
    () => generate(env, request, { apiKey: API_KEY }),
    (error) => error.code === 'missing_srt_instruction',
  );
  assert.equal(calls.length, 0);
}

// Unsupported Studio/operation combinations must not invoke provider services.
for (const unsupported of [
  { ...request, studioId: 'story' },
  { ...request, studioId: 'short' },
  { ...request, studioId: 'shop' },
]) {
  const { calls, generate } = makeServices();
  await assert.rejects(
    () => generate(env, unsupported, executionContext),
    (error) => error.code === 'unsupported_shared_srt_capability',
  );
  assert.equal(calls.length, 0);
}

// Invalid request content is rejected without echoing audio or private text.
{
  const { calls, generate } = makeServices();
  await assert.rejects(
    () => generate(env, {
      ...request,
      input: { audioBase64: 'invalid-base64', privateText: USER_TEXT },
    }, executionContext),
    (error) => error.code === 'invalid_srt_request'
      && !error.message.includes(USER_TEXT)
      && !error.message.includes(AUDIO),
  );
  assert.equal(calls.length, 0);
}

// Invalid or empty provider output is rejected without echoing provider content.
for (const providerOutput of ['', 'not an SRT', 'PRIVATE_PROVIDER_OUTPUT_SENTINEL']) {
  const { generate } = makeServices({
    generateMultimodal: async () => providerOutput,
  });
  await assert.rejects(
    () => generate(env, request, executionContext),
    (error) => error.code === 'invalid_srt_provider_response'
      && !error.message.includes(providerOutput),
  );
}

// API key and private input never appear in the versioned response.
{
  const { generate } = makeServices();
  const response = await generate(env, request, executionContext);
  assert.equal(JSON.stringify(response).includes(API_KEY), false);
  assert.equal(JSON.stringify(response).includes(AUDIO), false);
}

console.log('Shared SRT Engine: PASS');
