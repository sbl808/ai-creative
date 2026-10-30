import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import worker from '../worker/src/index.js';
import { signToken } from '../worker/src/core/auth.js';
import {
  buildStoryFactsBlock,
  generateStory,
  generateStoryVideoPlan,
  parseStoryWithFacts,
  parseStoryVideoResponse,
  reviseStory,
} from '../worker/src/studios/story.js';

const facts = {
  storyId: 'story-001',
  storyType: '2',
  title: 'The Little Lantern',
  summary: 'A child helps a lost fox.',
  characters: [{ name: 'Mina', role: 'helper', attributes: 'brave' }],
  locations: ['forest'],
  timeline: ['dusk'],
  events: ['finds a fox'],
  dialogue: ['Are you lost?'],
  emotion: 'hope',
  importantObjects: ['lantern'],
  visualFacts: ['blue scarf'],
  sceneInformation: [{ scene: 1 }],
  internalPrompt: 'must not be forwarded',
  emptyField: '',
  absentField: null,
};

class RouteMockD1 {
  constructor() { this.limits = new Map(); }
  prepare(sql) {
    const self = this;
    return {
      bind(...args) { this.args = args; return this; },
      async run() {
        if (sql.includes('INSERT INTO api_generation_limits')) {
          const key = String(this.args[0]) + ':' + this.args[1];
          self.limits.set(key, (self.limits.get(key) || 0) + 1);
        }
        return { success: true };
      },
      async all() {
        if (sql.includes('SELECT studio_id, enabled FROM studio_settings')) {
          return { results: ['story', 'content', 'short', 'image', 'voice', 'shop'].map(studio_id => ({ studio_id, enabled: 1 })) };
        }
        return { results: [] };
      },
      async first() {
        if (sql.includes('SELECT attempts FROM api_generation_limits')) {
          const key = String(this.args[0]) + ':' + this.args[1];
          return { attempts: self.limits.get(key) || 0 };
        }
        return null;
      },
    };
  }
}

