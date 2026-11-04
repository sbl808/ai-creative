import assert from 'node:assert/strict';
import vm from 'node:vm';
import {
  BACKUP_MAX_FILE_BYTES,
  backupValidationScript,
  validateBackupEnvelope,
  validateBackupText
} from '../worker/src/frontend/storage/backup/validate.js';
import { backupImportScript } from '../worker/src/frontend/storage/backup/import.js';

function makeToken(sub) {
  return 'header.' + Buffer.from(JSON.stringify({ sub })).toString('base64url') + '.signature';
}

const ownerId = 'user-a';
const validBackup = {
  format: 'aics-browser-backup',
  exportVersion: 1,
  schemaVersion: 5,
  exportedAt: '2026-11-04T08:00:00.000Z',
  stores: {
    creations: [{
      id: 'c-1', user_id: ownerId, studio: 'IMAGE', title: 'Artwork',
      media_data: 'data:image/png;base64,AA=='
    }],
    projects: [{ id: 'p-1', user_id: ownerId, title: 'Project', description: '' }],
    studio_sessions: [{
      id: 's-1', ownerId, studio: 'STORY', title: 'Story', status: 'active',
      draft: { title: 'Draft' }, createdAt: '2026-11-04T07:00:00.000Z',
      updatedAt: '2026-11-04T07:00:00.000Z'
    }],
    studio_handoffs: [{
      id: 'h-1', ownerId, contractVersion: 1, source: 'ideas', target: 'story',
      payload: { idea: { title: 'Idea' } }, createdAt: '2026-11-04T07:00:00.000Z'
    }],
    session_results: [{
      id: 'r-1', ownerId, sessionId: 's-1', type: 'story',
      content: { text: 'Story result' }, createdAt: '2026-11-04T07:00:00.000Z'
    }]
  }
};

const valid = validateBackupEnvelope(validBackup, ownerId);
assert.equal(valid.valid, true);
assert.equal(valid.recordCount, 5);
assert.equal(valid.backup.stores.creations[0].media_data, 'data:image/png;base64,AA==');
assert.equal(validateBackupText(JSON.stringify(validBackup), ownerId).recordCount, 5);

function expectCode(input, code, owner = ownerId) {
  assert.throws(
    () => validateBackupEnvelope(input, owner),
    error => error && error.code === code,
    code
  );
}

expectCode(validBackup, 'backup_owner_mismatch', 'other-user');
expectCode({ ...validBackup, exportVersion: 2 }, 'backup_export_version_unsupported');
expectCode({ ...validBackup, schemaVersion: 3 }, 'backup_schema_version_unsupported');
expectCode({ ...validBackup, exportedAt: 'invalid' }, 'backup_invalid_exported_at');
expectCode({ ...validBackup, stores: { ...validBackup.stores, unexpected: [] } }, 'backup_invalid_stores');
expectCode({
  ...validBackup,
  stores: { ...validBackup.stores, creations: [{ id: 'c-1', user_id: 'user-b' }] }
}, 'backup_owner_mismatch');
expectCode({
  ...validBackup,
  stores: {
    ...validBackup.stores,
    session_results: [{ id: 'r-2', ownerId, sessionId: 'missing', type: 'story', content: {} }]
  }
}, 'backup_orphan_session_result');
expectCode({
  ...validBackup,
  stores: {
    ...validBackup.stores,
    projects: [
      { id: 'p-1', user_id: ownerId, title: 'Project' },
      { id: 'p-1', user_id: ownerId, title: 'Duplicate' }
    ]
  }
}, 'backup_duplicate_record_id');

const polluted = JSON.parse(JSON.stringify(validBackup));
polluted.stores.studio_sessions[0].draft = JSON.parse('{"__proto__":{"polluted":true}}');
expectCode(polluted, 'backup_unsafe_key');

assert.throws(
  () => validateBackupText('{invalid json', ownerId),
  error => error && error.code === 'backup_invalid_json'
);
assert.throws(
  () => validateBackupText('က'.repeat(BACKUP_MAX_FILE_BYTES), ownerId),
  error => error && error.code === 'backup_file_too_large'
);

const context = {
  window: {},
  Promise,
  __aicsRequireUserId: () => ownerId,
  __aicsStorageError(code) {
    const error = new Error(code);
    error.code = code;
    return error;
  }
};
vm.runInNewContext(backupValidationScript() + '\n' + backupImportScript(), context, { timeout: 1000 });

let fileRead = false;
const tooLargeFile = {
  size: BACKUP_MAX_FILE_BYTES + 1,
  text() { fileRead = true; return Promise.resolve('{}'); }
};
await assert.rejects(
  context.window.AICS_BACKUP_IMPORT.validateFile(tooLargeFile),
  error => error && error.code === 'backup_file_too_large'
);
assert.equal(fileRead, false, 'oversized file must be rejected before reading');

const validText = JSON.stringify(validBackup);
const imported = await context.window.AICS_BACKUP_IMPORT.validateFile({
  size: Buffer.byteLength(validText),
  text: () => Promise.resolve(validText)
});
assert.equal(imported.recordCount, 5);

await assert.rejects(
  context.window.AICS_BACKUP_IMPORT.validateText('{bad json'),
  error => error && error.code === 'backup_invalid_json'
);

context.__aicsRequireUserId = () => { throw new Error('auth_required'); };
await assert.rejects(
  context.window.AICS_BACKUP_IMPORT.validateText(validText),
  error => error && error.message === 'auth_required'
);

console.log('IndexedDB backup import validation tests passed.');
