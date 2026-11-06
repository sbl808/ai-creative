import { BACKUP_EXPORT_VERSION, BACKUP_FORMAT_ID, BACKUP_STORE_NAMES } from './format.js';
import { STORAGE_SCHEMA_VERSION } from '../schema/version.js';

const OWNER_INDEX_BY_STORE = Object.freeze({
  creations: 'user_id',
  projects: 'user_id',
  studio_sessions: 'ownerId',
  studio_handoffs: 'ownerId',
  session_results: 'ownerId',
  ideas: 'ownerId',
  drafts: 'ownerId'
});

const SCRIPT = String.raw`window.AICS_BACKUP = (function () {
  var storeNames = ${JSON.stringify(BACKUP_STORE_NAMES)};
  var ownerIndexes = ${JSON.stringify(OWNER_INDEX_BY_STORE)};
  var formatId = ${JSON.stringify(BACKUP_FORMAT_ID)};
  var exportVersion = ${BACKUP_EXPORT_VERSION};
  var schemaVersion = ${STORAGE_SCHEMA_VERSION};

  function exportJson() {
    var ownerId;
    try { ownerId = __aicsRequireUserId(); }
    catch (error) { return Promise.reject(error); }

    return __aicsDbOpen().then(function (db) {
      return new Promise(function (resolve, reject) {
        var transaction;
        try { transaction = db.transaction(storeNames, 'readonly'); }
        catch (error) { reject(__aicsStorageError('backup_read_failed', error)); return; }

        var records = {};
        var settled = false;
        function fail(code, cause) {
          if (settled) return;
          settled = true;
          try { transaction.abort(); } catch (abortError) {}
          reject(__aicsStorageError(code, cause));
        }

        storeNames.forEach(function (storeName) {
          var request;
          try {
            request = transaction.objectStore(storeName)
              .index(ownerIndexes[storeName])
              .getAll(String(ownerId));
          } catch (error) {
            fail('backup_read_failed', error);
            return;
          }
          request.onsuccess = function () {
            records[storeName] = request.result || [];
          };
          request.onerror = function () {
            fail('backup_read_failed', request.error);
          };
        });

        transaction.oncomplete = function () {
          if (settled) return;
          try {
            var snapshot = {};
            storeNames.forEach(function (storeName) {
              snapshot[storeName] = records[storeName] || [];
            });
            var exportedAt = new Date().toISOString();
            var envelope = {
              format: formatId,
              exportVersion: exportVersion,
              schemaVersion: schemaVersion,
              exportedAt: exportedAt,
              stores: snapshot
            };
            settled = true;
            resolve(JSON.stringify(envelope, null, 2));
          } catch (error) {
            fail('backup_serialization_failed', error);
          }
        };
        transaction.onerror = function () {
          fail('backup_read_failed', transaction.error);
        };
        transaction.onabort = function () {
          if (!settled) {
            settled = true;
            reject(__aicsStorageError('backup_read_failed', transaction.error));
          }
        };
      });
    }).catch(function (error) {
      if (error && error.code) throw error;
      throw __aicsStorageError('backup_read_failed', error);
    });
  }

  function download() {
    return exportJson().then(function (json) {
      if (typeof Blob !== 'function' || !window.URL || !window.URL.createObjectURL ||
          !window.document || !window.document.createElement) {
        throw __aicsStorageError('backup_download_unavailable');
      }
      var blob = new Blob([json], { type: 'application/json;charset=utf-8' });
      var url = window.URL.createObjectURL(blob);
      var datePart = new Date().toISOString().replace(/[:.]/g, '-');
      var filename = 'aics-browser-backup-' + datePart + '.json';
      var link = window.document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      window.document.body.appendChild(link);
      try {
        link.click();
      } finally {
        window.document.body.removeChild(link);
        window.setTimeout(function () { window.URL.revokeObjectURL(url); }, 1000);
      }
      return { filename: filename };
    }).catch(function (error) {
      if (error && error.code) throw error;
      throw __aicsStorageError('backup_download_failed', error);
    });
  }

  return {
    exportJson: exportJson,
    download: download
  };
})();`;

export function backupExportScript() {
  return SCRIPT;
}
