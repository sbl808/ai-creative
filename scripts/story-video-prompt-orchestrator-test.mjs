import assert from 'node:assert/strict';
import { generateStoryVideoPlan } from '../worker/src/studios/story.js';

const originalFetch = globalThis.fetch;
const requests = [];
globalThis.fetch = async (url, options = {}) => {
  const body = JSON.parse(options.body || '{}');
  requests.push({ url: String(url), body });
  return new Response(JSON.stringify({
    candidates: [{
      content: {
        parts: [{
          text: JSON.stringify({
            characters: [],
            scenes: [{
              id: 'scene_01',
              number: 1,
              title: 'Lantern discovery',
              duration: 8,
              characterIds: [],
              videoPrompt: 'A child discovers a lantern.',
              environmentPrompt: 'A quiet forest.',
            }],
          }),
        }],
      },
    }],
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

const brainRows = [
  { scope: 'GLOBAL_BRAIN', module: 'GLOBAL_FRAMEWORK', type: 'BASE', key: 'role', value: 'Global policy role.' },
  { scope: 'GLOBAL_BRAIN', module: 'GLOBAL_FRAMEWORK', type: 'BASE', key: 'safety', value: 'Respect platform safety.' },
  { scope: 'STORY_VIDEO', module: 'VIDEO_KNOWLEDGE', type: 'BASE', key: 'role', value: 'Video knowledge role must not replace global role.' },
  { scope: 'STORY_VIDEO', module: 'VIDEO_KNOWLEDGE', type: 'BASE', key: 'video_rules', value: 'Use clear visual storytelling.' },
  { scope: 'STORY_VIDEO', module: 'VISUAL_STYLE', type: 'REALISM', key: 'look', value: 'Naturalistic textures and lighting.' },
  { scope: 'STORY_VIDEO', module: 'VISUAL_STYLE', type: 'ANIME', key: 'look', value: 'Anime style must not leak.' },
  { scope: 'STORY_VIDEO', module: 'VIDEO_WORKFLOW', type: 'CINEMATIC_FEATURE', key: 'pacing', value: 'Use a three-act cinematic arc.' },
  { scope: 'STORY_VIDEO', module: 'VIDEO_WORKFLOW', type: 'DOCUMENTARY', key: 'pacing', value: 'Documentary workflow must not leak.' },
];

function makeEnv({ rows = brainRows, legacy = null } = {}) {
  return {
    GEMINI_API_KEY: 'story-video-prompt-test-key',
    DB: {
      prepare(sql) {
        let args = [];
        return {
          bind(...values) { args = values; return this; },
          async all() {
            if (sql.includes('SELECT key, value FROM cms_brain')) {
              const [scope, module, type, plan] = args;
              return {
                results: rows.filter((row) =>
                  row.scope === scope &&
                  row.module === module &&
                  row.type === type &&
                  plan === 'FREE'
                ),
              };
            }
            if (sql.includes('FROM cms_prompts')) {
              return { results: legacy ? [legacy] : [] };
            }
            if (sql.includes('FROM ai_models')) return { results: [] };
            return { results: [] };
          },
        };
      },
    },
  };
}

try {
  await generateStoryVideoPlan(makeEnv(), {
    story: 'A child finds a glowing lantern.',
    storyFacts: { storyId: 'story-1', title: 'The Lantern' },
    visualStyle: 'REALISM',
    workflow: 'CINEMATIC_FEATURE',
    duration: '45 sec',
    language: 'မြန်မာ',
    additionalInstructions: 'Keep the ending hopeful.',
    plan: 'FREE',
  });

  const body = requests.at(-1).body;
  const system = body.systemInstruction.parts[0].text;
  const prompt = body.contents[0].parts[0].text;
  assert.match(system, /Global policy role/);
  assert.match(system, /Respect platform safety/);
  assert.match(system, /Use clear visual storytelling/);
  assert.match(system, /Naturalistic textures and lighting/);
  assert.match(system, /Use a three-act cinematic arc/);
  assert.doesNotMatch(system, /Video knowledge role must not replace global role/);
  assert.doesNotMatch(system, /Anime style must not leak/);
  assert.doesNotMatch(system, /Documentary workflow must not leak/);
  assert.doesNotMatch(system, /glowing lantern/);
  assert.match(system, /TASK INSTRUCTIONS/);
  assert.match(prompt, /USER-PROVIDED DATA/);
  assert.match(prompt, /glowing lantern/);
  assert.match(prompt, /The Lantern/);
  assert.match(prompt, /Keep the ending hopeful/);
  assert.match(prompt, /45 sec/);
  assert.match(prompt, /မြန်မာ/);

  const legacyEnv = makeEnv({
    rows: brainRows.filter((row) => row.scope === 'GLOBAL_BRAIN'),
    legacy: {
      core: 'Legacy video role.',
      memory: 'Legacy video memory.',
      knowledge: 'Legacy video knowledge.',
      workflow: 'Legacy video workflow.',
      template: 'Legacy video template.',
      prompt: 'Legacy video prompt rule.',
      quality_check: 'Legacy video quality check.',
      final_output: 'Legacy video final output.',
    },
  });
  await generateStoryVideoPlan(legacyEnv, {
    story: 'A quiet journey.',
    plan: 'FREE',
  });
  const fallbackBody = requests.at(-1).body;
  const fallbackSystem = fallbackBody.systemInstruction.parts[0].text;
  assert.match(fallbackSystem, /Global policy role/);
  assert.match(fallbackSystem, /Legacy video role/);
  assert.match(fallbackSystem, /Legacy video memory/);
  assert.match(fallbackSystem, /Legacy video final output/);

  console.log('Story Video Prompt Orchestrator integration tests passed.');
} finally {
  globalThis.fetch = originalFetch;
}
