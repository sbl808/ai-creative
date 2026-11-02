import assert from 'node:assert/strict';
import { generateStory, reviseStory } from '../worker/src/studios/story.js';

const originalFetch = globalThis.fetch;
const requests = [];
globalThis.fetch = async (url, options = {}) => {
  const body = JSON.parse(options.body || '{}');
  requests.push({ url: String(url), body });
  return new Response(JSON.stringify({
    candidates: [{ content: { parts: [{ text: 'A completed story.\n\n```json\n{"storyId":"story-test"}\n```' }] } }],
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

function makeEnv({ brain = [], legacy = null } = {}) {
  return {
    GEMINI_API_KEY: 'story-prompt-test-key',
    DB: {
      prepare(sql) {
        let args = [];
        return {
          bind(...values) { args = values; return this; },
          async all() {
            if (sql.includes('SELECT key, value FROM cms_brain')) {
              const [scope] = args;
              return { results: brain.filter(row => row.scope === scope) };
            }
            if (sql.includes('SELECT core, memory, knowledge, workflow, template, prompt')) {
              return { results: legacy ? [legacy] : [] };
            }
            if (sql.includes('SELECT id, name, category, enabled, is_default, plan_access')) {
              return { results: [] };
            }
            return { results: [] };
          },
        };
      },
    },
  };
}

try {
  const brainEnv = makeEnv({
    brain: [
      { scope: 'GLOBAL_BRAIN', key: 'role', value: 'GLOBAL ROLE WINS' },
      { scope: 'GLOBAL_BRAIN', key: 'platform_policy', value: 'Follow platform policy.' },
      { scope: 'STORY_TYPES', key: 'role', value: 'Studio role must not replace global role.' },
      { scope: 'STORY_TYPES', key: 'story_structure', value: 'Use a three-act arc.' },
    ],
    legacy: { core: 'Legacy role should be ignored.', memory: 'Legacy memory should be ignored.' },
  });
  const generated = await generateStory(brainEnv, {
    idea: 'A child finds a glowing lantern.',
    type: '1',
    plan: 'FREE',
  });
  assert.equal(generated.story, 'A completed story.');
  assert.equal(generated.storyFacts.storyId, 'story-test');
  const generateBody = requests.at(-1).body;
  const system = generateBody.systemInstruction.parts[0].text;
  const userPrompt = generateBody.contents[0].parts[0].text;
  assert.match(system, /GLOBAL ROLE WINS/);
  assert.match(system, /Follow platform policy/);
  assert.match(system, /Use a three-act arc/);
  assert.doesNotMatch(system, /Studio role must not replace global role/);
  assert.doesNotMatch(system, /Legacy role should be ignored/);
  assert.doesNotMatch(system, /glowing lantern/);
  assert.match(userPrompt, /USER-PROVIDED DATA/);
  assert.match(userPrompt, /glowing lantern/);

  const legacyEnv = makeEnv({
    brain: [{ scope: 'GLOBAL_BRAIN', key: 'role', value: 'GLOBAL ROLE OVERRIDES LEGACY CORE' }],
    legacy: {
      core: 'Legacy CMS role.',
      memory: 'Legacy CMS memory.',
      knowledge: 'Legacy CMS knowledge.',
      workflow: 'Legacy CMS workflow.',
      template: 'Legacy CMS template.',
      prompt: 'Legacy CMS prompt rule.',
      quality_check: 'Legacy CMS quality check.',
      final_output: 'Legacy CMS final output.',
    },
  });
  await reviseStory(legacyEnv, {
    idea: 'Original idea',
    currentStory: 'Current private draft text.',
    instruction: 'Make the ending hopeful.',
    type: '1',
    plan: 'FREE',
  });
  const reviseBody = requests.at(-1).body;
  const reviseSystem = reviseBody.systemInstruction.parts[0].text;
  const revisePrompt = reviseBody.contents[0].parts[0].text;
  assert.match(reviseSystem, /GLOBAL ROLE OVERRIDES LEGACY CORE/);
  assert.doesNotMatch(reviseSystem, /Legacy CMS role/);
  assert.match(reviseSystem, /Legacy CMS memory/);
  assert.match(reviseSystem, /Legacy CMS quality check/);
  assert.match(reviseSystem, /Legacy CMS final output/);
  assert.doesNotMatch(reviseSystem, /Current private draft text/);
  assert.match(revisePrompt, /Current private draft text/);
  assert.match(revisePrompt, /Make the ending hopeful/);
  assert.match(revisePrompt, /USER-PROVIDED DATA/);

  console.log('Story Prompt Orchestrator integration tests passed.');
} finally {
  globalThis.fetch = originalFetch;
}
