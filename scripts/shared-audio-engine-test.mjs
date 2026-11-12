import assert from 'node:assert/strict';
import {
  AUDIO_CONTRACT_VERSION,
} from '../worker/src/media-production/contracts/audio.contract.js';
import {
  createSharedAudioEngine,
} from '../worker/src/media-production/audio/engine.js';
import { pcmToWavBase64 } from '../worker/src/core/utilities.js';

const API_KEY = 'PRIVATE_PROVIDER_KEY_SENTINEL_7f31';
const PRIVATE_TEXT = 'PRIVATE_USER_TEXT_SENTINEL_42ac';
const PRIVATE_AUDIO = 'UFJJVkFURV9BVURJT19TRU5USU5FTA==';
const PCM_BASE64 = 'AAECAwQ=';

function makeServices(overrides = {}) {
  const calls = [];
  const services = {
    resolveModel: async (...args) => {
      calls.push({ type: 'resolveModel', args });
      return `${args[1]}:${args[4]}:model`;
    },
    generateSpeech: async (_env, args) => {
      calls.push({ type: 'generateSpeech', args });
      return { data: PCM_BASE64, mimeType: 'audio/pcm' };
    },
    generateMultimodal: async (_env, args) => {
      calls.push({ type: 'generateMultimodal', args });
      return 'မြန်မာဘာသာဖြင့် ပြောင်းထားသော စာသား';
    },
    pcmToWavBase64: (data, sampleRate, channels, bitsPerSample) => {
      calls.push({
        type: 'pcmToWavBase64',
        args: { data, sampleRate, channels, bitsPerSample },
      });
      // Validate provider PCM using the real converter before returning the
      // deterministic WAV fixture used by the contract assertions.
      pcmToWavBase64(data, sampleRate, channels, bitsPerSample);
      return 'UklGRg==';
    },
    ...overrides,
  };
  return { calls, generate: createSharedAudioEngine(services) };
}

const executionContext = {
  apiKey: API_KEY,
  plan: 'PRO',
  model: 'selected-audio-model',
};
const env = {};

// Content TTS must use the existing Content task mapping and preserve WAV output.
{
  const { calls, generate } = makeServices();
  const request = {
    contractVersion: AUDIO_CONTRACT_VERSION,
    studioId: 'content',
    operation: 'tts',
    input: { text: 'မင်္ဂလာပါ', voiceName: 'Kore' },
  };
  const response = await generate(env, request, executionContext);
  const modelCall = calls.find((call) => call.type === 'resolveModel');
  const speechCall = calls.find((call) => call.type === 'generateSpeech');
  const wavCall = calls.find((call) => call.type === 'pcmToWavBase64');

  assert.deepEqual(modelCall.args, [env, 'voice', 'PRO', 'selected-audio-model', 'content.voice']);
  assert.equal(speechCall.args.task, 'content.voice');
  assert.equal(speechCall.args.model, 'voice:content.voice:model');
  assert.equal(speechCall.args.apiKey, API_KEY);
  assert.equal(speechCall.args.text, 'မင်္ဂလာပါ');
  assert.deepEqual(wavCall.args, {
    data: PCM_BASE64,
    sampleRate: 24000,
    channels: 1,
    bitsPerSample: 16,
  });
  assert.deepEqual(response.result, { data: 'UklGRg==', mimeType: 'audio/wav' });
  assert.equal(response.studioId, 'content');
  assert.equal(response.operation, 'tts');
}

// Voice TTS must remain mapped to voice.voice.
{
  const { calls, generate } = makeServices();
  const response = await generate(env, {
    contractVersion: AUDIO_CONTRACT_VERSION,
    studioId: 'voice',
    operation: 'tts',
    input: { text: 'အသံစမ်းသပ်မှု' },
  }, executionContext);
  const speechCall = calls.find((call) => call.type === 'generateSpeech');
  assert.equal(speechCall.args.task, 'voice.voice');
  assert.deepEqual(response.result, { data: 'UklGRg==', mimeType: 'audio/wav' });
}

// Voice transcription must use voice.transcribe and accept Studio-specific instructions.
{
  const { calls, generate } = makeServices();
  const prompt = 'VOICE_STUDIO_TRANSCRIPTION_INSTRUCTION';
  const request = {
    contractVersion: AUDIO_CONTRACT_VERSION,
    studioId: 'voice',
    operation: 'transcribe',
    input: { audioBase64: PRIVATE_AUDIO, mimeType: 'audio/webm;codecs=opus' },
  };
  const response = await generate(env, request, {
    ...executionContext,
    prompt,
  });
  const modelCall = calls.find((call) => call.type === 'resolveModel');
  const transcriptionCall = calls.find((call) => call.type === 'generateMultimodal');
  assert.deepEqual(modelCall.args, [env, 'transcribe', 'PRO', 'selected-audio-model', 'voice.transcribe']);
  assert.equal(transcriptionCall.args.task, 'voice.transcribe');
  assert.equal(transcriptionCall.args.prompt, prompt);
  assert.equal(transcriptionCall.args.apiKey, API_KEY);
  assert.deepEqual(transcriptionCall.args.images, [{
    mimeType: 'audio/webm;codecs=opus',
    base64: PRIVATE_AUDIO,
  }]);
  assert.deepEqual(response.result, { text: 'မြန်မာဘာသာဖြင့် ပြောင်းထားသော စာသား' });
}

