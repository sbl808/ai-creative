const SCRIPT = String.raw`(function () {
  var storeNames = ['creations', 'projects', 'studio_sessions', 'studio_handoffs', 'session_results'];
  var ownerIndexes = {
    creations: 'user_id',
    projects: 'user_id',
    studio_sessions: 'ownerId',
    studio_handoffs: 'ownerId',
    session_results: 'ownerId'
  };

  function restore(backup, options) {
    var ownerId;
    try { ownerId = __aicsRequireUserId(); }
    catch (error) { return Promise.reject(error); }

    options = options || {};
    if (options.confirmReplace !== true) {
      return Promise.reject(__aicsStorageError('backup_restore_confirmation_required'));
    }

    var validation;
    try {
      if (!window.__AICS_VALIDATE_BACKUP ||
          typeof window.__AICS_VALIDATE_BACKUP.validateEnvelope !== 'function') {
        throw __aicsStorageError('backup_validator_unavailable');
      }
      validation = window.__AICS_VALIDATE_BACKUP.validateEnvelope(backup, ownerId);
    } catch (error) {
      if (error && error.code) return Promise.reject(__aicsStorageError(error.code));
      return Promise.reject(__aicsStorageError('backup_validation_failed'));
    }

    return __aicsDbOpen().then(function (db) {
      return new Promise(function (resolve, reject) {
        var transaction;
        try { transaction = db.transaction(storeNames, 'readwrite'); }
        catch (error) {
          reject(__aicsStorageError('backup_restore_transaction_failed'));
          return;
        }

        var settled = false;
        var remainingStores = storeNames.length;
        var removedCount = 0;
        var addedCount = 0;

        function fail(code) {
          if (settled) return;
          settled = true;
          try { transaction.abort(); } catch (abortError) {}
          reject(__aicsStorageError(code));
        }

        function addBackupRecords() {
          if (settled) return;
          try {
            storeNames.forEach(function (storeName) {
              var store = transaction.objectStore(storeName);
              var records = validation.backup.stores[storeName];
              records.forEach(function (record) {
                var request = store.add(record);
                request.onerror = function () {
                  fail('backup_restore_write_failed');
                };
                request.onsuccess = function () {
                  addedCount += 1;
                };
              });
            });
          } catch (error) {
            fail('backup_restore_write_failed');
          }
        }

        function clearOwnerRecords(storeName) {
          var store;
          var request;
          try {
            store = transaction.objectStore(storeName);
            request = store.index(ownerIndexes[storeName])
              .openCursor(window.IDBKeyRange.only(ownerId));
          } catch (error) {
            fail('backup_restore_read_failed');
            return;
          }

          request.onerror = function () {
            fail('backup_restore_read_failed');
          };
          request.onsuccess = function () {
            if (settled) return;
            var cursor = request.result;
            if (cursor) {
              try {
                var deleteRequest = cursor.delete();
                deleteRequest.onerror = function () {
                  fail('backup_restore_delete_failed');
                };
                deleteRequest.onsuccess = function () {
                  removedCount += 1;
                };
                cursor.continue();
              } catch (error) {
                fail('backup_restore_delete_failed');
              }
              return;
            }

            remainingStores -= 1;
            if (remainingStores === 0) addBackupRecords();
          };
        }

        transaction.oncomplete = function () {
          if (settled) return;
          settled = true;
          resolve({
            restored: true,
            mode: 'replace',
            removedCount: removedCount,
            importedCount: addedCount,
            recordCount: validation.recordCount
          });
        };
        transaction.onerror = function () {
          fail('backup_restore_transaction_failed');
        };
        transaction.onabort = function () {
          if (settled) return;
          settled = true;
          reject(__aicsStorageError('backup_restore_aborted'));
        };

        storeNames.forEach(clearOwnerRecords);
      });
    }).catch(function (error) {
      if (error && error.code) throw error;
      throw __aicsStorageError('backup_restore_failed');
    });
  }

  if (!window.AICS_BACKUP_IMPORT) {
    window.AICS_BACKUP_IMPORT = {};
  }
  window.AICS_BACKUP_IMPORT.restore = restore;
})();`;

export function backupRestoreScript() {
  return SCRIPT;
}
