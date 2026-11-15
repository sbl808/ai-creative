import assert from 'node:assert/strict';
import vm from 'node:vm';
import { clientStorageScript } from '../worker/src/frontend/storage/client-storage.js';

function makeToken(sub) {
  return 'header.' + Buffer.from(JSON.stringify({ sub })).toString('base64url') + '.signature';
}

function makeDb(data) {
  return {
    transaction(storeNames, mode) {
      assert.equal(mode, 'readonly');
      assert.deepEqual(Array.from(storeNames), [
        'creations', 'projects', 'studio_sessions', 'studio_handoffs', 'session_results', 'ideas', 'drafts', 'media_assets'
      ]);
      let pending = storeNames.length;
      let completeQueued = false;
      let aborted = false;
      const tx = {
        error: null,
        abort() {
          if (aborted) return;
          aborted = true;
          queueMicrotask(() => tx.onabort && tx.onabort());
        },
        objectStore(name) {
          return {
            index(indexName) {
              const expected = name === 'creations' || name === 'projects' ? 'user_id' : 'ownerId';
              assert.equal(indexName, expected);
              return {
                getAll(ownerId) {
                  const request = {};
                  queueMicrotask(() => {
                    if (aborted) return;
                    const ownerField = expected;
                    request.result = (data[name] || [])
                      .filter(record => String(record[ownerField] || '') === String(ownerId))
                      .map(record => structuredClone(record));
                    if (request.onsuccess) request.onsuccess();
                    pending--;
                    if (pending === 0 && !completeQueued) {
                      completeQueued = true;
                      queueMicrotask(() => !aborted && tx.oncomplete && tx.oncomplete());
                    }
                  });
                  return request;
                }
              };
            }
          };
        }
      };
      return tx;
    }
  };
}

const sourceData = {
  creations: [
    { id: 'c-a', user_id: 'user-a', title: 'A creation' },
    { id: 'c-b', user_id: 'user-b', title: 'B private creation' }
  ],
  projects: [
    { id: 'p-a', user_id: 'user-a', title: 'A project' },
    { id: 'p-b', user_id: 'user-b', title: 'B private project' }
  ],
  studio_sessions: [
    { id: 's-a', ownerId: 'user-a', studio: 'STORY' },
    { id: 's-b', ownerId: 'user-b', studio: 'STORY' }
  ],
  studio_handoffs: [
    { id: 'h-a', ownerId: 'user-a', target: 'story' },
    { id: 'h-b', ownerId: 'user-b', target: 'story' }
  ],
  session_results: [
    { id: 'r-a', ownerId: 'user-a', sessionId: 's-a', content: { text: 'A result' } },
    { id: 'r-b', ownerId: 'user-b', sessionId: 's-b', content: { text: 'B private result' } }
  ],
  ideas: [
    {
      id: 'i-a', ownerId: 'user-a', recordVersion: 1, category: 'story',
      fields: { idea: 'A idea' },
      result: { title: 'A idea', concept: 'A concept', hook: 'A hook', outline: 'A outline', suggestedStudio: 'story' },
      isFavorite: false
    },
    {
      id: 'i-b', ownerId: 'user-b', recordVersion: 1, category: 'story',
      fields: { idea: 'B private idea' },
      result: { title: 'B private idea', concept: 'B private concept', hook: 'B private hook', outline: 'B private outline', suggestedStudio: 'story' },
      isFavorite: false
    }
  ],
  drafts: [
    { id: 'd-a', ownerId: 'user-a', studio: 'short', draftVersion: 1, data: { prompt: 'A draft' } },
    { id: 'd-b', ownerId: 'user-b', studio: 'short', draftVersion: 1, data: { prompt: 'B private draft' } }
  ],
  media_assets: [
    { id: 'ma-a', ownerId: 'user-a', studioId: 'image', mediaType: 'image', createdAt: '2026-11-10T00:00:00.000Z', contractVersion: 1 },
    { id: 'ma-b', ownerId: 'user-b', studioId: 'image', mediaType: 'image', createdAt: '2026-11-10T00:00:00.000Z', contractVersion: 1 }
  ]
};

const window = {
  __aicsDb: makeDb(sourceData),
  URL: {
    createObjectURL: () => 'blob:test',
    revokeObjectURL: () => {}
  },
  document: {
    body: {
      appendChild(node) { node.parentNode = this; },
      removeChild(node) { node.parentNode = null; }
    },
    createElement() {
      return { style: {}, click() { this.clicked = true; } };
    }
  },
  setTimeout(callback) { callback(); }
};
const context = {
  window,
  localStorage: { getItem: key => key === 'aics_token' ? makeToken('user-a') : null },
  atob: value => Buffer.from(value, 'base64').toString('binary'),
  Blob,
  Date,
  JSON,
  String,
  Promise,
  Error,
  Math,
  isFinite,
  setTimeout: window.setTimeout
};
vm.runInNewContext(clientStorageScript(), context, { timeout: 1000 });

const json = await window.AICS_BACKUP.exportJson();
const backup = JSON.parse(json);
assert.equal(backup.format, 'aics-browser-backup');
assert.equal(backup.exportVersion, 1);
assert.equal(backup.schemaVersion, 7);
assert.deepEqual(Object.keys(backup.stores).sort(), [
  'creations', 'drafts', 'ideas', 'media_assets', 'projects', 'session_results', 'studio_handoffs', 'studio_sessions'
]);
assert.deepEqual(backup.stores.creations.map(record => record.id), ['c-a']);
assert.deepEqual(backup.stores.projects.map(record => record.id), ['p-a']);
assert.deepEqual(backup.stores.studio_sessions.map(record => record.id), ['s-a']);
assert.deepEqual(backup.stores.studio_handoffs.map(record => record.id), ['h-a']);
assert.deepEqual(backup.stores.session_results.map(record => record.id), ['r-a']);
assert.deepEqual(backup.stores.ideas.map(record => record.id), ['i-a']);
assert.deepEqual(backup.stores.drafts.map(record => record.id), ['d-a']);
assert.deepEqual(backup.stores.media_assets.map(record => record.id), ['ma-a']);
assert.ok(!json.includes('B private'));
assert.equal(sourceData.creations.length, 2, 'export must not mutate IndexedDB records');

const maxBytes = 50 * 1024 * 1024;
const boundaryRecord = { id: 'c-size', user_id: 'user-a', title: '' };
sourceData.creations.push(boundaryRecord);
const baselineJson = await window.AICS_BACKUP.exportJson();
boundaryRecord.title = 'x'.repeat(maxBytes - Buffer.byteLength(baselineJson, 'utf8'));
const boundaryJson = await window.AICS_BACKUP.exportJson();
assert.equal(Buffer.byteLength(boundaryJson, 'utf8'), maxBytes, 'an export exactly at 50 MiB must be allowed');
boundaryRecord.title += 'x';
await assert.rejects(
  window.AICS_BACKUP.exportJson(),
  error => error && error.code === 'backup_file_too_large',
  'an export larger than 50 MiB must be rejected'
);
sourceData.creations.pop();

const download = await window.AICS_BACKUP.download();
assert.match(download.filename, /^aics-browser-backup-/);

context.localStorage.getItem = () => null;
await assert.rejects(window.AICS_BACKUP.exportJson(), error => error.code === 'auth_required');

console.log('IndexedDB backup export tests passed.');
