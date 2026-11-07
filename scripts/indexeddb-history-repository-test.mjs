#!/usr/bin/env node
/**
 * IndexedDB History Repository behavior and ownership tests.
 * Run: node --experimental-default-type=module scripts/indexeddb-history-repository-test.mjs
 */
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { historyRepositoryScript } from '../worker/src/frontend/storage/repositories/history.js';

const source = historyRepositoryScript();
new vm.Script(source, { filename: 'history-repository.js' });
assert.match(source, /window\.AICS_HISTORY\s*=\s*\{/);
assert.match(source, /studio_sessions/);
assert.match(source, /session_results/);

function clone(value) {
  return value == null ? value : structuredClone(value);
}

class FakeKeyRange {
  constructor(value) { this.value = value; }
  includes(value) { return String(value) === String(this.value); }
  static only(value) { return new FakeKeyRange(value); }
}

function createFakeDatabase(seed) {
  const stores = new Map(Object.entries(seed).map(([name, records]) => [
    name,
    records.map(clone)
  ]));

  return {
    transaction(storeNames, mode) {
      assert.equal(mode, 'readonly');
      const names = Array.isArray(storeNames) ? storeNames : [storeNames];
      for (const name of names) assert.ok(stores.has(name), 'store exists: ' + name);

      let completedCursors = 0;
      let completionScheduled = false;
      const transaction = {
        error: null,
        oncomplete: null,
        onerror: null,
        onabort: null,
        aborted: false,
        abort() {
          this.aborted = true;
          queueMicrotask(() => this.onabort && this.onabort());
        },
        objectStore(name) {
          assert.ok(names.includes(name), 'store is in transaction: ' + name);
          return {
            index(indexName) {
              return {
                openCursor(range) {
                  const keyFor = (record) => record[indexName];
                  const records = stores.get(name).filter((record) =>
                    !range || range.includes(keyFor(record))
                  );
                  let index = 0;
                  const request = { result: null, error: null, onsuccess: null, onerror: null };

                  function finishCursor() {
                    completedCursors++;
                    if (completedCursors === names.length && !completionScheduled) {
                      completionScheduled = true;
                      queueMicrotask(() => {
                        if (!transaction.aborted && transaction.oncomplete) transaction.oncomplete();
                      });
                    }
                  }

                  function emit() {
                    queueMicrotask(() => {
                      if (transaction.aborted) return;
                      const record = records[index];
                      if (!record) {
                        request.result = null;
                        if (request.onsuccess) request.onsuccess();
                        finishCursor();
                        return;
                      }
                      let continued = false;
                      request.result = {
                        value: clone(record),
                        continue() {
                          if (continued) return;
                          continued = true;
                          index++;
                          emit();
                        }
                      };
                      if (request.onsuccess) request.onsuccess();
                      if (!continued) finishCursor();
                    });
                  }

                  emit();
                  return request;
                }
              };
            }
          };
        }
      };
      return transaction;
    }
  };
}

const seed = {
  creations: [
    {
      id: 'creation-a', user_id: 'user-a', studio: 'story', title: 'A Creation',
      original_prompt: 'A private prompt', created_at: '2026-11-01T08:00:00.000Z',
      updated_at: '2026-11-01T08:10:00.000Z', is_favorite: 1,
      media_data: 'data:image/png;base64,PRIVATE_MEDIA'
    },
    {
      id: 'creation-b', user_id: 'user-b', studio: 'image', title: 'Other User',
      created_at: '2026-11-01T09:00:00.000Z'
    }
  ],
  ideas: [
    {
      id: 'idea-a', ownerId: 'user-a', category: 'content',
      result: { title: 'A Saved Idea', concept: 'Idea concept' },
      createdAt: '2026-11-01T10:00:00.000Z', updatedAt: '2026-11-01T10:05:00.000Z',
      isFavorite: true
    },
    {
      id: 'idea-b', ownerId: 'user-b', category: 'story',
      result: { title: 'Private to B' }, createdAt: '2026-11-01T11:00:00.000Z'
    }
  ],
  studio_sessions: [
    {
      id: 'session-empty', ownerId: 'user-a', studio: 'voice', title: 'Empty Session',
      createdAt: '2026-11-01T07:00:00.000Z', updatedAt: '2026-11-01T07:00:00.000Z'
    },
    {
      id: 'session-has-result', ownerId: 'user-a', studio: 'story', title: 'Result Session',
      createdAt: '2026-11-01T06:00:00.000Z', updatedAt: '2026-11-01T06:00:00.000Z'
    }
  ],
  session_results: [
    {
      id: 'result-a', ownerId: 'user-a', sessionId: 'session-has-result',
      type: 'story', content: { title: 'A Story Result', text: 'Result body' },
      createdAt: '2026-11-01T12:00:00.000Z'
    },
    {
      id: 'result-b', ownerId: 'user-b', sessionId: 'other-session',
      type: 'story', content: { title: 'Other User Result' },
      createdAt: '2026-11-01T13:00:00.000Z'
    }
  ],
  drafts: [
    {
      id: 'draft-a', ownerId: 'user-a', studio: 'content',
      createdAt: '2026-11-01T05:00:00.000Z', updatedAt: '2026-11-01T05:30:00.000Z',
      data: { prompt: 'draft data' }
    },
    {
      id: 'draft-b', ownerId: 'user-b', studio: 'short',
      createdAt: '2026-11-01T14:00:00.000Z'
    }
  ]
};

const fakeDatabase = createFakeDatabase(seed);
let activeOwner = 'user-a';
const window = { IDBKeyRange: FakeKeyRange };
const context = {
  window,
  __aicsUserId: () => activeOwner,
  __aicsDbOpen: () => Promise.resolve(fakeDatabase),
  __aicsStorageError(code) {
    const error = new Error(code);
    error.code = code;
    return error;
  },
  Promise, String, Array, Object, Error
};

vm.runInNewContext(source, context, { timeout: 1000 });

const items = await window.AICS_HISTORY.list();
assert.deepEqual(
  Array.from(items, (item) => item.kind + ':' + item.sourceId),
  [
    'result:result-a',
    'idea:idea-a',
    'creation:creation-a',
    'session:session-empty',
    'draft:draft-a'
  ],
  'history should be newest-first and suppress sessions that already have results'
);
assert.equal(items.length, 5, 'records owned by another user must be excluded');
assert.equal(items.find((item) => item.kind === 'creation').isFavorite, true);
assert.equal(items.find((item) => item.kind === 'idea').isFavorite, true);
assert.equal(items.find((item) => item.kind === 'result').title, 'A Story Result');
assert.equal(items.find((item) => item.kind === 'session').title, 'Empty Session');
assert.equal(
  Object.hasOwn(items.find((item) => item.kind === 'creation'), 'media_data'),
  false,
  'history entries must not retain media payloads'
);

const ideasOnly = await window.AICS_HISTORY.list({ type: 'idea' });
assert.equal(ideasOnly.length, 1);
assert.equal(ideasOnly[0].sourceId, 'idea-a');

const searchResults = await window.AICS_HISTORY.list({ search: 'private prompt' });
assert.equal(searchResults.length, 1);
assert.equal(searchResults[0].sourceId, 'creation-a');

activeOwner = 'user-b';
const userBItems = await window.AICS_HISTORY.list();
assert.deepEqual(
  Array.from(userBItems, (item) => item.sourceId).sort(),
  ['creation-b', 'draft-b', 'idea-b', 'result-b'].sort(),
  'switching owner must return only that owner records'
);

activeOwner = '';
assert.deepEqual(Array.from(await window.AICS_HISTORY.list()), [],
  'unauthenticated users must receive an empty history');

console.log('IndexedDB History Repository tests passed.');
