import assert from 'node:assert/strict';
import vm from 'node:vm';
import { BACKUP_STORE_NAMES, createBackupEnvelope } from '../worker/src/frontend/storage/backup/format.js';
import { validateBackupEnvelope } from '../worker/src/frontend/storage/backup/validate.js';
import { clientStorageScript } from '../worker/src/frontend/storage/client-storage.js';
import { backupRecoveryUiScript } from '../worker/src/frontend/storage/backup/recovery-ui.js';

const now = '2026-11-05T00:00:00.000Z';
const idea = {
  id: 'idea-1',
  ownerId: 'owner-1',
  recordVersion: 1,
  category: 'story',
  fields: { idea: 'A test idea', audience: 'Readers' },
  result: {
    title: 'Test title',
    concept: 'Test concept',
    hook: 'Test hook',
    outline: 'Test outline',
    suggestedStudio: 'STORY'
  },
  isFavorite: false,
  createdAt: now,
  updatedAt: now
};

const stores = Object.fromEntries(BACKUP_STORE_NAMES.map((name) => [name, []]));
stores.ideas = [idea];

const current = createBackupEnvelope(stores, now);
assert.equal(current.exportVersion, 1);
assert.equal(current.schemaVersion, 6);
assert.deepEqual(current.stores.ideas, [idea]);
assert.equal(validateBackupEnvelope(current, 'owner-1').valid, true);

const oldV5Stores = { ...current.stores };
delete oldV5Stores.ideas;
const oldV5 = { ...current, schemaVersion: 5, stores: oldV5Stores };
assert.equal(validateBackupEnvelope(oldV5, 'owner-1').valid, true);

const missingIdeasInV6 = { ...current, stores: { ...current.stores } };
delete missingIdeasInV6.stores.ideas;
assert.throws(
  () => validateBackupEnvelope(missingIdeasInV6, 'owner-1'),
  /backup_invalid_stores/
);

assert.throws(
  () => validateBackupEnvelope(current, 'another-owner'),
  /backup_owner_mismatch/
);

const badIdea = {
  ...current,
  stores: {
    ...current.stores,
    ideas: [{ ...idea, category: 'unknown' }]
  }
};
assert.throws(
  () => validateBackupEnvelope(badIdea, 'owner-1'),
  /backup_invalid_record/
);

const storageScript = clientStorageScript();
new vm.Script(storageScript, { filename: 'client-storage.js' });
assert.match(storageScript, /ideas: 'ownerId'/);
assert.match(storageScript, /'session_results', 'ideas', 'drafts'/);

const recoveryScript = backupRecoveryUiScript();
new vm.Script(recoveryScript, { filename: 'backup-recovery-ui.js' });

console.log('Idea backup contract tests passed.');
