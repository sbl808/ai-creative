const SCRIPT = String.raw`function __aicsIdeaId() {
  return 'idea_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 11);
}
function __aicsValidateIdea(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw __aicsStorageError('invalid_idea');
  }
  var category = String(input.category || '');
  if (['story', 'content', 'short', 'image', 'shop'].indexOf(category) === -1) {
    throw __aicsStorageError('invalid_idea_category');
  }
  if (!input.fields || typeof input.fields !== 'object' || Array.isArray(input.fields)) {
    throw __aicsStorageError('invalid_idea_fields');
  }
}
window.AICS_IDEAS = {
  create: function (input) {
    var ownerId;
    try { ownerId = __aicsRequireUserId(); __aicsValidateIdea(input); }
    catch (error) { return Promise.reject(error); }
    var now = new Date().toISOString();
    var record = {
      id: __aicsIdeaId(), ownerId: ownerId, recordVersion: 1,
      category: String(input.category), fields: input.fields,
      isFavorite: input.isFavorite === true, createdAt: now, updatedAt: now
    };
    return __aicsDbOpen().then(function (db) {
      return new Promise(function (resolve, reject) {
        var transaction;
        try { transaction = db.transaction('ideas', 'readwrite'); }
        catch (error) { reject(__aicsStorageError('indexeddb_transaction_failed', error)); return; }
        transaction.oncomplete = function () { resolve(record); };
        transaction.onerror = function () {
          reject(__aicsStorageError('indexeddb_transaction_failed', transaction.error));
        };
        transaction.onabort = function () {
          reject(__aicsStorageError('indexeddb_transaction_aborted', transaction.error));
        };
        try { transaction.objectStore('ideas').add(record); }
        catch (error) {
          try { transaction.abort(); } catch (abortError) {}
          reject(__aicsStorageError('indexeddb_write_failed', error));
        }
      });
    });
  },
  update: function (id, changes) {
    changes = changes || {};
    return __aicsOwnedStoreMutation('ideas', id, function (store, record) {
      if (Object.prototype.hasOwnProperty.call(changes, 'category') &&
          changes.category !== record.category) throw __aicsStorageError('idea_category_immutable');
      if (Object.prototype.hasOwnProperty.call(changes, 'fields')) {
        if (!changes.fields || typeof changes.fields !== 'object' || Array.isArray(changes.fields)) {
          throw __aicsStorageError('invalid_idea_fields');
        }
        record.fields = changes.fields;
      }
      if (Object.prototype.hasOwnProperty.call(changes, 'isFavorite')) {
        record.isFavorite = changes.isFavorite === true;
      }
      record.updatedAt = new Date().toISOString();
      store.put(record);
      return record;
    });
  },
  get: function (id) {
    var ownerId = __aicsUserId();
    if (!ownerId || !id) return Promise.resolve(null);
    return __aicsDbOpen().then(function (db) {
      return new Promise(function (resolve, reject) {
        var transaction;
        try { transaction = db.transaction('ideas', 'readonly'); }
        catch (error) { reject(__aicsStorageError('indexeddb_transaction_failed', error)); return; }
        var result = null;
        var request = transaction.objectStore('ideas').get(String(id));
        request.onsuccess = function () {
          var record = request.result;
          if (record && String(record.ownerId || '') === String(ownerId)) result = record;
        };
        request.onerror = function () {
          reject(__aicsStorageError('indexeddb_read_failed', request.error));
        };
        transaction.oncomplete = function () { resolve(result); };
        transaction.onerror = function () {
          reject(__aicsStorageError('indexeddb_transaction_failed', transaction.error));
        };
        transaction.onabort = function () {
          reject(__aicsStorageError('indexeddb_transaction_aborted', transaction.error));
        };
      });
    });
  },
  list: function (options) {
    var ownerId = __aicsUserId();
    if (!ownerId) return Promise.resolve([]);
    options = options || {};
    return __aicsDbOpen().then(function (db) {
      return new Promise(function (resolve, reject) {
        var transaction;
        try { transaction = db.transaction('ideas', 'readonly'); }
        catch (error) { reject(__aicsStorageError('indexeddb_transaction_failed', error)); return; }
        var items = [];
        var request = transaction.objectStore('ideas').index('ownerId').getAll(String(ownerId));
        request.onsuccess = function () {
          items = request.result || [];
          if (options.category) items = items.filter(function (item) { return item.category === options.category; });
          if (options.favoritesOnly === true) items = items.filter(function (item) { return item.isFavorite === true; });
        };
        request.onerror = function () {
          reject(__aicsStorageError('indexeddb_read_failed', request.error));
        };
        transaction.oncomplete = function () {
          items.sort(function (a, b) { return (b.updatedAt || '').localeCompare(a.updatedAt || ''); });
          resolve(items);
        };
        transaction.onerror = function () {
          reject(__aicsStorageError('indexeddb_transaction_failed', transaction.error));
        };
        transaction.onabort = function () {
          reject(__aicsStorageError('indexeddb_transaction_aborted', transaction.error));
        };
      });
    });
  },
  remove: function (id) {
    return __aicsOwnedStoreMutation('ideas', id, function (store) { store.delete(id); return true; });
  },
  toggleFavorite: function (id) {
    return __aicsOwnedStoreMutation('ideas', id, function (store, record) {
      record.isFavorite = record.isFavorite !== true;
      record.updatedAt = new Date().toISOString();
      store.put(record);
      return { isFavorite: record.isFavorite };
    });
  }
};`;

export function ideasRepositoryScript() { return SCRIPT; }
