const SCRIPT = String.raw\`function __aicsSessionResultId() {
  return 'sr_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 11);
}

function __aicsSessionResultCursorEncode(record) {
  return encodeURIComponent(JSON.stringify({
    createdAt: String(record.createdAt || ''),
    id: String(record.id || '')
  }));
}

function __aicsSessionResultCursorDecode(value) {
  if (!value) return null;
  try {
    var parsed = JSON.parse(decodeURIComponent(String(value)));
    if (!parsed || typeof parsed.createdAt !== 'string' || typeof parsed.id !== 'string' || !parsed.id) {
      throw new Error('invalid_cursor');
    }
    return parsed;
  } catch (error) {
    throw __aicsStorageError('invalid_cursor', error);
  }
}

function __aicsSessionResultTransactionFailure(transaction, settled, reject) {
  if (settled.value) return;
  settled.value = true;
  reject(__aicsStorageError('indexeddb_transaction_failed', transaction.error));
}

window.AICS_SESSION_RESULTS = {
  create: function (input) {
    var ownerId;
    try { ownerId = __aicsRequireUserId(); }
    catch (error) { return Promise.reject(error); }

    input = input || {};
    var sessionId = String(input.sessionId || '').trim();
    var type = String(input.type || '').trim().toLowerCase().slice(0, 40);
    if (!sessionId) return Promise.reject(__aicsStorageError('missing_session_id'));
    if (!type) return Promise.reject(__aicsStorageError('missing_result_type'));
    if (!Object.prototype.hasOwnProperty.call(input, 'content') || typeof input.content === 'undefined') {
      return Promise.reject(__aicsStorageError('missing_result_content'));
    }

    var now = new Date().toISOString();
    var result = {
      id: __aicsSessionResultId(),
      sessionId: sessionId,
      ownerId: ownerId,
      type: type,
      content: input.content,
      createdAt: now
    };

    return __aicsDbOpen().then(function (db) {
      return new Promise(function (resolve, reject) {
        var transaction;
        try { transaction = db.transaction(['studio_sessions', 'session_results'], 'readwrite'); }
        catch (error) { reject(__aicsStorageError('indexeddb_transaction_failed', error)); return; }

        var settled = { value: false };
        var sessions = transaction.objectStore('studio_sessions');
        var results = transaction.objectStore('session_results');
        var sessionRequest;
        function fail(error) {
          if (settled.value) return;
          settled.value = true;
          try { transaction.abort(); } catch (abortError) {}
          reject(error);
        }

        try { sessionRequest = sessions.get(sessionId); }
        catch (error) { fail(__aicsStorageError('indexeddb_read_failed', error)); return; }

        sessionRequest.onsuccess = function () {
          var session = sessionRequest.result;
          if (!session) { fail(__aicsStorageError('session_not_found')); return; }
          if (String(session.ownerId || '') !== ownerId) { fail(__aicsStorageError('forbidden')); return; }
          try { results.add(result); }
          catch (error) { fail(__aicsStorageError('indexeddb_write_failed', error)); }
        };
        sessionRequest.onerror = function () {
          fail(__aicsStorageError('indexeddb_read_failed', sessionRequest.error));
        };

        transaction.oncomplete = function () {
          if (!settled.value) { settled.value = true; resolve(result); }
        };
        transaction.onerror = function () {
          __aicsSessionResultTransactionFailure(transaction, settled, reject);
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

  get: function (id) {
    var ownerId = __aicsUserId();
    if (!ownerId) return Promise.resolve(null);
    id = String(id || '').trim();
    if (!id) return Promise.resolve(null);

    return __aicsDbOpen().then(function (db) {
      return new Promise(function (resolve, reject) {
        var transaction;
        try { transaction = db.transaction('session_results', 'readonly'); }
        catch (error) { reject(__aicsStorageError('indexeddb_transaction_failed', error)); return; }

        var settled = { value: false };
        var record = null;
        var request;
        try { request = transaction.objectStore('session_results').get(id); }
        catch (error) { reject(__aicsStorageError('indexeddb_read_failed', error)); return; }

        request.onsuccess = function () {
          var value = request.result;
          if (value && String(value.ownerId || '') === String(ownerId)) record = value;
        };
        request.onerror = function () {
          if (!settled.value) {
            settled.value = true;
            reject(__aicsStorageError('indexeddb_read_failed', request.error));
          }
        };
        transaction.oncomplete = function () {
          if (!settled.value) { settled.value = true; resolve(record); }
        };
        transaction.onerror = function () {
          __aicsSessionResultTransactionFailure(transaction, settled, reject);
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
    var sessionId = String(options.sessionId || '').trim();
    if (!sessionId) return Promise.reject(__aicsStorageError('missing_session_id'));

    var limit = Number(options.limit);
    if (!isFinite(limit)) limit = 50;
    limit = Math.max(1, Math.min(100, Math.floor(limit)));

    var decodedCursor;
    try { decodedCursor = __aicsSessionResultCursorDecode(options.cursor); }
    catch (error) { return Promise.reject(error); }

    return __aicsDbOpen().then(function (db) {
      return new Promise(function (resolve, reject) {
        var transaction;
        try { transaction = db.transaction(['studio_sessions', 'session_results'], 'readonly'); }
        catch (error) { reject(__aicsStorageError('indexeddb_transaction_failed', error)); return; }

        var settled = { value: false };
        var items = [];
        var sessionRequest;
        function fail(error) {
          if (settled.value) return;
          settled.value = true;
          reject(error);
        }

        try { sessionRequest = transaction.objectStore('studio_sessions').get(sessionId); }
        catch (error) { fail(__aicsStorageError('indexeddb_read_failed', error)); return; }

        sessionRequest.onsuccess = function () {
          var session = sessionRequest.result;
          if (!session) { fail(__aicsStorageError('session_not_found')); return; }
          if (String(session.ownerId || '') !== String(ownerId)) { fail(__aicsStorageError('forbidden')); return; }

          var index;
          var request;
          try {
            index = transaction.objectStore('session_results').index('session_createdAt');
            request = index.openCursor(
              window.IDBKeyRange.bound([sessionId, ''], [sessionId, '\\uffff']),
              'prev'
            );
          } catch (error) {
            fail(__aicsStorageError('indexeddb_read_failed', error));
            return;
          }

          request.onerror = function () {
            fail(__aicsStorageError('indexeddb_read_failed', request.error));
          };
          request.onsuccess = function () {
            var cursor = request.result;
            if (!cursor || settled.value) return;

            if (decodedCursor) {
              var start = decodedCursor;
              decodedCursor = null;
              try {
                cursor.continuePrimaryKey([sessionId, start.createdAt], start.id);
              } catch (error) {
                fail(__aicsStorageError('invalid_cursor', error));
              }
              return;
            }

            if (items.length < limit + 1) items.push(cursor.value);
            if (items.length >= limit + 1) return;
            cursor.continue();
          };
        };
        sessionRequest.onerror = function () {
          fail(__aicsStorageError('indexeddb_read_failed', sessionRequest.error));
        };

        transaction.oncomplete = function () {
          if (settled.value) return;
          settled.value = true;
          var hasMore = items.length > limit;
          if (hasMore) items.pop();
          resolve({
            items: items,
            nextCursor: hasMore && items.length
              ? __aicsSessionResultCursorEncode(items[items.length - 1])
              : null,
            hasMore: hasMore
          });
        };
        transaction.onerror = function () {
          __aicsSessionResultTransactionFailure(transaction, settled, reject);
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
    id = String(id || '').trim();
    if (!id) return Promise.reject(__aicsStorageError('missing_result_id'));

    return __aicsDbOpen().then(function (db) {
      return new Promise(function (resolve, reject) {
        var transaction;
        try { transaction = db.transaction('session_results', 'readwrite'); }
        catch (error) { reject(__aicsStorageError('indexeddb_transaction_failed', error)); return; }

        var settled = { value: false };
        var store = transaction.objectStore('session_results');
        var request;
        var removed = false;
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
          try {
            store.delete(id);
            removed = true;
          } catch (error) {
            fail(__aicsStorageError('indexeddb_write_failed', error));
          }
        };
        request.onerror = function () {
          fail(__aicsStorageError('indexeddb_read_failed', request.error));
        };

        transaction.oncomplete = function () {
          if (!settled.value) { settled.value = true; resolve(removed); }
        };
        transaction.onerror = function () {
          __aicsSessionResultTransactionFailure(transaction, settled, reject);
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
\`;

export function sessionResultsRepositoryScript() {
  return SCRIPT;
}
