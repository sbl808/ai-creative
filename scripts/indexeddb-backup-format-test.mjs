import assert from 'node:assert/strict';
import {
  BACKUP_FORMAT_ID,
  BACKUP_EXPORT_VERSION,
  BACKUP_STORE_NAMES,
  createBackupEnvelope
} from '../worker/src/frontend/storage/backup/format.js';
import { STORAGE_SCHEMA_VERSION } from '../worker/src/frontend/storage/schema/version.js';

const stores = Object.fromEntries(BACKUP_STORE_NAMES.map(name => [name, []]));
stores.creations.push({ id: 'creation-1', user_id: 'user-a', title: 'Example' });
const backup = createBackupEnvelope(stores, '2026-11-04T08:00:00.000Z');

assert.equal(backup.format, BACKUP_FORMAT_ID);
assert.equal(backup.format, 'aics-browser-backup');
assert.equal(backup.exportVersion, BACKUP_EXPORT_VERSION);
assert.equal(backup.exportVersion, 1);
assert.equal(backup.schemaVersion, STORAGE_SCHEMA_VERSION);
assert.equal(backup.exportedAt, '2026-11-04T08:00:00.000Z');
assert.deepEqual(Object.keys(backup.stores), BACKUP_STORE_NAMES);
assert.deepEqual(backup.stores.creations, [{ id: 'creation-1', user_id: 'user-a', title: 'Example' }]);
assert.notEqual(backup.stores.creations, stores.creations, 'envelope arrays must not alias input arrays');
assert.equal(stores.creations.length, 1, 'creating an envelope must not mutate source records');

assert.throws(() => createBackupEnvelope(null), /invalid_backup_stores/);
assert.throws(() => createBackupEnvelope({}), /invalid_backup_store:creations/);
assert.throws(() => createBackupEnvelope({ ...stores, studio_sessions: {} }), /invalid_backup_store:studio_sessions/);
assert.throws(() => createBackupEnvelope(stores, 'not-a-date'), /invalid_backup_exported_at/);

console.log('IndexedDB backup format contract tests passed.');
