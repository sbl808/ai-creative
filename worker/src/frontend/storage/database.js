const SCRIPT = String.raw`function __aicsDbOpen() {
  return new Promise(function (resolve, reject) {
    if (window.__aicsDb) return resolve(window.__aicsDb);
    if (!window.indexedDB) {
      reject(__aicsStorageError('no_indexeddb'));
      return;
    }
    var req;
    try {
      req = window.indexedDB.open('aics_creations_v1', 3);
    } catch (error) {
      reject(__aicsStorageError('indexeddb_open_failed', error));
      return;
    }
    req.onupgradeneeded = function () {
      var db = req.result;

      // Existing stores are deliberately preserved during schema upgrades.
      if (!db.objectStoreNames.contains('creations')) {
        var creations = db.createObjectStore('creations', { keyPath: 'id' });
        creations.createIndex('user_id', 'user_id', { unique: false });
      }
      if (!db.objectStoreNames.contains('projects')) {
        var projects = db.createObjectStore('projects', { keyPath: 'id' });
        projects.createIndex('user_id', 'user_id', { unique: false });
      }

      // One record per Studio session. Compound index supports owner-scoped
      // newest-first pagination without loading every user's sessions.
      if (!db.objectStoreNames.contains('studio_sessions')) {
        var sessions = db.createObjectStore('studio_sessions', { keyPath: 'id' });
        sessions.createIndex('ownerId', 'ownerId', { unique: false });
        sessions.createIndex('updatedAt', 'updatedAt', { unique: false });
        sessions.createIndex('owner_updatedAt', ['ownerId', 'updatedAt'], { unique: false });
      }

      // Results are separate so large media payloads do not rewrite session
      // metadata and drafts on every save.
      if (!db.objectStoreNames.contains('session_results')) {
        var results = db.createObjectStore('session_results', { keyPath: 'id' });
        results.createIndex('ownerId', 'ownerId', { unique: false });
        results.createIndex('sessionId', 'sessionId', { unique: false });
        results.createIndex('session_createdAt', ['sessionId', 'createdAt'], { unique: false });
        results.createIndex('owner_sessionId', ['ownerId', 'sessionId'], { unique: false });
      }
    };
    req.onsuccess = function () {
      var db = req.result;
      db.onversionchange = function () {
        try { db.close(); } catch (error) {}
        if (window.__aicsDb === db) window.__aicsDb = null;
      };
      window.__aicsDb = db;
      resolve(db);
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
