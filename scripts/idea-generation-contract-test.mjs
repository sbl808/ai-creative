import assert from 'node:assert/strict';
import { validateIdeasBrief, parseIdeasOutput } from '../worker/src/core/ideas.js';

const base = {
  idea: 'A story about a lost map',
  audience: 'Young adults',
  goal: 'Entertainment',
  language: 'Burmese',
  platform: 'YouTube',
  contentType: 'Story',
  count: 3,
};

for (const category of ['story', 'content', 'short', 'image', 'shop']) {
  const result = validateIdeasBrief({ ...base, category, formData: { ...base, ...(category === 'story' ? { characters: 'Two friends' } : {}) } });
  assert.equal(result.ok, true, category);
  assert.equal(result.category, category);
}
assert.equal(validateIdeasBrief({ ...base, category: 'unknown' }).error, 'invalid_category');
assert.equal(validateIdeasBrief({ ...base, category: 'story', formData: { ...base, priceOffer: 'wrong category' } }).error, 'invalid_form_field');
assert.equal(validateIdeasBrief({ ...base, count: 2 }).error, 'count_must_be_3');
assert.equal(validateIdeasBrief({ ...base, formData: [] }).error, 'invalid_form_data');

const validOutput = JSON.stringify({ ideas: [1, 2, 3].map((n) => ({
  title: 'Idea ' + n, concept: 'Concept ' + n, hook: 'Hook ' + n,
  outline: 'Outline ' + n, suggestedStudio: 'story',
})) });
assert.equal(parseIdeasOutput(validOutput).length, 3);
assert.throws(() => parseIdeasOutput(JSON.stringify({ ideas: [] })), /invalid_ideas_count/);
console.log('Idea generation contract tests passed.');
