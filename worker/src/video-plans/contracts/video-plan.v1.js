/**
 * Versioned, UI-independent contract shared by all Video Plan studios.
 * Keep this module free of browser and Cloudflare-specific APIs.
 * Studio adapters translate legacy Studio response shapes into this contract.
 */

export const VIDEO_PLAN_CONTRACT_VERSION = 1;

export const VIDEO_PLAN_STUDIO_IDS = Object.freeze([
  'story',
  'content',
  'short',
  'shop',
]);

export const VIDEO_PLAN_V1_CONTRACT = Object.freeze({
  contractVersion: VIDEO_PLAN_CONTRACT_VERSION,
  requiredFields: Object.freeze([
    'contractVersion',
    'studioId',
    'product',
    'characters',
    'scenes',
    'rawFallback',
  ]),
  characterFields: Object.freeze([
    'id',
    'name',
    'role',
    'age',
    'description',
    'characterPrompt',
    'referenceImage',
  ]),
  sceneFields: Object.freeze([
    'id',
    'number',
    'title',
    'duration',
    'characterIds',
    'description',
    'visualDescription',
    'videoPrompt',
    'environmentPrompt',
    'dialogue',
    'emotion',
    'camera',
    'lighting',
    'location',
    'visualStyle',
  ]),
  productFields: Object.freeze(['name', 'prompt']),
});

const STUDIO_IDS = new Set(VIDEO_PLAN_STUDIO_IDS);

function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasStringFields(value, fields, prefix, errors) {
  for (const field of fields) {
    if (typeof value[field] !== 'string') errors.push(`${prefix}.${field}_must_be_string`);
  }
}

/**
 * Validate a normalized Video Plan without returning or logging plan content.
 * The result contains only stable error codes and array indexes.
 */
export function validateVideoPlanV1(value) {
  const errors = [];
  if (!isPlainObject(value)) return { ok: false, errors: ['invalid_video_plan'] };

  if (value.contractVersion !== VIDEO_PLAN_CONTRACT_VERSION) {
    errors.push('unsupported_contract_version');
  }
  if (typeof value.studioId !== 'string' || !STUDIO_IDS.has(value.studioId)) {
    errors.push('invalid_studio_id');
  }
  if (!Array.isArray(value.characters)) errors.push('characters_must_be_array');
  if (!Array.isArray(value.scenes)) errors.push('scenes_must_be_array');
  if (typeof value.rawFallback !== 'boolean') errors.push('raw_fallback_must_be_boolean');

  if (value.product !== null && value.product !== undefined) {
    if (!isPlainObject(value.product)) {
      errors.push('product_must_be_object_or_null');
    } else {
      hasStringFields(value.product, VIDEO_PLAN_V1_CONTRACT.productFields, 'product', errors);
    }
  } else if (value.product === undefined) {
    errors.push('product_field_required');
  }

  const characterIds = new Set();
  if (Array.isArray(value.characters)) {
    value.characters.forEach((character, index) => {
      const prefix = `characters[${index}]`;
      if (!isPlainObject(character)) {
        errors.push(`${prefix}_must_be_object`);
        return;
      }
      hasStringFields(character, VIDEO_PLAN_V1_CONTRACT.characterFields, prefix, errors);
      if (typeof character.id === 'string' && character.id.trim()) {
        if (characterIds.has(character.id)) errors.push(`${prefix}.duplicate_id`);
        characterIds.add(character.id);
      } else {
        errors.push(`${prefix}.id_required`);
      }
    });
  }

  const sceneIds = new Set();
  if (Array.isArray(value.scenes)) {
    value.scenes.forEach((scene, index) => {
      const prefix = `scenes[${index}]`;
      if (!isPlainObject(scene)) {
        errors.push(`${prefix}_must_be_object`);
        return;
      }
      for (const field of VIDEO_PLAN_V1_CONTRACT.sceneFields) {
        if (field === 'number' || field === 'duration' || field === 'characterIds') continue;
        if (typeof scene[field] !== 'string') errors.push(`${prefix}.${field}_must_be_string`);
      }
      if (!Number.isInteger(scene.number) || scene.number < 1) {
        errors.push(`${prefix}.number_must_be_positive_integer`);
      }
      if (typeof scene.duration !== 'number' || !Number.isFinite(scene.duration) || scene.duration <= 0) {
        errors.push(`${prefix}.duration_must_be_positive_number`);
      }
      if (!Array.isArray(scene.characterIds) || scene.characterIds.some((id) => typeof id !== 'string')) {
        errors.push(`${prefix}.character_ids_must_be_string_array`);
      } else {
        scene.characterIds.forEach((id) => {
          if (!characterIds.has(id)) errors.push(`${prefix}.character_reference_not_found`);
        });
      }
      if (typeof scene.id === 'string' && scene.id.trim()) {
        if (sceneIds.has(scene.id)) errors.push(`${prefix}.duplicate_id`);
        sceneIds.add(scene.id);
      } else {
        errors.push(`${prefix}.id_required`);
      }
    });
  }

  if (value.studioData !== undefined && !isPlainObject(value.studioData)) {
    errors.push('studio_data_must_be_object');
  }

  return { ok: errors.length === 0, errors };
}
