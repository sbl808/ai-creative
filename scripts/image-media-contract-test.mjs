import assert from 'node:assert/strict';
import {
  IMAGE_CONTRACT_VERSION,
  validateImageRequestV1,
  validateImageResponseV1,
} from '../worker/src/media-production/contracts/image.contract.js';

const validPromptRequest = {
  contractVersion: IMAGE_CONTRACT_VERSION,
  studioId: 'story',
  operation: 'prompt',
  input: {
    idea: 'A quiet village at sunrise',
    model: 'test-image-text-model',
    type: '1',
    images: [{ base64: 'aW1hZ2U=', mimeType: 'image/png' }],
  },
};

assert.deepEqual(validateImageRequestV1(validPromptRequest), { ok: true, errors: [] });
assert.deepEqual(validateImageRequestV1({
  ...validPromptRequest,
  operation: 'ad-prompt',
  studioId: 'shop',
}), { ok: true, errors: [] });

assert.deepEqual(validateImageRequestV1({
  contractVersion: 1,
  studioId: 'image',
  operation: 'generate',
  input: { prompt: 'A product photo' },
}), { ok: true, errors: [] });

const privacySentinels = {
  prompt: 'PRIVATE_PROMPT_SENTINEL_83f1',
  image: 'PRIVATE_IMAGE_SENTINEL_91ac',
};
const invalidRequest = validateImageRequestV1({
  contractVersion: 99,
  studioId: 'unknown',
  operation: 'prompt',
  input: {
    idea: ' ',
    model: privacySentinels.prompt,
    images: [{ base64: privacySentinels.image, mimeType: '' }],
  },
});
assert.equal(invalidRequest.ok, false);
assert.ok(invalidRequest.errors.includes('unsupported_contract_version'));
assert.ok(invalidRequest.errors.includes('invalid_studio_id'));
assert.ok(invalidRequest.errors.includes('idea_required'));
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
  studioId: 'content',
  operation: 'prompt',
  result: { prompt: 'A cinematic scene', map: null },
}), { ok: true, errors: [] });

assert.deepEqual(validateImageResponseV1({
  contractVersion: 1,
  studioId: 'shop',
  operation: 'generate',
  result: { data: 'aW1hZ2U=', mimeType: 'image/png' },
}), { ok: true, errors: [] });

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
  studioId: 'story',
  operation: 'prompt',
  result: { prompt: '   ' },
});
assert.equal(emptyPromptResponse.ok, false);
assert.ok(emptyPromptResponse.errors.includes('result_prompt_must_be_non_empty_string'));

// Validation diagnostics must not contain user-provided prompt or media content.
assert.equal(invalidRequest.errors.some((error) => error.includes(privacySentinels.prompt)), false);
assert.equal(invalidRequest.errors.some((error) => error.includes(privacySentinels.image)), false);

console.log('Shared Image Media Contract: PASS');
