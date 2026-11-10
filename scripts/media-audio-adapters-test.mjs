import assert from 'node:assert/strict';
import {
  AUDIO_CONTRACT_VERSION,
} from '../worker/src/media-production/contracts/audio.contract.js';
import {
  createContentAudioAdapter,
} from '../worker/src/media-adapters/content/audio.adapter.js';
import {
  createVoiceAudioAdapter,
} from '../worker/src/media-adapters/voice/audio.adapter.js';

const env = { TEST_ENV: true };
const API_KEY = 'browser-byok-test-key';
const PRIVATE_AUDIO = 'UklGRiQAAABXQVZFZm10IBAAAAABAAEA';
const PRIVATE_TEXT = 'အသံဖန်တီးရန် သီးသန့်စာသား';

function createEngine(result) {
  const calls = [];
  const engine = async (...args) => {
    calls.push(args);
    return {
      contractVersion: AUDIO_CONTRACT_VERSION,
      studioId: args[1].studioId,
      operation: args[1].operation,
      result,
    };
  };
  return { calls, engine };
}

// Content TTS maps to the shared contract and preserves the legacy WAV shape.
{
  const { calls, engine } = createEngine({
    data: 'UklGRg==',
    mimeType: 'audio/wav',
  });
  const adapter = createContentAudioAdapter(engine);
  const result = await adapter.tts(env, {
    text: PRIVATE_TEXT,
    voiceName: 'Kore',
    apiKey: API_KEY,
    model: 'selected-model',
    plan: 'PRO',
  });
  assert.deepEqual(result, { data: 'UklGRg==', mimeType: 'audio/wav' });
  assert.deepEqual(calls[0][1], {
    contractVersion: AUDIO_CONTRACT_VERSION,
    studioId: 'content',
    operation: 'tts',
    input: { text: PRIVATE_TEXT, voiceName: 'Kore' },
  });
  assert.deepEqual(calls[0][2], {
    apiKey: API_KEY,
    model: 'selected-model',
    plan: 'PRO',
    prompt: undefined,
  });
  assert.equal(JSON.stringify(calls[0][1]).includes(API_KEY), false);
}

// Voice TTS uses its own Studio ID and the same shared audio contract.
{
  const { calls, engine } = createEngine({
    data: 'UklGRg==',
    mimeType: 'audio/wav',
  });
  const adapter = createVoiceAudioAdapter(engine);
  const result = await adapter.tts(env, {
    text: PRIVATE_TEXT,
    apiKey: API_KEY,
  });
  assert.deepEqual(result, { data: 'UklGRg==', mimeType: 'audio/wav' });
  assert.equal(calls[0][1].studioId, 'voice');
  assert.equal(calls[0][1].operation, 'tts');
  assert.equal(calls[0][2].apiKey, API_KEY);
}

// Voice transcription forwards its CMS-derived prompt outside the contract.
{
  const prompt = 'VOICE_CMS_TRANSCRIPTION_PROMPT';
  const { calls, engine } = createEngine({ text: 'အသိအမှတ်ပြုထားသော စာသား' });
  const adapter = createVoiceAudioAdapter(engine);
  const result = await adapter.transcribe(env, {
    audioBase64: PRIVATE_AUDIO,
    mimeType: 'audio/webm;codecs=opus',
    apiKey: API_KEY,
    model: 'transcription-model',
    plan: 'PRO',
    prompt,
  });
  assert.deepEqual(result, { text: 'အသိအမှတ်ပြုထားသော စာသား' });
  assert.deepEqual(calls[0][1], {
    contractVersion: AUDIO_CONTRACT_VERSION,
    studioId: 'voice',
    operation: 'transcribe',
    input: {
      audioBase64: PRIVATE_AUDIO,
      mimeType: 'audio/webm;codecs=opus',
    },
  });
  assert.equal(calls[0][2].prompt, prompt);
  assert.equal(calls[0][2].apiKey, API_KEY);
  assert.equal(JSON.stringify(calls[0][1]).includes(API_KEY), false);
  assert.equal(JSON.stringify(calls[0][1]).includes(prompt), false);
}

// Content does not gain a transcription capability through the adapter.
{
  const adapter = createContentAudioAdapter(async () => {
    throw new Error('engine_should_not_be_called');
  });
  await assert.rejects(
    () => adapter.transcribe(env, {
      audioBase64: PRIVATE_AUDIO,
      apiKey: API_KEY,
    }),
    (error) => error.message === 'unsupported_audio_adapter_operation',
  );
}

console.log('Shared Audio Studio Adapters: PASS');
