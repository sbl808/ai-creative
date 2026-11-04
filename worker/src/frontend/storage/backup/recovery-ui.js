const PANEL_HTML = `
<section class="tab-panel" id="backup-recovery-panel" aria-labelledby="tab-btn-backup">
  <h2 style="font-size:17px;margin-bottom:8px;">Browser Data Backup & Recovery</h2>
  <p class="hint" style="margin:0 0 18px;">သင့်ဖန်တီးမှုဒေတာများသည် ဤ Browser ၏ IndexedDB ထဲတွင်သာ သိမ်းထားပါသည်။ Backup ဖိုင်ကို လုံခြုံသောနေရာတွင် ကိုယ်တိုင်သိမ်းထားပါ။</p>
  <div class="profile-row"><span class="profile-label">Storage အခြေအနေ</span><span class="profile-value" id="backup-persist-status">စစ်ဆေးနေသည်…</span></div>
  <div class="profile-row"><span class="profile-label">အသုံးပြုထားသော Storage</span><span class="profile-value" id="backup-usage">—</span></div>
  <div class="profile-row"><span class="profile-label">ခွင့်ပြုထားသော Quota</span><span class="profile-value" id="backup-quota">—</span></div>
  <p class="hint" id="backup-storage-note">Storage အခြေအနေကို ဖတ်ရှုနေပါသည်။</p>
  <div style="display:flex;flex-wrap:wrap;gap:8px;margin:16px 0 24px;">
    <button type="button" class="btn btn-secondary" id="backup-refresh">အခြေအနေ ပြန်စစ်ရန်</button>
    <button type="button" class="btn btn-secondary" id="backup-persist">ဒေတာထိန်းသိမ်းခွင့် တောင်းရန်</button>
  </div>
  <h3 style="font-size:15px;margin:18px 0 6px;">Backup ထုတ်ယူရန်</h3>
  <p class="hint">လက်ရှိ User ၏ ဒေတာများကို JSON ဖိုင်အဖြစ် ဤစက်ထဲသို့ Download လုပ်ပါမည်။</p>
  <button type="button" class="btn btn-primary" id="backup-export" style="margin-top:10px;">Backup ဖိုင် ထုတ်ယူရန်</button>
  <div style="height:1px;background:var(--border);margin:24px 0;"></div>
  <h3 style="font-size:15px;margin-bottom:6px;">Backup ပြန်လည်ထည့်သွင်းရန်</h3>
  <p class="hint">သင့် Backup JSON ဖိုင်ကို ရွေးပါ။ စစ်ဆေးပြီးမှသာ Restore လုပ်နိုင်ပါမည်။</p>
  <div class="form-row" style="margin-top:12px;">
    <label for="backup-file">Backup JSON ဖိုင်</label>
    <input class="form-input" id="backup-file" type="file" accept=".json,application/json">
  </div>
  <div id="backup-preview" hidden style="padding:14px;border:1px solid var(--border);border-radius:10px;background:var(--card2);margin-top:12px;">
    <strong>Restore မလုပ်မီ စစ်ဆေးချက်</strong>
    <p class="hint" id="backup-preview-summary" style="margin-top:8px;"></p>
    <p class="hint" id="backup-preview-counts"></p>
    <p class="hint" style="color:var(--warning);">Restore လုပ်ပါက ဤ User ၏ လက်ရှိဒေတာများကို Backup ထဲရှိဒေတာများဖြင့် အစားထိုးပါမည်။ အခြား User များ၏ဒေတာကို မထိခိုက်စေပါ။</p>
    <button type="button" class="btn btn-primary" id="backup-restore" disabled style="margin-top:10px;">စစ်ဆေးပြီး Restore လုပ်ရန်</button>
  </div>
  <p class="hint" id="backup-recovery-message" role="status" aria-live="polite" style="margin-top:14px;"></p>
  <p class="hint" style="margin-top:18px;">သတိပြုရန် — Persistence ခွင့်ပြုချက်သည် ဒေတာမပျောက်ရန် အာမခံချက်မဟုတ်ပါ။ Safari အပါအဝင် Browser အချို့တွင် Storage ဖယ်ရှားခံရနိုင်သည်။ ဤဒေတာများသည် စက်တစ်ခုနှင့်တစ်ခု အလိုအလျောက် Sync မလုပ်ပါ။</p>
</section>`;

