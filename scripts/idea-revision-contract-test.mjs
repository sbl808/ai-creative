import assert from 'node:assert/strict';
import {
  validateIdeaRevision,
  parseIdeaRevisionOutput,
} from '../worker/src/core/ideas.js';

const idea = {
  title: 'A small-town mystery',
  concept: 'A student finds a hidden map.',
  hook: 'The map changes every night.',
  outline: 'Discovery, clues, reveal.',
  suggestedStudio: 'story',
};
const base = {
  category: 'story',
  idea,
  fields: { characters: 'A student and a librarian' },
  instruction: 'Make the mystery more emotional.',
};

assert.equal(validateIdeaRevision(base).ok, true);
assert.equal(validateIdeaRevision({ ...base, category: 'unknown' }).error, 'invalid_category');
assert.equal(validateIdeaRevision({ ...base, instruction: '' }).error, 'missing_instruction');
assert.equal(validateIdeaRevision({ ...base, instruction: 'x'.repeat(2001) }).error, 'field_too_long');
assert.equal(validateIdeaRevision({ ...base, fields: { priceOffer: 'wrong category' } }).error, 'invalid_form_field');
assert.equal(validateIdeaRevision({ ...base, idea: { ...idea, suggestedStudio: 'unknown' } }).error, 'invalid_suggested_studio');

const revised = { ...idea, title: 'The map remembers' };
const validOutput = JSON.stringify({ idea: revised });
assert.deepEqual(parseIdeaRevisionOutput(validOutput), revised);
assert.deepEqual(parseIdeaRevisionOutput('```json\n' + validOutput + '\n```'), revised);
assert.throws(() => parseIdeaRevisionOutput('{broken'), /invalid_ai_output/);
assert.throws(() => parseIdeaRevisionOutput(JSON.stringify({ idea: { ...revised, hook: '' } })), /invalid_idea/);
assert.throws(() => parseIdeaRevisionOutput(JSON.stringify({ idea: { ...revised, suggestedStudio: 'invalid' } })), /invalid_suggested_studio/);

console.log('Idea revision contract tests passed.');
