const SCRIPT = String.raw`(function () {
  var KDF_NAME = 'PBKDF2';
  var KDF_HASH = 'SHA-256';
  var KDF_ITERATIONS = 600000;
  var CIPHER_NAME = 'AES-GCM';
  var CIPHER_KEY_LENGTH = 256;
  var RECORD_VERSION = 1;
  var encoder = new TextEncoder();
  var decoder = new TextDecoder('utf-8', { fatal: true });

  function identity(accountIdValue, providerValue) {
    var accountId = String(accountIdValue || '').trim();
    var provider = String(providerValue || '').trim().toLowerCase();
    if (!accountId) throw __aicsStorageError('credentials_account_required');
    if (!provider || !/^[a-z0-9_-]{1,40}$/.test(provider)) {
      throw __aicsStorageError('credentials_provider_invalid');
    }
    return { accountId: accountId, provider: provider };
  }

  function passphraseBytes(value) {
    var passphrase = String(value || '');
    if (!passphrase) throw __aicsStorageError('credentials_passphrase_required');
    var bytes = encoder.encode(passphrase);
    if (!bytes.length || bytes.length > 1024) {
      throw __aicsStorageError('credentials_passphrase_invalid');
    }
    return bytes;
  }

  function associatedData(record) {
    return encoder.encode(JSON.stringify({
      accountId: record.accountId,
      provider: record.provider,
      recordVersion: record.recordVersion,
      kdf: record.kdf,
      kdfHash: record.kdfHash,
      kdfIterations: record.kdfIterations,
      cipher: record.cipher,
      cipherKeyLength: record.cipherKeyLength
    }));
  }

  function deriveAesKey(passphrase, salt, usage) {
    return crypto.subtle.importKey(
      'raw',
      passphrase,
      { name: KDF_NAME },
      false,
      ['deriveKey']
    ).then(function (material) {
      return crypto.subtle.deriveKey({
        name: KDF_NAME,
        salt: salt,
        iterations: KDF_ITERATIONS,
        hash: KDF_HASH
      }, material, {
        name: CIPHER_NAME,
        length: CIPHER_KEY_LENGTH
      }, false, [usage]);
    });
  }

  function runTransaction(mode, operation) {
    return __aicsCredentialsDbOpen().then(function (db) {
      return new Promise(function (resolve, reject) {
        var transaction;
        var output;
        var settled = false;
        try {
          transaction = db.transaction('provider_keys', mode);
        } catch (error) {
          reject(__aicsStorageError('credentials_transaction_failed', error));
          return;
        }
        var store = transaction.objectStore('provider_keys');
        function fail(code, cause) {
          if (settled) return;
          settled = true;
          try { transaction.abort(); } catch (abortError) {}
          reject(__aicsStorageError(code, cause));
        }
        try {
          operation(store, function (value) { output = value; }, fail);
        } catch (error) {
          fail('credentials_operation_failed', error);
        }
        transaction.oncomplete = function () {
          if (settled) return;
          settled = true;
          resolve(output);
        };
        transaction.onerror = function () {
          if (settled) return;
          settled = true;
          reject(__aicsStorageError('credentials_transaction_failed', transaction.error));
        };
        transaction.onabort = function () {
          if (settled) return;
          settled = true;
          reject(__aicsStorageError('credentials_transaction_aborted', transaction.error));
        };
      });
    });
  }

  function validateRecord(record, identityValue) {
    if (!record ||
        record.accountId !== identityValue.accountId ||
        record.provider !== identityValue.provider ||
        record.recordVersion !== RECORD_VERSION ||
        record.kdf !== KDF_NAME ||
        record.kdfHash !== KDF_HASH ||
        record.kdfIterations !== KDF_ITERATIONS ||
        record.cipher !== CIPHER_NAME ||
        record.cipherKeyLength !== CIPHER_KEY_LENGTH ||
        !(record.salt instanceof Uint8Array) ||
        record.salt.byteLength !== 16 ||
        !(record.iv instanceof Uint8Array) ||
        record.iv.byteLength !== 12 ||
        !(record.ciphertext instanceof ArrayBuffer)) {
      throw __aicsStorageError('credentials_record_invalid');
    }
  }

  window.AICS_API_KEYS = {
    // accountId MUST come from the authenticated /api/users/me response, never from a decoded local JWT.
    save: function (accountIdValue, providerValue, apiKeyValue, passphraseValue) {
      var id;
      var keyText = String(apiKeyValue || '').trim();
      var passphrase;
      try {
        id = identity(accountIdValue, providerValue);
        if (!keyText) throw __aicsStorageError('credentials_api_key_required');
        passphrase = passphraseBytes(passphraseValue);
      } catch (error) {
        return Promise.reject(error);
      }
      var salt = crypto.getRandomValues(new Uint8Array(16));
      var iv = crypto.getRandomValues(new Uint8Array(12));
      var record = {
        accountId: id.accountId,
        provider: id.provider,
        salt: salt,
        iv: iv,
        kdf: KDF_NAME,
        kdfHash: KDF_HASH,
        kdfIterations: KDF_ITERATIONS,
        cipher: CIPHER_NAME,
        cipherKeyLength: CIPHER_KEY_LENGTH,
        recordVersion: RECORD_VERSION,
        updatedAt: new Date().toISOString()
      };
      return deriveAesKey(passphrase, salt, 'encrypt').then(function (key) {
        return crypto.subtle.encrypt({
          name: CIPHER_NAME,
          iv: iv,
          additionalData: associatedData(record),
          tagLength: 128
        }, key, encoder.encode(keyText));
      }).then(function (ciphertext) {
        record.ciphertext = ciphertext;
        return runTransaction('readwrite', function (store, setOutput, fail) {
          var request;
          try { request = store.put(record); }
          catch (error) { fail('credentials_write_failed', error); return; }
          request.onerror = function () { fail('credentials_write_failed', request.error); };
          request.onsuccess = function () {
            setOutput({
              accountId: record.accountId,
              provider: record.provider,
              updatedAt: record.updatedAt,
              recordVersion: record.recordVersion
            });
          };
        });
      }).catch(function (error) {
        if (error && error.code) throw error;
        throw __aicsStorageError('credentials_encrypt_failed');
      });
    },

    // Plaintext is returned only to the caller for the immediate AI request; never persist or log it.
    decrypt: function (accountIdValue, providerValue, passphraseValue) {
      var id;
      var passphrase;
      try {
        id = identity(accountIdValue, providerValue);
        passphrase = passphraseBytes(passphraseValue);
      } catch (error) {
        return Promise.reject(error);
      }
      return runTransaction('readonly', function (store, setOutput, fail) {
        var request;
        try { request = store.get([id.accountId, id.provider]); }
        catch (error) { fail('credentials_read_failed', error); return; }
        request.onerror = function () { fail('credentials_read_failed', request.error); };
        request.onsuccess = function () {
          var record = request.result;
          try { validateRecord(record, id); }
          catch (error) { fail(error.code || 'credentials_record_invalid', error); return; }
          deriveAesKey(passphrase, record.salt, 'decrypt').then(function (key) {
            return crypto.subtle.decrypt({
              name: CIPHER_NAME,
              iv: record.iv,
              additionalData: associatedData(record),
              tagLength: 128
            }, key, record.ciphertext);
          }).then(function (plaintext) {
            setOutput(decoder.decode(plaintext));
          }).catch(function () {
            fail('credentials_decrypt_failed');
          });
        };
      });
    },

    remove: function (accountIdValue, providerValue) {
      var id;
      try { id = identity(accountIdValue, providerValue); }
      catch (error) { return Promise.reject(error); }
      return runTransaction('readwrite', function (store, setOutput, fail) {
        var request;
        try { request = store.delete([id.accountId, id.provider]); }
        catch (error) { fail('credentials_delete_failed', error); return; }
        request.onerror = function () { fail('credentials_delete_failed', request.error); };
        request.onsuccess = function () { setOutput(true); };
      });
    },

    list: function (accountIdValue) {
      var accountId = String(accountIdValue || '').trim();
      if (!accountId) return Promise.reject(__aicsStorageError('credentials_account_required'));
      return runTransaction('readonly', function (store, setOutput, fail) {
        var request;
        try { request = store.index('accountId').getAll(accountId); }
        catch (error) { fail('credentials_read_failed', error); return; }
        request.onerror = function () { fail('credentials_read_failed', request.error); };
        request.onsuccess = function () {
          setOutput((request.result || []).map(function (record) {
            return {
              provider: record.provider,
              updatedAt: record.updatedAt,
              recordVersion: record.recordVersion
            };
          }));
        };
      });
    }
  };
})();`;

export function apiKeysRepositoryScript() {
  return SCRIPT;
}
