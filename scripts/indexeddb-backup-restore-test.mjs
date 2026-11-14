import assert from 'node:assert/strict';
import vm from 'node:vm';
import { clientStorageScript } from '../worker/src/frontend/storage/client-storage.js';

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

class FakeKeyRange {
  constructor(value) { this.value = value; }
  includes(value) { return value === this.value; }
  static only(value) { return new FakeKeyRange(value); }
}

function createFakeIndexedDB(seed) {
  const records = new Map();
  const definitions = new Map();
  let version = 0;
  for (const [name, values] of Object.entries(seed || {})) {
    records.set(name, new Map(values.map(record => [record.id, clone(record)])));
    const indexPaths = {
      creations: { user_id: 'user_id' },
      ideas: { ownerId: 'ownerId' },
      projects: { user_id: 'user_id' },
      studio_sessions: { ownerId: 'ownerId' },
      studio_handoffs: { ownerId: 'ownerId' },
      session_results: { ownerId: 'ownerId' },
      drafts: { ownerId: 'ownerId' },
      media_assets: { ownerId: 'ownerId' },
      user_settings: { ownerId: 'ownerId' }
    };
    definitions.set(name, { keyPath: 'id', indexes: new Map(Object.entries(indexPaths[name] || {})) });
  }

  function scheduleRequest(transaction, operation) {
    const request = { result: undefined, error: null, onsuccess: null, onerror: null };
    transaction.pending += 1;
    queueMicrotask(() => {
      if (transaction.aborted) {
        transaction.pending -= 1;
        transaction.scheduleCompletion();
        return;
      }
      try {
        request.result = operation();
        if (request.onsuccess) request.onsuccess();
      } catch (error) {
        request.error = error;
        transaction.error = error;
        if (request.onerror) request.onerror();
        if (!transaction.aborted) transaction.abort();
      }
      transaction.pending -= 1;
      transaction.scheduleCompletion();
    });
    return request;
  }

  const database = {
    objectStoreNames: { contains(name) { return records.has(name); } },
    createObjectStore(name, options) {
      records.set(name, new Map());
      definitions.set(name, { keyPath: options.keyPath, indexes: new Map() });
      return {
        createIndex(indexName, keyPath) {
          definitions.get(name).indexes.set(indexName, keyPath);
        }
      };
    },
    close() {},
    transaction(storeNames, mode) {
      const names = Array.isArray(storeNames) ? storeNames : [storeNames];
      const working = new Map(names.map(name => {
        if (!records.has(name)) throw new Error('NotFoundError');
        return [name, new Map(Array.from(records.get(name), ([id, value]) => [id, clone(value)]))];
      }));
      const transaction = {
        mode,
        pending: 0,
        aborted: false,
        completionQueued: false,
        error: null,
        oncomplete: null,
        onerror: null,
        onabort: null,
        abort() {
          if (this.aborted) return;
          this.aborted = true;
          queueMicrotask(() => { if (this.onabort) this.onabort(); });
        },
        scheduleCompletion() {
          if (this.pending || this.completionQueued || this.aborted) return;
          this.completionQueued = true;
          queueMicrotask(() => {
            this.completionQueued = false;
            if (this.pending || this.aborted) return;
            for (const [name, map] of working) records.set(name, map);
            if (this.oncomplete) this.oncomplete();
          });
        },
        objectStore(name) {
          if (!names.includes(name)) throw new Error('NotFoundError');
          const map = working.get(name);
          const definition = definitions.get(name);
          const writable = () => {
            if (mode !== 'readwrite') throw new Error('ReadOnlyError');
          };
          return {
            add(value) {
              writable();
              return scheduleRequest(transaction, () => {
                const id = value[definition.keyPath];
                if (map.has(id)) throw new Error('ConstraintError');
                map.set(id, clone(value));
                return id;
              });
            },
            index(indexName) {
              const keyPath = definition.indexes.get(indexName);
              if (!keyPath) throw new Error('NotFoundError');
              return {
                openCursor(range) {
                  const matching = Array.from(map.entries())
                    .filter(([, value]) => range.includes(value[keyPath]))
                    .map(([id, value]) => ({ id, value: clone(value) }));
                  const request = { result: null, error: null, onsuccess: null, onerror: null };
                  transaction.pending += 1;
                  let position = 0;
                  function emit() {
                    queueMicrotask(() => {
                      if (transaction.aborted) {
                        transaction.pending -= 1;
                        transaction.scheduleCompletion();
                        return;
                      }
                      const entry = matching[position];
                      if (!entry) {
                        request.result = null;
                        if (request.onsuccess) request.onsuccess();
                        transaction.pending -= 1;
                        transaction.scheduleCompletion();
                        return;
                      }
                      let continued = false;
                      request.result = {
                        value: clone(entry.value),
                        primaryKey: entry.id,
                        delete() {
                          writable();
                          return scheduleRequest(transaction, () => map.delete(entry.id));
                        },
                        continue() {
                          continued = true;
                          position += 1;
                          emit();
                        }
                      };
                      if (request.onsuccess) request.onsuccess();
                      if (!continued) {
                        transaction.pending -= 1;
                        transaction.scheduleCompletion();
                      }
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

  return {
    records,
    database,
    open(name, requestedVersion) {
      const request = { result: null, onupgradeneeded: null, onsuccess: null, onerror: null };
      queueMicrotask(() => {
        request.result = database;
        if (requestedVersion > version) {
          const oldVersion = version;
          version = requestedVersion;
          if (request.onupgradeneeded) request.onupgradeneeded({ oldVersion, newVersion: version });
        }
        if (request.onsuccess) request.onsuccess();
      });
      return request;
    }
  };
}

function makeToken(sub) {
  return 'header.' + Buffer.from(JSON.stringify({ sub })).toString('base64url') + '.signature';
}

const owner = 'user-a';
const sessionId = 'session-new';
const backup = {
  format: 'aics-browser-backup',
  exportVersion: 1,
  schemaVersion: 8,
  exportedAt: '2026-11-04T08:00:00.000Z',
  stores: {
    creations: [{ id: 'creation-new', user_id: owner, title: 'New creation' }],
    ideas: [],
    projects: [{ id: 'project-new', user_id: owner, title: 'New project' }],
    studio_sessions: [{ id: sessionId, ownerId: owner, studio: 'STORY', title: 'New story' }],
    studio_handoffs: [{
      id: 'handoff-new', ownerId: owner, contractVersion: 1,
      source: 'ideas', target: 'story', payload: { idea: { title: 'New idea' } }
    }],
    session_results: [{
      id: 'result-new', ownerId: owner, sessionId, type: 'story',
      content: { text: 'New story result' }
    }],
    drafts: [{ id: 'draft-new', ownerId: owner, studio: 'short', draftVersion: 1, data: { prompt: 'New draft' } }],
    media_assets: [{ contractVersion: 1, id: 'asset-new', ownerId: owner, studioId: 'image', mediaType: 'image', createdAt: '2026-11-04T07:00:00.000Z' }],
    user_settings: [{ id: owner, ownerId: owner, profile: { name: 'New profile' }, settings: { theme: 'dark' }, preferences: {}, updatedAt: '2026-11-04T07:00:00.000Z' }]
  }
};

function seedRecordSet(userId, suffix) {
  return {
    creations: [{ id: 'creation-' + suffix, user_id: userId, title: 'Old creation' }],
    ideas: [{
      id: 'idea-' + suffix, ownerId: userId, recordVersion: 1, category: 'story',
      fields: {}, result: {
        title: 'Old idea', concept: 'Concept', hook: 'Hook', outline: 'Outline',
        suggestedStudio: 'story'
      }, isFavorite: false
    }],
    projects: [{ id: 'project-' + suffix, user_id: userId, title: 'Old project' }],
    studio_sessions: [{ id: 'session-' + suffix, ownerId: userId, studio: 'STORY' }],
    studio_handoffs: [{
      id: 'handoff-' + suffix, ownerId: userId, contractVersion: 1,
      source: 'ideas', target: 'story', payload: { title: 'Old' }
    }],
    session_results: [{
      id: 'result-' + suffix, ownerId: userId, sessionId: 'session-' + suffix,
      type: 'story', content: { text: 'Old result' }
    }],
    drafts: [{ id: 'draft-' + suffix, ownerId: userId, studio: 'short', draftVersion: 1, data: { prompt: 'Old draft' } }],
    media_assets: [{ contractVersion: 1, id: 'asset-' + suffix, ownerId: userId, studioId: 'image', mediaType: 'image', createdAt: '2026-11-03T07:00:00.000Z' }],
    user_settings: [{ id: userId, ownerId: userId, profile: { name: 'Old profile' }, settings: { theme: 'light' }, preferences: {}, updatedAt: '2026-11-03T07:00:00.000Z' }]
  };
}

const initialA = seedRecordSet(owner, 'a');
const initialB = seedRecordSet('user-b', 'b');
const seed = {};
for (const name of Object.keys(initialA)) seed[name] = [...initialA[name], ...initialB[name]];
const fakeDb = createFakeIndexedDB(seed);
const window = {
  indexedDB: { open: (name, version) => fakeDb.open(name, version) },
  IDBKeyRange: FakeKeyRange
};
const context = {
  window,
  localStorage: { getItem: key => key === 'aics_token' ? makeToken(owner) : null },
  atob: value => Buffer.from(value, 'base64').toString('binary'),
  Promise, JSON, String, Error, Array, Object, Number, Math, Date, isFinite
};
vm.runInNewContext(clientStorageScript(), context, { timeout: 1000 });

await assert.rejects(
  window.AICS_BACKUP_IMPORT.restore(backup),
  error => error && error.code === 'backup_restore_confirmation_required'
);

const result = await window.AICS_BACKUP_IMPORT.restore(backup, { confirmReplace: true });
assert.equal(result.restored, true);
assert.equal(result.mode, 'replace');
assert.equal(result.removedCount, 9);
assert.equal(result.importedCount, 8);
assert.equal(result.recordCount, 8);

for (const [name, values] of Object.entries(backup.stores)) {
  const all = Array.from(fakeDb.records.get(name).values());
  assert.deepEqual(all.filter(record => record.user_id === owner || record.ownerId === owner).map(record => record.id), values.map(record => record.id));
  assert.equal(all.some(record => record.id.endsWith('-b')), true, name + ' must preserve another owner');
}

const collisionSeed = {};
for (const name of Object.keys(initialA)) {
  collisionSeed[name] = [
    ...initialA[name],
    ...initialB[name]
  ];
}
collisionSeed.projects.push({
  id: 'project-new', user_id: 'user-b', title: 'Other owner collision'
});
const collisionDb = createFakeIndexedDB(collisionSeed);
const collisionWindow = {
  indexedDB: { open: (name, version) => collisionDb.open(name, version) },
  IDBKeyRange: FakeKeyRange
};
const collisionContext = {
  window: collisionWindow,
  localStorage: { getItem: key => key === 'aics_token' ? makeToken(owner) : null },
  atob: value => Buffer.from(value, 'base64').toString('binary'),
  Promise, JSON, String, Error, Array, Object, Number, Math, Date, isFinite
};
vm.runInNewContext(clientStorageScript(), collisionContext, { timeout: 1000 });

await assert.rejects(
  collisionWindow.AICS_BACKUP_IMPORT.restore(backup, { confirmReplace: true }),
  error => error && error.code === 'backup_restore_write_failed'
);
for (const [name, values] of Object.entries(initialA)) {
  const restoredOwner = Array.from(collisionDb.records.get(name).values())
    .filter(record => record.user_id === owner || record.ownerId === owner);
  assert.deepEqual(restoredOwner.map(record => record.id).sort(), values.map(record => record.id).sort(),
    name + ' must rollback the owner data when any imported key collides');
}
assert.equal(
  collisionDb.records.get('projects').get('project-new').user_id,
  'user-b',
  'a conflicting record owned by another user must never be overwritten'
);


const legacyBackup = clone(backup);
legacyBackup.schemaVersion = 6;
delete legacyBackup.stores.media_assets;
delete legacyBackup.stores.user_settings;

const legacyDb = createFakeIndexedDB(seed);
const legacyWindow = {
  indexedDB: { open: (name, version) => legacyDb.open(name, version) },
  IDBKeyRange: FakeKeyRange
};
const legacyContext = {
  window: legacyWindow,
  localStorage: { getItem: key => key === 'aics_token' ? makeToken(owner) : null },
  atob: value => Buffer.from(value, 'base64').toString('binary'),
  Promise, JSON, String, Error, Array, Object, Number, Math, Date, isFinite
};
vm.runInNewContext(clientStorageScript(), legacyContext, { timeout: 1000 });

const mediaAssetsBeforeLegacyRestore = Array.from(legacyDb.records.get('media_assets').values())
  .map(record => clone(record))
  .sort((a, b) => a.id.localeCompare(b.id));

const legacyResult = await legacyWindow.AICS_BACKUP_IMPORT.restore(
  legacyBackup,
  { confirmReplace: true }
);
assert.equal(legacyResult.restored, true);
assert.equal(legacyResult.mode, 'replace');
assert.equal(
  legacyResult.recordCount,
  Object.values(legacyBackup.stores).reduce((total, records) => total + records.length, 0)
);
const mediaAssetsAfterLegacyRestore = Array.from(legacyDb.records.get('media_assets').values())
  .map(record => clone(record))
  .sort((a, b) => a.id.localeCompare(b.id));
assert.deepEqual(
  mediaAssetsAfterLegacyRestore,
  mediaAssetsBeforeLegacyRestore,
  'restoring a v6 backup without media_assets must preserve all existing Media Assets'
);
assert.deepEqual(
  Array.from(legacyDb.records.get('user_settings').values()).sort((a, b) => a.id.localeCompare(b.id)),
  Array.from(seed.user_settings || []).sort((a, b) => a.id.localeCompare(b.id)),
  'restoring a legacy backup without user_settings must preserve existing User Settings'
);


const v5Backup = clone(backup);
v5Backup.schemaVersion = 5;
delete v5Backup.stores.media_assets;
delete v5Backup.stores.user_settings;

const v5Db = createFakeIndexedDB(seed);
const v5Window = {
  indexedDB: { open: (name, version) => v5Db.open(name, version) },
  IDBKeyRange: FakeKeyRange
};
const v5Context = {
  window: v5Window,
  localStorage: { getItem: key => key === 'aics_token' ? makeToken(owner) : null },
  atob: value => Buffer.from(value, 'base64').toString('binary'),
  Promise, JSON, String, Error, Array, Object, Number, Math, Date, isFinite
};
vm.runInNewContext(clientStorageScript(), v5Context, { timeout: 1000 });

const mediaAssetsBeforeV5Restore = Array.from(v5Db.records.get('media_assets').values())
  .map(record => clone(record))
  .sort((a, b) => a.id.localeCompare(b.id));

const v5Result = await v5Window.AICS_BACKUP_IMPORT.restore(
  v5Backup,
  { confirmReplace: true }
);
assert.equal(v5Result.restored, true);
assert.equal(v5Result.mode, 'replace');
assert.equal(
  v5Result.recordCount,
  Object.values(v5Backup.stores).reduce((total, records) => total + records.length, 0)
);
const mediaAssetsAfterV5Restore = Array.from(v5Db.records.get('media_assets').values())
  .map(record => clone(record))
  .sort((a, b) => a.id.localeCompare(b.id));
assert.deepEqual(
  mediaAssetsAfterV5Restore,
  mediaAssetsBeforeV5Restore,
  'restoring a v5 backup without media_assets must preserve every existing Media Asset, including other owners'
);
assert.deepEqual(
  Array.from(v5Db.records.get('user_settings').values()).sort((a, b) => a.id.localeCompare(b.id)),
  Array.from(seed.user_settings || []).sort((a, b) => a.id.localeCompare(b.id)),
  'restoring a v5 backup without user_settings must preserve existing User Settings'
);

console.log('IndexedDB backup safe restore tests passed.');
