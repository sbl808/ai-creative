import assert from 'node:assert/strict';
import {
  IMAGE_CONTRACT_VERSION,
} from '../worker/src/media-production/contracts/image.contract.js';
import {
  createSharedImageEngine,
} from '../worker/src/media-production/image/engine.js';

const calls = [];
const services = {
  resolveModel: async (...args) => {
    calls.push({ type: 'resolveModel', args });
    return args[4] + '-model';
  },
  generateImage: async (env, args) => {
    calls.push({ type: 'generateImage', args });
    return { data: 'aW1hZ2U=', mimeType: 'image/png' };
  },
  generateMultimodal: async (env, args) => {
    calls.push({ type: 'generateMultimodal', args });
    return 'Enriched product image prompt';
  },
};
const generate = createSharedImageEngine(services);
const executionContext = {
  apiKey: 'TEST_PROVIDER_KEY',
  plan: 'PRO',
  model: 'selected-image-model',
};

for (const [studioId, task] of [
  ['image', 'image.image'],
  ['content', 'content.image'],
  ['short', 'short.image'],
  ['shop', 'shop.image'],
  ['story', 'story.image'],
]) {
  calls.length = 0;
  const response = await generate({}, {
    contractVersion: IMAGE_CONTRACT_VERSION,
    studioId,
    operation: 'generate',
    input: { prompt: 'A clear product photograph' },
  }, executionContext);

  assert.deepEqual(response.result, {
    data: 'aW1hZ2U=',
    mimeType: 'image/png',
  });
  assert.equal(response.studioId, studioId);
  const imageCall = calls.find((call) => call.type === 'generateImage');
  assert.equal(imageCall.args.task, task);
  assert.equal(imageCall.args.model, task + '-model');
  assert.equal(imageCall.args.apiKey, executionContext.apiKey);
  assert.equal(Object.hasOwn(imageCall.args, 'images'), false);
}

calls.length = 0;
const shopResponse = await generate({}, {
  contractVersion: 1,
  studioId: 'shop',
  operation: 'generate',
  input: {
    prompt: 'A product photograph',
    images: [{ base64: 'aW1hZ2U=', mimeType: 'image/png' }],
  },
}, executionContext);
assert.equal(shopResponse.result.data, 'aW1hZ2U=');
const multimodalCall = calls.find((call) => call.type === 'generateMultimodal');
assert.ok(multimodalCall);
assert.equal(multimodalCall.args.task, 'shop.text');
assert.equal(multimodalCall.args.apiKey, executionContext.apiKey);
assert.deepEqual(multimodalCall.args.images, [
  { base64: 'aW1hZ2U=', mimeType: 'image/png' },
]);
const shopImageCall = calls.find((call) => call.type === 'generateImage');
assert.equal(shopImageCall.args.prompt, 'Enriched product image prompt');

// Reference-image enrichment failure must fall back to the original prompt.
const fallbackCalls = [];
const fallbackGenerate = createSharedImageEngine({
  resolveModel: async (_env, category, _plan, _model, task) => category + ':' + task,
  generateMultimodal: async () => { throw new Error('provider details must not escape'); },
  generateImage: async (_env, args) => {
    fallbackCalls.push(args);
    return { data: 'aW1hZ2U=', mimeType: 'image/png' };
  },
});
await fallbackGenerate({}, {
  contractVersion: 1,
  studioId: 'shop',
  operation: 'generate',
  input: {
    prompt: 'Original prompt',
    images: [{ base64: 'aW1hZ2U=', mimeType: 'image/png' }],
  },
}, executionContext);
assert.equal(fallbackCalls[0].prompt, 'Original prompt');

// Prompt generation remains Studio-specific and is not handled by this engine.
await assert.rejects(
  () => generate({}, {
    contractVersion: 1,
    studioId: 'image',
    operation: 'prompt',
    input: { idea: 'A landscape' },
  }, executionContext),
  (error) => error.code === 'unsupported_shared_image_operation',
);

// Invalid contracts fail with a sanitized error.
await assert.rejects(
  () => generate({}, {
    contractVersion: 1,
    studioId: 'image',
    operation: 'generate',
    input: { prompt: '   ' },
  }, executionContext),
  (error) => error.code === 'invalid_image_request',
);

const invalidOutputGenerate = createSharedImageEngine({
  resolveModel: async () => 'image-model',
  generateImage: async () => ({ data: 'not-base64', mimeType: 'text/plain' }),
});
await assert.rejects(
  () => invalidOutputGenerate({}, {
    contractVersion: 1,
    studioId: 'image',
    operation: 'generate',
    input: { prompt: 'A landscape' },
  }, executionContext),
  (error) => error.code === 'invalid_image_provider_response',
);

console.log('Shared Image Engine: PASS');
