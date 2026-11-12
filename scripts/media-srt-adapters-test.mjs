import assert from 'node:assert/strict';
import { SRT_CONTRACT_VERSION } from '../worker/src/media-production/contracts/srt.contract.js';
import { createContentSrtAdapter } from '../worker/src/media-adapters/content/srt.adapter.js';
import { createVoiceSrtAdapter } from '../worker/src/media-adapters/voice/srt.adapter.js';
import { createShopSrtAdapter } from '../worker/src/media-adapters/shop/srt.adapter.js';
import { createSrtStudioAdapter } from '../worker/src/media-adapters/srt/index.js';

const env = { TEST_ENV: true };
const API_KEY = 'browser-byok-srt-test-key';
const AUDIO = 'UklGRiQAAABXQVZFZm10IBAAAAABAAEA';
const PROMPT = 'STUDIO_SPECIFIC_SRT_INSTRUCTION';
const SRT = '1\n00:00:00,000 --> 00:00:02,000\nမင်္ဂလာပါ';

function createEngine() {
  const calls = [];
  const engine = async (...args) => {
    calls.push(args);
    return {
      contractVersion: SRT_CONTRACT_VERSION,
      studioId: args[1].studioId,
      operation: args[1].operation,
      result: { srt: SRT },
    };
  };
  return { calls, engine };
}

// Content adapter maps the request to the shared SRT contract.
{
  const { calls, engine } = createEngine();
  const adapter = createContentSrtAdapter(engine);
  const result = await adapter.generate(env, {
    audioBase64: AUDIO,
    mimeType: 'audio/mpeg',
    apiKey: API_KEY,
    model: 'content-transcribe-model',
    plan: 'FREE',
    prompt: PROMPT,
  });

  assert.deepEqual(result, { srt: SRT });
  assert.deepEqual(calls[0][1], {
    contractVersion: SRT_CONTRACT_VERSION,
    studioId: 'content',
    operation: 'audio-to-srt',
    input: { audioBase64: AUDIO, mimeType: 'audio/mpeg' },
  });
  assert.deepEqual(calls[0][2], {
    apiKey: API_KEY,
    model: 'content-transcribe-model',
    plan: 'FREE',
    prompt: PROMPT,
  });
  assert.equal(JSON.stringify(calls[0][1]).includes(API_KEY), false);
  assert.equal(JSON.stringify(calls[0][1]).includes(PROMPT), false);
}

// Voice adapter maps the request independently and preserves its execution context.
{
  const { calls, engine } = createEngine();
  const adapter = createVoiceSrtAdapter(engine);
  const result = await adapter.generate(env, {
    audioBase64: AUDIO,
    apiKey: API_KEY,
    model: 'voice-transcribe-model',
    plan: 'PRO',
    prompt: PROMPT,
  });

  assert.deepEqual(result, { srt: SRT });
  assert.deepEqual(calls[0][1], {
    contractVersion: SRT_CONTRACT_VERSION,
    studioId: 'voice',
    operation: 'audio-to-srt',
    input: { audioBase64: AUDIO },
  });
  assert.deepEqual(calls[0][2], {
    apiKey: API_KEY,
    model: 'voice-transcribe-model',
    plan: 'PRO',
    prompt: PROMPT,
  });
}

// Shop uses a dedicated adapter and preserves the shared contract boundary.
{
  const { calls, engine } = createEngine();
  const adapter = createShopSrtAdapter(engine);
  const result = await adapter.generate(env, {
    audioBase64: AUDIO,
    mimeType: 'audio/wav',
    apiKey: API_KEY,
    model: 'shop-transcribe-model',
    plan: 'PRO',
    prompt: PROMPT,
  });
  assert.deepEqual(result, { srt: SRT });
  assert.equal(calls[0][1].studioId, 'shop');
  assert.equal(calls[0][2].prompt, PROMPT);
}

// Unverified Studios cannot obtain the shared SRT adapter.
for (const studioId of ['story', 'short', 'image']) {
  assert.throws(
    () => createSrtStudioAdapter(studioId),
    (error) => error.message === 'unsupported_srt_adapter_studio',
  );
}

// Adapter errors are not wrapped or replaced, preserving safe engine error codes.
{
  const adapter = createContentSrtAdapter(async () => {
    const error = new Error('missing_api_key');
    error.code = 'missing_api_key';
    throw error;
  });
  await assert.rejects(
    () => adapter.generate(env, { audioBase64: AUDIO, prompt: PROMPT }),
    (error) => error.code === 'missing_api_key',
  );
}

console.log('Shared SRT Studio Adapters: PASS');
