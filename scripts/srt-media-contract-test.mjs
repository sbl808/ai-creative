import assert from 'node:assert/strict';
import {
  SRT_CONTRACT_VERSION,
  validateSrtRequestV1,
  validateSrtResponseV1,
} from '../worker/src/media-production/contracts/srt.contract.js';

const validRequest = {
  contractVersion: SRT_CONTRACT_VERSION,
  studioId: 'voice',
  operation: 'audio-to-srt',
  input: {
    audioBase64: 'YXVkaW8=',
    mimeType: 'audio/mpeg',
    knownText: 'မင်္ဂလာပါ',
    model: 'test-transcribe-model',
    type: '2',
  },
};
assert.deepEqual(validateSrtRequestV1(validRequest), { ok: true, errors: [] });

assert.deepEqual(validateSrtRequestV1({
  ...validRequest,
  studioId: 'content',
  input: { audioBase64: 'YXVkaW8=', mimeType: 'audio/webm;codecs=opus' },
}), { ok: true, errors: [] });

const privacySentinels = {
  audio: 'PRIVATE_SRT_AUDIO_SENTINEL_82af',
  text: 'PRIVATE_SRT_TEXT_SENTINEL_31bd',
};
const invalidRequest = validateSrtRequestV1({
  contractVersion: 99,
  studioId: 'unknown',
  operation: 'audio-to-srt',
  input: {
    audioBase64: privacySentinels.audio,
    mimeType: 'text/plain',
    knownText: privacySentinels.text,
  },
});
assert.equal(invalidRequest.ok, false);
assert.ok(invalidRequest.errors.includes('unsupported_contract_version'));
assert.ok(invalidRequest.errors.includes('invalid_studio_id'));
assert.ok(invalidRequest.errors.includes('audio_data_invalid'));
assert.ok(invalidRequest.errors.includes('audio_mime_type_invalid'));
assert.equal(invalidRequest.errors.some((error) => error.includes(privacySentinels.audio)), false);
assert.equal(invalidRequest.errors.some((error) => error.includes(privacySentinels.text)), false);

const invalidKnownText = validateSrtRequestV1({
  ...validRequest,
  input: { ...validRequest.input, knownText: '   ' },
});
assert.ok(invalidKnownText.errors.includes('known_text_must_be_non_empty_string'));

const validSrt = '1\n00:00:00,000 --> 00:00:02,000\nမင်္ဂလာပါ\n\n2\n00:00:02,000 --> 00:00:04,000\nနေကောင်းလား';
assert.deepEqual(validateSrtResponseV1({
  contractVersion: 1,
  studioId: 'voice',
  operation: 'audio-to-srt',
  result: { srt: validSrt },
}), { ok: true, errors: [] });

const invalidResponse = validateSrtResponseV1({
  contractVersion: 1,
  studioId: 'content',
  operation: 'audio-to-srt',
  result: { srt: 'ဒီစာသားမှာ SRT timestamp မပါပါ' },
});
assert.equal(invalidResponse.ok, false);
assert.ok(invalidResponse.errors.includes('result_srt_invalid'));

const emptyResponse = validateSrtResponseV1({
  contractVersion: 1,
  studioId: 'voice',
  operation: 'audio-to-srt',
  result: { srt: '   ' },
});
assert.ok(emptyResponse.errors.includes('result_srt_invalid'));

console.log('Shared SRT Media Contract: PASS');
