#!/usr/bin/env node
/**
 * Passphrase-encrypted BYOK credentials IndexedDB contract.
 * Run: node --experimental-default-type=module scripts/indexeddb-api-keys-test.mjs
 */
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import { clientStorageScript } from '../worker/src/frontend/storage/client-storage.js';
import { backupExportScript } from '../worker/src/frontend/storage/backup/export.js';

const source = clientStorageScript();
new vm.Script(source, { filename: 'client-storage.js' });
assert.match(source, /indexedDB\.open\('aics_credentials_v1', 1\)/);
assert.match(source, /createObjectStore\('provider_keys'/);
assert.match(source, /keyPath: \['accountId', 'provider'\]/);
assert.match(source, /PBKDF2/);
assert.match(source, /SHA-256/);
assert.match(source, /iterations: KDF_ITERATIONS/);
assert.match(source, /AES-GCM/);
assert.match(source, /additionalData: associatedData\(record\)/);
assert.match(source, /window\.AICS_API_KEYS\s*=\s*\{/);
assert.doesNotMatch(backupExportScript(), /provider_keys|aics_credentials_v1/,
  'credentials database must not be part of content backup export');

function clone(value) {
  return value == null ? value : structuredClone(value);
}

function keyOf(value) {
  return JSON.stringify(value);
}

function createFakeIndexedDB() {
  const stores = new Map();
  const indexes = new Map();
  let version = 0;
  let database = null;

  function makeDatabase() {
    return {
      objectStoreNames: { contains(name) { return stores.has(name); } },
      createObjectStore(name, options) {
        stores.set(name, new Map());
        indexes.set(name, new Map());
        const store = {
          createIndex(indexName, keyPath) {
            indexes.get(name).set(indexName, keyPath);
          }
        };
        store.keyPath = options && options.keyPath;
        return store;
      },
      close() {},
      transaction(storeName) {
        if (!stores.has(storeName)) throw new Error('NotFoundError');
        let pending = 0;
        let aborted = false;
        let completeQueued = false;
        const tx = { error: null, oncomplete: null, onerror: null, onabort: null };
        function scheduleComplete() {
          if (pending || completeQueued || aborted) return;
          completeQueued = true;
          queueMicrotask(() => {
            completeQueued = false;
            if (!pending && !aborted && tx.oncomplete) tx.oncomplete();
          });
        }
        function request(operation) {
          const req = { result: undefined, error: null, onsuccess: null, onerror: null };
          pending++;
          queueMicrotask(() => {
            if (!aborted) {
              try {
                req.result = operation();
                if (req.onsuccess) req.onsuccess();
              } catch (error) {
                req.error = error;
                tx.error = error;
                if (req.onerror) req.onerror();
                if (tx.onerror) tx.onerror();
              }
            }
            pending--;
            scheduleComplete();
          });
          return req;
        }
        tx.abort = function () {
          if (aborted) return;
          aborted = true;
          queueMicrotask(() => { if (tx.onabort) tx.onabort(); });
        };
        tx.objectStore = function (name) {
          if (!stores.has(name)) throw new Error('NotFoundError');
          const records = stores.get(name);
          const indexMap = indexes.get(name);
          return {
            get(key) { return request(() => clone(records.get(keyOf(key)))); },
            put(value) {
              return request(() => {
                const keyPath = ['accountId', 'provider'];
                const key = keyOf(keyPath.map((field) => value[field]));
                records.set(key, clone(value));
                return key;
              });
            },
            delete(key) { return request(() => records.delete(keyOf(key))); },
            index(indexName) {
              const keyPath = indexMap.get(indexName);
              if (!keyPath) throw new Error('NotFoundError');
              return {
                getAll(value) {
                  return request(() => Array.from(records.values())
                    .filter((record) => record[keyPath] === value)
                    .map(clone));
                }
              };
            }
          };
        };
        return tx;
      }
    };
  }

  return {
    stores,
    get version() { return version; },
    open(name, requestedVersion) {
      assert.equal(name, 'aics_credentials_v1');
      const req = { result: null, error: null, transaction: null };
      queueMicrotask(() => {
        if (!database) database = makeDatabase();
        req.result = database;
        if (requestedVersion > version) {
          const oldVersion = version;
          version = requestedVersion;
          req.transaction = { abort() {} };
          if (req.onupgradeneeded) req.onupgradeneeded({
            oldVersion,
            newVersion: version,
            target: req
          });
        }
        if (req.onsuccess) req.onsuccess();
      });
      return req;
    }
  };
}

const fakeIndexedDB = createFakeIndexedDB();
const window = { indexedDB: fakeIndexedDB };
const context = {
  window,
  crypto: webcrypto,
  TextEncoder,
  TextDecoder,
  Uint8Array,
  ArrayBuffer,
  Date,
  Promise,
  JSON,
  String,
  Number,
  Array,
  Object,
  Error,
  RegExp,
  Math,
  isFinite,
  queueMicrotask
};
vm.runInNewContext(source, context, { timeout: 2000 });

const saved = await window.AICS_API_KEYS.save(
  'server-user-1',
  'Gemini',
  'AIza-PLAINTEXT-TEST-KEY',
  'a long example passphrase'
);
assert.equal(saved.accountId, 'server-user-1');
assert.equal(saved.provider, 'gemini');
assert.equal(saved.recordVersion, 1);
assert.equal(fakeIndexedDB.version, 1);
assert.ok(fakeIndexedDB.stores.has('provider_keys'));

const records = Array.from(fakeIndexedDB.stores.get('provider_keys').values());
assert.equal(records.length, 1);
const stored = records[0];
assert.equal(stored.kdf, 'PBKDF2');
assert.equal(stored.kdfHash, 'SHA-256');
assert.equal(stored.kdfIterations, 600000);
assert.equal(stored.cipher, 'AES-GCM');
assert.equal(stored.cipherKeyLength, 256);
assert.equal(stored.salt.byteLength, 16);
assert.equal(stored.iv.byteLength, 12);
assert.ok(stored.ciphertext instanceof ArrayBuffer);
assert.equal(JSON.stringify(stored).includes('AIza-PLAINTEXT-TEST-KEY'), false);
assert.equal(JSON.stringify(stored).includes('a long example passphrase'), false);
assert.equal(Object.prototype.hasOwnProperty.call(stored, 'passphrase'), false);
assert.equal(Object.prototype.hasOwnProperty.call(stored, 'apiKey'), false);

assert.equal(
  await window.AICS_API_KEYS.decrypt('server-user-1', 'gemini', 'a long example passphrase'),
  'AIza-PLAINTEXT-TEST-KEY'
);
await assert.rejects(
  window.AICS_API_KEYS.decrypt('server-user-1', 'gemini', 'incorrect passphrase'),
  /credentials_decrypt_failed/
);
await assert.rejects(
  window.AICS_API_KEYS.decrypt('another-user', 'gemini', 'a long example passphrase'),
  /credentials_record_invalid/
);

const listed = await window.AICS_API_KEYS.list('server-user-1');
assert.deepEqual(Array.from(listed), [{
  provider: 'gemini',
  updatedAt: stored.updatedAt,
  recordVersion: 1
}]);
assert.equal(Object.prototype.hasOwnProperty.call(listed[0], 'ciphertext'), false);

await window.AICS_API_KEYS.save(
  'server-user-1',
  'gemini',
  'AIza-REPLACED-KEY',
  'a long example passphrase'
);
assert.equal(fakeIndexedDB.stores.get('provider_keys').size, 1);
assert.equal(
  await window.AICS_API_KEYS.decrypt('server-user-1', 'gemini', 'a long example passphrase'),
  'AIza-REPLACED-KEY'
);
assert.equal(await window.AICS_API_KEYS.remove('server-user-1', 'gemini'), true);
assert.equal((await window.AICS_API_KEYS.list('server-user-1')).length, 0);

await assert.rejects(
  window.AICS_API_KEYS.save('', 'gemini', 'key', 'passphrase'),
  /credentials_account_required/
);
await assert.rejects(
  window.AICS_API_KEYS.save('server-user-1', 'bad provider!', 'key', 'passphrase'),
  /credentials_provider_invalid/
);
await assert.rejects(
  window.AICS_API_KEYS.save('server-user-1', 'gemini', '', 'passphrase'),
  /credentials_api_key_required/
);
await assert.rejects(
  window.AICS_API_KEYS.save('server-user-1', 'gemini', 'key', ''),
  /credentials_passphrase_required/
);

console.log('IndexedDB encrypted BYOK credentials tests passed.');
