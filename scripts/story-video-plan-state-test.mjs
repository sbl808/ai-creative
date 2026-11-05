import assert from 'node:assert/strict';
import vm from 'node:vm';
import { STORY_VIDEO_PLAN_STATE_SCRIPT } from '../worker/src/frontend/studios/story-video-plan/state.js';

function makeContext(search) {
  const nodes = {};
  const document = {
    getElementById(id) {
      if (!nodes[id]) {
        nodes[id] = {
          id, value: '', checked: true, type: id === 'vidContinuity' || id === 'vidConsistency' ? 'checkbox' : 'text',
          options: [], textContent: '', classList: { toggle() {}, add() {}, remove() {} },
          appendChild(option) { this.options.push(option); },
          dispatchEvent() {}
        };
      }
      return nodes[id];
    },
    createElement() { return { value: '', textContent: '' }; }
  };
  const created = [];
  const updates = [];
  const copiedImages = [];
  const planImages = [];
  const sourceResults = {
    items: [
      { id: 'legacy_char', type: 'story_image', content: { key: 'char_0', dataUrl: 'data:image/png;base64,AA==' } },
      { id: 'legacy_env', type: 'story_image', content: { key: 'env_0', dataUrl: 'data:image/jpeg;base64,BB==' } }
    ]
  };
  const planSession = { id: 'plan_1', studio: 'STORY_VIDEO_PLAN', draft: {} };
  const window = {
    location: { href: 'https://studio.example/app/story-video-plan' + (search || ''), search: search || '' },
    history: { replaceState() {} },
    AICS_SESSIONS: {
      create: async (input) => {
        created.push(input);
        planSession.draft = input.draft;
        return planSession;
      },
      update: async (id, changes) => {
        updates.push({ id, changes });
        planSession.draft = changes.draft;
        return planSession;
      },
      get: async (id) => id === 'plan_1' ? planSession : null
    },
    AICS_SESSION_RESULTS: {
      list: async ({ sessionId }) => sessionId === 'story_1'
        ? sourceResults
        : { items: planImages.slice() },
      create: async (input) => {
        copiedImages.push(input);
        const saved = { id: 'img_' + copiedImages.length, ...input };
        planImages.push(saved);
        return { id: saved.id };
      }
    }
  };
  const context = { window, document, URL, URLSearchParams, Event: function Event() {}, Promise, JSON, String, Object, Array };
  vm.runInNewContext(STORY_VIDEO_PLAN_STATE_SCRIPT, context);
  return { context, nodes, created, updates, copiedImages, planImages, planSession };
}

async function run() {
  const source = {
    sessionId: 'story_1',
    story: 'Current Story result',
    storyFacts: { genre: 'drama' },
    updatedAt: '2026-11-04T10:00:00.000Z',
    legacyVideoPlan: {
      videoForm: { story: 'User-edited Video Story', duration: '60 sec', workflow: 'DOCUMENTARY' },
      characters: [{ id: 'char_01', name: 'Hero' }],
      scenes: [{ number: 1, videoPrompt: 'Wide shot' }]
    }
  };
  const original = JSON.stringify(source);
  const { context, nodes, created, updates, copiedImages, planImages, planSession } = makeContext('');
  await context.window.AICS_STORY_VIDEO_PLAN_STATE.init(source);

  const state = context.window.AICS_STORY_VIDEO_PLAN_STATE.state;
  assert.equal(state.sessionId, 'plan_1');
  assert.equal(state.sourceSessionId, 'story_1');
  assert.equal(state.story, 'User-edited Video Story');
  assert.equal(state.characters[0].name, 'Hero');
  assert.equal(state.scenes[0].videoPrompt, 'Wide shot');
  assert.equal(nodes.vidDurationSel.value, '60 sec');
  assert.equal(nodes.vidWorkflowSel.value, 'DOCUMENTARY');
  assert.equal(created[0].studio, 'STORY_VIDEO_PLAN');
  assert.equal(created[0].draft.schemaVersion, 1);
  assert.equal(created[0].draft.sourceStorySnapshot, 'Current Story result');
  assert.equal(created[0].draft.contractVersion, null, 'legacy Video Plan drafts keep an explicit unknown contract version');
  assert.equal(created[0].draft.studioId, 'story');
  assert.equal(created[0].draft.rawFallback, false);
  assert.equal(copiedImages.length, 2, 'both legacy character and environment images migrate');
  assert.equal(copiedImages[0].sessionId, 'plan_1');
  assert.equal(copiedImages[0].type, 'video_image');
  assert.deepEqual(copiedImages.map((item) => item.content.key).sort(), ['char_0', 'env_0']);
  assert.equal(planSession.draft.legacyImagesMigrated, true);
  assert.equal(source.legacyVideoPlan.videoForm.story, 'User-edited Video Story');
  assert.equal(JSON.stringify(source), original, 'source Story session projection must not be mutated');
  assert.equal(planSession.draft.characters[0].name, 'Hero');

  const updatesBeforeExplicitSave = updates.length;
  state.contractVersion = 1;
  state.studioId = 'story';
  state.rawFallback = true;
  nodes.vidExtra.value = 'Updated after first save';
  await context.window.AICS_STORY_VIDEO_PLAN_STATE.save();
  assert.equal(
    updates.length,
    updatesBeforeExplicitSave + 1,
    'an explicit save performs exactly one additional IndexedDB session update'
  );
  assert.equal(updates.at(-1).id, 'plan_1');
  assert.equal(planSession.draft.form.additionalInstructions, 'Updated after first save');
  assert.equal(planSession.draft.contractVersion, 1);
  assert.equal(planSession.draft.studioId, 'story');
  assert.equal(planSession.draft.rawFallback, true);

  const reload = makeContext('?session=story_1&plan=plan_1');
  // Separate page contexts share the same IndexedDB-backed result records.
  reload.planImages.push(...planImages);
  reload.context.window.AICS_SESSIONS.get = async () => planSession;
  await reload.context.window.AICS_STORY_VIDEO_PLAN_STATE.init(source);
  const restored = reload.context.window.AICS_STORY_VIDEO_PLAN_STATE.state;
  assert.equal(restored.sessionId, 'plan_1');
  assert.equal(restored.story, 'User-edited Video Story');
  assert.equal(restored.form.additionalInstructions, 'Updated after first save');
  assert.equal(restored.contractVersion, 1, 'contract version restores from the IndexedDB draft');
  assert.equal(restored.studioId, 'story');
  assert.equal(restored.rawFallback, true, 'raw fallback marker restores from the IndexedDB draft');
  assert.equal(restored.imageCache.char_0, 'data:image/png;base64,AA==');
  assert.equal(restored.imageCache.env_0, 'data:image/jpeg;base64,BB==');
  assert.equal(restored.imageResultIds.char_0, 'img_1');
  assert.equal(restored.imageResultIds.env_0, 'img_2');
  assert.equal(planImages.length, 2, 'reload restores images without duplicating migrated image records');

  console.log('Story Video Plan state and legacy migration tests passed.');
}

run().catch((error) => { console.error(error); process.exitCode = 1; });
