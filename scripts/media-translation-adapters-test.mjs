import assert from 'node:assert/strict';
import { TRANSLATION_CONTRACT_VERSION } from '../worker/src/media-production/contracts/translation.contract.js';
import { createTranslationStudioAdapter } from '../worker/src/media-adapters/translation/index.js';
import { createContentTranslationAdapter } from '../worker/src/media-adapters/content/translation.adapter.js';
import { createVoiceTranslationAdapter } from '../worker/src/media-adapters/voice/translation.adapter.js';
import { createShopTranslationAdapter } from '../worker/src/media-adapters/shop/translation.adapter.js';

const env = { TEST_ENV: true };
const API_KEY = 'browser-byok-translation-test-key';
const SOURCE_SRT = '1\\n00:00:00,000 --> 00:00:02,000\\nမင်္ဂလာပါ';
const RESULT_SRT = '1\\n00:00:00,000 --> 00:00:02,000\\nမင်္ဂလာပါ\\n你好';

function createEngine() {
  const calls = [];
  const engine = async (...args) => {
    calls.push(args);
    return {
      contractVersion: TRANSLATION_CONTRACT_VERSION,
      studioId: args[1].studioId,
      operation: args[1].operation,
      result: { srt: RESULT_SRT },
    };
  };
  return { calls, engine };
}

// Content preserves its lowercase default, legacy prompt wording and undefined plan.
{
  const { calls, engine } = createEngine();
  const adapter = createContentTranslationAdapter(engine);
  const result = await adapter.translate(env, {
    srtText: SOURCE_SRT,
    apiKey: API_KEY,
    model: 'content-translation-model',
  });

  assert.deepEqual(result, { srt: RESULT_SRT });
  assert.deepEqual(calls[0][1], {
    contractVersion: TRANSLATION_CONTRACT_VERSION,
    studioId: 'content',
    operation: 'translate-srt',
    input: {
      srtText: SOURCE_SRT,
      direction: 'MY_TO_CN',
      model: 'content-translation-model',
    },
  });
  assert.equal(calls[0][2].apiKey, API_KEY);
  assert.equal(calls[0][2].model, 'content-translation-model');
  assert.equal(calls[0][2].plan, undefined);
  assert.ok(calls[0][2].prompt.includes('SRT:\n' + SOURCE_SRT));
  assert.ok(calls[0][2].prompt.includes('SRT Number'));
  assert.equal(JSON.stringify(calls[0][1]).includes(API_KEY), false);
}

// Content maps a Chinese-to-Myanmar direction and retains its own wrapping instruction.
{
  const { calls, engine } = createEngine();
  const adapter = createContentTranslationAdapter(engine);
  await adapter.translate(env, {
    srtText: SOURCE_SRT,
    direction: 'cn-to-my',
    apiKey: API_KEY,
  });
  assert.equal(calls[0][1].input.direction, 'CN_TO_MY');
  assert.ok(calls[0][2].prompt.includes('စာလုံးရေ ၁၅ လုံးထက် မကျော်စေရပါ'));
  assert.ok(calls[0][2].prompt.includes('Number/Timestamp အသစ် မဖန်တီးဘဲ'));
}

// Voice preserves its uppercase default, Studio-specific wording and plan.
{
  const { calls, engine } = createEngine();
  const adapter = createVoiceTranslationAdapter(engine);
  const result = await adapter.translate(env, {
    srtText: SOURCE_SRT,
    apiKey: API_KEY,
    model: 'voice-translation-model',
    plan: 'PRO',
    type: '3',
  });

  assert.deepEqual(result, { srt: RESULT_SRT });
  assert.deepEqual(calls[0][1], {
    contractVersion: TRANSLATION_CONTRACT_VERSION,
    studioId: 'voice',
    operation: 'translate-srt',
    input: {
      srtText: SOURCE_SRT,
      direction: 'MY_TO_CN',
      model: 'voice-translation-model',
      type: '3',
    },
  });
  assert.equal(calls[0][2].plan, 'PRO');
  assert.ok(calls[0][2].prompt.includes('SRT:\n' + SOURCE_SRT));
  assert.ok(calls[0][2].prompt.includes('အောက်ပါ SRT ထဲက Text များသည် မြန်မာဘာသာ ဖြစ်ပါသည်'));
  assert.equal(JSON.stringify(calls[0][1]).includes(API_KEY), false);
}

