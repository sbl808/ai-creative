/**
 * Versioned, UI-independent contract for transferring work between studios.
 * Keep this module free of browser and Cloudflare-specific APIs so both sides
 * can use the same validation rules.
 */

export const STUDIO_HANDOFF_CONTRACT_VERSION = 1;

const definitions = [
  { id: 'ideas', label: 'Idea Workspace', route: '/app/ideas', canReceiveHandoff: false },
  { id: 'story', label: 'Story', route: '/app/story', canReceiveHandoff: true },
  { id: 'content', label: 'Content', route: '/app/content', canReceiveHandoff: true },
  { id: 'short', label: 'Short', route: '/app/short', canReceiveHandoff: true },
  { id: 'image', label: 'Image', route: '/app/image', canReceiveHandoff: true },
  { id: 'voice', label: 'Voice', route: '/app/voice', canReceiveHandoff: true },
  { id: 'shop', label: 'Shop', route: '/app/shop', canReceiveHandoff: true },
  { id: 'subtitle', label: 'Subtitle', route: '/app/subtitle', canReceiveHandoff: true },
];

export const STUDIO_REGISTRY = Object.freeze(
  definitions.map((studio) => Object.freeze({ ...studio })),
);

export const STUDIO_HANDOFF_TARGETS = Object.freeze(
  STUDIO_REGISTRY.filter((studio) => studio.canReceiveHandoff),
);

const STUDIO_IDS = new Set(STUDIO_REGISTRY.map((studio) => studio.id));
const HANDOFF_TARGET_IDS = new Set(
  STUDIO_HANDOFF_TARGETS.map((studio) => studio.id),
);

function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/**
 * Validate a handoff envelope without returning or logging user payload data.
 */
export function validateStudioHandoff(value) {
  if (!isPlainObject(value)) return { ok: false, error: 'invalid_handoff' };
  if (value.contractVersion !== STUDIO_HANDOFF_CONTRACT_VERSION) {
    return { ok: false, error: 'unsupported_contract_version' };
  }
  if (typeof value.source !== 'string' || !STUDIO_IDS.has(value.source)) {
    return { ok: false, error: 'invalid_handoff_source' };
  }
  if (typeof value.target !== 'string' || !HANDOFF_TARGET_IDS.has(value.target)) {
    return { ok: false, error: 'invalid_handoff_target' };
  }
  if (!isPlainObject(value.payload)) {
    return { ok: false, error: 'invalid_handoff_payload' };
  }
  if (value.createdAt !== undefined && (
    typeof value.createdAt !== 'string' || Number.isNaN(Date.parse(value.createdAt))
  )) {
    return { ok: false, error: 'invalid_handoff_timestamp' };
  }
  if (value.sourceRecordId !== undefined && (
    typeof value.sourceRecordId !== 'string' || value.sourceRecordId.length > 200
  )) {
    return { ok: false, error: 'invalid_handoff_source_record_id' };
  }
  return { ok: true };
}

/**
 * Create a versioned handoff envelope. The payload is deliberately opaque:
 * target studios own their own payload-to-draft adapters.
 */
export function createStudioHandoff({
  source,
  target,
  payload,
  sourceRecordId,
  createdAt = new Date().toISOString(),
} = {}) {
  const handoff = {
    contractVersion: STUDIO_HANDOFF_CONTRACT_VERSION,
    source,
    target,
    payload,
    createdAt,
    ...(sourceRecordId ? { sourceRecordId } : {}),
  };
  const result = validateStudioHandoff(handoff);
  if (!result.ok) throw new TypeError(result.error);
  return handoff;
}

export function getStudioDefinition(studioId) {
  return STUDIO_REGISTRY.find((studio) => studio.id === studioId) || null;
}
