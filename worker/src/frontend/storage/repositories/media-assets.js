const SCRIPT = String.raw`function __aicsMediaAssetObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function __aicsMediaAssetId() {
  return 'ma_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

function __aicsMediaAssetValidate(record) {
  if (!__aicsMediaAssetObject(record)) throw __aicsStorageError('invalid_media_asset');
  var allowed = ['contractVersion', 'id', 'ownerId', 'studioId', 'mediaType', 'createdAt'];
  var keys = Object.keys(record);
  if (keys.some(function (key) { return allowed.indexOf(key) === -1; })) {
    throw __aicsStorageError('media_asset_must_not_contain_payload_or_credentials');
  }
  if (record.contractVersion !== 1 ||
      typeof record.id !== 'string' || !record.id.trim() || record.id.length > 128 ||
      typeof record.ownerId !== 'string' || !record.ownerId.trim() || record.ownerId.length > 128 ||
      ['story', 'content', 'short', 'image', 'voice', 'shop'].indexOf(record.studioId) === -1 ||
      ['image', 'audio', 'subtitle'].indexOf(record.mediaType) === -1 ||
      typeof record.createdAt !== 'string' ||
      !Number.isFinite(Date.parse(record.createdAt)) ||
      new Date(Date.parse(record.createdAt)).toISOString() !== record.createdAt) {
    throw __aicsStorageError('invalid_media_asset');
  }
  return record;
}

function __aicsMediaAssetTransactionError(transaction) {
  return __aicsStorageError('indexeddb_transaction_failed', transaction.error);
}

window.AICS_MEDIA_ASSETS = {
  create: function (input) {
    var ownerId;
    try { ownerId = __aicsRequireUserId(); }
    catch (error) { return Promise.reject(error); }

    input = input || {};
    if (!__aicsMediaAssetObject(input)) return Promise.reject(__aicsStorageError('invalid_media_asset'));
    var allowedInput = ['id', 'studioId', 'mediaType'];
    if (Object.keys(input).some(function (key) { return allowedInput.indexOf(key) === -1; })) {
      return Promise.reject(__aicsStorageError('media_asset_must_not_contain_payload_or_credentials'));
    }
    var record = {
      contractVersion: 1,
      id: typeof input.id === 'string' && input.id.trim() ? input.id : __aicsMediaAssetId(),
      ownerId: ownerId,
      studioId: input.studioId,
      mediaType: input.mediaType,
      createdAt: new Date().toISOString()
    };
    try { __aicsMediaAssetValidate(record); }
    catch (error) { return Promise.reject(error); }

    return __aicsDbOpen().then(function (db) {
      return new Promise(function (resolve, reject) {
        var transaction;
        try { transaction = db.transaction('media_assets', 'readwrite'); }
        catch (error) { reject(__aicsStorageError('indexeddb_transaction_failed', error)); return; }
        var store = transaction.objectStore('media_assets');
        var settled = false;
        function fail(error) {
          if (settled) return;
          settled = true;
          try { transaction.abort(); } catch (abortError) {}
          reject(error);
        }
        var request;
        try { request = store.get(record.id); }
        catch (error) { fail(__aicsStorageError('indexeddb_read_failed', error)); return; }
        request.onsuccess = function () {
          if (settled) return;
          var existing = request.result;
          if (existing) {
            fail(__aicsStorageError(String(existing.ownerId || '') === ownerId ? 'media_asset_already_exists' : 'forbidden'));
            return;
          }
          try { store.add(record); }
          catch (error) { fail(__aicsStorageError('indexeddb_write_failed', error)); }
        };
        request.onerror = function () { fail(__aicsStorageError('indexeddb_read_failed', request.error)); };
        transaction.oncomplete = function () { if (!settled) { settled = true; resolve(record); } };
        transaction.onerror = function () { if (!settled) { settled = true; reject(__aicsMediaAssetTransactionError(transaction)); } };
        transaction.onabort = function () { if (!settled) { settled = true; reject(__aicsStorageError('indexeddb_transaction_aborted', transaction.error)); } };
      });
    });
  },

  get: function (id) {
    var ownerId = __aicsUserId();
    if (!ownerId) return Promise.resolve(null);
    if (typeof id !== 'string' || !id) return Promise.reject(__aicsStorageError('invalid_asset_id'));
    return __aicsDbOpen().then(function (db) {
      return new Promise(function (resolve, reject) {
        var transaction;
        try { transaction = db.transaction('media_assets', 'readonly'); }
        catch (error) { reject(__aicsStorageError('indexeddb_transaction_failed', error)); return; }
        var request;
        var record = null;
        try { request = transaction.objectStore('media_assets').get(id); }
        catch (error) { reject(__aicsStorageError('indexeddb_read_failed', error)); return; }
        request.onsuccess = function () {
          var value = request.result;
          if (value && String(value.ownerId || '') === String(ownerId)) record = value;
        };
        request.onerror = function () { reject(__aicsStorageError('indexeddb_read_failed', request.error)); };
        transaction.oncomplete = function () { resolve(record); };
        transaction.onerror = function () { reject(__aicsMediaAssetTransactionError(transaction)); };
        transaction.onabort = function () { reject(__aicsStorageError('indexeddb_transaction_aborted', transaction.error)); };
      });
    });
  },

  list: function (options) {
    var ownerId = __aicsUserId();
    if (!ownerId) return Promise.resolve([]);
    options = options || {};
    if (!__aicsMediaAssetObject(options) ||
        Object.keys(options).some(function (key) { return ['studioId', 'mediaType'].indexOf(key) === -1; })) {
      return Promise.reject(__aicsStorageError('invalid_media_asset_filter'));
    }
    if (options.studioId && ['story', 'content', 'short', 'image', 'voice', 'shop'].indexOf(options.studioId) === -1) {
      return Promise.reject(__aicsStorageError('invalid_studio_id'));
    }
    if (options.mediaType && ['image', 'audio', 'subtitle'].indexOf(options.mediaType) === -1) {
      return Promise.reject(__aicsStorageError('invalid_media_type'));
    }
    return __aicsDbOpen().then(function (db) {
      return new Promise(function (resolve, reject) {
        var transaction;
        try { transaction = db.transaction('media_assets', 'readonly'); }
        catch (error) { reject(__aicsStorageError('indexeddb_transaction_failed', error)); return; }
        var items = [];
        var request;
        try { request = transaction.objectStore('media_assets').index('ownerId').getAll(String(ownerId)); }
        catch (error) { reject(__aicsStorageError('indexeddb_read_failed', error)); return; }
        request.onsuccess = function () {
          items = (request.result || []).filter(function (record) {
            return String(record.ownerId || '') === String(ownerId) &&
              (!options.studioId || record.studioId === options.studioId) &&
              (!options.mediaType || record.mediaType === options.mediaType);
          });
        };
        request.onerror = function () { reject(__aicsStorageError('indexeddb_read_failed', request.error)); };
        transaction.oncomplete = function () {
          items.sort(function (a, b) { return String(b.createdAt || '').localeCompare(String(a.createdAt || '')); });
          resolve(items);
        };
        transaction.onerror = function () { reject(__aicsMediaAssetTransactionError(transaction)); };
        transaction.onabort = function () { reject(__aicsStorageError('indexeddb_transaction_aborted', transaction.error)); };
      });
    });
  },

  remove: function (id) {
    var ownerId;
    try { ownerId = __aicsRequireUserId(); }
    catch (error) { return Promise.reject(error); }
    if (typeof id !== 'string' || !id) return Promise.reject(__aicsStorageError('invalid_asset_id'));
    return __aicsDbOpen().then(function (db) {
      return new Promise(function (resolve, reject) {
        var transaction;
        try { transaction = db.transaction('media_assets', 'readwrite'); }
        catch (error) { reject(__aicsStorageError('indexeddb_transaction_failed', error)); return; }
        var store = transaction.objectStore('media_assets');
        var settled = false;
        var removed = false;
        function fail(error) {
          if (settled) return;
          settled = true;
          try { transaction.abort(); } catch (abortError) {}
          reject(error);
        }
        var request;
        try { request = store.get(id); }
        catch (error) { fail(__aicsStorageError('indexeddb_read_failed', error)); return; }
        request.onsuccess = function () {
          var record = request.result;
          if (!record) return;
          if (String(record.ownerId || '') !== ownerId) { fail(__aicsStorageError('forbidden')); return; }
          try { store.delete(id); removed = true; }
          catch (error) { fail(__aicsStorageError('indexeddb_write_failed', error)); }
        };
        request.onerror = function () { fail(__aicsStorageError('indexeddb_read_failed', request.error)); };
        transaction.oncomplete = function () { if (!settled) { settled = true; resolve(removed); } };
        transaction.onerror = function () { if (!settled) { settled = true; reject(__aicsMediaAssetTransactionError(transaction)); } };
        transaction.onabort = function () { if (!settled) { settled = true; reject(__aicsStorageError('indexeddb_transaction_aborted', transaction.error)); } };
      });
    });
  }
};
`;

export function mediaAssetsRepositoryScript() {
  return SCRIPT;
}
