import assert from 'node:assert/strict';
import vm from 'node:vm';
import { SETTINGS_HTML } from '../worker/src/frontend/settings.js';
import { backupRecoveryPanelHtml, backupRecoveryUiScript } from '../worker/src/frontend/storage/backup/recovery-ui.js';

const panel = backupRecoveryPanelHtml();
const script = backupRecoveryUiScript();

for (const id of [
  'tab-btn-backup', 'tab-backup', 'backup-persist-status', 'backup-usage',
  'backup-quota', 'backup-refresh', 'backup-persist', 'backup-export',
  'backup-file', 'backup-preview', 'backup-preview-summary',
  'backup-preview-counts', 'backup-restore', 'backup-recovery-message'
]) {
  assert.ok(SETTINGS_HTML.includes(id), 'Settings page must include ' + id);
}
assert.match(SETTINGS_HTML, /backup:'tab-backup'/);
assert.ok(SETTINGS_HTML.includes('var pendingBackup = null;'), 'Settings page must inject the recovery UI script');
assert.match(panel, /Browser Data Backup & Recovery/);
assert.match(panel, /Safari/);
assert.match(panel, /အလိုအလျောက် Sync မလုပ်ပါ/);
assert.match(script, /AICS_STORAGE_PERSISTENCE\.getStatus/);
assert.match(script, /AICS_STORAGE_PERSISTENCE\.requestPersistence/);
assert.match(script, /AICS_BACKUP\.download/);
assert.match(script, /AICS_BACKUP_IMPORT\.validateFile/);
assert.match(script, /AICS_BACKUP_IMPORT\.restore/);
assert.match(script, /confirmReplace: true/);
assert.match(script, /textContent/);
assert.doesNotMatch(script, /innerHTML\s*=/, 'backup metadata must not be inserted as HTML');
assert.doesNotMatch(script, /fetch\s*\(/, 'backup data must not be sent to a server');

new vm.Script(script, { filename: 'backup-recovery-ui.js' });
const scriptBodies = Array.from(SETTINGS_HTML.matchAll(/<script>([\s\S]*?)<\/script>/g));
assert.equal(scriptBodies.length, 2, 'settings page should keep the shared sidebar and page scripts');
for (let i = 0; i < scriptBodies.length; i++) {
  new vm.Script(scriptBodies[i][1], { filename: 'settings-inline-' + i + '.js' });
}

console.log('IndexedDB backup recovery UI tests passed.');
