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
        'creations', 'projects', 'studio_sessions', 'studio_handoffs', 'session_results'
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
assert.equal(backup.schemaVersion, 4);
assert.deepEqual(Object.keys(backup.stores).sort(), [
  'creations', 'projects', 'session_results', 'studio_handoffs', 'studio_sessions'
]);
assert.deepEqual(backup.stores.creations.map(record => record.id), ['c-a']);
assert.deepEqual(backup.stores.projects.map(record => record.id), ['p-a']);
assert.deepEqual(backup.stores.studio_sessions.map(record => record.id), ['s-a']);
assert.deepEqual(backup.stores.studio_handoffs.map(record => record.id), ['h-a']);
assert.deepEqual(backup.stores.session_results.map(record => record.id), ['r-a']);
assert.ok(!json.includes('B private'));
assert.equal(sourceData.creations.length, 2, 'export must not mutate IndexedDB records');

const download = await window.AICS_BACKUP.download();
assert.match(download.filename, /^aics-browser-backup-/);

context.localStorage.getItem = () => null;
await assert.rejects(window.AICS_BACKUP.exportJson(), error => error.code === 'auth_required');

console.log('IndexedDB backup export tests passed.');
