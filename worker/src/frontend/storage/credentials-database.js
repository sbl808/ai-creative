const SCRIPT = String.raw`function __aicsCredentialsDbOpen() {
  return new Promise(function (resolve, reject) {
    if (window.__aicsCredentialsDb) return resolve(window.__aicsCredentialsDb);
    if (!window.indexedDB) {
      reject(__aicsStorageError('no_indexeddb'));
      return;
    }
    var request;
    try {
      request = window.indexedDB.open('aics_credentials_v1', 1);
    } catch (error) {
      reject(__aicsStorageError('credentials_indexeddb_open_failed', error));
      return;
    }
    request.onupgradeneeded = function () {
      try {
        var db = request.result;
        if (!db.objectStoreNames.contains('provider_keys')) {
          var store = db.createObjectStore('provider_keys', {
            keyPath: ['accountId', 'provider']
          });
          store.createIndex('accountId', 'accountId', { unique: false });
        }
      } catch (error) {
        try { request.transaction.abort(); } catch (abortError) {}
        reject(__aicsStorageError('credentials_indexeddb_migration_failed', error));
      }
    };
    request.onsuccess = function () {
      var db = request.result;
      db.onversionchange = function () {
        try { db.close(); } catch (error) {}
        if (window.__aicsCredentialsDb === db) window.__aicsCredentialsDb = null;
      };
      window.__aicsCredentialsDb = db;
      resolve(db);
    };
    request.onerror = function () {
      reject(__aicsStorageError('credentials_indexeddb_open_failed', request.error));
    };
    request.onblocked = function () {
      reject(__aicsStorageError('credentials_indexeddb_open_blocked'));
    };
  });
}`;

export function credentialsDatabaseScript() {
  return SCRIPT;
}
