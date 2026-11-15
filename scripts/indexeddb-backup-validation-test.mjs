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
  schemaVersion: 6,
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
    }],
    ideas: [{
      id: 'i-1', ownerId, recordVersion: 1, category: 'story',
      fields: { premise: 'A story idea' },
      result: {
        title: 'A story idea', concept: 'A concept', hook: 'A hook',
        outline: 'An outline', suggestedStudio: 'story'
      },
      isFavorite: false,
      createdAt: '2026-11-04T07:00:00.000Z',
      updatedAt: '2026-11-04T07:00:00.000Z'
    }],
    drafts: [{ id: 'd-1', ownerId, studio: 'short', draftVersion: 1, data: { prompt: 'Draft' }, createdAt: '2026-11-04T07:00:00.000Z', updatedAt: '2026-11-04T07:00:00.000Z' }]
  }
};

const valid = validateBackupEnvelope(validBackup, ownerId);
assert.equal(valid.valid, true);
assert.equal(valid.recordCount, 7);
assert.equal(valid.backup.stores.creations[0].media_data, 'data:image/png;base64,AA==');
assert.equal(valid.backup.stores.drafts[0].studio, 'short');
assert.equal(valid.backup.stores.ideas[0].result.title, 'A story idea');
assert.equal(validateBackupText(JSON.stringify(validBackup), ownerId).recordCount, 7);

const currentBackup = JSON.parse(JSON.stringify(validBackup));
currentBackup.schemaVersion = 7;
currentBackup.stores.media_assets = [{
  contractVersion: 1, id: 'asset-1', ownerId, studioId: 'image',
  mediaType: 'image', createdAt: '2026-11-04T07:00:00.000Z'
}];
assert.equal(validateBackupEnvelope(currentBackup, ownerId).recordCount, 8);
assert.equal(validateBackupText(JSON.stringify(currentBackup), ownerId).recordCount, 8);

// Media Asset V1 accepts exactly the six contract fields.
const validMediaAsset = currentBackup.stores.media_assets[0];
for (const forbiddenField of [
  'data', 'base64', 'content', 'prompt', 'apiKey', 'token', 'secret', 'debugNote'
]) {
  const invalidAsset = { ...validMediaAsset, [forbiddenField]: 'unexpected' };
  expectCode({
    ...currentBackup,
    stores: { ...currentBackup.stores, media_assets: [invalidAsset] }
  }, 'backup_invalid_record');
}

for (const requiredField of [
  'contractVersion', 'id', 'ownerId', 'studioId', 'mediaType', 'createdAt'
]) {
  const invalidAsset = { ...validMediaAsset };
  delete invalidAsset[requiredField];
  expectCode({
    ...currentBackup,
    stores: { ...currentBackup.stores, media_assets: [invalidAsset] }
  }, 'backup_invalid_record');
}

expectCode({
  ...currentBackup,
  stores: {
    ...currentBackup.stores,
    media_assets: [{ ...validMediaAsset, id: '   ' }]
  }
}, 'backup_invalid_record');
expectCode({ ...currentBackup, stores: { ...currentBackup.stores, media_assets: undefined } }, 'backup_invalid_stores');
expectCode({
  ...currentBackup,
  stores: { ...currentBackup.stores, media_assets: [{ ...currentBackup.stores.media_assets[0], ownerId: 'user-b' }] }
}, 'backup_invalid_record');
expectCode({
  ...currentBackup,
  stores: { ...currentBackup.stores, media_assets: [{ ...currentBackup.stores.media_assets[0], data: 'forbidden' }] }
}, 'backup_invalid_record');

function expectCode(input, code, owner = ownerId) {
  assert.throws(
    () => validateBackupEnvelope(input, owner),
    error => error && error.code === code,
    code
  );
}

expectCode(validBackup, 'backup_owner_mismatch', 'other-user');
expectCode({ ...validBackup, stores: { ...validBackup.stores, drafts: [{ id: 'd-2', ownerId: 'user-b', studio: 'short', data: {} }] } }, 'backup_owner_mismatch');
expectCode({ ...validBackup, stores: { ...validBackup.stores, drafts: [{ id: 'd-2', ownerId, studio: 'unknown', data: {} }] } }, 'backup_invalid_record');
const versionFiveBackup = JSON.parse(JSON.stringify(validBackup));
delete versionFiveBackup.stores.ideas;
versionFiveBackup.schemaVersion = 5;
assert.equal(validateBackupEnvelope(versionFiveBackup, ownerId).valid, true);
assert.equal(validateBackupEnvelope(versionFiveBackup, ownerId).recordCount, 6);
assert.equal(validateBackupText(JSON.stringify(versionFiveBackup), ownerId).recordCount, 6);

const versionFiveWithIdeas = JSON.parse(JSON.stringify(validBackup));
versionFiveWithIdeas.schemaVersion = 5;
expectCode(versionFiveWithIdeas, 'backup_invalid_stores');

const versionSixWithMediaAssets = JSON.parse(JSON.stringify(currentBackup));
versionSixWithMediaAssets.schemaVersion = 6;
expectCode(versionSixWithMediaAssets, 'backup_invalid_stores');

const missingDraftsBackup = JSON.parse(JSON.stringify(validBackup));
delete missingDraftsBackup.stores.drafts;
expectCode(missingDraftsBackup, 'backup_invalid_stores');
const missingIdeasBackup = JSON.parse(JSON.stringify(validBackup));
delete missingIdeasBackup.stores.ideas;
expectCode(missingIdeasBackup, 'backup_invalid_stores');
expectCode({ ...validBackup, exportVersion: 2 }, 'backup_export_version_unsupported');
expectCode({ ...validBackup, schemaVersion: 3 }, 'backup_schema_version_unsupported');
expectCode({ ...validBackup, exportedAt: 'invalid' }, 'backup_invalid_exported_at');
expectCode({ ...validBackup, stores: { ...validBackup.stores, unexpected: [] } }, 'backup_unknown_store');
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
assert.equal(imported.recordCount, 7);

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
