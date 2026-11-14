const SCRIPT = String.raw\`(function () {
  var DEFAULT_LANGUAGE = 'zh-CN';
  var SUPPORTED_LANGUAGES = ['my', 'zh-CN', 'en'];
  function normalizeLanguage(value) {
    var candidate = String(value || DEFAULT_LANGUAGE).trim().replace(/_/g, '-').toLowerCase();
    if (candidate === 'my' || candidate === 'my-mm') return 'my';
    if (candidate === 'zh' || candidate === 'zh-cn') return 'zh-CN';
    if (candidate === 'en' || candidate === 'en-us' || candidate === 'en-gb') return 'en';
    return DEFAULT_LANGUAGE;
  }
  function getLanguage() {
    return __aicsDbOpen().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx, request, result = DEFAULT_LANGUAGE;
        try {
          tx = db.transaction('app_preferences', 'readonly');
          request = tx.objectStore('app_preferences').get('app_language');
        } catch (error) { reject(__aicsStorageError('indexeddb_read_failed', error)); return; }
        request.onsuccess = function () {
          var record = request.result;
          if (record && record.key === 'app_language') result = normalizeLanguage(record.value);
        };
        request.onerror = function () { reject(__aicsStorageError('indexeddb_read_failed', request.error)); };
        tx.oncomplete = function () { resolve(result); };
        tx.onerror = function () { reject(__aicsStorageError('indexeddb_transaction_failed', tx.error)); };
        tx.onabort = function () { reject(__aicsStorageError('indexeddb_transaction_aborted', tx.error)); };
      });
    });
  }
  function setLanguage(value) {
    var language = normalizeLanguage(value);
    return __aicsDbOpen().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx, request;
        try {
          tx = db.transaction('app_preferences', 'readwrite');
          request = tx.objectStore('app_preferences').put({
            key: 'app_language', value: language, updatedAt: new Date().toISOString()
          });
        } catch (error) { reject(__aicsStorageError('indexeddb_write_failed', error)); return; }
        request.onerror = function () { reject(__aicsStorageError('indexeddb_write_failed', request.error)); };
        tx.oncomplete = function () { resolve(language); };
        tx.onerror = function () { reject(__aicsStorageError('indexeddb_transaction_failed', tx.error)); };
        tx.onabort = function () { reject(__aicsStorageError('indexeddb_transaction_aborted', tx.error)); };
      });
    });
  }
  window.AICS_APP_PREFERENCES = Object.freeze({
    getLanguage: getLanguage,
    setLanguage: setLanguage,
    getDefaultLanguage: function () { return DEFAULT_LANGUAGE; },
    getSupportedLanguages: function () { return SUPPORTED_LANGUAGES.slice(); }
  });
})();\`;
export function appPreferencesRepositoryScript() { return SCRIPT; }
