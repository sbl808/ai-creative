const PANEL = `
<section class="panel" id="legacyIdeaMigration">
  <h2>အရင် Idea များ Import လုပ်ရန်</h2>
  <p class="muted small">ယခင် `aics_ideas_v1` Database ထဲရှိ လက်ရှိ Login User ပိုင် Idea များကိုသာ ပြသပါမည်။ Category ကို ကိုယ်တိုင်ရွေးပြီး Import လုပ်ရပါမည်။ မူလဒေတာကို မဖျက်ပါ။</p>
  <div class="actions"><button type="button" class="secondary" id="legacyIdeaScan">အရင် Idea များ စစ်ဆေးရန်</button></div>
  <div id="legacyIdeaStatus" class="status" role="status" aria-live="polite"></div>
  <div id="legacyIdeaList"></div>
</section>`;

const SCRIPT = String.raw`(function () {
  var panel = document.getElementById('legacyIdeaMigration');
  if (!panel) return;
  var scanButton = document.getElementById('legacyIdeaScan');
  var status = document.getElementById('legacyIdeaStatus');
  var list = document.getElementById('legacyIdeaList');
  var records = [];
  function say(text, error) {
    status.textContent = text;
    status.className = 'status' + (error ? ' error' : '');
  }
  function ownerIdFromToken() {
    try {
      var token = localStorage.getItem('aics_token') || '';
      var part = token.split('.')[1] || '';
      part = part.replace(/-/g, '+').replace(/_/g, '/');
      while (part.length % 4) part += '=';
      var payload = JSON.parse(atob(part));
      return String(payload.sub || payload.user_id || '');
    } catch (error) { return ''; }
  }
  function openLegacyDatabase() {
    if (!window.indexedDB || typeof window.indexedDB.databases !== 'function') {
      return Promise.reject(new Error('legacy_database_discovery_unavailable'));
    }
    return window.indexedDB.databases().then(function (databases) {
      var exists = databases.some(function (database) {
        return database.name === 'aics_ideas_v1';
      });
      if (!exists) return null;
      return new Promise(function (resolve, reject) {
        var request = window.indexedDB.open('aics_ideas_v1');
        request.onsuccess = function () { resolve(request.result); };
        request.onerror = function () { reject(new Error('legacy_database_open_failed')); };
        request.onblocked = function () { reject(new Error('legacy_database_open_blocked')); };
      });
    });
  }
  function readLegacyIdeas() {
    var ownerId = ownerIdFromToken();
    if (!ownerId) return Promise.reject(new Error('login_required'));
    return openLegacyDatabase().then(function (db) {
      if (!db) return [];
      return new Promise(function (resolve, reject) {
        if (!db.objectStoreNames.contains('ideas')) {
          db.close(); resolve([]); return;
        }
        var transaction = db.transaction('ideas', 'readonly');
        var request = transaction.objectStore('ideas').getAll();
        request.onsuccess = function () {
          records = (request.result || []).filter(function (record) {
            return String(record.user_id || '') === ownerId;
          });
        };
        request.onerror = function () { reject(new Error('legacy_idea_read_failed')); };
        transaction.oncomplete = function () { db.close(); resolve(records); };
        transaction.onerror = function () { db.close(); reject(new Error('legacy_idea_read_failed')); };
        transaction.onabort = function () { db.close(); reject(new Error('legacy_idea_read_failed')); };
      });
    });
  }
  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/&/g, '&amp;')
      .replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function render() {
    if (!records.length) {
      list.textContent = 'ဒီ Login User အတွက် Import လုပ်နိုင်သော အရင် Idea မတွေ့ပါ။';
      return;
    }
    list.innerHTML = records.map(function (record, index) {
      return '<article class="saved-item"><strong>' + escapeHtml(record.title || 'Untitled') +
        '</strong><p>' + escapeHtml(record.concept || '') + '</p>' +
        '<div class="field"><label for="legacyCategory' + index + '">Category ကို ရွေးပါ</label>' +
        '<select id="legacyCategory' + index + '">' +
        '<option value="">ရွေးချယ်ပါ</option><option value="story">Story</option>' +
        '<option value="content">Content</option><option value="short">Short</option>' +
        '<option value="image">Image</option><option value="shop">Shop</option></select></div>' +
        '<div class="actions"><button type="button" data-legacy-import="' + index + '">Import လုပ်ရန်</button></div></article>';
    }).join('');
    list.querySelectorAll('[data-legacy-import]').forEach(function (button) {
      button.addEventListener('click', function () {
        var index = Number(button.getAttribute('data-legacy-import'));
        var record = records[index];
        var select = document.getElementById('legacyCategory' + index);
        var category = select && select.value;
        if (!category) { say('Import မလုပ်မီ Category ကို ရွေးပါ။', true); return; }
        if (!window.AICS_IDEAS || typeof window.AICS_IDEAS.importLegacy !== 'function') {
          say('Idea Import လုပ်ဆောင်ချက် မရရှိပါ။', true); return;
        }
        button.disabled = true;
        window.AICS_IDEAS.importLegacy(record, category).then(function (result) {
          if (result.duplicate) say('ဒီ Idea ကို အရင် Import လုပ်ပြီးသားဖြစ်သည်။');
          else {
            records.splice(index, 1);
            say('Idea ကို Import လုပ်ပြီးပါပြီ။ မူလ Database ထဲက Record ကို မဖျက်ထားပါ။');
            render();
            if (typeof window.AICS_IDEAS.list === 'function') {
              window.AICS_IDEAS.list().then(function (items) {
                var saved = document.getElementById('saved');
                if (saved) saved.textContent = 'သိမ်းထားသော Idea စာရင်းကို ပြန်ဖွင့်ရန် Page ကို Refresh လုပ်ပါ။';
              });
            }
          }
        }).catch(function () {
          button.disabled = false;
          say('ဒီ Idea ကို Import မလုပ်နိုင်ပါ။ Record အချက်အလက်ကို စစ်ဆေးပါ။', true);
        });
      });
    });
  }
  scanButton.addEventListener('click', function () {
    scanButton.disabled = true;
    say('အရင် Database ကို စစ်ဆေးနေသည်…');
    readLegacyIdeas().then(function (items) {
      records = items;
      say('လက်ရှိ User ပိုင် Idea ' + records.length + ' ခု တွေ့ရှိသည်။ Category ကို တစ်ခုချင်း ရွေးပါ။');
      render();
    }).catch(function (error) {
      var message = error.message === 'legacy_database_discovery_unavailable'
        ? 'ဤ Browser တွင် Database စာရင်းစစ်ဆေးမှု မရနိုင်ပါ။ မူလဒေတာကို မပြောင်းထားပါ။'
        : error.message === 'login_required'
          ? 'Login ဝင်ပြီးမှ Import လုပ်နိုင်ပါသည်။'
          : 'အရင် Idea Database ကို ဖတ်မရပါ။ မူလဒေတာကို မပြောင်းထားပါ။';
      say(message, true);
    }).then(function () { scanButton.disabled = false; });
  });
})();`;

export function legacyIdeaMigrationPanelHtml() { return PANEL; }
export function legacyIdeaMigrationScript() { return SCRIPT; }
