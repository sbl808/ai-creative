/**
 * Versioned contract for translating existing SRT subtitle text.
 * Verified current consumers: Voice Studio, Content Studio, and Shop Studio.
 * Subtitle Studio shares this contract while retaining its own Studio prompt.
 * Keep translation separate from Audio -> SRT generation.
 * Never include credentials or persist user subtitle content here.
 */

export const TRANSLATION_CONTRACT_VERSION = 1;
export const TRANSLATION_STUDIO_IDS = Object.freeze(['voice', 'content', 'shop', 'subtitle']);
export const TRANSLATION_OPERATIONS = Object.freeze(['translate-srt']);
export const TRANSLATION_DIRECTIONS = Object.freeze([
  'MY_TO_CN',
  'CN_TO_MY',
  'my-to-cn',
  'cn-to-my',
]);

const STUDIO_IDS = new Set(TRANSLATION_STUDIO_IDS);
const OPERATIONS = new Set(TRANSLATION_OPERATIONS);
const DIRECTIONS = new Set(TRANSLATION_DIRECTIONS);

function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function validateEnvelope(value, errors) {
  if (!isPlainObject(value)) {
    errors.push('invalid_translation_contract');
    return false;
  }
  if (value.contractVersion !== TRANSLATION_CONTRACT_VERSION) {
    errors.push('unsupported_contract_version');
  }
  if (typeof value.studioId !== 'string' || !STUDIO_IDS.has(value.studioId)) {
    errors.push('invalid_studio_id');
  }
  if (typeof value.operation !== 'string' || !OPERATIONS.has(value.operation)) {
    errors.push('invalid_translation_operation');
  }
  return true;
}

/**
 * Request:
 * { contractVersion, studioId: 'voice' | 'content' | 'shop' | 'subtitle',
 *   operation: 'translate-srt',
 *   input: { srtText, direction?, model?, type? } }
 *
 * direction aliases reflect the values currently accepted by each Studio.
 */
export function validateTranslationRequestV1(value) {
  const errors = [];
  if (!validateEnvelope(value, errors)) return { ok: false, errors };
  if (!isPlainObject(value.input)) {
    errors.push('input_must_be_object');
    return { ok: false, errors };
  }

  if (!hasNonEmptyString(value.input.srtText)) errors.push('srt_text_must_be_non_empty_string');
  if (value.input.direction !== undefined && !DIRECTIONS.has(value.input.direction)) {
    errors.push('translation_direction_invalid');
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
 * { contractVersion, studioId, operation: 'translate-srt', result: { srt } }
 * Validation errors are fixed codes and never echo user subtitle content.
 */
export function validateTranslationResponseV1(value) {
  const errors = [];
  if (!validateEnvelope(value, errors)) return { ok: false, errors };
  if (!isPlainObject(value.result)) {
    errors.push('result_must_be_object');
    return { ok: false, errors };
  }
  if (!hasNonEmptyString(value.result.srt)) errors.push('result_srt_must_be_non_empty_string');
  return { ok: errors.length === 0, errors };
}