const SCRIPT = String.raw`(function () {
  var pendingBackup = null;
  var storeNames = ['creations', 'projects', 'studio_sessions', 'studio_handoffs', 'session_results'];
  function byId(id) { return document.getElementById(id); }
  function message(text, isError) {
    var node = byId('backup-recovery-message');
    if (!node) return;
    node.textContent = text;
    node.style.color = isError ? 'var(--error)' : 'var(--success)';
  }
  function bytes(value) {
    if (typeof value !== 'number' || !isFinite(value) || value < 0) return 'မရရှိနိုင်ပါ';
    if (value < 1024) return value + ' B';
    if (value < 1024 * 1024) return (value / 1024).toFixed(1) + ' KB';
    if (value < 1024 * 1024 * 1024) return (value / (1024 * 1024)).toFixed(1) + ' MB';
    return (value / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  }
  function refreshStatus() {
    if (!window.AICS_STORAGE_PERSISTENCE) {
      message('Storage အခြေအနေ စစ်ဆေးမှု မရနိုင်ပါ။', true);
      return Promise.resolve();
    }
    return window.AICS_STORAGE_PERSISTENCE.getStatus().then(function (status) {
      var persist = byId('backup-persist-status');
      var note = byId('backup-storage-note');
      if (persist) {
        if (!status.supported) persist.textContent = 'ဤ Browser တွင် Storage API မပံ့ပိုးပါ';
        else if (status.persisted === true) persist.textContent = 'ထိန်းသိမ်းခွင့် ရရှိထားသည်';
        else if (status.persisted === false) persist.textContent = 'ထိန်းသိမ်းခွင့် မရရှိသေးပါ';
        else persist.textContent = 'အခြေအနေ မသိရှိနိုင်ပါ';
      }
      if (byId('backup-usage')) byId('backup-usage').textContent = bytes(status.usage);
      if (byId('backup-quota')) byId('backup-quota').textContent = bytes(status.quota);
      if (note) note.textContent = status.persisted === true
        ? 'Browser က ဤ Storage ကို ပုံမှန်ရှင်းလင်းမှုမှ ကာကွယ်ပေးရန် ခွင့်ပြုထားသည်။'
        : 'Browser ၏ Storage ထိန်းသိမ်းခွင့် မရသေးပါ သို့မဟုတ် မစစ်ဆေးနိုင်ပါ။ Backup ကို ပုံမှန်ထုတ်ယူထားပါ။';
    }).catch(function () {
      message('Storage အခြေအနေကို မဖတ်နိုင်ပါ။', true);
    });
  }
  var refresh = byId('backup-refresh');
  if (refresh) refresh.addEventListener('click', function () {
    refresh.disabled = true;
    refreshStatus().then(function () { refresh.disabled = false; });
  });
  var persist = byId('backup-persist');
  if (persist) persist.addEventListener('click', function () {
    if (!window.AICS_STORAGE_PERSISTENCE) { message('Storage API မရရှိပါ။', true); return; }
    persist.disabled = true;
    window.AICS_STORAGE_PERSISTENCE.requestPersistence().then(function (result) {
      if (result.granted) message(result.alreadyPersisted ? 'ဒေတာထိန်းသိမ်းခွင့် ရရှိပြီးသားဖြစ်သည်။' : 'ဒေတာထိန်းသိမ်းခွင့် ရရှိပါပြီ။');
      else message(result.supported ? 'Browser က ထိန်းသိမ်းခွင့် မပေးခဲ့ပါ။ Backup ကို ပုံမှန်ထုတ်ယူပါ။' : 'ဤ Browser တွင် ထိုလုပ်ဆောင်ချက် မပံ့ပိုးပါ။', true);
      return refreshStatus();
    }).catch(function () {
      message('ထိန်းသိမ်းခွင့် တောင်းဆိုမှု မအောင်မြင်ပါ။', true);
    }).then(function () { persist.disabled = false; });
  });
  var exportButton = byId('backup-export');
  if (exportButton) exportButton.addEventListener('click', function () {
    if (!window.AICS_BACKUP) { message('Backup လုပ်ဆောင်ချက် မရရှိပါ။', true); return; }
    exportButton.disabled = true;
    window.AICS_BACKUP.download().then(function (result) {
      message('Backup ဖိုင် ထုတ်ယူပြီးပါပြီ — ' + result.filename);
    }).catch(function () {
      message('Backup ဖိုင် ထုတ်ယူ၍ မရပါ။ Browser Storage ကို စစ်ဆေးပါ။', true);
    }).then(function () { exportButton.disabled = false; });
  });
  var fileInput = byId('backup-file');
  var preview = byId('backup-preview');
  var restoreButton = byId('backup-restore');
  if (fileInput) fileInput.addEventListener('change', function () {
    pendingBackup = null;
    if (restoreButton) restoreButton.disabled = true;
    if (preview) preview.hidden = true;
    var file = fileInput.files && fileInput.files[0];
    if (!file) return;
    if (!window.AICS_BACKUP_IMPORT) { message('Backup Import လုပ်ဆောင်ချက် မရရှိပါ။', true); return; }
    message('Backup ဖိုင်ကို စစ်ဆေးနေသည်…');
    window.AICS_BACKUP_IMPORT.validateFile(file).then(function (result) {
      pendingBackup = result.backup;
      if (byId('backup-preview-summary')) {
        byId('backup-preview-summary').textContent =
          'ဖိုင်: ' + file.name + ' · Export: ' + result.backup.exportedAt +
          ' · Schema: ' + result.backup.schemaVersion + ' · စုစုပေါင်း: ' + result.recordCount + ' ခု';
      }
      if (byId('backup-preview-counts')) {
        byId('backup-preview-counts').textContent = storeNames.map(function (name) {
          return name + ': ' + result.backup.stores[name].length;
        }).join(' · ');
      }
      if (preview) preview.hidden = false;
      if (restoreButton) restoreButton.disabled = false;
      message('Backup ဖိုင် မှန်ကန်ကြောင်း စစ်ဆေးပြီးပါပြီ။ Restore မလုပ်မီ အစားထိုးမည့်ဒေတာကို သေချာစစ်ပါ။');
    }).catch(function () {
      pendingBackup = null;
      if (preview) preview.hidden = true;
      message('Backup ဖိုင်ကို စစ်ဆေး၍ မရပါ။ မှန်ကန်သော ဤ App Backup ဖိုင်ကို ရွေးပါ။', true);
    });
  });
  if (restoreButton) restoreButton.addEventListener('click', function () {
    if (!pendingBackup || !window.AICS_BACKUP_IMPORT) return;
    var count = storeNames.reduce(function (total, name) {
      return total + pendingBackup.stores[name].length;
    }, 0);
    if (!window.confirm('လက်ရှိ User ၏ ဒေတာများကို Backup ထဲရှိ ဒေတာ ' + count + ' ခုဖြင့် အစားထိုးမည်။ ဆက်လုပ်မလား?')) return;
    restoreButton.disabled = true;
    window.AICS_BACKUP_IMPORT.restore(pendingBackup, { confirmReplace: true }).then(function (result) {
      pendingBackup = null;
      if (preview) preview.hidden = true;
      if (fileInput) fileInput.value = '';
      message('Restore အောင်မြင်ပါသည်။ ပြန်ထည့်သွင်းထားသော ဒေတာ ' + result.importedCount + ' ခု။');
      return refreshStatus();
    }).catch(function () {
      message('Restore မအောင်မြင်ပါ။ မူလဒေတာများကို မပြောင်းလဲဘဲ ထားရှိရန် Transaction ကို ပယ်ဖျက်ထားပါသည်။', true);
      restoreButton.disabled = false;
    });
  });
  refreshStatus();
})();`;

export function backupRecoveryPanelHtml() {
  return PANEL_HTML;
}

export function backupRecoveryUiScript() {
  return SCRIPT;
}
