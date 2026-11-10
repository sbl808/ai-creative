/**
 * Versioned, UI-independent contract for shared Image production.
 * Studio adapters translate existing Studio payloads to/from this contract.
 * Do not include API keys, auth tokens, or persist user media in this module.
 */

export const IMAGE_CONTRACT_VERSION = 1;
export const IMAGE_STUDIO_IDS = Object.freeze([
  'story',
  'content',
  'short',
  'image',
  'voice',
  'shop',
]);
export const IMAGE_OPERATIONS = Object.freeze([
  'prompt',
  'ad-prompt',
  'generate',
]);

const STUDIO_IDS = new Set(IMAGE_STUDIO_IDS);
const OPERATIONS = new Set(IMAGE_OPERATIONS);

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
    errors.push('invalid_image_contract');
    return false;
  }
  if (value.contractVersion !== IMAGE_CONTRACT_VERSION) errors.push('unsupported_contract_version');
  if (typeof value.studioId !== 'string' || !STUDIO_IDS.has(value.studioId)) {
    errors.push('invalid_studio_id');
  }
  if (typeof value.operation !== 'string' || !OPERATIONS.has(value.operation)) {
    errors.push('invalid_image_operation');
  }
  return true;
}

function validateImages(images, errors) {
  if (images === undefined) return;
  if (!Array.isArray(images)) {
    errors.push('images_must_be_array');
    return;
  }
  images.forEach((image, index) => {
    if (!isPlainObject(image)) {
      errors.push(`images[${index}]_must_be_object`);
      return;
    }
    if (!hasNonEmptyString(image.base64)) errors.push(`images[${index}].base64_required`);
    if (!hasNonEmptyString(image.mimeType)) errors.push(`images[${index}].mime_type_required`);
  });
}

/**
 * Request shape:
 * {
 *   contractVersion: 1,
 *   studioId: 'story' | 'content' | 'short' | 'image' | 'voice' | 'shop',
 *   operation: 'prompt' | 'ad-prompt' | 'generate',
 *   input: { idea | prompt, model?, type?, images? }
 * }
 *
 * Credentials are deliberately excluded; authentication/provider credentials
 * remain the responsibility of the existing route and AI service layers.
 */
export function validateImageRequestV1(value) {
  const errors = [];
  if (!validateEnvelope(value, errors)) return { ok: false, errors };
  if (!isPlainObject(value.input)) {
    errors.push('input_must_be_object');
    return { ok: false, errors };
  }

  if (value.operation === 'prompt' || value.operation === 'ad-prompt') {
    if (!hasNonEmptyString(value.input.idea)) errors.push('idea_required');
  }
  if (value.operation === 'generate') {
    if (!hasNonEmptyString(value.input.prompt)) errors.push('prompt_required');
  }
  if (value.input.model !== undefined && !hasNonEmptyString(value.input.model)) {
    errors.push('model_must_be_non_empty_string');
  }
  if (value.input.type !== undefined && !hasNonEmptyString(String(value.input.type))) {
    errors.push('type_must_be_non_empty_string');
  }
  if (value.operation === 'generate' && value.input.images !== undefined) {
    errors.push('images_not_supported_for_generate_operation');
  } else {
    validateImages(value.input.images, errors);
  }

  return { ok: errors.length === 0, errors };
}

/**
 * Response shape:
 * prompt/ad-prompt: { result: { prompt: string, map?: object | null } }
 * generate:         { result: { data: base64 string, mimeType: string } }
 *
 * Validation errors contain codes/indexes only, never media or prompt content.
 */
export function validateImageResponseV1(value) {
  const errors = [];
  if (!validateEnvelope(value, errors)) return { ok: false, errors };
  if (!isPlainObject(value.result)) {
    errors.push('result_must_be_object');
    return { ok: false, errors };
  }

  if (value.operation === 'prompt' || value.operation === 'ad-prompt') {
    if (typeof value.result.prompt !== 'string') errors.push('result_prompt_must_be_string');
    if (value.result.map !== undefined && value.result.map !== null && !isPlainObject(value.result.map)) {
      errors.push('result_map_must_be_object_or_null');
    }
  }
  if (value.operation === 'generate') {
    if (!hasNonEmptyString(value.result.data)) errors.push('result_data_required');
    if (!hasNonEmptyString(value.result.mimeType)) errors.push('result_mime_type_required');
  }

  return { ok: errors.length === 0, errors };
}
