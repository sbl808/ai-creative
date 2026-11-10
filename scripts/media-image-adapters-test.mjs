import assert from 'node:assert/strict';
import { IMAGE_CONTRACT_VERSION } from '../worker/src/media-production/contracts/image.contract.js';
import { createImageStudioAdapter } from '../worker/src/media-adapters/image/index.js';
import { createImageStudioImageAdapter } from '../worker/src/media-adapters/image/image.adapter.js';
import { createContentImageAdapter } from '../worker/src/media-adapters/content/image.adapter.js';
import { createShortImageAdapter } from '../worker/src/media-adapters/short/image.adapter.js';
import { createShopImageAdapter } from '../worker/src/media-adapters/shop/image.adapter.js';

const captured = [];
const fakeEngine = async (env, request, executionContext) => {
  captured.push({ env, request, executionContext });
  return {
    contractVersion: IMAGE_CONTRACT_VERSION,
    studioId: request.studioId,
    operation: 'generate',
    result: { data: 'aW1hZ2U=', mimeType: 'image/png' },
  };
};

const cases = [
  ['image', createImageStudioImageAdapter],
  ['content', createContentImageAdapter],
  ['short', createShortImageAdapter],
  ['shop', createShopImageAdapter],
];

for (const [studioId, createAdapter] of cases) {
  captured.length = 0;
  const result = await createAdapter(fakeEngine)({}, {
    prompt: 'A studio image prompt',
    apiKey: 'TEST_KEY',
    model: 'selected-model',
    plan: 'PRO',
  });

  assert.deepEqual(result, { data: 'aW1hZ2U=', mimeType: 'image/png' });
  assert.equal(captured[0].request.contractVersion, IMAGE_CONTRACT_VERSION);
  assert.equal(captured[0].request.studioId, studioId);
  assert.equal(captured[0].request.operation, 'generate');
  assert.deepEqual(captured[0].request.input, { prompt: 'A studio image prompt' });
  assert.deepEqual(captured[0].executionContext, {
    apiKey: 'TEST_KEY',
    model: 'selected-model',
    plan: 'PRO',
  });
  assert.equal(JSON.stringify(captured[0].request).includes('TEST_KEY'), false);
}

// Shop alone may forward the existing optional reference-image payload.
captured.length = 0;
await createShopImageAdapter(fakeEngine)({}, {
  prompt: 'Product image',
  images: [
    { base64: 'aW1hZ2U=', mimeType: 'image/png', ignored: 'not forwarded' },
  ],
});
assert.deepEqual(captured[0].request.input, {
  prompt: 'Product image',
  images: [{ base64: 'aW1hZ2U=', mimeType: 'image/png' }],
});

// Other Studios must not forward reference images through this capability.
captured.length = 0;
await createContentImageAdapter(fakeEngine)({}, {
  prompt: 'Content scene',
  images: [{ base64: 'aW1hZ2U=', mimeType: 'image/png' }],
});
assert.deepEqual(captured[0].request.input, { prompt: 'Content scene' });

assert.throws(
  () => createImageStudioAdapter('story', fakeEngine),
  (error) => error.message === 'unsupported_image_adapter_studio',
);

console.log('Shared Image Studio Adapters: PASS');
