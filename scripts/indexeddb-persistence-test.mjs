import assert from 'node:assert/strict';
import vm from 'node:vm';
import { clientStorageScript } from '../worker/src/frontend/storage/client-storage.js';

function createContext(storage) {
  const window = { navigator: storage ? { storage } : {} };
  const context = { window, Promise, Number, String, Object, Error };
  vm.runInNewContext(clientStorageScript(), context, { timeout: 1000 });
  return window.AICS_STORAGE_PERSISTENCE;
}

{
  let requests = 0;
  const api = createContext({
    persisted: async () => false,
    persist: async () => { requests += 1; return true; },
    estimate: async () => ({ usage: 1200, quota: 5000 })
  });
  const status = await api.getStatus();
  assert.equal(status.supported, true);
  assert.equal(status.persistSupported, true);
  assert.equal(status.persisted, false);
  assert.equal(status.usage, 1200);
  assert.equal(status.quota, 5000);
  assert.equal(requests, 0, 'status checks must not trigger a persistence prompt');

  const result = await api.requestPersistence();
  assert.equal(result.granted, true);
  assert.equal(requests, 1);
}

{
  let requests = 0;
  const api = createContext({
    persisted: async () => true,
    persist: async () => { requests += 1; return false; },
    estimate: async () => ({ usage: 0, quota: 0 })
  });
  const result = await api.requestPersistence();
  assert.equal(result.granted, true);
  assert.equal(result.alreadyPersisted, true);
  assert.equal(requests, 0, 'already-persisted storage must not prompt again');
}

{
  const api = createContext({
    persisted: async () => false,
    persist: async () => false,
    estimate: async () => ({ usage: 10, quota: 20 })
  });
  const result = await api.requestPersistence();
  assert.equal(result.supported, true);
  assert.equal(result.granted, false);
  assert.equal(result.persisted, false);
}

{
  const api = createContext({
    persisted: async () => false,
    persist: async () => { throw new Error('private browser detail'); },
    estimate: async () => { throw new Error('quota detail'); }
  });
  const status = await api.getStatus();
  assert.equal(status.usage, null);
  assert.equal(status.quota, null);
  const result = await api.requestPersistence();
  assert.equal(result.error, 'persistence_request_failed');
  assert.equal(JSON.stringify(result).includes('private browser detail'), false);
}

{
  const api = createContext(null);
  const status = await api.getStatus();
  assert.equal(status.supported, false);
  assert.equal(status.persistSupported, false);
  assert.equal(status.persisted, null);
  const result = await api.requestPersistence();
  assert.equal(result.supported, false);
  assert.equal(result.error, 'persistence_unsupported');
}

{
  const api = createContext({ estimate: async () => ({ usage: -1, quota: 'unknown' }) });
  const status = await api.getStatus();
  assert.equal(status.supported, true);
  assert.equal(status.persistSupported, false);
  assert.equal(status.usage, null);
  assert.equal(status.quota, null);
}

console.log('IndexedDB persistence tests passed.');
