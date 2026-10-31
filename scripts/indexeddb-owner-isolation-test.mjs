#!/usr/bin/env node
/**
 * Runtime contract test for Browser IndexedDB creation ownership.
 * Run: node --experimental-default-type=module scripts/indexeddb-owner-isolation-test.mjs
 */
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { sidebarScript } from '../worker/src/frontend/shared.js';

const assembled = sidebarScript();
const start = assembled.indexOf('function __aicsDbOpen() {');
const end = assembled.indexOf('// ===== AI Creative Studio — Shared Sidebar Script', start);
assert.ok(start >= 0 && end > start, 'IndexedDB store script must be present in sidebarScript()');
const storeScript = assembled.slice(start, end);

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function createFakeIndexedDB() {
  let database;
  const records = new Map();

  function makeStore() {
    return {
      createIndex() {},
      get(id) {
        const request = {};
        queueMicrotask(() => {
          request.result = clone(records.get(id));
          if (request.onsuccess) request.onsuccess();
        });
        return request;
      },
      put(value) {
        queueMicrotask(() => records.set(value.id, clone(value)));
      },
      delete(id) {
        queueMicrotask(() => records.delete(id));
      },
      index() {
        return {
          getAll(userId) {
            const request = {};
            queueMicrotask(() => {
              request.result = Array.from(records.values())
                .filter((record) => String(record.user_id || '') === String(userId))
                .map(clone);
              if (request.onsuccess) request.onsuccess();
            });
            return request;
          }
        };
      }
    };
  }

  function makeDatabase() {
    const stores = new Map();
    return {
      objectStoreNames: { contains: (name) => stores.has(name) },
      createObjectStore(name) {
        const store = makeStore();
        stores.set(name, store);
        return store;
      },
      transaction() {
        let pending = 0;
        let aborted = false;
        let completeScheduled = false;
        const tx = {
          error: null,
          objectStore() {
            const base = stores.get('creations');
            return {
              get: base.get,
              put: base.put,
              delete: base.delete,
              index: base.index
            };
          },
          abort() {
            if (aborted) return;
            aborted = true;
            queueMicrotask(() => { if (tx.onabort) tx.onabort(); });
          }
        };
        const scheduleComplete = () => {
          if (pending !== 0 || completeScheduled || aborted) return;
          completeScheduled = true;
          queueMicrotask(() => {
            completeScheduled = false;
            if (pending === 0 && !aborted && tx.oncomplete) tx.oncomplete();
          });
        };
        const originalObjectStore = tx.objectStore;
        tx.objectStore = function () {
          const base = originalObjectStore.call(tx);
          const enqueue = (operation, request) => {
            pending++;
            queueMicrotask(() => {
              if (!aborted) {
                try {
                  operation();
                  if (request && request.onsuccess) request.onsuccess();
                } catch (error) {
                  tx.error = error;
                  if (request && request.onerror) request.onerror();
                  if (tx.onerror) tx.onerror();
                }
              }
              pending--;
              scheduleComplete();
            });
            return request;
          };
          return {
            get(id) {
              const request = {};
              return enqueue(() => { request.result = clone(records.get(id)); }, request);
            },
            put(value) {
              return enqueue(() => { records.set(value.id, clone(value)); });
            },
            delete(id) {
              return enqueue(() => { records.delete(id); });
            },
            index(name) {
              return {
                getAll(userId) {
                  const request = {};
                  return enqueue(() => {
                    request.result = Array.from(records.values())
                      .filter((record) => String(record.user_id || '') === String(userId))
                      .map(clone);
                  }, request);
                }
              };
            }
          };
        };
        return tx;
      }
    };
  }

  return {
    records,
    open() {
      const request = {};
      queueMicrotask(() => {
        if (!database) database = makeDatabase();
        request.result = database;
        if (request.onupgradeneeded) request.onupgradeneeded();
        if (request.onsuccess) request.onsuccess();
      });
      return request;
    }
  };
}

function makeToken(sub) {
  return 'header.' + Buffer.from(JSON.stringify({ sub })).toString('base64url') + '.signature';
}

let activeToken = makeToken('user-a');
const fakeIndexedDB = createFakeIndexedDB();
const localStorage = {
  getItem(key) {
    return key === 'aics_token' ? activeToken : null;
  }
};
const indexedDB = { open: () => fakeIndexedDB.open() };
const window = { indexedDB };
const context = {
  window,
  localStorage,
  indexedDB,
  atob: (value) => Buffer.from(value, 'base64').toString('binary'),
  Date,
  Math,
  Promise,
  JSON,
  String,
  Error
};
vm.runInNewContext(storeScript, context, { timeout: 1000 });
const store = window.AICS_CREATIONS;

const recordA = await store.save({ id: 'record-a', title: 'User A record' });
assert.equal(recordA.user_id, 'user-a');

activeToken = makeToken('user-b');
const recordB = await store.save({ id: 'record-b', title: 'User B record' });
assert.equal(recordB.user_id, 'user-b');
assert.deepEqual((await store.list()).map((item) => item.id), ['record-b']);

await assert.rejects(store.remove('record-a'), /forbidden/);
await assert.rejects(store.toggleFav('record-a'), /forbidden/);
await assert.rejects(store.save({ id: 'record-a', title: 'Overwrite attempt' }), /forbidden/);
assert.equal(fakeIndexedDB.records.get('record-a').title, 'User A record');

activeToken = '';
assert.deepEqual(await store.list(), []);
await assert.rejects(store.save({ title: 'Anonymous record' }), /auth_required/);

activeToken = makeToken('user-a');
assert.deepEqual((await store.list()).map((item) => item.id), ['record-a']);
await store.toggleFav('record-a');
assert.equal(fakeIndexedDB.records.get('record-a').is_favorite, 1);
await store.remove('record-a');
assert.equal(fakeIndexedDB.records.has('record-a'), false);

console.log('IndexedDB owner isolation tests passed.');
