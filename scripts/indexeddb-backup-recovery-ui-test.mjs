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

const expectedBackupStores = [
  'creations', 'projects', 'studio_sessions', 'studio_handoffs',
  'session_results', 'ideas', 'drafts', 'media_assets'
];
for (const storeName of expectedBackupStores) {
  assert.ok(
    script.includes("'" + storeName + "'"),
    'Backup recovery preview and confirmation must include ' + storeName
  );
}
assert.match(script, /storeNames\.map\(function \(name\)/);
assert.match(script, /storeNames\.reduce\(function \(total, name\)/);

assert.match(script, /confirmReplace: true/);
assert.match(script, /textContent/);
assert.doesNotMatch(script, /innerHTML\s*=/, 'backup metadata must not be inserted as HTML');
assert.doesNotMatch(script, /fetch\s*\(/, 'backup data must not be sent to a server');


function createRecoveryHarness(backup) {
  const ids = [
    'backup-recovery-message', 'backup-persist-status', 'backup-storage-note',
    'backup-usage', 'backup-quota', 'backup-refresh', 'backup-persist',
    'backup-export', 'backup-file', 'backup-preview', 'backup-preview-summary',
    'backup-preview-counts', 'backup-restore'
  ];
  const nodes = new Map();
  for (const id of ids) {
    nodes.set(id, {
      id,
      textContent: '',
      hidden: id === 'backup-preview',
      disabled: id === 'backup-restore',
      value: '',
      files: [],
      style: {},
      listeners: {},
      addEventListener(type, callback) { this.listeners[type] = callback; }
    });
  }

  const calls = { validate: 0, restore: [], confirmations: [] };
  let confirmResult = false;
  const file = { name: 'test-backup.json' };
  const window = {
    confirm(message) {
      calls.confirmations.push(message);
      return confirmResult;
    },
    AICS_STORAGE_PERSISTENCE: {
      getStatus: () => Promise.resolve({
        supported: true, persisted: false, usage: 1024, quota: 4096
      }),
      requestPersistence: () => Promise.resolve({ supported: true, granted: false })
    },
    AICS_BACKUP_IMPORT: {
      validateFile(selectedFile) {
        calls.validate += 1;
        assert.equal(selectedFile, file);
        return Promise.resolve({
          backup,
          recordCount: Object.values(backup.stores)
            .reduce((total, records) => total + records.length, 0)
        });
      },
      restore(selectedBackup, options) {
        calls.restore.push({ backup: selectedBackup, options });
        return Promise.resolve({ importedCount: Object.values(selectedBackup.stores)
          .reduce((total, records) => total + records.length, 0) });
      }
    }
  };
  const document = { getElementById: id => nodes.get(id) || null };
  const context = {
    window, document, Promise, JSON, String, Error, Array, Object, Number,
    Math, Date, isFinite
  };
  vm.runInNewContext(script, context, { timeout: 1000 });

  async function settle() {
    await new Promise(resolve => setImmediate(resolve));
    await new Promise(resolve => setImmediate(resolve));
  }

  return {
    nodes, calls, file, window, settle,
    setConfirmResult(value) { confirmResult = value; },
    async selectBackup() {
      nodes.get('backup-file').files = [file];
      nodes.get('backup-file').listeners.change();
      await settle();
    },
    async clickRestore() {
      nodes.get('backup-restore').listeners.click();
      await settle();
    }
  };
}

const modernStores = Object.fromEntries(
  expectedBackupStores.map((name, index) => [name, Array.from({ length: index + 1 }, (_, item) => ({ id: name + '-' + item }))])
);
const modernBackup = {
  format: 'aics-browser-backup',
  exportVersion: 1,
  schemaVersion: 7,
  exportedAt: '2026-11-10T00:00:00.000Z',
  stores: modernStores
};
const modernHarness = createRecoveryHarness(modernBackup);
await modernHarness.selectBackup();
assert.equal(modernHarness.calls.validate, 1, 'selecting a backup must validate the selected file');
assert.equal(modernHarness.nodes.get('backup-preview').hidden, false, 'valid backup must reveal the preview');
assert.equal(
  modernHarness.nodes.get('backup-preview-counts').textContent,
  expectedBackupStores.map((name, index) => name + ': ' + (index + 1)).join(' · '),
  'preview must show the correct record count for all eight stores'
);
assert.match(
  modernHarness.nodes.get('backup-preview-summary').textContent,
  /စုစုပေါင်း: 36 ခု/,
  'preview summary must show the combined record count'
);
assert.equal(modernHarness.nodes.get('backup-restore').disabled, false);

await modernHarness.clickRestore();
assert.equal(modernHarness.calls.confirmations.length, 1, 'Restore must request confirmation');
assert.match(modernHarness.calls.confirmations[0], /ဒေတာ 36 ခု/);
assert.equal(modernHarness.calls.restore.length, 0, 'canceling confirmation must not restore data');
assert.equal(modernHarness.nodes.get('backup-restore').disabled, false);

modernHarness.setConfirmResult(true);
await modernHarness.clickRestore();
assert.equal(modernHarness.calls.restore.length, 1, 'confirming must invoke Restore exactly once');
assert.equal(modernHarness.calls.restore[0].backup, modernBackup);
assert.equal(modernHarness.calls.restore[0].options.confirmReplace, true);
assert.match(modernHarness.nodes.get('backup-recovery-message').textContent, /Restore အောင်မြင်ပါသည်/);
assert.equal(modernHarness.nodes.get('backup-preview').hidden, true);
assert.equal(modernHarness.nodes.get('backup-file').value, '');

const legacyStores = Object.fromEntries(
  expectedBackupStores.filter(name => name !== 'media_assets')
    .map((name, index) => [name, Array.from({ length: index + 1 }, (_, item) => ({ id: name + '-' + item }))])
);
const legacyBackup = {
  format: 'aics-browser-backup',
  exportVersion: 1,
  schemaVersion: 6,
  exportedAt: '2026-11-10T00:00:00.000Z',
  stores: legacyStores
};
const legacyHarness = createRecoveryHarness(legacyBackup);
await legacyHarness.selectBackup();
assert.equal(
  legacyHarness.nodes.get('backup-preview-counts').textContent,
  expectedBackupStores.map(name => name + ': ' + (name === 'media_assets' ? 0 : legacyStores[name].length)).join(' · '),
  'legacy backups without media_assets must show zero for that store'
);
assert.match(
  legacyHarness.nodes.get('backup-preview-summary').textContent,
  /စုစုပေါင်း: 28 ခု/,
  'legacy preview summary must count only records actually present in the backup'
);

new vm.Script(script, { filename: 'backup-recovery-ui.js' });
const scriptBodies = Array.from(SETTINGS_HTML.matchAll(/<script>([\s\S]*?)<\/script>/g));
assert.equal(scriptBodies.length, 2, 'settings page should keep the shared sidebar and page scripts');
for (let i = 0; i < scriptBodies.length; i++) {
  new vm.Script(scriptBodies[i][1], { filename: 'settings-inline-' + i + '.js' });
}

console.log('IndexedDB backup recovery UI tests passed.');
