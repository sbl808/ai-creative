import assert from 'node:assert/strict';
import {
  VIDEO_PLAN_CONTRACT_VERSION,
  VIDEO_PLAN_STUDIO_IDS,
  VIDEO_PLAN_V1_CONTRACT,
  validateVideoPlanV1,
} from '../worker/src/video-plans/contracts/video-plan.v1.js';

assert.equal(VIDEO_PLAN_CONTRACT_VERSION, 1);
assert.deepEqual(VIDEO_PLAN_STUDIO_IDS, ['story', 'content', 'short', 'shop']);
assert.ok(Object.isFrozen(VIDEO_PLAN_V1_CONTRACT));
assert.ok(Object.isFrozen(VIDEO_PLAN_V1_CONTRACT.sceneFields));

function validPlan(studioId) {
  return {
    contractVersion: 1,
    studioId,
    product: studioId === 'shop' ? { name: 'Sample product', prompt: 'Product reference' } : null,
    characters: [{
      id: 'char_01',
      name: 'Sample character',
      role: 'Main Character',
      age: '',
      description: '',
      characterPrompt: '',
      referenceImage: '',
    }],
    scenes: [{
      id: 'scene_01',
      number: 1,
      title: 'Opening',
      duration: 8,
      characterIds: ['char_01'],
      description: '',
      visualDescription: '',
      videoPrompt: 'A sample video prompt',
      environmentPrompt: '',
      dialogue: '',
      emotion: '',
      camera: '',
      lighting: '',
      location: '',
      visualStyle: '',
    }],
    rawFallback: false,
  };
}

for (const studioId of VIDEO_PLAN_STUDIO_IDS) {
  assert.deepEqual(validateVideoPlanV1(validPlan(studioId)), { ok: true, errors: [] });
}

assert.deepEqual(validateVideoPlanV1(null), { ok: false, errors: ['invalid_video_plan'] });
assert.ok(validateVideoPlanV1({ ...validPlan('story'), contractVersion: 2 }).errors.includes('unsupported_contract_version'));
assert.ok(validateVideoPlanV1({ ...validPlan('unknown') }).errors.includes('invalid_studio_id'));
assert.ok(validateVideoPlanV1({ ...validPlan('story'), scenes: 'not-an-array' }).errors.includes('scenes_must_be_array'));
assert.ok(validateVideoPlanV1({
  ...validPlan('story'),
  scenes: [{ ...validPlan('story').scenes[0], characterIds: ['missing'] }],
}).errors.includes('scenes[0].character_reference_not_found'));
assert.ok(validateVideoPlanV1({
  ...validPlan('story'),
  characters: [{ ...validPlan('story').characters[0] }, { ...validPlan('story').characters[0] }],
}).errors.includes('characters[1].duplicate_id'));
assert.ok(validateVideoPlanV1({ ...validPlan('shop'), product: 'invalid' }).errors.includes('product_must_be_object_or_null'));

console.log('Video Plan contract tests passed.');
