const SCRIPT = String.raw`function __aicsDraftStudio(value) {
  var studio = String(value || '').trim().toLowerCase();
  if (['content', 'short', 'image', 'voice', 'shop'].indexOf(studio) === -1) {
    throw __aicsStorageError('invalid_draft_studio');
  }
  return studio;
}

function __aicsDraftObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function __aicsDraftId() {
  return 'd_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

function __aicsDraftTransactionError(transaction) {
  return __aicsStorageError('indexeddb_transaction_failed', transaction.error);
}

window.AICS_DRAFTS = {
  save: function (input) {
    var ownerId;
    try { ownerId = __aicsRequireUserId(); }
    catch (error) { return Promise.reject(error); }

    input = input || {};
    var studio;
    try { studio = __aicsDraftStudio(input.studio); }
    catch (error) { return Promise.reject(error); }
    if (!__aicsDraftObject(input.data)) return Promise.reject(__aicsStorageError('invalid_draft_data'));

    var draftVersion = Number(input.draftVersion);
    if (!isFinite(draftVersion) || draftVersion < 1) draftVersion = 1;
    draftVersion = Math.floor(draftVersion);

    return __aicsDbOpen().then(function (db) {
      return new Promise(function (resolve, reject) {
        var transaction;
        try { transaction = db.transaction('drafts', 'readwrite'); }
        catch (error) { reject(__aicsStorageError('indexeddb_transaction_failed', error)); return; }

        var settled = false;
        var store;
        var existingRequest;
        var saved = null;
        function fail(error) {
          if (settled) return;
          settled = true;
          try { transaction.abort(); } catch (abortError) {}
          reject(error);
        }

        try {
          store = transaction.objectStore('drafts');
          existingRequest = store.index('owner_studio').get([ownerId, studio]);
        } catch (error) {
          fail(__aicsStorageError('indexeddb_read_failed', error));
          return;
        }

        existingRequest.onsuccess = function () {
          if (settled) return;
          var existing = existingRequest.result;
          var now = new Date().toISOString();
          saved = {
            id: existing && existing.id ? existing.id : __aicsDraftId(),
            ownerId: ownerId,
            studio: studio,
            draftVersion: draftVersion,
            data: input.data,
            createdAt: existing && existing.createdAt ? existing.createdAt : now,
            updatedAt: now
          };
          try { store.put(saved); }
          catch (error) { fail(__aicsStorageError('indexeddb_write_failed', error)); }
        };
        existingRequest.onerror = function () {
          fail(__aicsStorageError('indexeddb_read_failed', existingRequest.error));
        };

        transaction.oncomplete = function () {
          if (!settled) { settled = true; resolve(saved); }
        };
        transaction.onerror = function () {
          if (!settled) { settled = true; reject(__aicsDraftTransactionError(transaction)); }
        };
        transaction.onabort = function () {
          if (!settled) { settled = true; reject(__aicsStorageError('indexeddb_transaction_aborted', transaction.error)); }
        };
      });
    });
  },

  get: function (studioValue) {
    var ownerId = __aicsUserId();
    if (!ownerId) return Promise.resolve(null);
    var studio;
    try { studio = __aicsDraftStudio(studioValue); }
    catch (error) { return Promise.reject(error); }

    return __aicsDbOpen().then(function (db) {
      return new Promise(function (resolve, reject) {
        var transaction;
        try { transaction = db.transaction('drafts', 'readonly'); }
        catch (error) { reject(__aicsStorageError('indexeddb_transaction_failed', error)); return; }

        var settled = false;
        var record = null;
        var request;
        try { request = transaction.objectStore('drafts').index('owner_studio').get([String(ownerId), studio]); }
        catch (error) { reject(__aicsStorageError('indexeddb_read_failed', error)); return; }
        request.onsuccess = function () {
          var value = request.result;
          if (value && String(value.ownerId || '') === String(ownerId)) record = value;
        };
        request.onerror = function () {
          if (!settled) { settled = true; reject(__aicsStorageError('indexeddb_read_failed', request.error)); }
        };
        transaction.oncomplete = function () {
          if (!settled) { settled = true; resolve(record); }
        };
        transaction.onerror = function () {
          if (!settled) { settled = true; reject(__aicsDraftTransactionError(transaction)); }
        };
        transaction.onabort = function () {
          if (!settled) { settled = true; reject(__aicsStorageError('indexeddb_transaction_aborted', transaction.error)); }
        };
      });
    });
  },

  list: function () {
    var ownerId = __aicsUserId();
    if (!ownerId) return Promise.resolve([]);

    return __aicsDbOpen().then(function (db) {
      return new Promise(function (resolve, reject) {
        var transaction;
        try { transaction = db.transaction('drafts', 'readonly'); }
        catch (error) { reject(__aicsStorageError('indexeddb_transaction_failed', error)); return; }

        var settled = false;
        var items = [];
        var request;
        try { request = transaction.objectStore('drafts').index('ownerId').getAll(String(ownerId)); }
        catch (error) { reject(__aicsStorageError('indexeddb_read_failed', error)); return; }
        request.onsuccess = function () {
          items = (request.result || []).filter(function (record) {
            return String(record.ownerId || '') === String(ownerId);
          });
        };
        request.onerror = function () {
          if (!settled) { settled = true; reject(__aicsStorageError('indexeddb_read_failed', request.error)); }
        };
        transaction.oncomplete = function () {
          if (settled) return;
          settled = true;
          items.sort(function (a, b) {
            return String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''));
          });
          resolve(items);
        };
        transaction.onerror = function () {
          if (!settled) { settled = true; reject(__aicsDraftTransactionError(transaction)); }
        };
        transaction.onabort = function () {
          if (!settled) { settled = true; reject(__aicsStorageError('indexeddb_transaction_aborted', transaction.error)); }
        };
      });
    });
  },

  remove: function (studioValue) {
    var ownerId;
    try { ownerId = __aicsRequireUserId(); }
    catch (error) { return Promise.reject(error); }
    var studio;
    try { studio = __aicsDraftStudio(studioValue); }
    catch (error) { return Promise.reject(error); }

    return __aicsDbOpen().then(function (db) {
      return new Promise(function (resolve, reject) {
        var transaction;
        try { transaction = db.transaction('drafts', 'readwrite'); }
        catch (error) { reject(__aicsStorageError('indexeddb_transaction_failed', error)); return; }

        var settled = false;
        var store;
        var request;
        var removed = false;
        function fail(error) {
          if (settled) return;
          settled = true;
          try { transaction.abort(); } catch (abortError) {}
          reject(error);
        }

        try {
          store = transaction.objectStore('drafts');
          request = store.index('owner_studio').get([ownerId, studio]);
        } catch (error) {
          fail(__aicsStorageError('indexeddb_read_failed', error));
          return;
        }
        request.onsuccess = function () {
          var record = request.result;
          if (!record) return;
          if (String(record.ownerId || '') !== ownerId) { fail(__aicsStorageError('forbidden')); return; }
          try { store.delete(record.id); removed = true; }
          catch (error) { fail(__aicsStorageError('indexeddb_write_failed', error)); }
        };
        request.onerror = function () {
          fail(__aicsStorageError('indexeddb_read_failed', request.error));
        };
        transaction.oncomplete = function () {
          if (!settled) { settled = true; resolve(removed); }
        };
        transaction.onerror = function () {
          if (!settled) { settled = true; reject(__aicsDraftTransactionError(transaction)); }
        };
        transaction.onabort = function () {
          if (!settled) { settled = true; reject(__aicsStorageError('indexeddb_transaction_aborted', transaction.error)); }
        };
      });
    });
  }
};
`;

export function draftsRepositoryScript() {
  return SCRIPT;
}
