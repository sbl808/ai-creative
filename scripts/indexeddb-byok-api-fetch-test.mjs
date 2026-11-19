import assert from 'node:assert/strict';
import vm from 'node:vm';
import { AICS_STREAM_SCRIPT } from '../worker/src/frontend/shared-ui.js';

const calls = [];
let injected = 0;
const sandbox = {
  window: {
    localStorage: { getItem: () => '123e4567-e89b-42d3-a456-426614174000', setItem: () => {} },
    crypto: { randomUUID: () => '123e4567-e89b-42d3-a456-426614174000' },
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

await sandbox.window.aicsApiFetch('/api/studio/image/generate', { prompt: 'test', apiKey: 'caller-plaintext-key' }, {
  method: 'POST', headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' }
});
assert.equal(injected, 1);
assert.equal(calls[0].init.cache, 'no-store');
assert.equal(calls[0].init.headers['X-AICS-Client-ID'], '123e4567-e89b-42d3-a456-426614174000');
assert.deepEqual(JSON.parse(calls[0].init.body), { prompt: 'test', apiKey: 'decrypted-test-key' });

await sandbox.window.aicsApiFetch('/api/ideas/generate', { count: 3 }, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }
});
assert.equal(injected, 2);
assert.equal(JSON.parse(calls[1].init.body).apiKey, 'decrypted-test-key');
assert.equal(calls[1].init.headers['X-AICS-Client-ID'], '123e4567-e89b-42d3-a456-426614174000');

await sandbox.window.aicsApiFetch('/api/ai-models?category=text', undefined, { method: 'GET', headers: {} });
assert.equal(injected, 2);
assert.equal(calls[2].init.body, undefined);
assert.equal(calls[2].init.cache, 'no-store');
assert.equal(calls[2].init.headers, undefined);

const failClosed = { window: {}, fetch: async () => { throw new Error('fetch_should_not_run'); }, Promise, Object, String, Error };
vm.runInNewContext(AICS_STREAM_SCRIPT, failClosed);
await assert.rejects(
  failClosed.window.aicsApiFetch('/api/studio/story/generate', {}, { method: 'POST' }),
  /credentials_unavailable/
);

assert.match(AICS_STREAM_SCRIPT, /X-AICS-Client-ID/);
console.log('IndexedDB BYOK non-streaming API fetch tests passed.');
