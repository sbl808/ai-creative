import assert from 'node:assert/strict';
import { mergePromptFields, PROMPT_SOURCE_PRIORITY } from '../worker/src/prompt/merge-engine/index.js';

assert.deepEqual(PROMPT_SOURCE_PRIORITY, [
  'globalPolicy',
  'studioBrain',
  'studioConfig',
  'taskTemplate',
  'userInput',
]);

const merged = mergePromptFields({
  userInput: {
    role: 'User role',
    idea: 'User idea',
    tone: 'User tone',
    emptyFallback: 'User fallback',
    enabled: false,
    count: 0,
  },
  taskTemplate: {
    role: 'Template role',
    format: 'Template format',
    emptyFallback: '   ',
  },
  studioConfig: {
    role: 'Studio config role',
    format: 'Studio format',
    layout: 'Studio layout',
  },
  studioBrain: {
    role: 'Studio brain role',
    layout: 'Brain layout',
    safety: 'Studio safety',
  },
  globalPolicy: {
    role: 'Global role',
    safety: 'Global safety',
    policyOnly: 'Global-only field',
  },
});

assert.deepEqual(merged, {
  role: 'Global role',
  safety: 'Global safety',
  policyOnly: 'Global-only field',
  layout: 'Brain layout',
  format: 'Studio format',
  idea: 'User idea',
  tone: 'User tone',
  emptyFallback: 'User fallback',
  enabled: false,
  count: 0,
});

assert.deepEqual(mergePromptFields(), {});
assert.deepEqual(mergePromptFields({ globalPolicy: { empty: '', absent: null } }), {});

assert.throws(
  () => mergePromptFields({ studioBrain: 'not-an-object' }),
  /invalid_prompt_source:studioBrain/
);
assert.throws(
  () => mergePromptFields({ userInput: { nested: { unsafe: true } } }),
  /invalid_prompt_value:nested/
);
assert.throws(
  () => mergePromptFields({ userInput: { 'bad field': 'value' } }),
  /invalid_prompt_field:bad field/
);
assert.throws(
  () => mergePromptFields(JSON.parse('{"userInput":{"__proto__":"polluted"}}')),
  /invalid_prompt_field:__proto__/
);
assert.throws(
  () => mergePromptFields(null),
  /invalid_prompt_sources/
);

console.log('Prompt merge engine contract tests passed.');
