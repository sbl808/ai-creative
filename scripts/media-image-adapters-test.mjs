import assert from 'node:assert/strict';
import { IMAGE_CONTRACT_VERSION } from '../worker/src/media-production/contracts/image.contract.js';
import { createImageStudioAdapter } from '../worker/src/media-adapters/image/index.js';
import { generateImageFromPrompt } from '../worker/src/media-adapters/image/image.adapter.js';
import { generateContentVideoImage } from '../worker/src/media-adapters/content/image.adapter.js';
import { generateShortVideoImage } from '../worker/src/media-adapters/short/image.adapter.js';
import { generateShopVideoImage } from '../worker/src/media-adapters/shop/image.adapter.js';

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
  ['image', generateImageFromPrompt],
  ['content', generateContentVideoImage],
  ['short', generateShortVideoImage],
  ['shop', generateShopVideoImage],
];

for (const [studioId, adapter] of cases) {
  captured.length = 0;
  const result = await createImageStudioAdapter(studioId, fakeEngine)({}, {
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
  assert.equal(typeof adapter, 'function');
}

// Shop alone may forward the existing optional reference-image payload.
captured.length = 0;
await createImageStudioAdapter('shop', fakeEngine)({}, {
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
await createImageStudioAdapter('content', fakeEngine)({}, {
  prompt: 'Content scene',
  images: [{ base64: 'aW1hZ2U=', mimeType: 'image/png' }],
});
assert.deepEqual(captured[0].request.input, { prompt: 'Content scene' });

assert.throws(
  () => createImageStudioAdapter('story', fakeEngine),
  (error) => error.message === 'unsupported_image_adapter_studio',
);

console.log('Shared Image Studio Adapters: PASS');
