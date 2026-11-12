import assert from 'node:assert/strict';
import {
  IMAGE_CONTRACT_VERSION,
  IMAGE_STUDIO_IDS,
  IMAGE_STUDIO_OPERATIONS,
  validateImageRequestV1,
  validateImageResponseV1,
} from '../worker/src/media-production/contracts/image.contract.js';

const validPromptRequest = {
  contractVersion: IMAGE_CONTRACT_VERSION,
  studioId: 'image',
  operation: 'prompt',
  input: {
    idea: 'A quiet village at sunrise',
    model: 'test-image-text-model',
    type: '1',
    images: [{ base64: 'aW1hZ2U=', mimeType: 'image/png' }],
  },
};

assert.deepEqual(IMAGE_STUDIO_IDS, ['content', 'short', 'image', 'shop', 'story']);
assert.deepEqual(IMAGE_STUDIO_OPERATIONS, {
  image: ['prompt', 'ad-prompt', 'generate'],
  content: ['generate'],
  short: ['generate'],
  shop: ['generate'],
  story: ['generate'],
});

assert.deepEqual(validateImageRequestV1(validPromptRequest), { ok: true, errors: [] });
assert.deepEqual(validateImageRequestV1({
  ...validPromptRequest,
  operation: 'ad-prompt',
}), { ok: true, errors: [] });

for (const studioId of ['content', 'short', 'shop', 'story']) {
  assert.deepEqual(validateImageRequestV1({
    contractVersion: 1,
    studioId,
    operation: 'generate',
    input: { prompt: 'A product photo' },
  }), { ok: true, errors: [] });
}

assert.deepEqual(validateImageRequestV1({
  contractVersion: 1,
  studioId: 'image',
  operation: 'generate',
  input: { prompt: 'A product photo' },
}), { ok: true, errors: [] });

// Shop's existing video-image route accepts reference images.
assert.deepEqual(validateImageRequestV1({
  contractVersion: 1,
  studioId: 'shop',
  operation: 'generate',
  input: {
    prompt: 'A product photo',
    images: [{ base64: 'aW1hZ2U=', mimeType: 'image/png' }],
  },
}), { ok: true, errors: [] });

// Other generate routes must reject reference images until their routes
// explicitly support passing them to the image generator.
for (const studioId of ['content', 'short', 'image', 'story']) {
  const result = validateImageRequestV1({
    contractVersion: 1,
    studioId,
    operation: 'generate',
    input: {
      prompt: 'A product photo',
      images: [{ base64: 'aW1hZ2U=', mimeType: 'image/png' }],
    },
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('images_not_supported_for_generate_operation'));
}

// Studios without an inspected Image route must not be admitted.
for (const studioId of ['voice', 'unknown']) {
  const result = validateImageRequestV1({
    contractVersion: 1,
    studioId,
    operation: 'generate',
    input: { prompt: 'A product photo' },
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('invalid_studio_id'));
}

// Prompt operations are reserved for Image Studio.
for (const studioId of ['content', 'short', 'shop', 'story']) {
  const result = validateImageRequestV1({
    contractVersion: 1,
    studioId,
    operation: 'prompt',
    input: { idea: 'A cinematic scene' },
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('operation_not_allowed_for_studio'));
}

const privacySentinels = {
  prompt: 'PRIVATE_PROMPT_SENTINEL_83f1',
  image: 'PRIVATE_IMAGE_SENTINEL_91ac',
};
const invalidRequest = validateImageRequestV1({
  contractVersion: 99,
  studioId: 'unknown',
  operation: 'prompt',
  input: {
    idea: privacySentinels.prompt,
    images: [{ base64: privacySentinels.image, mimeType: '' }],
  },
});
assert.equal(invalidRequest.ok, false);
assert.ok(invalidRequest.errors.includes('unsupported_contract_version'));
assert.ok(invalidRequest.errors.includes('invalid_studio_id'));
assert.ok(invalidRequest.errors.includes('images[0].base64_invalid'));
assert.ok(invalidRequest.errors.includes('images[0].mime_type_invalid'));

const invalidTypeRequest = validateImageRequestV1({
  ...validPromptRequest,
  input: { ...validPromptRequest.input, type: { unexpected: true } },
});
assert.equal(invalidTypeRequest.ok, false);
assert.ok(invalidTypeRequest.errors.includes('type_must_be_non_empty_string'));

assert.deepEqual(validateImageResponseV1({
  contractVersion: 1,
  studioId: 'image',
  operation: 'prompt',
  result: { prompt: 'A cinematic scene', map: null },
}), { ok: true, errors: [] });

for (const studioId of ['content', 'short', 'shop', 'story']) {
  assert.deepEqual(validateImageResponseV1({
    contractVersion: 1,
    studioId,
    operation: 'generate',
    result: { data: 'aW1hZ2U=', mimeType: 'image/png' },
  }), { ok: true, errors: [] });
}

const forbiddenResponse = validateImageResponseV1({
  contractVersion: 1,
  studioId: 'content',
  operation: 'prompt',
  result: { prompt: 'Should not be allowed for Content' },
});
assert.equal(forbiddenResponse.ok, false);
assert.ok(forbiddenResponse.errors.includes('operation_not_allowed_for_studio'));

const invalidResponse = validateImageResponseV1({
  contractVersion: 1,
  studioId: 'image',
  operation: 'generate',
  result: { data: 'not-base64', mimeType: 'text/plain' },
});
assert.equal(invalidResponse.ok, false);
assert.ok(invalidResponse.errors.includes('result_data_invalid'));
assert.ok(invalidResponse.errors.includes('result_mime_type_invalid'));

const emptyPromptResponse = validateImageResponseV1({
  contractVersion: 1,
  studioId: 'image',
  operation: 'prompt',
  result: { prompt: '   ' },
});
assert.equal(emptyPromptResponse.ok, false);
assert.ok(emptyPromptResponse.errors.includes('result_prompt_must_be_non_empty_string'));

// Validation diagnostics must not contain user-provided prompt or media content.
assert.equal(invalidRequest.errors.some((error) => error.includes(privacySentinels.prompt)), false);
assert.equal(invalidRequest.errors.some((error) => error.includes(privacySentinels.image)), false);

console.log('Shared Image Media Contract: PASS');
