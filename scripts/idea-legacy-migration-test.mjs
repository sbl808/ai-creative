import assert from 'node:assert/strict';
import vm from 'node:vm';
import { legacyIdeaMigrationPanelHtml, legacyIdeaMigrationScript } from '../worker/src/frontend/ideas/legacy-migration.js';
import { ideasRepositoryScript } from '../worker/src/frontend/storage/repositories/ideas.js';
import { backupRecoveryUiScript } from '../worker/src/frontend/storage/backup/recovery-ui.js';

const panel = legacyIdeaMigrationPanelHtml();
assert.match(panel, /legacyIdeaScan/);

const migration = legacyIdeaMigrationScript();
new vm.Script(migration);
assert.match(migration, /indexedDB/);
assert.match(migration, /user_id/);
assert.match(migration, /importLegacy/);
assert.doesNotMatch(migration, /deleteDatabase/);

const repository = ideasRepositoryScript();
new vm.Script(repository);
assert.match(repository, /legacy_idea_owner_mismatch/);
assert.match(repository, /legacySourceId/);

const recovery = backupRecoveryUiScript();
new vm.Script(recovery);
assert.match(recovery, /ideas/);

console.log('Legacy Idea migration contract tests passed.');
