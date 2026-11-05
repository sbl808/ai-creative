import assert from 'node:assert/strict';
import { validateVideoPlanV1 } from '../worker/src/video-plans/contracts/video-plan.v1.js';
import { adaptStoryVideoPlan } from '../worker/src/video-plans/adapters/story.js';
import { adaptContentVideoPlan } from '../worker/src/video-plans/adapters/content.js';
import { adaptShortVideoPlan } from '../worker/src/video-plans/adapters/short.js';
import { adaptShopVideoPlan } from '../worker/src/video-plans/adapters/shop.js';

const story = adaptStoryVideoPlan({
  rawFallback: false,
  characters: [{
    id: 'hero', name: 'Hero', role: 'Lead', age: '30',
    description: 'A hero', characterPrompt: 'Hero prompt',
  }],
  scenes: [{
    id: 'opening', number: 1, title: 'Opening', duration: 8,
    characterIds: ['hero'], description: 'Scene description',
    visualDescription: 'Wide shot', videoPrompt: 'Hero walks',
    environmentPrompt: 'A city', emotion: 'Hope', camera: 'Wide',
    lighting: 'Daylight', location: 'City', visualStyle: 'Cinematic',
  }],
});
assert.equal(story.studioId, 'story');
assert.equal(story.scenes[0].characterIds[0], 'hero');
assert.deepEqual(validateVideoPlanV1(story), { ok: true, errors: [] });

const content = adaptContentVideoPlan({
  rawFallback: false,
  characters: [{ name: 'Presenter', description: 'Host' }],
  scenes: [{
    number: 1, duration: 6, visualPrompt: 'Presenter speaks',
    description: 'Studio background', dialogue: 'Hello',
  }],
});
assert.equal(content.characters[0].id, 'char_01');
assert.equal(content.scenes[0].videoPrompt, 'Presenter speaks');
assert.equal(content.scenes[0].visualDescription, 'Presenter speaks');
assert.equal(content.scenes[0].dialogue, 'Hello');
assert.deepEqual(validateVideoPlanV1(content), { ok: true, errors: [] });

const short = adaptShortVideoPlan({
  rawFallback: true,
  characters: [],
  scenes: [{
    id: 'scene_01', number: 1, duration: 5,
    characterIds: [], videoPrompt: 'Fast opening',
    environmentPrompt: 'Street', emotion: 'Excited',
  }],
});
assert.equal(short.studioId, 'short');
assert.equal(short.rawFallback, true);
assert.deepEqual(validateVideoPlanV1(short), { ok: true, errors: [] });

const shop = adaptShopVideoPlan({
  rawFallback: false,
  product: { name: 'Camera', prompt: 'Compact camera' },
  characters: [],
  scenes: [{
    id: 'scene_01', number: 1, duration: 8,
    characterIds: [], videoPrompt: 'Camera close-up',
    environmentPrompt: 'White background',
  }],
});
assert.deepEqual(shop.product, { name: 'Camera', prompt: 'Compact camera' });
assert.deepEqual(validateVideoPlanV1(shop), { ok: true, errors: [] });

const invalidDurationFallback = adaptStoryVideoPlan({
  characters: [],
  scenes: [{ duration: -1, number: 1 }],
});
assert.equal(invalidDurationFallback.scenes[0].duration, 8);

console.log('Video Plan adapter tests passed.');
