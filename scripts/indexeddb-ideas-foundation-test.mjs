import assert from 'node:assert/strict';
import vm from 'node:vm';
import { clientStorageScript } from '../worker/src/frontend/storage/client-storage.js';
import { BACKUP_STORE_NAMES, createBackupEnvelope } from '../worker/src/frontend/storage/backup/format.js';
import { validateBackupEnvelope } from '../worker/src/frontend/storage/backup/validate.js';
import { STORAGE_SCHEMA_VERSION } from '../worker/src/frontend/storage/schema/version.js';

const source = clientStorageScript();
assert.equal(STORAGE_SCHEMA_VERSION, 6);
assert.match(source, /indexedDB\.open\('aics_creations_v1', 6\)/);
assert.match(source, /version:\s*6/);
assert.match(source, /createObjectStore\('ideas',\s*\{\s*keyPath:\s*'id'\s*\}\)/);
assert.match(source, /createIndex\('ownerId',\s*'ownerId'/);
assert.match(source, /createIndex\('owner_category'/);
assert.match(source, /window\.AICS_IDEAS\s*=\s*\{/);
assert.match(source, /__aicsRequireUserId\(\)/);
assert.match(source, /__aicsOwnedStoreMutation\('ideas'/);
assert.match(source, /window\.AICS_STORAGE_PERSISTENCE\.requestPersistence/);
assert.doesNotMatch(source, /indexedDB\.open\('aics_ideas_v1'/);
new vm.Script(source, { filename: 'client-storage.js' });

const emptyStores = Object.fromEntries(BACKUP_STORE_NAMES.map((name) => [name, []]));
const currentBackup = createBackupEnvelope(emptyStores);
assert.equal(validateBackupEnvelope(currentBackup, 'user-1').valid, true);
const previousBackup = { ...currentBackup, schemaVersion: 5 };
assert.equal(validateBackupEnvelope(previousBackup, 'user-1').valid, true);
assert.throws(
  () => validateBackupEnvelope({ ...currentBackup, schemaVersion: 4 }, 'user-1'),
  /backup_schema_version_unsupported/
);
console.log('IndexedDB Idea Foundation tests passed.');
