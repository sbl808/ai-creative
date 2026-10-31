const SCRIPT = String.raw`function __aicsUserId() {
  var token = '';
  try { token = localStorage.getItem('aics_token') || ''; } catch (error) {}
  if (!token) return '';
  try {
    var part = token.split('.')[1] || '';
    part = part.replace(/-/g, '+').replace(/_/g, '/');
    while (part.length % 4) part += '=';
    var payload = JSON.parse(atob(part));
    return payload.sub || payload.user_id || '';
  } catch (error) { return ''; }
}
function __aicsRequireUserId() {
  var userId = __aicsUserId();
  if (!userId) throw __aicsStorageError('auth_required');
  return String(userId);
}
function __aicsOwnedMutation(id, mutate) {
  var userId;
  try { userId = __aicsRequireUserId(); }
  catch (error) { return Promise.reject(error); }
  return __aicsDbOpen().then(function (db) {
    return new Promise(function (resolve, reject) {
      var transaction;
      try { transaction = db.transaction('creations', 'readwrite'); }
      catch (error) { reject(__aicsStorageError('indexeddb_transaction_failed', error)); return; }
      var store = transaction.objectStore('creations');
      var settled = false;
      var output = null;
      function fail(error) {
        if (settled) return;
        settled = true;
        try { transaction.abort(); } catch (abortError) {}
        reject(error);
      }
      var request = store.get(id);
      request.onsuccess = function () {
        var record = request.result;
        if (!record) { fail(__aicsStorageError('not_found')); return; }
        if (String(record.user_id || '') !== userId) { fail(__aicsStorageError('forbidden')); return; }
        try { output = mutate(store, record); }
        catch (error) { fail(__aicsStorageError('indexeddb_write_failed', error)); }
      };
      request.onerror = function () { fail(__aicsStorageError('indexeddb_read_failed', request.error)); };
      transaction.oncomplete = function () {
        if (!settled) { settled = true; resolve(output); }
      };
      transaction.onerror = function () {
        if (!settled) { settled = true; reject(__aicsStorageError('indexeddb_transaction_failed', transaction.error)); }
      };
      transaction.onabort = function () {
        if (!settled) { settled = true; reject(__aicsStorageError('indexeddb_transaction_aborted', transaction.error)); }
      };
    });
  });
}`;

export function storageOwnerScript() {
  return SCRIPT;
}
