import { STORAGE_SCHEMA_VERSION } from './schema/version.js';
import { schemaMigrationsScript } from './schema/migrations.js';

const SCRIPT = String.raw`${schemaMigrationsScript()}
function __aicsDbOpen() {
  return new Promise(function (resolve, reject) {
    if (window.__aicsDb) return resolve(window.__aicsDb);
    if (!window.indexedDB) { reject(__aicsStorageError('no_indexeddb')); return; }
    var req;
    try { req = window.indexedDB.open('aics_creations_v1', ${STORAGE_SCHEMA_VERSION});
    } catch (error) { reject(__aicsStorageError('indexeddb_open_failed', error)); return; }
    req.onupgradeneeded = function (event) {
      try { __aicsRunSchemaMigrations(req.result, event.oldVersion, event.newVersion); }
      catch (error) { try { req.transaction.abort(); } catch (abortError) {} reject(__aicsStorageError('indexeddb_migration_failed', error)); }
    };
    req.onsuccess = function () {
      var db = req.result;
      db.onversionchange = function () { try { db.close(); } catch (error) {} if (window.__aicsDb === db) window.__aicsDb = null; };
      window.__aicsDb = db; resolve(db);
    };
    req.onerror = function () { reject(__aicsStorageError('indexeddb_open_failed', req.error)); };
    req.onblocked = function () { reject(__aicsStorageError('indexeddb_open_blocked')); };
  });
}
`;

export function databaseScript() { return SCRIPT; }
