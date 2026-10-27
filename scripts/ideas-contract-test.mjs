import assert from 'node:assert/strict';
import { parseIdeasOutput, validateIdeasBrief } from '../worker/src/core/ideas.js';

const brief = {
  idea: 'A local education channel',
  audience: 'Young adults',
  goal: 'Teach a useful skill',
  language: 'Burmese',
  platform: 'TikTok',
  contentType: 'Educational short video',
  count: 3,
};
assert.deepEqual(validateIdeasBrief(brief), { ok: true });
assert.equal(validateIdeasBrief({ ...brief, count: 2 }).error, 'count_must_be_3');
assert.equal(validateIdeasBrief({ ...brief, idea: '' }).error, 'missing_idea');
assert.equal(validateIdeasBrief(null).error, 'invalid_request');
assert.equal(validateIdeasBrief({ ...brief, idea: 'x'.repeat(2001) }).error, 'field_too_long');

const ideas = [1, 2, 3].map((n) => ({
  title: 'Idea ' + n,
  concept: 'Concept ' + n,
  hook: 'Hook ' + n,
  outline: 'Outline ' + n,
  suggestedStudio: 'story',
}));
assert.equal(parseIdeasOutput(JSON.stringify({ ideas })).length, 3);
assert.equal(parseIdeasOutput('```json\n' + JSON.stringify({ ideas }) + '\n```').length, 3);
assert.throws(() => parseIdeasOutput('not json'), /invalid_ai_output/);
assert.throws(() => parseIdeasOutput(JSON.stringify({ ideas: ideas.slice(0, 2) })), /invalid_ideas_count/);
assert.throws(() => parseIdeasOutput(JSON.stringify({ ideas: ideas.map((x) => ({ ...x, suggestedStudio: 'unknown' })) })), /invalid_suggested_studio/);
assert.throws(() => parseIdeasOutput(JSON.stringify({ ideas: ideas.map((x) => ({ ...x, title: '' })) })), /invalid_idea/);

console.log('Idea Workspace contract tests passed.');
