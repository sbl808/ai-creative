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

const invalidRequest = validateImageRequestV1({
  contractVersion: 99,
  studioId: 'unknown',
  operation: 'prompt',
  input: { idea: ' ', images: [{ base64: '', mimeType: '' }] },
});
assert.equal(invalidRequest.ok, false);
assert.ok(invalidRequest.errors.includes('unsupported_contract_version'));
assert.ok(invalidRequest.errors.includes('invalid_studio_id'));
assert.ok(invalidRequest.errors.includes('idea_required'));
assert.ok(invalidRequest.errors.includes('images[0].base64_required'));
assert.ok(invalidRequest.errors.includes('images[0].mime_type_required'));

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
  result: { data: '', mimeType: '' },
});
assert.equal(invalidResponse.ok, false);
assert.ok(invalidResponse.errors.includes('result_data_required'));
assert.ok(invalidResponse.errors.includes('result_mime_type_required'));

// Validation diagnostics must not contain user-provided prompt or media content.
assert.equal(invalidRequest.errors.some((error) => error.includes('A quiet village')), false);
assert.equal(invalidRequest.errors.some((error) => error.includes('aW1hZ2U=')), false);

console.log('Shared Image Media Contract: PASS');
