import assert from 'node:assert/strict';
import {
  AUDIO_CONTRACT_VERSION,
  validateAudioRequestV1,
  validateAudioResponseV1,
} from '../worker/src/media-production/contracts/audio.contract.js';

const validTtsRequest = {
  contractVersion: AUDIO_CONTRACT_VERSION,
  studioId: 'voice',
  operation: 'tts',
  input: {
    text: 'မင်္ဂလာပါ',
    voiceName: 'Kore',
    model: 'test-tts-model',
  },
};
assert.deepEqual(validateAudioRequestV1(validTtsRequest), { ok: true, errors: [] });

const validTranscribeRequest = {
  contractVersion: AUDIO_CONTRACT_VERSION,
  studioId: 'content',
  operation: 'transcribe',
  input: {
    audioBase64: 'YXVkaW8=',
    mimeType: 'audio/mpeg',
    type: '1',
  },
};
assert.deepEqual(validateAudioRequestV1(validTranscribeRequest), { ok: true, errors: [] });

for (const studioId of ['story', 'short', 'image', 'shop']) {
  const unsupportedStudioRequest = validateAudioRequestV1({
    ...validTranscribeRequest,
    studioId,
  });
  assert.equal(unsupportedStudioRequest.ok, false);
  assert.ok(unsupportedStudioRequest.errors.includes('invalid_studio_id'));
}

const privacySentinels = {
  text: 'PRIVATE_AUDIO_TEXT_SENTINEL_6a2f',
  audio: 'PRIVATE_AUDIO_DATA_SENTINEL_9c31',
};
const invalidRequest = validateAudioRequestV1({
  contractVersion: 7,
  studioId: 'unknown',
  operation: 'transcribe',
  input: {
    audioBase64: privacySentinels.audio,
    mimeType: 'text/plain',
    text: privacySentinels.text,
  },
});
assert.equal(invalidRequest.ok, false);
assert.ok(invalidRequest.errors.includes('unsupported_contract_version'));
assert.ok(invalidRequest.errors.includes('invalid_studio_id'));
assert.ok(invalidRequest.errors.includes('audio_data_invalid'));
assert.ok(invalidRequest.errors.includes('audio_mime_type_invalid'));

const invalidTtsRequest = validateAudioRequestV1({
  ...validTtsRequest,
  input: { ...validTtsRequest.input, text: '  ', voiceName: { name: 'Kore' } },
});
assert.equal(invalidTtsRequest.ok, false);
assert.ok(invalidTtsRequest.errors.includes('text_required'));
assert.ok(invalidTtsRequest.errors.includes('voice_name_must_be_non_empty_string'));

assert.deepEqual(validateAudioResponseV1({
  contractVersion: 1,
  studioId: 'voice',
  operation: 'tts',
  result: { data: 'YXVkaW8=', mimeType: 'audio/wav' },
}), { ok: true, errors: [] });

assert.deepEqual(validateAudioResponseV1({
  contractVersion: 1,
  studioId: 'content',
  operation: 'transcribe',
  result: { text: 'အသံမှ စာသားပြောင်းထားသည်' },
}), { ok: true, errors: [] });

const invalidTtsResponse = validateAudioResponseV1({
  contractVersion: 1,
  studioId: 'voice',
  operation: 'tts',
  result: { data: 'not-base64', mimeType: 'image/png' },
});
assert.equal(invalidTtsResponse.ok, false);
assert.ok(invalidTtsResponse.errors.includes('result_audio_data_invalid'));
assert.ok(invalidTtsResponse.errors.includes('result_audio_mime_type_invalid'));

const emptyTranscriptionResponse = validateAudioResponseV1({
  contractVersion: 1,
  studioId: 'voice',
  operation: 'transcribe',
  result: { text: '   ' },
});
assert.equal(emptyTranscriptionResponse.ok, false);
assert.ok(emptyTranscriptionResponse.errors.includes('result_text_must_be_non_empty_string'));

// Validation diagnostics must never include user-provided text or audio data.
assert.equal(invalidRequest.errors.some((error) => error.includes(privacySentinels.text)), false);
assert.equal(invalidRequest.errors.some((error) => error.includes(privacySentinels.audio)), false);

console.log('Shared Audio Media Contract: PASS');
