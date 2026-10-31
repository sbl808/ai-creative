const SCRIPT = String.raw`function __aicsProjectId() {
  return 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}
window.AICS_PROJECTS = {
  create: function (input) {
    var userId;
    try { userId = __aicsRequireUserId(); }
    catch (error) { return Promise.reject(error); }
    input = input || {};
    var title = String(input.title || '').trim().slice(0, 120);
    if (!title) return Promise.reject(__aicsStorageError('missing_title'));
    var description = String(input.description || '').trim().slice(0, 500);
    var now = new Date().toISOString();
    var project = {
      id: __aicsProjectId(),
      user_id: userId,
      title: title,
      description: description,
      created_at: now,
      updated_at: now
    };
    return __aicsDbOpen().then(function (db) {
      return new Promise(function (resolve, reject) {
        var transaction;
        try { transaction = db.transaction('projects', 'readwrite'); }
        catch (error) { reject(__aicsStorageError('indexeddb_transaction_failed', error)); return; }
        var settled = false;
        function fail(error) {
          if (settled) return;
          settled = true;
          try { transaction.abort(); } catch (abortError) {}
          reject(error);
        }
        transaction.oncomplete = function () {
          if (!settled) { settled = true; resolve(project); }
        };
        transaction.onerror = function () {
          if (!settled) { settled = true; reject(__aicsStorageError('indexeddb_transaction_failed', transaction.error)); }
        };
        transaction.onabort = function () {
          if (!settled) { settled = true; reject(__aicsStorageError('indexeddb_transaction_aborted', transaction.error)); }
        };
        try { transaction.objectStore('projects').add(project); }
        catch (error) { fail(__aicsStorageError('indexeddb_write_failed', error)); }
      });
    });
  },
  list: function () {
    var userId = __aicsUserId();
    if (!userId) return Promise.resolve([]);
    return __aicsDbOpen().then(function (db) {
      return new Promise(function (resolve, reject) {
        var transaction;
        try { transaction = db.transaction('projects', 'readonly'); }
        catch (error) { reject(__aicsStorageError('indexeddb_transaction_failed', error)); return; }
        var items = [];
        var settled = false;
        var request;
        try { request = transaction.objectStore('projects').index('user_id').getAll(String(userId)); }
        catch (error) { reject(__aicsStorageError('indexeddb_read_failed', error)); return; }
        request.onsuccess = function () { items = request.result || []; };
        request.onerror = function () {
          if (!settled) { settled = true; reject(__aicsStorageError('indexeddb_read_failed', request.error)); }
        };
        transaction.oncomplete = function () {
          if (settled) return;
          settled = true;
          items.sort(function (a, b) {
            return ((b.created_at || '') > (a.created_at || '')) ? 1 :
              (((b.created_at || '') < (a.created_at || '')) ? -1 : 0);
          });
          resolve(items);
        };
        transaction.onerror = function () {
          if (!settled) { settled = true; reject(__aicsStorageError('indexeddb_transaction_failed', transaction.error)); }
        };
        transaction.onabort = function () {
          if (!settled) { settled = true; reject(__aicsStorageError('indexeddb_transaction_aborted', transaction.error)); }
        };
      });
    });
  },
  remove: function (id) {
    return __aicsOwnedStoreMutation('projects', id, function (store) {
      store.delete(id);
      return true;
    });
  }
};
`;

export function projectsRepositoryScript() {
  return SCRIPT;
}
