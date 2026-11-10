import assert from 'node:assert/strict';
import {
  TRANSLATION_CONTRACT_VERSION,
  validateTranslationRequestV1,
  validateTranslationResponseV1,
} from '../worker/src/media-production/contracts/translation.contract.js';

const validVoiceRequest = {
  contractVersion: TRANSLATION_CONTRACT_VERSION,
  studioId: 'voice',
  operation: 'translate-srt',
  input: {
    srtText: '1\\n00:00:00,000 --> 00:00:02,000\\nမင်္ဂလာပါ',
    direction: 'MY_TO_CN',
    model: 'test-model',
    type: '2',
  },
};
assert.deepEqual(validateTranslationRequestV1(validVoiceRequest), { ok: true, errors: [] });

const validContentRequest = {
  ...validVoiceRequest,
  studioId: 'content',
  input: { srtText: '1\\n00:00:00,000 --> 00:00:02,000\\n你好', direction: 'cn-to-my' },
};
assert.deepEqual(validateTranslationRequestV1(validContentRequest), { ok: true, errors: [] });

const privacySentinel = 'PRIVATE_TRANSLATION_SRT_SENTINEL_7c91';
const invalidRequest = validateTranslationRequestV1({
  ...validVoiceRequest,
  input: { srtText: privacySentinel, direction: 'EN_TO_JP' },
});
assert.equal(invalidRequest.ok, false);
assert.ok(invalidRequest.errors.includes('translation_direction_invalid'));
assert.equal(invalidRequest.errors.some((error) => error.includes(privacySentinel)), false);

assert.ok(validateTranslationRequestV1({
  ...validVoiceRequest,
  input: { srtText: '   ' },
}).errors.includes('srt_text_must_be_non_empty_string'));

assert.ok(validateTranslationRequestV1({
  ...validVoiceRequest,
  studioId: 'shop',
}).errors.includes('invalid_studio_id'));

assert.deepEqual(validateTranslationResponseV1({
  contractVersion: 1,
  studioId: 'voice',
  operation: 'translate-srt',
  result: { srt: '1\\n00:00:00,000 --> 00:00:02,000\\nမင်္ဂလာပါ\\n你好' },
}), { ok: true, errors: [] });

assert.ok(validateTranslationResponseV1({
  contractVersion: 1,
  studioId: 'content',
  operation: 'translate-srt',
  result: { srt: '   ' },
}).errors.includes('result_srt_must_be_non_empty_string'));

console.log('Shared Translation Contract: PASS');
