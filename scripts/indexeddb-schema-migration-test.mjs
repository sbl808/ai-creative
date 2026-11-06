import assert from 'node:assert/strict';
import vm from 'node:vm';
import { STORAGE_SCHEMA_VERSION } from '../worker/src/frontend/storage/schema/version.js';
import { schemaMigrationsScript } from '../worker/src/frontend/storage/schema/migrations.js';
import { databaseScript } from '../worker/src/frontend/storage/database.js';

assert.equal(STORAGE_SCHEMA_VERSION, 6);
const context = {};
vm.runInNewContext(schemaMigrationsScript(), context);

function fakeDb(existing) {
  const stores = new Map();
  (existing || []).forEach(name => stores.set(name, { indexes: new Map(), createIndex() {} }));
  return {
    objectStoreNames: { contains: name => stores.has(name) },
    createObjectStore(name) {
      const store = {
        indexes: new Map(),
        createIndex(indexName, keyPath, options) {
          store.indexes.set(indexName, { keyPath, unique: !!(options && options.unique) });
        }
      };
      stores.set(name, store);
      return store;
    },
    names: () => Array.from(stores.keys()).sort(),
    store: name => stores.get(name)
  };
}
const expected = ['creations', 'drafts', 'ideas', 'projects', 'session_results', 'studio_handoffs', 'studio_sessions'];
const fresh = fakeDb();
context.__aicsRunSchemaMigrations(fresh, 0, STORAGE_SCHEMA_VERSION);
assert.deepEqual(fresh.names(), expected);
assert.deepEqual(Array.from(fresh.store('drafts').indexes.keys()).sort(), ['ownerId', 'owner_studio', 'updatedAt']);
const ownerStudioIndex = fresh.store('drafts').indexes.get('owner_studio');
assert.deepEqual({ keyPath: Array.from(ownerStudioIndex.keyPath), unique: ownerStudioIndex.unique }, {
  keyPath: ['ownerId', 'studio'], unique: true
});
assert.deepEqual(Array.from(fresh.store('ideas').indexes.keys()).sort(), [
  'category', 'ownerId', 'owner_category', 'owner_updatedAt'
]);
const ownerCategoryIndex = fresh.store('ideas').indexes.get('owner_category');
assert.deepEqual({ keyPath: Array.from(ownerCategoryIndex.keyPath), unique: ownerCategoryIndex.unique }, {
  keyPath: ['ownerId', 'category'], unique: false
});

const legacy = fakeDb(['creations', 'projects', 'studio_sessions', 'session_results']);
context.__aicsRunSchemaMigrations(legacy, 3, STORAGE_SCHEMA_VERSION);
assert.deepEqual(legacy.names(), expected, 'existing stores must remain while missing stores are added');

const versionFour = fakeDb(['creations', 'projects', 'studio_sessions', 'studio_handoffs', 'session_results']);
context.__aicsRunSchemaMigrations(versionFour, 4, STORAGE_SCHEMA_VERSION);
assert.deepEqual(versionFour.names(), expected, 'v4 data stores must remain while drafts and ideas are added');

const versionFive = fakeDb(['creations', 'drafts', 'projects', 'session_results', 'studio_handoffs', 'studio_sessions']);
context.__aicsRunSchemaMigrations(versionFive, 5, STORAGE_SCHEMA_VERSION);
assert.deepEqual(versionFive.names(), expected, 'v5 data stores must remain while the ideas store is added');

const current = fakeDb(expected);
context.__aicsRunSchemaMigrations(current, STORAGE_SCHEMA_VERSION, STORAGE_SCHEMA_VERSION);
assert.deepEqual(current.names(), expected);

assert.match(databaseScript(), /__aicsRunSchemaMigrations/);
assert.match(databaseScript(), /indexeddb_migration_failed/);
console.log('IndexedDB schema migration tests passed.');
