import assert from 'node:assert/strict';
import vm from 'node:vm';
import { AICS_STREAM_SCRIPT } from '../worker/src/frontend/shared-ui.js';

const calls = [];
let injected = 0;
const sandbox = {
  window: {
    AICS_BYOK: {
      withGeminiKey: async (body) => {
        injected += 1;
        return { ...body, apiKey: 'decrypted-test-key' };
      }
    }
  },
  fetch: async (url, init) => {
    calls.push({ url, init });
    return { ok: true, status: 200 };
  },
  Promise, Object, String, Error, AbortController, TextDecoder,
  localStorage: { getItem: () => 'test-token' }
};
vm.runInNewContext(AICS_STREAM_SCRIPT, sandbox);

await sandbox.window.aicsApiFetch('/api/studio/image/generate', { prompt: 'test' }, {
  method: 'POST', headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' }
});
assert.equal(injected, 1);
assert.equal(calls[0].init.cache, 'no-store');
assert.deepEqual(JSON.parse(calls[0].init.body), { prompt: 'test', apiKey: 'decrypted-test-key' });

await sandbox.window.aicsApiFetch('/api/ideas/generate', { count: 3 }, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }
});
assert.equal(injected, 2);
assert.equal(JSON.parse(calls[1].init.body).apiKey, 'decrypted-test-key');

await sandbox.window.aicsApiFetch('/api/ai-models?category=text', undefined, { method: 'GET', headers: {} });
assert.equal(injected, 2);
assert.equal(calls[2].init.body, undefined);
assert.equal(calls[2].init.cache, 'no-store');

const failClosed = { window: {}, fetch: async () => { throw new Error('fetch_should_not_run'); }, Promise, Object, String, Error };
vm.runInNewContext(AICS_STREAM_SCRIPT, failClosed);
await assert.rejects(
  failClosed.window.aicsApiFetch('/api/studio/story/generate', {}, { method: 'POST' }),
  /credentials_unavailable/
);

console.log('IndexedDB BYOK non-streaming API fetch tests passed.');
