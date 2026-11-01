import { databaseScript } from './database.js';
import { storageOwnerScript } from './storage-owner.js';
import { storageErrorsScript } from './storage-errors.js';
import { projectsRepositoryScript } from './repositories/projects.js';
import { sessionsRepositoryScript } from './repositories/sessions.js';
import { sessionResultsRepositoryScript } from './repositories/session-results.js';

const CREATIONS_SCRIPT = String.raw`function __aicsGenId() { return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 9); }
window.AICS_CREATIONS = {
  save: function (rec) {
    var uid;
    try { uid = __aicsRequireUserId(); } catch (e) { return Promise.reject(e); }
    rec = rec || {};
    var now = new Date().toISOString();
    var item = {
      id: rec.id || __aicsGenId(),
      user_id: uid,
      studio: rec.studio || 'UNKNOWN',
      type: String(rec.type || '1'),
      title: rec.title || 'Untitled',
      original_prompt: rec.original_prompt || '',
      ai_output: rec.ai_output || '',
      media_type: rec.media_type || '',
      media_mime: rec.media_mime || '',
      media_data: rec.media_data || '',
      is_favorite: rec.is_favorite ? 1 : 0,
      created_at: rec.created_at || now,
      updated_at: now
    };
    return __aicsDbOpen().then(function (db) {
      return new Promise(function (resolve, reject) {
        var t = db.transaction('creations', 'readwrite');
        var s = t.objectStore('creations');
        var settled = false;
        function fail(error) {
          if (settled) return;
          settled = true;
          try { t.abort(); } catch (e) {}
          reject(error);
        }
        var req = s.get(item.id);
        req.onsuccess = function () {
          var existing = req.result;
          if (existing && String(existing.user_id || '') !== uid) { fail(new Error('forbidden')); return; }
          if (existing && !rec.created_at) item.created_at = existing.created_at || item.created_at;
          try { s.put(item); } catch (e) { fail(e); }
        };
        req.onerror = function () { fail(req.error || new Error('indexeddb_read_failed')); };
        t.oncomplete = function () { if (!settled) { settled = true; resolve(item); } };
        t.onerror = function () { if (!settled) { settled = true; reject(t.error || new Error('indexeddb_transaction_failed')); } };
        t.onabort = function () { if (!settled) { settled = true; reject(t.error || new Error('indexeddb_transaction_aborted')); } };
      });
    });
  },
  list: function () {
    var uid = __aicsUserId();
    if (!uid) return Promise.resolve([]);
    return __aicsDbOpen().then(function (db) {
      return new Promise(function (resolve, reject) {
        var t = db.transaction('creations', 'readonly');
        var req = t.objectStore('creations').index('user_id').getAll(String(uid));
        req.onsuccess = function () {
          var items = req.result || [];
          items.sort(function (a, b) { return ((b.created_at || '') > (a.created_at || '')) ? 1 : (((b.created_at || '') < (a.created_at || '')) ? -1 : 0); });
          resolve(items);
        };
        req.onerror = function () { reject(req.error || new Error('indexeddb_read_failed')); };
      });
    });
  },
  remove: function (id) {
    return __aicsOwnedMutation(id, function (s) { s.delete(id); return true; });
  },
  toggleFav: function (id) {
    return __aicsOwnedMutation(id, function (s, record) {
      record.is_favorite = record.is_favorite ? 0 : 1;
      record.updated_at = new Date().toISOString();
      s.put(record);
      return { favorite: record.is_favorite === 1 };
    });
  }
};
`;

export function clientStorageScript() {
  return [
    databaseScript(),
    storageErrorsScript(),
    storageOwnerScript(),
    CREATIONS_SCRIPT,
    projectsRepositoryScript(),
    sessionsRepositoryScript(),
    sessionResultsRepositoryScript()
  ].join('\\n');
}
