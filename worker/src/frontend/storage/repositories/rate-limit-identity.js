const SCRIPT = String.raw`window.AICS_RATE_LIMIT_IDENTITY = (function () {
  var recordId = 'browser';
  function createClientId() {
    if (!window.crypto || typeof window.crypto.getRandomValues !== 'function') {
      throw new Error('rate_limit_identity_unavailable');
    }
    var bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    return Array.prototype.map.call(bytes, function (value) {
      return value.toString(16).padStart(2, '0');
    }).join('');
  }
  function get() {
    return __aicsDbOpen().then(function (db) {
      return new Promise(function (resolve, reject) {
        var transaction;
        try { transaction = db.transaction('rate_limit_identity', 'readwrite'); }
        catch (error) { reject(new Error('rate_limit_identity_storage_unavailable')); return; }
        var store = transaction.objectStore('rate_limit_identity');
        var request = store.get(recordId);
        var clientId = '';
        request.onsuccess = function () {
          var record = request.result;
          if (record && typeof record.clientId === 'string' && /^[a-f0-9]{32}$/.test(record.clientId)) {
            clientId = record.clientId;
            return;
          }
          try {
            clientId = createClientId();
            store.put({ id: recordId, clientId: clientId, createdAt: new Date().toISOString() });
          } catch (error) {
            try { transaction.abort(); } catch (abortError) {}
            reject(new Error('rate_limit_identity_create_failed'));
          }
        };
        request.onerror = function () { reject(new Error('rate_limit_identity_read_failed')); };
        transaction.oncomplete = function () { if (clientId) resolve(clientId); else reject(new Error('rate_limit_identity_unavailable')); };
        transaction.onerror = function () { reject(new Error('rate_limit_identity_storage_failed')); };
        transaction.onabort = function () { reject(new Error('rate_limit_identity_storage_failed')); };
      });
    });
  }
  return { get: get };
})();`;
export function rateLimitIdentityRepositoryScript() { return SCRIPT; }