// Voice maps the reverse direction and keeps its distinct wording.
{
  const { calls, engine } = createEngine();
  const adapter = createVoiceTranslationAdapter(engine);
  await adapter.translate(env, {
    srtText: SOURCE_SRT,
    direction: 'CN_TO_MY',
    apiKey: API_KEY,
    plan: 'FREE',
  });
  assert.equal(calls[0][1].input.direction, 'CN_TO_MY');
  assert.ok(calls[0][2].prompt.includes('ဒီ မြန်မာဘာသာပြန် Line'));
}

// Shop previously called Voice API, so it preserves the same translation prompt,
// direction defaults and plan context while using a Shop-scoped contract.
{
  const { calls, engine } = createEngine();
  const adapter = createShopTranslationAdapter(engine);
  const result = await adapter.translate(env, {
    srtText: SOURCE_SRT,
    apiKey: API_KEY,
    model: 'shop-translation-model',
    plan: 'PRO',
    type: '2',
  });

  assert.deepEqual(result, { srt: RESULT_SRT });
  assert.equal(calls[0][1].studioId, 'shop');
  assert.equal(calls[0][1].input.direction, 'MY_TO_CN');
  assert.equal(calls[0][1].input.type, '2');
  assert.equal(calls[0][2].plan, 'PRO');
  assert.ok(calls[0][2].prompt.includes('အောက်ပါ SRT ထဲက Text များသည် မြန်မာဘာသာ ဖြစ်ပါသည်'));
  assert.equal(JSON.stringify(calls[0][1]).includes(API_KEY), false);
}

// Shop maps the reverse direction and retains the Voice API's 15-character wrapping rule.
{
  const { calls, engine } = createEngine();
  const adapter = createShopTranslationAdapter(engine);
  await adapter.translate(env, {
    srtText: SOURCE_SRT,
    direction: 'CN_TO_MY',
    apiKey: API_KEY,
    plan: 'PRO',
  });
  assert.equal(calls[0][1].input.direction, 'CN_TO_MY');
  assert.ok(calls[0][2].prompt.includes('စာလုံးရေ ၁၅ လုံးထက် မကျော်စေရပါ'));
  assert.ok(calls[0][2].prompt.includes('Number/Timestamp'));
}

// Empty SRT is rejected before invoking the shared engine.
{
  const { calls, engine } = createEngine();
  const adapter = createContentTranslationAdapter(engine);
  await assert.rejects(
    () => adapter.translate(env, { srtText: '  ', apiKey: API_KEY }),
    (error) => error.message === 'missing_srt',
  );
  assert.equal(calls.length, 0);
}

// Unsupported Studios and missing prompt builders are rejected.
assert.throws(
  () => createTranslationStudioAdapter('story', { buildPrompt: () => 'prompt' }),
  (error) => error.message === 'unsupported_translation_adapter_studio',
);
assert.throws(
  () => createTranslationStudioAdapter('content'),
  (error) => error.message === 'translation_prompt_builder_required',
);

// Engine errors are propagated without exposing or replacing their safe codes.
{
  const adapter = createContentTranslationAdapter(async () => {
    const error = new Error('missing_api_key');
    error.code = 'missing_api_key';
    throw error;
  });
  await assert.rejects(
    () => adapter.translate(env, { srtText: SOURCE_SRT, apiKey: API_KEY }),
    (error) => error.code === 'missing_api_key',
  );
}

console.log('Shared Translation Studio Adapters: PASS');
