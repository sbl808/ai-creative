import assert from 'node:assert/strict';
import vm from 'node:vm';
import { STORAGE_SCHEMA_VERSION } from '../worker/src/frontend/storage/schema/version.js';
import { schemaMigrationsScript } from '../worker/src/frontend/storage/schema/migrations.js';
import { databaseScript } from '../worker/src/frontend/storage/database.js';

assert.equal(STORAGE_SCHEMA_VERSION, 4);
const context = {};
vm.runInNewContext(schemaMigrationsScript(), context);

function fakeDb(existing) {
  const stores = new Map();
  (existing || []).forEach(name => stores.set(name, { createIndex() {} }));
  return {
    objectStoreNames: { contains: name => stores.has(name) },
    createObjectStore(name) {
      const store = { createIndex() {} };
      stores.set(name, store);
      return store;
    },
    names: () => Array.from(stores.keys()).sort()
  };
}
const expected = ['creations', 'projects', 'session_results', 'studio_handoffs', 'studio_sessions'];
const fresh = fakeDb();
context.__aicsRunSchemaMigrations(fresh, 0, STORAGE_SCHEMA_VERSION);
assert.deepEqual(fresh.names(), expected);

const legacy = fakeDb(['creations', 'projects', 'studio_sessions', 'session_results']);
context.__aicsRunSchemaMigrations(legacy, 3, STORAGE_SCHEMA_VERSION);
assert.deepEqual(legacy.names(), expected, 'existing stores must remain while missing store is added');

const current = fakeDb(expected);
context.__aicsRunSchemaMigrations(current, STORAGE_SCHEMA_VERSION, STORAGE_SCHEMA_VERSION);
assert.deepEqual(current.names(), expected);

assert.match(databaseScript(), /__aicsRunSchemaMigrations/);
assert.match(databaseScript(), /indexeddb_migration_failed/);
console.log('IndexedDB schema migration tests passed.');
