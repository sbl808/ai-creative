// Pure field-based prompt merge engine.
// Precedence is highest-first: Global Policy > Studio Brain > Task Instructions > User Input.
// This module intentionally has no Worker, D1, provider, or logging dependencies.

export const PROMPT_SOURCE_PRIORITY = Object.freeze([
  'globalPolicy',
  'studioBrain',
  'taskInstructions',
  'userInput',
]);

const RESERVED_FIELD_NAMES = new Set(['__proto__', 'prototype', 'constructor']);
const FIELD_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_.-]{0,63}$/;

function isPromptValue(value) {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}

function normalizeSource(sourceName, fields) {
  if (fields === undefined || fields === null) return {};
  if (typeof fields !== 'object' || Array.isArray(fields)) {
    throw new TypeError('invalid_prompt_source:' + sourceName);
  }

  const normalized = {};
  for (const [field, value] of Object.entries(fields)) {
    if (!FIELD_NAME_PATTERN.test(field) || RESERVED_FIELD_NAMES.has(field)) {
      throw new TypeError('invalid_prompt_field:' + field);
    }
    if (value === undefined || value === null) continue;
    if (!isPromptValue(value)) {
      throw new TypeError('invalid_prompt_value:' + field);
    }
    // Blank strings mean "not configured" and allow a lower-priority fallback.
    if (typeof value === 'string' && value.trim() === '') continue;
    normalized[field] = value;
  }
  return normalized;
}

/**
 * Merge prompt fields using the fixed, documented source precedence.
 * Fields absent from higher-priority sources are filled by lower-priority sources.
 * A field present in a higher-priority source cannot be replaced by a lower one.
 *
 * @param {{
 *   globalPolicy?: Record<string, string|number|boolean>,
 *   studioBrain?: Record<string, string|number|boolean>,
 *   studioConfig?: Record<string, string|number|boolean>,
 *   taskTemplate?: Record<string, string|number|boolean>,
 *   userInput?: Record<string, string|number|boolean>
 * }} sources
 * @returns {Record<string, string|number|boolean>}
 */
export function mergePromptFields(sources = {}) {
  if (!sources || typeof sources !== 'object' || Array.isArray(sources)) {
    throw new TypeError('invalid_prompt_sources');
  }

  const merged = {};
  for (const sourceName of PROMPT_SOURCE_PRIORITY) {
    const fields = normalizeSource(sourceName, sources[sourceName]);
    for (const [field, value] of Object.entries(fields)) {
      if (!Object.prototype.hasOwnProperty.call(merged, field)) {
        merged[field] = value;
      }
    }
  }
  return merged;
}
