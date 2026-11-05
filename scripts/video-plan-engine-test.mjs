import assert from 'node:assert/strict';
import {
  assertValidVideoPlan,
  generateVideoPlan,
  VideoPlanEngineError,
} from '../worker/src/video-plans/engine.js';

function sourcePlan(studioId) {
  return {
    product: studioId === 'shop' ? { name: 'Sample product', prompt: 'Product prompt' } : undefined,
    rawFallback: false,
    characters: [{
      id: 'char_01',
      name: 'Presenter',
      role: 'Main Character',
      age: '',
      description: 'A presenter',
      characterPrompt: 'Presenter prompt',
    }],
    scenes: [{
      id: 'scene_01',
      number: 1,
      title: 'Opening',
      duration: 8,
      characterIds: ['char_01'],
      description: 'Opening scene',
      visualDescription: 'A presenter on screen',
      videoPrompt: 'Presenter speaks',
      environmentPrompt: 'Studio',
      dialogue: 'Hello',
      emotion: 'Friendly',
      camera: 'Medium shot',
      lighting: 'Soft light',
      location: 'Studio',
      visualStyle: 'Realistic',
    }],
  };
}

for (const studioId of ['story', 'content', 'short', 'shop']) {
  let calls = 0;
  const plan = await generateVideoPlan({
    studioId,
    generate: async () => {
      calls += 1;
      return sourcePlan(studioId);
    },
  });
  assert.equal(calls, 1);
  assert.equal(plan.studioId, studioId);
  assert.equal(plan.contractVersion, 1);
  assert.equal(plan.scenes.length, 1);
  assert.equal(plan.scenes[0].videoPrompt, 'Presenter speaks');
  assert.equal(assertValidVideoPlan(plan), plan);
  if (studioId === 'shop') assert.equal(plan.product.name, 'Sample product');
}

let unsupportedGeneratorCalled = false;
await assert.rejects(
  generateVideoPlan({
    studioId: 'unknown',
    generate: async () => { unsupportedGeneratorCalled = true; return sourcePlan('unknown'); },
  }),
  (error) => error instanceof VideoPlanEngineError && error.code === 'unsupported_studio',
);
assert.equal(unsupportedGeneratorCalled, false);

const generatorFailure = new Error('generator_failed');
await assert.rejects(
  generateVideoPlan({ studioId: 'story', generate: async () => { throw generatorFailure; } }),
  (error) => error === generatorFailure,
);

await assert.rejects(
  generateVideoPlan({ studioId: 'story', generate: 'not-a-function' }),
  (error) => error instanceof VideoPlanEngineError && error.code === 'generator_required',
);

assert.throws(
  () => assertValidVideoPlan({ contractVersion: 999 }),
  (error) => error instanceof VideoPlanEngineError
    && error.code === 'invalid_video_plan'
    && error.details.includes('unsupported_contract_version'),
);

await assert.rejects(
  generateVideoPlan({
    studioId: 'content',
    generate: async () => ({ characters: 'invalid', scenes: 'invalid' }),
  }),
  (error) => error instanceof VideoPlanEngineError && error.code === 'invalid_video_plan',
);

console.log('Video Plan engine tests passed.');
