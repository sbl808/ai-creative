#!/usr/bin/env node
/**
 * IndexedDB Projects Repository ownership and schema-upgrade contract.
 * Run: node --experimental-default-type=module scripts/indexeddb-projects-test.mjs
 */
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { clientStorageScript } from '../worker/src/frontend/storage/client-storage.js';

const source = clientStorageScript();
new vm.Script(source, { filename: 'client-storage.js' });
assert.match(source, /indexedDB\.open\('aics_creations_v1', 4\)/);
assert.match(source, /createObjectStore\('projects'/);
assert.match(source, /createObjectStore\('studio_sessions'/);
assert.match(source, /createObjectStore\('session_results'/);
assert.match(source, /createIndex\('owner_updatedAt'/);
assert.match(source, /window\.AICS_PROJECTS\s*=\s*\{/);

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function createFakeIndexedDB() {
  const records = new Map([
    ['creations', new Map([['legacy-record', {
      id: 'legacy-record', user_id: 'user-a', title: 'Existing Creation',
      created_at: '2026-10-31T10:00:00.000Z'
    }]])],
    ['projects', new Map([['legacy-project', {
      id: 'legacy-project', user_id: 'user-a', title: 'Existing Project',
      created_at: '2026-10-30T10:00:00.000Z'
    }]])]
  ]);
  const indexes = new Map([
    ['creations', new Set(['user_id'])],
    ['projects', new Set(['user_id'])]
  ]);
  let version = 3;

  const database = {
    objectStoreNames: {
      contains(name) { return records.has(name); }
    },
    createObjectStore(name) {
      records.set(name, new Map());
      indexes.set(name, new Set());
      return {
        createIndex(indexName) { indexes.get(name).add(indexName); }
      };
    },
    close() {},
    transaction(storeName) {
      if (!records.has(storeName)) throw new Error('NotFoundError');
      let pending = 0;
      let aborted = false;
      let completeQueued = false;
      const tx = { error: null, oncomplete: null, onerror: null, onabort: null };
      function scheduleComplete() {
        if (pending || completeQueued || aborted) return;
        completeQueued = true;
        queueMicrotask(function() {
          completeQueued = false;
          if (!pending && !aborted && tx.oncomplete) tx.oncomplete();
        });
      }
      function request(operation) {
        const req = { result: undefined, error: null, onsuccess: null, onerror: null };
        pending++;
        queueMicrotask(function() {
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
      tx.abort = function() {
        if (aborted) return;
        aborted = true;
        queueMicrotask(function() { if (tx.onabort) tx.onabort(); });
      };
      tx.objectStore = function(name) {
        if (!records.has(name)) throw new Error('NotFoundError');
        const map = records.get(name);
        return {
          get(id) { return request(() => clone(map.get(id))); },
          add(value) {
            return request(() => {
              if (map.has(value.id)) throw new Error('ConstraintError');
              map.set(value.id, clone(value));
              return value.id;
            });
          },
          put(value) {
            return request(() => { map.set(value.id, clone(value)); return value.id; });
          },
          delete(id) { return request(() => map.delete(id)); },
          index(indexName) {
            if (!indexes.get(name).has(indexName)) throw new Error('NotFoundError');
            return {
              getAll(userId) {
                return request(() => Array.from(map.values())
                  .filter((item) => String(item.user_id || '') === String(userId))
                  .map(clone));
              }
            };
          }
        };
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
      queueMicrotask(function() {
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
const localStorage = {
  getItem(key) { return key === 'aics_token' ? activeToken : null; }
};
const window = { indexedDB: { open: (name, version) => fakeIndexedDB.open(name, version) } };
const context = {
  window, localStorage,
  atob: (value) => Buffer.from(value, 'base64').toString('binary'),
  Date, Math, Promise, JSON, String, Error, Array, Object
};
vm.runInNewContext(source, context, { timeout: 1000 });

assert.equal(fakeIndexedDB.version, 3, 'database should be v3 before handoff schema upgrade');
const projectA = await window.AICS_PROJECTS.create({ title: 'User A Project' });
assert.equal(fakeIndexedDB.version, 5, 'database must upgrade from v3 to v5');
assert.equal(projectA.user_id, 'user-a');
assert.equal(projectA.description, '');
assert.equal((await window.AICS_PROJECTS.list()).length, 2, 'existing project must survive upgrade');
assert.equal((await window.AICS_CREATIONS.list())[0].id, 'legacy-record', 'existing Creations data must survive upgrade');
assert.equal(fakeIndexedDB.records.get('projects').get('legacy-project').title, 'Existing Project', 'existing Projects data must survive upgrade');
assert.ok(fakeIndexedDB.records.has('studio_sessions'), 'existing studio_sessions store must survive schema v4');
assert.ok(fakeIndexedDB.records.has('session_results'), 'existing session_results store must survive schema v4');
assert.ok(fakeIndexedDB.indexes.get('studio_sessions').has('owner_updatedAt'), 'sessions must have owner-scoped pagination index');
assert.ok(fakeIndexedDB.indexes.get('session_results').has('session_createdAt'), 'results must have session ordering index');
assert.ok(fakeIndexedDB.records.has('studio_handoffs'), 'schema v4 must create studio_handoffs');
assert.ok(fakeIndexedDB.records.has('drafts'), 'schema v5 must create drafts');
assert.ok(fakeIndexedDB.indexes.get('drafts').has('ownerId'), 'drafts must have owner index');
assert.ok(fakeIndexedDB.indexes.get('drafts').has('updatedAt'), 'drafts must have updatedAt index');
assert.ok(fakeIndexedDB.indexes.get('drafts').has('owner_studio'), 'drafts must have owner/studio unique index');
assert.ok(fakeIndexedDB.indexes.get('studio_handoffs').has('ownerId'), 'handoffs must have owner index');
assert.ok(fakeIndexedDB.indexes.get('studio_handoffs').has('owner_target_createdAt'), 'handoffs must have owner/target/time index');

activeToken = makeToken('user-b');
assert.deepEqual(Array.from(await window.AICS_PROJECTS.list()), []);
const projectB = await window.AICS_PROJECTS.create({ title: 'User B Project' });
assert.equal(projectB.user_id, 'user-b');
await assert.rejects(window.AICS_PROJECTS.remove(projectA.id), /forbidden/);
assert.equal((await window.AICS_PROJECTS.list()).length, 1);
assert.equal(fakeIndexedDB.records.get('projects').get(projectA.id).title, 'User A Project');

activeToken = '';
assert.deepEqual(Array.from(await window.AICS_PROJECTS.list()), []);
await assert.rejects(window.AICS_PROJECTS.create({ title: 'Anonymous Project' }), /auth_required/);

activeToken = makeToken('user-a');
await assert.rejects(window.AICS_PROJECTS.create({ title: '   ' }), /missing_title/);
await window.AICS_PROJECTS.remove(projectA.id);
assert.equal((await window.AICS_PROJECTS.list()).length, 1, 'pre-existing project must remain after removing new project');
assert.equal(fakeIndexedDB.records.get('projects').has(projectA.id), false);
console.log('IndexedDB Projects Repository tests passed.');
