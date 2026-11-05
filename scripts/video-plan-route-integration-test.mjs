import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const cases = [
  { studioId: 'story', path: '../worker/src/routes/studios/story-video-plan.routes.js', endpoint: '/api/studio/story/video', gate: "requireFeature(env, 'story.video'", generator: 'generateStoryVideoPlan' },
  { studioId: 'content', path: '../worker/src/routes/studios/content.routes.js', endpoint: '/api/studio/content/video', gate: "requireFeature(env, 'content.video'", generator: 'generateContentVideo' },
  { studioId: 'short', path: '../worker/src/routes/studios/short.routes.js', endpoint: '/api/studio/short/video', gate: "requireFeature(env, 'short.video'", generator: 'generateShortVideoPlan' },
  { studioId: 'shop', path: '../worker/src/routes/studios/shop.routes.js', endpoint: '/api/studio/shop/video/generate', gate: "requireFeature(env, 'shop.video_generate'", generator: 'generateShopVideo' },
];

for (const item of cases) {
  const source = await readFile(new URL(item.path, import.meta.url), 'utf8');
  assert.ok(source.includes("import { generateVideoPlan } from '../../video-plans/engine.js';"), item.studioId + ' imports shared engine');
  assert.ok(source.includes("studioId: '" + item.studioId + "'"), item.studioId + ' selects matching adapter');
  assert.ok(source.includes('generate: () => ' + item.generator + '('), item.studioId + ' delegates to existing generator');
  assert.ok(source.includes(item.endpoint), item.studioId + ' endpoint remains available');
  const gateIndex = source.indexOf(item.gate);
  const engineIndex = source.indexOf('generateVideoPlan({');
  assert.ok(gateIndex >= 0, item.studioId + ' feature gate remains');
  assert.ok(engineIndex > gateIndex, item.studioId + ' feature gate precedes engine call');
}

const contentUi = await readFile(new URL('../worker/src/frontend/studios/content/api.js', import.meta.url), 'utf8');
assert.ok(contentUi.includes('function sceneVideoPrompt(scene)'), 'Content UI defines a shared prompt accessor');
assert.ok(contentUi.includes('return scene.videoPrompt||scene.visualPrompt||\'\';'), 'Content UI reads canonical videoPrompt and keeps legacy visualPrompt fallback');
assert.ok(contentUi.includes('if(sceneVideoPrompt(s))'), 'Content scene renderer uses canonical video prompt accessor');
assert.ok(contentUi.includes('var text=sceneVideoPrompt(videoPlan.scenes[idx]);'), 'Content copy action uses canonical video prompt accessor');
assert.ok(contentUi.includes('var prompt=sceneVideoPrompt(scene)||scene.environmentPrompt||scene.visualDescription||scene.description||\'\';'), 'Content image generation uses canonical video prompt and environment fallbacks');

const story = await readFile(new URL('../worker/src/routes/studios/story-video-plan.routes.js', import.meta.url), 'utf8');
assert.ok(story.includes("requireFeature(env, 'story.video', plan, '1', cors)"), 'Story Video feature-level PRO gate remains unchanged');
console.log('Video Plan route integration tests passed.');
