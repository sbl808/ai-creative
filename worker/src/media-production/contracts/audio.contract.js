/**
 * Versioned, UI-independent contract for shared Audio production.
 * Studio adapters translate existing Studio payloads to/from this contract.
 * Do not include API keys, auth tokens, or persist user media in this module.
 */

export const AUDIO_CONTRACT_VERSION = 1;
export const AUDIO_STUDIO_IDS = Object.freeze([
  'story',
  'content',
  'short',
  'image',
  'voice',
  'shop',
]);
export const AUDIO_OPERATIONS = Object.freeze([
  'tts',
  'transcribe',
]);

const STUDIO_IDS = new Set(AUDIO_STUDIO_IDS);
const OPERATIONS = new Set(AUDIO_OPERATIONS);
const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const AUDIO_MIME_TYPE_PATTERN = /^audio\/[a-z0-9][a-z0-9.+-]*(?:\s*;\s*[^;\s=]+=[^;]+)*$/i;

function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidBase64(value) {
  return hasNonEmptyString(value) && value.length % 4 === 0 && BASE64_PATTERN.test(value);
}

function isValidAudioMimeType(value) {
  return typeof value === 'string' && AUDIO_MIME_TYPE_PATTERN.test(value);
}

function validateEnvelope(value, errors) {
  if (!isPlainObject(value)) {
    errors.push('invalid_audio_contract');
    return false;
  }
  if (value.contractVersion !== AUDIO_CONTRACT_VERSION) errors.push('unsupported_contract_version');
  if (typeof value.studioId !== 'string' || !STUDIO_IDS.has(value.studioId)) {
    errors.push('invalid_studio_id');
  }
  if (typeof value.operation !== 'string' || !OPERATIONS.has(value.operation)) {
    errors.push('invalid_audio_operation');
  }
  return true;
}

/**
 * Request shape:
 * tts:        { text, voiceName?, model?, type? }
 * transcribe: { audioBase64, mimeType?, model?, type? }
 *
 * Credentials are deliberately excluded; authentication/provider credentials
 * remain the responsibility of the existing route and AI service layers.
 */
export function validateAudioRequestV1(value) {
  const errors = [];
  if (!validateEnvelope(value, errors)) return { ok: false, errors };
  if (!isPlainObject(value.input)) {
    errors.push('input_must_be_object');
    return { ok: false, errors };
  }

  if (value.operation === 'tts' && !hasNonEmptyString(value.input.text)) {
    errors.push('text_required');
  }
  if (value.operation === 'transcribe') {
    if (!isValidBase64(value.input.audioBase64)) errors.push('audio_data_invalid');
    if (value.input.mimeType !== undefined && !isValidAudioMimeType(value.input.mimeType)) {
      errors.push('audio_mime_type_invalid');
    }
  }
  if (value.input.voiceName !== undefined && !hasNonEmptyString(value.input.voiceName)) {
    errors.push('voice_name_must_be_non_empty_string');
  }
  if (value.input.model !== undefined && !hasNonEmptyString(value.input.model)) {
    errors.push('model_must_be_non_empty_string');
  }
  if (value.input.type !== undefined && !hasNonEmptyString(value.input.type)) {
    errors.push('type_must_be_non_empty_string');
  }

  return { ok: errors.length === 0, errors };
}

/**
 * Response shape:
 * tts:        { result: { data: base64 string, mimeType: audio MIME type } }
 * transcribe: { result: { text: non-empty string } }
 *
 * Validation errors contain codes only, never user text or audio data.
 */
export function validateAudioResponseV1(value) {
  const errors = [];
  if (!validateEnvelope(value, errors)) return { ok: false, errors };
  if (!isPlainObject(value.result)) {
    errors.push('result_must_be_object');
    return { ok: false, errors };
  }

  if (value.operation === 'tts') {
    if (!isValidBase64(value.result.data)) errors.push('result_audio_data_invalid');
    if (!isValidAudioMimeType(value.result.mimeType)) errors.push('result_audio_mime_type_invalid');
  }
  if (value.operation === 'transcribe' && !hasNonEmptyString(value.result.text)) {
    errors.push('result_text_must_be_non_empty_string');
  }

  return { ok: errors.length === 0, errors };
}
