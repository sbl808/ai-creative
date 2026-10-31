const SCRIPT = String.raw`function __aicsDbOpen() {
  return new Promise(function (resolve, reject) {
    if (window.__aicsDb) return resolve(window.__aicsDb);
    if (!window.indexedDB) {
      reject(__aicsStorageError('no_indexeddb'));
      return;
    }
    var req;
    try {
      req = window.indexedDB.open('aics_creations_v1', 1);
    } catch (error) {
      reject(__aicsStorageError('indexeddb_open_failed', error));
      return;
    }
    req.onupgradeneeded = function () {
      var db = req.result;
      if (!db.objectStoreNames.contains('creations')) {
        var store = db.createObjectStore('creations', { keyPath: 'id' });
        store.createIndex('user_id', 'user_id', { unique: false });
      }
    };
    req.onsuccess = function () {
      window.__aicsDb = req.result;
      resolve(req.result);
    };
    req.onerror = function () {
      reject(__aicsStorageError('indexeddb_open_failed', req.error));
    };
    req.onblocked = function () {
      reject(__aicsStorageError('indexeddb_open_blocked'));
    };
  });
}`;

export function databaseScript() {
  return SCRIPT;
}
