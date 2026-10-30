import assert from 'node:assert/strict';
import {
  buildStoryFactsBlock,
  generateStory,
  generateStoryVideoPlan,
  parseStoryWithFacts,
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

try {
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

  console.log('Story Studio API contracts: PASS');
} catch (error) {
  console.error('Story Studio API contracts: FAIL');
  throw error;
}
