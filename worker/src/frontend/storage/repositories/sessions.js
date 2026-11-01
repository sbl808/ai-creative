const SCRIPT = String.raw`function __aicsSessionId() {
  return 's_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 11);
}

function __aicsSessionCloneObject(value, fallback) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fallback;
  return value;
}

function __aicsSessionCursorEncode(record) {
  return encodeURIComponent(JSON.stringify({
    updatedAt: String(record.updatedAt || ''),
    id: String(record.id || '')
  }));
}

function __aicsSessionCursorDecode(value) {
  if (!value) return null;
  try {
    var parsed = JSON.parse(decodeURIComponent(String(value)));
    if (!parsed || typeof parsed.updatedAt !== 'string' || typeof parsed.id !== 'string' || !parsed.id) {
      throw new Error('invalid_cursor');
    }
    return parsed;
  } catch (error) {
    throw __aicsStorageError('invalid_cursor', error);
  }
}

function __aicsSessionTransactionFailure(transaction, settled, reject) {
  if (settled.value) return;
  settled.value = true;
  reject(__aicsStorageError('indexeddb_transaction_failed', transaction.error));
}

window.AICS_SESSIONS = {
  create: function (input) {
    var ownerId;
    try { ownerId = __aicsRequireUserId(); }
    catch (error) { return Promise.reject(error); }

    input = input || {};
    var studio = String(input.studio || '').trim().toUpperCase().slice(0, 40);
    if (!studio) return Promise.reject(__aicsStorageError('missing_studio'));

    var now = new Date().toISOString();
    var session = {
      id: __aicsSessionId(),
      ownerId: ownerId,
      studio: studio,
      title: String(input.title || 'Untitled').trim().slice(0, 120) || 'Untitled',
      createdAt: now,
      updatedAt: now,
      status: 'active',
      draft: __aicsSessionCloneObject(input.draft, {})
    };

    return __aicsDbOpen().then(function (db) {
      return new Promise(function (resolve, reject) {
        var transaction;
        try { transaction = db.transaction('studio_sessions', 'readwrite'); }
        catch (error) { reject(__aicsStorageError('indexeddb_transaction_failed', error)); return; }

        var settled = { value: false };
        transaction.oncomplete = function () {
          if (!settled.value) { settled.value = true; resolve(session); }
        };
        transaction.onerror = function () {
          __aicsSessionTransactionFailure(transaction, settled, reject);
        };
        transaction.onabort = function () {
          if (!settled.value) {
            settled.value = true;
            reject(__aicsStorageError('indexeddb_transaction_aborted', transaction.error));
          }
        };

        try { transaction.objectStore('studio_sessions').add(session); }
        catch (error) {
          if (!settled.value) {
            settled.value = true;
            try { transaction.abort(); } catch (abortError) {}
            reject(__aicsStorageError('indexeddb_write_failed', error));
          }
        }
      });
    });
  },

  get: function (id) {
    var ownerId = __aicsUserId();
    if (!ownerId) return Promise.resolve(null);
    id = String(id || '');
    if (!id) return Promise.resolve(null);

    return __aicsDbOpen().then(function (db) {
      return new Promise(function (resolve, reject) {
        var transaction;
        try { transaction = db.transaction('studio_sessions', 'readonly'); }
        catch (error) { reject(__aicsStorageError('indexeddb_transaction_failed', error)); return; }

        var settled = { value: false };
        var result = null;
        var request;
        try { request = transaction.objectStore('studio_sessions').get(id); }
        catch (error) { reject(__aicsStorageError('indexeddb_read_failed', error)); return; }

        request.onsuccess = function () {
          var record = request.result;
          if (record && String(record.ownerId || '') === String(ownerId)) result = record;
        };
        request.onerror = function () {
          if (!settled.value) {
            settled.value = true;
            reject(__aicsStorageError('indexeddb_read_failed', request.error));
          }
        };
        transaction.oncomplete = function () {
          if (!settled.value) { settled.value = true; resolve(result); }
        };
        transaction.onerror = function () {
          __aicsSessionTransactionFailure(transaction, settled, reject);
        };
        transaction.onabort = function () {
          if (!settled.value) {
            settled.value = true;
            reject(__aicsStorageError('indexeddb_transaction_aborted', transaction.error));
          }
        };
      });
    });
  },

  list: function (options) {
    var ownerId = __aicsUserId();
    if (!ownerId) return Promise.resolve({ items: [], nextCursor: null, hasMore: false });

    options = options || {};
    var limit = Number(options.limit);
    if (!isFinite(limit)) limit = 10;
    limit = Math.max(1, Math.min(50, Math.floor(limit)));

    var decodedCursor;
    try { decodedCursor = __aicsSessionCursorDecode(options.cursor); }
    catch (error) { return Promise.reject(error); }

    return __aicsDbOpen().then(function (db) {
      return new Promise(function (resolve, reject) {
        var transaction;
        try { transaction = db.transaction('studio_sessions', 'readonly'); }
        catch (error) { reject(__aicsStorageError('indexeddb_transaction_failed', error)); return; }

        var store;
        var index;
        var range;
        try {
          store = transaction.objectStore('studio_sessions');
          index = store.index('owner_updatedAt');
          range = window.IDBKeyRange.bound([String(ownerId), ''], [String(ownerId), '\\uffff']);
        } catch (error) {
          reject(__aicsStorageError('indexeddb_read_failed', error));
          return;
        }

        var items = [];
        var settled = { value: false };
        var request;
        try { request = index.openCursor(range, 'prev'); }
        catch (error) { reject(__aicsStorageError('indexeddb_read_failed', error)); return; }

        request.onerror = function () {
          if (!settled.value) {
            settled.value = true;
            reject(__aicsStorageError('indexeddb_read_failed', request.error));
          }
        };
        request.onsuccess = function () {
          var cursor = request.result;
          if (!cursor) return;

          if (decodedCursor) {
            var start = decodedCursor;
            decodedCursor = null;
            try {
              cursor.continuePrimaryKey([String(ownerId), start.updatedAt], start.id);
            } catch (error) {
              if (!settled.value) {
                settled.value = true;
                try { transaction.abort(); } catch (abortError) {}
                reject(__aicsStorageError('invalid_cursor', error));
              }
            }
            return;
          }

          if (items.length < limit + 1) items.push(cursor.value);
          if (items.length >= limit + 1) return;
          cursor.continue();
        };

        transaction.oncomplete = function () {
          if (settled.value) return;
          settled.value = true;
          var hasMore = items.length > limit;
          if (hasMore) items.pop();
          resolve({
            items: items,
            nextCursor: hasMore && items.length ? __aicsSessionCursorEncode(items[items.length - 1]) : null,
            hasMore: hasMore
          });
        };
        transaction.onerror = function () {
          __aicsSessionTransactionFailure(transaction, settled, reject);
        };
        transaction.onabort = function () {
          if (!settled.value) {
            settled.value = true;
            reject(__aicsStorageError('indexeddb_transaction_aborted', transaction.error));
          }
        };
      });
    });
  },

  update: function (id, changes) {
    var ownerId;
    try { ownerId = __aicsRequireUserId(); }
    catch (error) { return Promise.reject(error); }
    id = String(id || '');
    if (!id) return Promise.reject(__aicsStorageError('missing_session_id'));
    changes = changes || {};

    return __aicsDbOpen().then(function (db) {
      return new Promise(function (resolve, reject) {
        var transaction;
        try { transaction = db.transaction('studio_sessions', 'readwrite'); }
        catch (error) { reject(__aicsStorageError('indexeddb_transaction_failed', error)); return; }

        var settled = { value: false };
        var updated = null;
        var store = transaction.objectStore('studio_sessions');
        var request;
        function fail(error) {
          if (settled.value) return;
          settled.value = true;
          try { transaction.abort(); } catch (abortError) {}
          reject(error);
        }

        try { request = store.get(id); }
        catch (error) { fail(__aicsStorageError('indexeddb_read_failed', error)); return; }

        request.onsuccess = function () {
          var record = request.result;
          if (!record) { fail(__aicsStorageError('not_found')); return; }
          if (String(record.ownerId || '') !== ownerId) { fail(__aicsStorageError('forbidden')); return; }

          if (Object.prototype.hasOwnProperty.call(changes, 'title')) {
            var title = String(changes.title || '').trim().slice(0, 120);
            if (!title) { fail(__aicsStorageError('missing_title')); return; }
            record.title = title;
          }
          if (Object.prototype.hasOwnProperty.call(changes, 'draft')) {
            if (!changes.draft || typeof changes.draft !== 'object' || Array.isArray(changes.draft)) {
              fail(__aicsStorageError('invalid_draft'));
              return;
            }
            record.draft = changes.draft;
          }
          if (Object.prototype.hasOwnProperty.call(changes, 'status')) {
            var status = String(changes.status || '').trim().toLowerCase();
            if (['active', 'archived'].indexOf(status) === -1) {
              fail(__aicsStorageError('invalid_status'));
              return;
            }
            record.status = status;
          }

          record.updatedAt = new Date().toISOString();
          updated = record;
          try { store.put(record); }
          catch (error) { fail(__aicsStorageError('indexeddb_write_failed', error)); }
        };
        request.onerror = function () { fail(__aicsStorageError('indexeddb_read_failed', request.error)); };
        transaction.oncomplete = function () {
          if (!settled.value) { settled.value = true; resolve(updated); }
        };
        transaction.onerror = function () {
          __aicsSessionTransactionFailure(transaction, settled, reject);
        };
        transaction.onabort = function () {
          if (!settled.value) {
            settled.value = true;
            reject(__aicsStorageError('indexeddb_transaction_aborted', transaction.error));
          }
        };
      });
    });
  },

  remove: function (id) {
    var ownerId;
    try { ownerId = __aicsRequireUserId(); }
    catch (error) { return Promise.reject(error); }
    id = String(id || '');
    if (!id) return Promise.reject(__aicsStorageError('missing_session_id'));

    return __aicsDbOpen().then(function (db) {
      return new Promise(function (resolve, reject) {
        var transaction;
        try { transaction = db.transaction(['studio_sessions', 'session_results'], 'readwrite'); }
        catch (error) { reject(__aicsStorageError('indexeddb_transaction_failed', error)); return; }

        var settled = { value: false };
        var sessions;
        var results;
        var sessionRequest;
        function fail(error) {
          if (settled.value) return;
          settled.value = true;
          try { transaction.abort(); } catch (abortError) {}
          reject(error);
        }

        try {
          sessions = transaction.objectStore('studio_sessions');
          results = transaction.objectStore('session_results');
          sessionRequest = sessions.get(id);
        } catch (error) {
          fail(__aicsStorageError('indexeddb_read_failed', error));
          return;
        }

        sessionRequest.onsuccess = function () {
          var record = sessionRequest.result;
          if (!record) { fail(__aicsStorageError('not_found')); return; }
          if (String(record.ownerId || '') !== ownerId) { fail(__aicsStorageError('forbidden')); return; }

          var resultIndex;
          var resultCursorRequest;
          try {
            resultIndex = results.index('owner_sessionId');
            resultCursorRequest = resultIndex.openCursor(window.IDBKeyRange.only([ownerId, id]));
          } catch (error) {
            fail(__aicsStorageError('indexeddb_read_failed', error));
            return;
          }
          resultCursorRequest.onsuccess = function () {
            var cursor = resultCursorRequest.result;
            if (cursor) {
              cursor.delete();
              cursor.continue();
            }
          };
          resultCursorRequest.onerror = function () {
            fail(__aicsStorageError('indexeddb_read_failed', resultCursorRequest.error));
          };
          try { sessions.delete(id); }
          catch (error) { fail(__aicsStorageError('indexeddb_write_failed', error)); }
        };
        sessionRequest.onerror = function () {
          fail(__aicsStorageError('indexeddb_read_failed', sessionRequest.error));
        };

        transaction.oncomplete = function () {
          if (!settled.value) { settled.value = true; resolve(true); }
        };
        transaction.onerror = function () {
          __aicsSessionTransactionFailure(transaction, settled, reject);
        };
        transaction.onabort = function () {
          if (!settled.value) {
            settled.value = true;
            reject(__aicsStorageError('indexeddb_transaction_aborted', transaction.error));
          }
        };
      });
    });
  }
};
`;

export function sessionsRepositoryScript() {
  return SCRIPT;
}
