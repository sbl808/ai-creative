/**
 * Versioned metadata contract for user-owned media assets.
 * Asset records contain references/metadata only, never media payloads or credentials.
 * User media and these records belong in the user's browser IndexedDB.
 */

export const MEDIA_ASSET_CONTRACT_VERSION = 1;

export const MEDIA_ASSET_STUDIO_IDS = Object.freeze([
  'story',
  'content',
  'short',
  'image',
  'voice',
  'shop',
]);

// Translation results remain subtitle assets; translation is an operation,
// not a separate media type. Video production is not admitted by this contract.
export const MEDIA_ASSET_TYPES = Object.freeze([
  'image',
  'audio',
  'subtitle',
]);

const STUDIO_IDS = new Set(MEDIA_ASSET_STUDIO_IDS);
const MEDIA_TYPES = new Set(MEDIA_ASSET_TYPES);
const RESERVED_PAYLOAD_FIELDS = Object.freeze([
  'base64',
  'data',
  'content',
  'prompt',
  'apiKey',
  'token',
  'secret',
]);

function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isNonEmptyId(value) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 128;
}

function isIsoTimestamp(value) {
  if (typeof value !== 'string' || !value) return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

/**
 * Media Asset V1:
 * {
 *   contractVersion: 1,
 *   id: string,
 *   ownerId: string,
 *   studioId: 'story' | 'content' | 'short' | 'image' | 'voice' | 'shop',
 *   mediaType: 'image' | 'audio' | 'subtitle',
 *   createdAt: ISO-8601 UTC timestamp
 * }
 *
 * This validator checks metadata shape only. It does not authorize ownership,
 * persist records, or accept the actual media bytes/content.
 */
export function validateMediaAssetV1(value) {
  const errors = [];

  if (!isPlainObject(value)) {
    return { ok: false, errors: ['invalid_media_asset'] };
  }

  if (value.contractVersion !== MEDIA_ASSET_CONTRACT_VERSION) {
    errors.push('unsupported_contract_version');
  }
  if (!isNonEmptyId(value.id)) errors.push('invalid_asset_id');
  if (!isNonEmptyId(value.ownerId)) errors.push('invalid_asset_owner_id');
  if (typeof value.studioId !== 'string' || !STUDIO_IDS.has(value.studioId)) {
    errors.push('invalid_studio_id');
  }
  if (typeof value.mediaType !== 'string' || !MEDIA_TYPES.has(value.mediaType)) {
    errors.push('invalid_media_type');
  }
  if (!isIsoTimestamp(value.createdAt)) errors.push('invalid_asset_created_at');

  if (RESERVED_PAYLOAD_FIELDS.some((field) => Object.hasOwn(value, field))) {
    errors.push('media_asset_must_not_contain_payload_or_credentials');
  }

  return { ok: errors.length === 0, errors };
}
