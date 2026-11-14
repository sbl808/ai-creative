#!/usr/bin/env node
import { STORAGE_SCHEMA_VERSION } from '../worker/src/frontend/storage/schema/version.js';
/**
 * IndexedDB Media Asset Repository ownership and metadata-only contract.
 * Run: node --experimental-default-type=module scripts/indexeddb-media-assets-repository-test.mjs
 */
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { clientStorageScript } from '../worker/src/frontend/storage/client-storage.js';

const source = clientStorageScript();
new vm.Script(source, { filename: 'client-storage.js' });
assert.ok(source.includes("indexedDB.open('aics_creations_v1', " + STORAGE_SCHEMA_VERSION + ")"));
assert.match(source, /window\.AICS_MEDIA_ASSETS\s*=\s*\{/);
assert.match(source, /createObjectStore\('media_assets'/);

function clone(value) { return value == null ? value : structuredClone(value); }
function keyFor(record, keyPath) { return Array.isArray(keyPath) ? keyPath.map((key) => record[key]) : record[keyPath]; }
function sameKey(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

function createFakeIndexedDB() {
  const records = new Map([['creations', new Map()], ['projects', new Map()], ['studio_sessions', new Map()], ['studio_handoffs', new Map()], ['session_results', new Map()]]);
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
      records.set(name, new Map()); indexes.set(name, new Map());
      return {
        createIndex(indexName, keyPath) { indexes.get(name).set(indexName, keyPath); }
      };
    },
    close() {},
    transaction(storeName) {
      const names = Array.isArray(storeName) ? storeName : [storeName];
      for (const name of names) if (!records.has(name)) throw new Error('NotFoundError');
      let pending = 0; let aborted = false; let completeQueued = false;
      const tx = { error: null, oncomplete: null, onerror: null, onabort: null };
      function scheduleComplete() {
        if (pending || completeQueued || aborted) return;
        completeQueued = true;
        queueMicrotask(() => { completeQueued = false; if (!pending && !aborted && tx.oncomplete) tx.oncomplete(); });
      }
      function request(operation) {
        const req = { result: undefined, error: null, onsuccess: null, onerror: null }; pending++;
        queueMicrotask(() => {
          if (!aborted) {
            try { req.result = operation(); if (req.onsuccess) req.onsuccess(); }
            catch (error) { req.error = error; tx.error = error; if (req.onerror) req.onerror(); if (tx.onerror) tx.onerror(); }
          }
          pending--; scheduleComplete();
        });
        return req;
      }
      tx.abort = () => { if (aborted) return; aborted = true; queueMicrotask(() => { if (tx.onabort) tx.onabort(); }); };
      tx.objectStore = (name) => {
        const map = records.get(name); const indexMap = indexes.get(name);
        const store = {
          get(id) { return request(() => clone(map.get(id))); },
          add(value) { return request(() => { if (map.has(value.id)) throw new Error('ConstraintError'); map.set(value.id, clone(value)); return value.id; }); },
          put(value) { return request(() => { map.set(value.id, clone(value)); return value.id; }); },
          delete(id) { return request(() => map.delete(id)); },
          index(indexName) {
            const keyPath = indexMap.get(indexName);
            if (!keyPath) throw new Error('NotFoundError');
            return {
              getAll(key) { return request(() => Array.from(map.values()).filter((record) => sameKey(keyFor(record, keyPath), key)).map(clone)); }
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
    get version() { return version; },
    open(name, requestedVersion) {
      const req = { result: null, error: null, onupgradeneeded: null, onsuccess: null, onerror: null, onblocked: null };
      queueMicrotask(() => {
        req.result = database;
        if (requestedVersion > version) {
          const oldVersion = version; version = requestedVersion;
          if (req.onupgradeneeded) req.onupgradeneeded({ oldVersion, newVersion: version });
        }
        if (req.onsuccess) req.onsuccess();
      });
      return req;
    }
  };
}

function makeToken(sub) { return 'header.' + Buffer.from(JSON.stringify({ sub })).toString('base64url') + '.signature'; }
let activeToken = makeToken('user-a');
const fakeIndexedDB = createFakeIndexedDB();
const localStorage = { getItem(key) { return key === 'aics_token' ? activeToken : null; } };
const window = { indexedDB: { open: (name, version) => fakeIndexedDB.open(name, version) } };
const context = { window, localStorage, atob: (value) => Buffer.from(value, 'base64').toString('binary'), Date, Math, Promise, JSON, String, Number, Error, Array, Object, isFinite };
vm.runInNewContext(source, context, { timeout: 1000 });

const assetA = await window.AICS_MEDIA_ASSETS.create({ studioId: 'image', mediaType: 'image' });
assert.equal(fakeIndexedDB.version, STORAGE_SCHEMA_VERSION);
assert.equal(assetA.ownerId, 'user-a');
assert.equal(assetA.contractVersion, 1);
assert.equal(assetA.studioId, 'image');
assert.equal(assetA.mediaType, 'image');
assert.equal(Object.keys(assetA).sort().join(','), 'contractVersion,createdAt,id,mediaType,ownerId,studioId');
assert.equal((await window.AICS_MEDIA_ASSETS.get(assetA.id)).id, assetA.id);
assert.equal((await window.AICS_MEDIA_ASSETS.list()).length, 1);
assert.equal((await window.AICS_MEDIA_ASSETS.list({ studioId: 'image', mediaType: 'image' })).length, 1);
await assert.rejects(window.AICS_MEDIA_ASSETS.create({ studioId: 'image', mediaType: 'image', data: 'base64payload' }), /media_asset_must_not_contain_payload_or_credentials/);
await assert.rejects(window.AICS_MEDIA_ASSETS.create({ studioId: 'unknown', mediaType: 'image' }), /invalid_media_asset/);
await assert.rejects(window.AICS_MEDIA_ASSETS.create({ studioId: 'image', mediaType: 'video' }), /invalid_media_asset/);

activeToken = makeToken('user-b');
assert.equal(await window.AICS_MEDIA_ASSETS.get(assetA.id), null, 'other user must not read user A asset');
assert.deepEqual(Array.from(await window.AICS_MEDIA_ASSETS.list()), []);
await assert.rejects(window.AICS_MEDIA_ASSETS.remove(assetA.id), /forbidden/);
const assetB = await window.AICS_MEDIA_ASSETS.create({ studioId: 'voice', mediaType: 'audio' });
assert.equal(assetB.ownerId, 'user-b');
assert.equal((await window.AICS_MEDIA_ASSETS.list()).length, 1);

activeToken = '';
assert.deepEqual(Array.from(await window.AICS_MEDIA_ASSETS.list()), []);
assert.equal(await window.AICS_MEDIA_ASSETS.get(assetB.id), null);
await assert.rejects(window.AICS_MEDIA_ASSETS.create({ studioId: 'shop', mediaType: 'image' }), /auth_required/);

activeToken = makeToken('user-a');
assert.equal(await window.AICS_MEDIA_ASSETS.remove(assetA.id), true);
assert.equal(await window.AICS_MEDIA_ASSETS.get(assetA.id), null);
assert.equal(fakeIndexedDB.records.get('media_assets').get(assetB.id).ownerId, 'user-b');
assert.equal(await window.AICS_MEDIA_ASSETS.remove(assetA.id), false);

console.log('IndexedDB Media Asset Repository tests passed.');