try {
  const routeEnv = {
    SESSION_SIGNING_KEY: 'story-contract-test-secret',
    DB: new RouteMockD1(),
  };
  const token = await signToken(routeEnv, { sub: 'story-contract-user', email: 'story@test.local' });
  const routePost = (path, body, authenticated = true) => worker.fetch(new Request('https://test.local' + path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authenticated ? { Authorization: 'Bearer ' + token } : {}),
    },
    body: JSON.stringify(body),
  }), routeEnv, {});
  const unauthenticated = await routePost('/api/studio/story/generate', {}, false);
  assert.equal(unauthenticated.status, 401);
  assert.equal((await unauthenticated.json()).error, 'unauthorized');

  const missingIdea = await routePost('/api/studio/story/generate', {});
  assert.equal(missingIdea.status, 400);
  assert.equal((await missingIdea.json()).error, 'missing_idea');

  const missingInstruction = await routePost('/api/studio/story/revise', { currentStory: 'Existing story' });
  assert.equal(missingInstruction.status, 400);
  assert.equal((await missingInstruction.json()).error, 'missing_instruction');

  const missingCurrentStory = await routePost('/api/studio/story/revise', { instruction: 'Make it warmer' });
  assert.equal(missingCurrentStory.status, 400);
  assert.equal((await missingCurrentStory.json()).error, 'missing_current_story');

  const missingVideoInput = await routePost('/api/studio/story/video', {});
  assert.equal(missingVideoInput.status, 400);
  assert.equal((await missingVideoInput.json()).error, 'missing_idea');

  const missingImagePrompt = await routePost('/api/studio/story/video-image', {});
  assert.equal(missingImagePrompt.status, 400);
  assert.equal((await missingImagePrompt.json()).error, 'missing_prompt');

  const fenced = parseStoryWithFacts(
    'A child found a fox.\n\n```json\n' + JSON.stringify(facts) + '\n```',
  );
  assert.equal(fenced.story, 'A child found a fox.');
  assert.equal(fenced.storyFacts.storyId, 'story-001');
  assert.equal(fenced.storyFacts.characters[0].name, 'Mina');

  const plain = parseStoryWithFacts('A story without a facts block.');
  assert.equal(plain.story, 'A story without a facts block.');
  assert.deepEqual(plain.storyFacts, {});

  const fallback = parseStoryWithFacts(
    'Story text\n' + JSON.stringify({ storyId: 'fallback-1', summary: 'fallback facts' }),
  );
  assert.equal(fallback.story, 'Story text');
  assert.equal(fallback.storyFacts.storyId, 'fallback-1');

  const serialized = buildStoryFactsBlock(facts);
  assert.ok(serialized);
  const parsed = JSON.parse(serialized);
  assert.deepEqual(Object.keys(parsed), [
    'storyId', 'storyType', 'title', 'summary', 'characters', 'locations',
    'timeline', 'events', 'dialogue', 'emotion', 'importantObjects',
    'visualFacts', 'sceneInformation',
  ]);
  assert.equal(parsed.internalPrompt, undefined);
  assert.equal(parsed.emptyField, undefined);
  assert.equal(parsed.absentField, undefined);
  assert.equal(buildStoryFactsBlock({ internalPrompt: 'not a supported story fact' }), '');
  assert.equal(buildStoryFactsBlock(null), '');
  assert.equal(buildStoryFactsBlock('not an object'), '');

  // Story → Video handoff contract: the API route forwards structured facts and continuity settings.
  const workerSource = readFileSync(new URL('../worker/src/index.js', import.meta.url), 'utf8');
  const storySource = readFileSync(new URL('../worker/src/studios/story.js', import.meta.url), 'utf8');
  const storyActionsSource = readFileSync(new URL('../worker/src/frontend/studios/story/actions.js', import.meta.url), 'utf8');
  assert.match(workerSource, /storyFacts:\s*body\.storyFacts/);
  assert.match(workerSource, /characterContinuity:\s*body\.characterContinuity/);
  assert.match(workerSource, /characterConsistency:\s*body\.characterConsistency/);
  assert.match(storySource, /const factsBlock = buildStoryFactsBlock\(storyFacts\)/);
  assert.match(storySource, /STORY FACTS \(structured — video အတွက် လိုအပ်သော facts သာ\)/);

  // Revision must invalidate facts extracted from the previous story version.
  // Otherwise Video Plan can receive facts that contradict the revised story text.
  const reviseAction = storyActionsSource.match(/function reviseStory\(\)\{([\s\S]*?)\n\}\nfunction addHistory/);
  assert.ok(reviseAction, 'reviseStory action block should be discoverable');
  const reviseActionBody = reviseAction[1];
  const storyUpdateIndex = reviseActionBody.indexOf("currentStory=data.story||'';");
  const factsClearIndex = reviseActionBody.indexOf('currentStoryFacts={};');
  const autosaveIndex = reviseActionBody.indexOf('autoSave();');
  assert.ok(storyUpdateIndex >= 0, 'successful revision must store the revised story');
  assert.ok(factsClearIndex > storyUpdateIndex, 'stale Story Facts must be cleared after storing the revised story');
  assert.ok(autosaveIndex > factsClearIndex, 'draft autosave must persist the revised story with cleared Story Facts');

  // Video response contract: repeated references to a character resolve to one stable ID.
  const videoPlan = parseStoryVideoResponse(JSON.stringify({
    characters: [
      { id: 'char_01', name: 'Mina', role: 'helper', characterPrompt: 'Blue scarf' },
      { id: 'char_02', name: 'Fox', role: 'lost animal', characterPrompt: 'Red fur' },
    ],
    scenes: [
      { id: 'scene_01', number: 1, title: 'Forest', characterIds: ['Mina', 'Fox'], videoPrompt: 'Mina meets Fox' },
      { id: 'scene_02', number: 2, title: 'Lantern', characterIds: ['char_01'], videoPrompt: 'Mina lights a lantern' },
      { id: 'scene_03', number: 3, title: 'Return', characterIds: [], videoPrompt: 'Mina walks home with Fox' },
    ],
  }));
  assert.deepEqual(videoPlan.characters.map(ch => ch.id), ['char_01', 'char_02']);
  assert.deepEqual(videoPlan.scenes.map(scene => scene.characterIds), [
    ['char_01', 'char_02'],
    ['char_01'],
    ['char_01', 'char_02'],
  ]);
  assert.equal(videoPlan.scenes[0].videoPrompt, 'Mina meets Fox');

  await assert.rejects(() => generateStory({}, { idea: '   ' }), /missing_idea/);
  await assert.rejects(
    () => reviseStory({}, { instruction: 'make it warmer' }),
    /missing_current_story/,
  );
  await assert.rejects(
    () => reviseStory({}, { instruction: '   ', currentStory: 'Once upon a time' }),
    /missing_instruction/,
  );
  await assert.rejects(
    () => generateStoryVideoPlan({}, { story: ' ', idea: '' }),
    /missing_idea/,
  );

  console.log('Story Studio API contracts (helpers + routes): PASS');
} catch (error) {
  console.error('Story Studio API contracts: FAIL');
  throw error;
}
