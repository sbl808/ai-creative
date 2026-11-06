import assert from 'node:assert/strict';
import vm from 'node:vm';
import { clientStorageScript } from '../worker/src/frontend/storage/client-storage.js';

const calls = [];
let current = null;
const context = {
  window: {
    AICS_DRAFTS: {
      save: async (input) => {
        calls.push({ method: 'save', input });
        current = { ...input, updatedAt: '2026-01-01T00:00:00.000Z' };
        return current;
      },
      get: async (studio) => {
        calls.push({ method: 'get', studio });
        return current && current.studio === studio ? current : null;
      },
      remove: async (studio) => {
        calls.push({ method: 'remove', studio });
        current = null;
        return true;
      }
    }
  },
  Date,
  Math,
  Promise,
  isFinite,
  String,
  Number,
  Object,
  Array,
  Error
};
context.window.window = context.window;
vm.runInNewContext(clientStorageScript(), context, { filename: 'client-storage.js' });

const api = context.window.AICS_STUDIO_DRAFTS;
assert.deepEqual(Array.from(api.studios), ['content', 'short', 'image', 'voice', 'shop']);

const legacy = {
  step: 2,
  savedAt: '2025-12-01T00:00:00.000Z',
  data: { form: { title: 'Legacy draft' }, byok: 'must-not-persist', videoByok: 'must-not-persist' }
};
const imported = await api.importLegacy('content', legacy);
assert.equal(imported.imported, true);
assert.equal(calls.at(-1).input.data.data.form.title, 'Legacy draft');
assert.equal('byok' in calls.at(-1).input.data.data, false);
assert.equal('videoByok' in calls.at(-1).input.data.data, false);
assert.equal('byok' in legacy.data, false, 'legacy credentials are stripped before import');

const loaded = await api.load('content');
assert.equal(loaded.data.step, 2);
assert.equal(loaded.data.data.form.title, 'Legacy draft');

const skipped = await api.importLegacy('content', {
  step: 1,
  data: { form: { title: 'older legacy value' } }
});
assert.equal(skipped.imported, false);
assert.equal(skipped.reason, 'indexeddb_draft_exists');

await api.save('image', { step: 3, data: { prompt: 'new image draft' } });
assert.equal(calls.at(-1).input.studio, 'image');
await api.remove('image');
assert.equal(calls.at(-1).method, 'remove');

await assert.rejects(api.save('story', { step: 1, data: {} }), /invalid_draft_studio/);
await assert.rejects(api.save('voice', { step: 1, data: null }), /invalid_draft_data/);
console.log('Shared Studio Draft adapter tests passed.');
