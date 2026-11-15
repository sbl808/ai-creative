const SCRIPT = String.raw`function __aicsValidateUserSettings(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw __aicsStorageError('invalid_user_settings');
  var allowed = ['default_studio', 'default_voice', 'default_model', 'language', 'theme'];
  var settings = {};
  allowed.forEach(function (key) {
    if (Object.prototype.hasOwnProperty.call(input.settings || {}, key)) {
      var value = input.settings[key];
      if (typeof value !== 'string' || value.length > 100) throw __aicsStorageError('invalid_user_settings');
      settings[key] = value;
    }
  });
  var preferences = input.preferences || {};
  if (!preferences || typeof preferences !== 'object' || Array.isArray(preferences)) throw __aicsStorageError('invalid_user_preferences');
  var cleanPreferences = {};
  Object.keys(preferences).forEach(function (key) {
    var value = preferences[key];
    if (!/^[a-zA-Z0-9_]{1,32}$/.test(key) || typeof value !== 'string' || value.length > 500) throw __aicsStorageError('invalid_user_preferences');
    cleanPreferences[key] = value;
  });
  var profile = {};
  if (input.profile !== undefined) {
    if (!input.profile || typeof input.profile !== 'object' || Array.isArray(input.profile)) throw __aicsStorageError('invalid_user_profile');
    if (input.profile.name !== undefined) {
      if (typeof input.profile.name !== 'string' || input.profile.name.length > 60) throw __aicsStorageError('invalid_user_profile');
      profile.name = input.profile.name;
    }
  }
  return { settings: settings, preferences: cleanPreferences, profile: profile };
}
window.AICS_USER_SETTINGS = {
  get: function () {
    var ownerId;
    try { ownerId = __aicsRequireUserId(); } catch (error) { return Promise.reject(error); }
    return __aicsDbOpen().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx;
        try { tx = db.transaction('user_settings', 'readonly'); } catch (error) { reject(__aicsStorageError('indexeddb_transaction_failed', error)); return; }
        var result = null, req;
        try { req = tx.objectStore('user_settings').get(ownerId); } catch (error) { reject(__aicsStorageError('indexeddb_read_failed', error)); return; }
        req.onsuccess = function () { var record = req.result; if (record && String(record.ownerId || '') === ownerId) result = record; };
        req.onerror = function () { reject(__aicsStorageError('indexeddb_read_failed', req.error)); };
        tx.oncomplete = function () { resolve(result); };
        tx.onerror = function () { reject(__aicsStorageError('indexeddb_transaction_failed', tx.error)); };
        tx.onabort = function () { reject(__aicsStorageError('indexeddb_transaction_aborted', tx.error)); };
      });
    });
  },
  save: function (patch) {
    var ownerId, clean;
    try { ownerId = __aicsRequireUserId(); clean = __aicsValidateUserSettings(patch || {}); }
    catch (error) { return Promise.reject(error); }
    return __aicsDbOpen().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx;
        try { tx = db.transaction('user_settings', 'readwrite'); } catch (error) { reject(__aicsStorageError('indexeddb_transaction_failed', error)); return; }
        var settled = false, result = null, store = tx.objectStore('user_settings');
        function fail(error) { if (settled) return; settled = true; try { tx.abort(); } catch (e) {} reject(error); }
        var req;
        try { req = store.get(ownerId); } catch (error) { fail(__aicsStorageError('indexeddb_read_failed', error)); return; }
        req.onsuccess = function () {
          var current = req.result;
          if (current && String(current.ownerId || '') !== ownerId) { fail(__aicsStorageError('forbidden')); return; }
          result = {
            id: ownerId, ownerId: ownerId,
            profile: Object.assign({}, current && current.profile || {}, clean.profile),
            settings: Object.assign({}, current && current.settings || {}, clean.settings),
            preferences: Object.assign({}, current && current.preferences || {}, clean.preferences),
            updatedAt: new Date().toISOString()
          };
          try { store.put(result); } catch (error) { fail(__aicsStorageError('indexeddb_write_failed', error)); }
        };
        req.onerror = function () { fail(__aicsStorageError('indexeddb_read_failed', req.error)); };
        tx.oncomplete = function () { if (!settled) { settled = true; resolve(result); } };
        tx.onerror = function () { if (!settled) { settled = true; reject(__aicsStorageError('indexeddb_transaction_failed', tx.error)); } };
        tx.onabort = function () { if (!settled) { settled = true; reject(__aicsStorageError('indexeddb_transaction_aborted', tx.error)); } };
      });
    });
  },
  remove: function () {
    var ownerId;
    try { ownerId = __aicsRequireUserId(); } catch (error) { return Promise.reject(error); }
    return __aicsDbOpen().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx;
        try { tx = db.transaction('user_settings', 'readwrite'); } catch (error) { reject(__aicsStorageError('indexeddb_transaction_failed', error)); return; }
        var settled = false, store = tx.objectStore('user_settings'), req;
        try { req = store.get(ownerId); } catch (error) { reject(__aicsStorageError('indexeddb_read_failed', error)); return; }
        req.onsuccess = function () { var record = req.result; if (record && String(record.ownerId || '') === ownerId) store.delete(ownerId); };
        req.onerror = function () { if (!settled) { settled = true; reject(__aicsStorageError('indexeddb_read_failed', req.error)); } };
        tx.oncomplete = function () { if (!settled) { settled = true; resolve(true); } };
        tx.onerror = function () { if (!settled) { settled = true; reject(__aicsStorageError('indexeddb_transaction_failed', tx.error)); } };
        tx.onabort = function () { if (!settled) { settled = true; reject(__aicsStorageError('indexeddb_transaction_aborted', tx.error)); } };
      });
    });
  }
};`;
export function userSettingsRepositoryScript() { return SCRIPT; }