// API credentials are passed only through execution context/provider calls,
// never copied into the versioned request or response.
{
  const { generate } = makeServices();
  const request = {
    contractVersion: AUDIO_CONTRACT_VERSION,
    studioId: 'content',
    operation: 'tts',
    input: { text: 'လျှို့ဝှက်မဟုတ်သော စမ်းသပ်စာသား' },
  };
  const response = await generate(env, request, executionContext);
  assert.equal(JSON.stringify(request).includes(API_KEY), false);
  assert.equal(JSON.stringify(response).includes(API_KEY), false);
}

// Browser BYOK is mandatory; an environment or D1 key must not be used as fallback.
{
  const { calls, generate } = makeServices();
  const envWithStoredKey = {
    API_KEY,
    GEMINI_API_KEY: API_KEY,
    DB: {
      prepare() {
        throw new Error('D1 key lookup must not occur');
      },
    },
  };
  await assert.rejects(
    () => generate(envWithStoredKey, {
      contractVersion: AUDIO_CONTRACT_VERSION,
      studioId: 'voice',
      operation: 'tts',
      input: { text: 'စမ်းသပ်စာသား' },
    }),
    (error) => error.code === 'missing_api_key' && error.message === 'missing_api_key',
  );
  assert.equal(calls.length, 0);
}

// A D1 binding must not be read when Browser BYOK is supplied.
{
  const { generate } = makeServices();
  const envWithGuardedDb = {
    get DB() {
      throw new Error('D1 must not be accessed by the shared Audio engine');
    },
  };
  const response = await generate(envWithGuardedDb, {
    contractVersion: AUDIO_CONTRACT_VERSION,
    studioId: 'voice',
    operation: 'tts',
    input: { text: 'Browser BYOK' },
  }, executionContext);
  assert.equal(response.result.mimeType, 'audio/wav');
}

// Studios outside the active contract allowlist are rejected during request validation.
for (const [studioId, operation, input] of [
  ['story', 'tts', { text: 'Story TTS is not currently route-backed' }],
  ['short', 'tts', { text: 'Short TTS is not currently route-backed' }],
  ['image', 'transcribe', { audioBase64: PRIVATE_AUDIO }],
]) {
  const { calls, generate } = makeServices();
  await assert.rejects(
    () => generate(env, {
      contractVersion: AUDIO_CONTRACT_VERSION,
      studioId,
      operation,
      input,
    }, executionContext),
    (error) => error.code === 'invalid_audio_request',
  );
  assert.equal(calls.length, 0);
}

// A valid Studio ID with an inactive operation is rejected by the engine capability map.
{
  const { calls, generate } = makeServices();
  await assert.rejects(
    () => generate(env, {
      contractVersion: AUDIO_CONTRACT_VERSION,
      studioId: 'content',
      operation: 'transcribe',
      input: { audioBase64: PRIVATE_AUDIO },
    }, executionContext),
    (error) => error.code === 'unsupported_shared_audio_capability',
  );
  assert.equal(calls.length, 0);
}

// Invalid requests fail with safe error codes, not user-provided content.
{
  const { calls, generate } = makeServices();
  await assert.rejects(
    () => generate(env, {
      contractVersion: AUDIO_CONTRACT_VERSION,
      studioId: 'voice',
      operation: 'transcribe',
      input: { audioBase64: 'invalid-base64', text: PRIVATE_TEXT },
    }, executionContext),
    (error) => {
      assert.equal(error.code, 'invalid_audio_request');
      assert.equal(error.message.includes(PRIVATE_TEXT), false);
      assert.equal(error.message.includes(PRIVATE_AUDIO), false);
      return true;
    },
  );
  assert.equal(calls.length, 0);
}

// Invalid provider outputs are rejected without including returned user content.
{
  const { generate } = makeServices({
    generateSpeech: async () => ({ data: 'not-base64', mimeType: 'text/plain' }),
  });
  await assert.rejects(
    () => generate(env, {
      contractVersion: AUDIO_CONTRACT_VERSION,
      studioId: 'voice',
      operation: 'tts',
      input: { text: PRIVATE_TEXT },
    }, executionContext),
    (error) => !error.message.includes(PRIVATE_TEXT),
  );
}
{
  const { generate } = makeServices({
    generateMultimodal: async () => '   ',
  });
  await assert.rejects(
    () => generate(env, {
      contractVersion: AUDIO_CONTRACT_VERSION,
      studioId: 'voice',
      operation: 'transcribe',
      input: { audioBase64: PRIVATE_AUDIO, mimeType: 'audio/mpeg' },
    }, executionContext),
    (error) => error.code === 'invalid_audio_provider_response'
      && !error.message.includes(PRIVATE_AUDIO),
  );
}

console.log('Shared Audio Engine: PASS');
