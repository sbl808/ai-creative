/**
 * Versioned, UI-independent contract for shared SRT generation.
 * This contract covers the verified Audio -> SRT flow only.
 * Only Studios with active Shared SRT Engine capabilities are accepted.
 * Script -> SRT remains a separate future path until its current API is verified.
 * Do not include credentials or persist user media in this module.
 */

export const SRT_CONTRACT_VERSION = 1;
export const SRT_STUDIO_IDS = Object.freeze(['content', 'voice', 'shop']);
export const SRT_OPERATIONS = Object.freeze(['audio-to-srt']);

const STUDIO_IDS = new Set(SRT_STUDIO_IDS);
const OPERATIONS = new Set(SRT_OPERATIONS);
const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const AUDIO_MIME_TYPE_PATTERN = /^audio\/[a-z0-9][a-z0-9.+-]*(?:\s*;\s*[^;\s=]+=[^;]+)*$/i;
const SRT_CUE_PATTERN = /^\d+\r?\n\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}\r?\n/m;

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

function isValidSrtText(value) {
  return hasNonEmptyString(value) && SRT_CUE_PATTERN.test(value.trim());
}

function validateEnvelope(value, errors) {
  if (!isPlainObject(value)) {
    errors.push('invalid_srt_contract');
    return false;
  }
  if (value.contractVersion !== SRT_CONTRACT_VERSION) errors.push('unsupported_contract_version');
  if (typeof value.studioId !== 'string' || !STUDIO_IDS.has(value.studioId)) {
    errors.push('invalid_studio_id');
  }
  if (typeof value.operation !== 'string' || !OPERATIONS.has(value.operation)) {
    errors.push('invalid_srt_operation');
  }
  return true;
}

/**
 * Request:
 * { contractVersion, studioId, operation: 'audio-to-srt',
 *   input: { audioBase64, mimeType?, knownText?, model?, type? } }
 *
 * knownText is optional and is currently used by Voice Studio to preserve
 * the source text while estimating subtitle timestamps from generated audio.
 */
export function validateSrtRequestV1(value) {
  const errors = [];
  if (!validateEnvelope(value, errors)) return { ok: false, errors };
  if (!isPlainObject(value.input)) {
    errors.push('input_must_be_object');
    return { ok: false, errors };
  }

  if (!isValidBase64(value.input.audioBase64)) errors.push('audio_data_invalid');
  if (value.input.mimeType !== undefined && !isValidAudioMimeType(value.input.mimeType)) {
    errors.push('audio_mime_type_invalid');
  }
  if (value.input.knownText !== undefined && !hasNonEmptyString(value.input.knownText)) {
    errors.push('known_text_must_be_non_empty_string');
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
 * Response:
 * { contractVersion, studioId, operation: 'audio-to-srt',
 *   result: { srt: valid-looking SubRip text } }
 *
 * Diagnostics contain error codes only, never user text or audio data.
 */
export function validateSrtResponseV1(value) {
  const errors = [];
  if (!validateEnvelope(value, errors)) return { ok: false, errors };
  if (!isPlainObject(value.result)) {
    errors.push('result_must_be_object');
    return { ok: false, errors };
  }
  if (!isValidSrtText(value.result.srt)) errors.push('result_srt_invalid');
  return { ok: errors.length === 0, errors };
}
