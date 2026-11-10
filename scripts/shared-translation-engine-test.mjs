import assert from 'node:assert/strict';
import { createSharedTranslationEngine } from '../worker/src/media-production/translation/engine.js';
import { TRANSLATION_CONTRACT_VERSION } from '../worker/src/media-production/contracts/translation.contract.js';

const sourceSrt = '1\n00:00:00,000 --> 00:00:02,000\nမင်္ဂလာပါ';
const translatedSrt = '1\n00:00:00,000 --> 00:00:02,000\nမင်္ဂလာပါ\n你好';

function request(studioId) {
  return {
    contractVersion: TRANSLATION_CONTRACT_VERSION,
    studioId,
    operation: 'translate-srt',
    input: { srtText: sourceSrt, direction: 'MY_TO_CN' },
  };
}

async function rejectsWithCode(promise, code) {
  await assert.rejects(promise, (error) => error.code === code);
}

async function testStudioTaskMappings() {
  const modelCalls = [];
  const aiCalls = [];
  const engine = createSharedTranslationEngine({
    resolveModel: async (...args) => {
      modelCalls.push(args);
      return 'test-model';
    },
    generateText: async (_env, args) => {
      aiCalls.push(args);
      return translatedSrt;
    },
  });

  for (const [studioId, task] of [
    ['content', 'content.transcribe'],
    ['voice', 'voice.transcribe'],
  ]) {
    const response = await engine({}, request(studioId), {
      apiKey: 'test-key',
      model: 'requested-model',
      plan: 'PRO',
      prompt: 'Studio-specific translation instruction',
    });
    assert.equal(response.result.srt, translatedSrt);
    assert.equal(response.studioId, studioId);
    assert.ok(modelCalls.some((args) => args[4] === task));
    assert.ok(aiCalls.some((args) => args.task === task &&
      args.apiKey === 'test-key' &&
      args.prompt === 'Studio-specific translation instruction'));
  }
}

async function testRequiredContextAndSafeResponse() {
  const engine = createSharedTranslationEngine({
    resolveModel: async () => 'test-model',
    generateText: async () => '   ',
  });
  await rejectsWithCode(engine({}, request('content'), {
    prompt: 'instruction',
  }), 'missing_api_key');
  await rejectsWithCode(engine({}, request('voice'), {
    apiKey: 'test-key',
  }), 'missing_translation_instruction');

  const invalid = request('content');
  invalid.input.srtText = ' ';
  await rejectsWithCode(engine({}, invalid, {
    apiKey: 'test-key',
    prompt: 'instruction',
  }), 'invalid_translation_request');
  await rejectsWithCode(engine({}, request('story'), {
    apiKey: 'test-key',
    prompt: 'instruction',
  }), 'invalid_translation_request');
  await rejectsWithCode(engine({}, request('voice'), {
    apiKey: 'test-key',
    prompt: 'instruction',
  }), 'invalid_translation_provider_response');
}

await testStudioTaskMappings();
await testRequiredContextAndSafeResponse();
console.log('Shared Translation Engine tests passed.');
