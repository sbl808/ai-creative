#!/usr/bin/env node
/**
 * IndexedDB Drafts Repository ownership and CRUD contract.
 * Run: node --experimental-default-type=module scripts/indexeddb-drafts-repository-test.mjs
 */
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { clientStorageScript } from '../worker/src/frontend/storage/client-storage.js';

const source = clientStorageScript();
new vm.Script(source, { filename: 'client-storage.js' });
assert.match(source, /indexedDB\.open\('aics_creations_v1', 5\)/);
assert.match(source, /window\.AICS_DRAFTS\s*=\s*\{/);
assert.match(source, /createObjectStore\('drafts'/);
assert.match(source, /createIndex\('owner_studio', \['ownerId', 'studio'\], \{ unique: true \}\)/);

function clone(value) {
  return value == null ? value : structuredClone(value);
}

function keyFor(record, keyPath) {
  if (Array.isArray(keyPath)) return keyPath.map((key) => record[key]);
  return record[keyPath];
}

function sameKey(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function createFakeIndexedDB() {
  const records = new Map([
    ['creations', new Map()],
    ['projects', new Map()],
    ['studio_sessions', new Map()],
    ['studio_handoffs', new Map()],
    ['session_results', new Map()]
  ]);
  const indexes = new Map([
    ['creations', new Map([['user_id', 'user_id']])],
    ['projects', new Map([['user_id', 'user_id']])],
    ['studio_sessions', new Map([['ownerId', 'ownerId'], ['updatedAt', 'updatedAt'], ['owner_updatedAt', ['ownerId', 'updatedAt']]])],
    ['studio_handoffs', new Map([['ownerId', 'ownerId'], ['owner_target_createdAt', ['ownerId', 'target', 'createdAt']]])],
    ['session_results', new Map([['ownerId', 'ownerId'], ['sessionId', 'sessionId'], ['session_createdAt', ['sessionId', 'createdAt']], ['owner_sessionId', ['ownerId', 'sessionId']]])]
  ]);
  let version = 4;

  const database = {
    objectStoreNames: { contains(name) { return records.has(name); } },
    createObjectStore(name, options = {}) {
      records.set(name, new Map());
      indexes.set(name, new Map());
      return {
        createIndex(indexName, keyPath) { indexes.get(name).set(indexName, keyPath); }
      };
    },
    close() {},
    transaction(storeName) {
      const names = Array.isArray(storeName) ? storeName : [storeName];
      for (const name of names) if (!records.has(name)) throw new Error('NotFoundError');
      let pending = 0;
      let aborted = false;
      let completeQueued = false;
      const tx = { error: null, oncomplete: null, onerror: null, onabort: null };
      function scheduleComplete() {
        if (pending || completeQueued || aborted) return;
        completeQueued = true;
        queueMicrotask(() => {
          completeQueued = false;
          if (!pending && !aborted && tx.oncomplete) tx.oncomplete();
        });
      }
      function request(operation) {
        const req = { result: undefined, error: null, onsuccess: null, onerror: null };
        pending++;
        queueMicrotask(() => {
          if (!aborted) {
            try {
              req.result = operation();
              if (req.onsuccess) req.onsuccess();
            } catch (error) {
              req.error = error;
              tx.error = error;
              if (req.onerror) req.onerror();
              if (tx.onerror) tx.onerror();
            }
          }
          pending--;
          scheduleComplete();
        });
        return req;
      }
      tx.abort = () => {
        if (aborted) return;
        aborted = true;
        queueMicrotask(() => { if (tx.onabort) tx.onabort(); });
      };
      tx.objectStore = (name) => {
        if (!records.has(name)) throw new Error('NotFoundError');
        const map = records.get(name);
        const indexMap = indexes.get(name);
        const store = {
          get(id) { return request(() => clone(map.get(id))); },
          getAll() { return request(() => Array.from(map.values()).map(clone)); },
          put(value) {
            return request(() => {
              for (const [indexName, keyPath] of indexMap) {
                if (indexName === 'owner_studio') {
                  const candidate = keyFor(value, keyPath);
                  for (const [id, existing] of map) {
                    if (id !== value.id && sameKey(keyFor(existing, keyPath), candidate)) {
                      throw new Error('ConstraintError');
                    }
                  }
                }
              }
              map.set(value.id, clone(value));
              return value.id;
            });
          },
          delete(id) { return request(() => map.delete(id)); },
          index(indexName) {
            const keyPath = indexMap.get(indexName);
            if (!keyPath) throw new Error('NotFoundError');
            return {
              get(key) {
                return request(() => {
                  for (const record of map.values()) {
                    if (sameKey(keyFor(record, keyPath), key)) return clone(record);
                  }
                  return undefined;
                });
              },
              getAll(key) {
                return request(() => Array.from(map.values())
                  .filter((record) => sameKey(keyFor(record, keyPath), key))
                  .map(clone));
              }
            };
          }
        };
        return store;
      };
      return tx;
    }
  };

  return {
    records,
    indexes,
    get version() { return version; },
    open(name, requestedVersion) {
      const req = { result: null, error: null, onupgradeneeded: null, onsuccess: null, onerror: null, onblocked: null };
      queueMicrotask(() => {
        req.result = database;
        if (requestedVersion > version) {
          const oldVersion = version;
          version = requestedVersion;
          if (req.onupgradeneeded) req.onupgradeneeded({ oldVersion, newVersion: version });
        }
        if (req.onsuccess) req.onsuccess();
      });
      return req;
    }
  };
}

function makeToken(sub) {
  return 'header.' + Buffer.from(JSON.stringify({ sub })).toString('base64url') + '.signature';
}

let activeToken = makeToken('user-a');
const fakeIndexedDB = createFakeIndexedDB();
const localStorage = { getItem(key) { return key === 'aics_token' ? activeToken : null; } };
const window = { indexedDB: { open: (name, version) => fakeIndexedDB.open(name, version) } };
const context = {
  window, localStorage,
  atob: (value) => Buffer.from(value, 'base64').toString('binary'),
  Date, Math, Promise, JSON, String, Number, Error, Array, Object, isFinite
};
vm.runInNewContext(source, context, { timeout: 1000 });

const savedA = await window.AICS_DRAFTS.save({
  studio: 'content',
  draftVersion: 2,
  data: { prompt: 'User A content draft' }
});
assert.equal(fakeIndexedDB.version, 5);
assert.equal(savedA.ownerId, 'user-a');
assert.equal(savedA.studio, 'content');
assert.equal(savedA.draftVersion, 2);
assert.equal((await window.AICS_DRAFTS.get('content')).data.prompt, 'User A content draft');

const updatedA = await window.AICS_DRAFTS.save({
  studio: 'content',
  draftVersion: 3,
  data: { prompt: 'Updated content draft' }
});
assert.equal(updatedA.id, savedA.id, 'saving the same studio draft should update the same record');
assert.equal(updatedA.createdAt, savedA.createdAt, 'update must preserve createdAt');
assert.equal((await window.AICS_DRAFTS.list()).length, 1);

await assert.rejects(window.AICS_DRAFTS.save({ studio: 'story', data: {} }), /invalid_draft_studio/);
await assert.rejects(window.AICS_DRAFTS.save({ studio: 'image', data: [] }), /invalid_draft_data/);

activeToken = makeToken('user-b');
assert.equal(await window.AICS_DRAFTS.get('content'), null, 'other user must not read user A draft');
assert.deepEqual(Array.from(await window.AICS_DRAFTS.list()), []);
const savedB = await window.AICS_DRAFTS.save({ studio: 'content', data: { prompt: 'User B draft' } });
assert.equal(savedB.ownerId, 'user-b');
assert.equal((await window.AICS_DRAFTS.list()).length, 1);

activeToken = '';
assert.deepEqual(Array.from(await window.AICS_DRAFTS.list()), []);
await assert.rejects(window.AICS_DRAFTS.save({ studio: 'shop', data: {} }), /auth_required/);

activeToken = makeToken('user-a');
assert.equal(await window.AICS_DRAFTS.remove('content'), true);
assert.equal(await window.AICS_DRAFTS.get('content'), null);
assert.equal(fakeIndexedDB.records.get('drafts').get(savedB.id).ownerId, 'user-b');
assert.equal(await window.AICS_DRAFTS.remove('content'), false);

console.log('IndexedDB Drafts Repository tests passed.');
