import { BACKUP_FORMAT_ID, BACKUP_EXPORT_VERSION, BACKUP_STORE_NAMES } from './format.js';
import { STORAGE_SCHEMA_VERSION } from '../schema/version.js';

export const BACKUP_MAX_FILE_BYTES = 50 * 1024 * 1024;
export const BACKUP_MAX_JSON_NODES = 500000;
export const BACKUP_MAX_JSON_DEPTH = 64;

function installBackupValidator(target, config) {
  var formatId = config.formatId;
  var exportVersion = config.exportVersion;
  var schemaVersion = config.schemaVersion;
  var storeNames = config.storeNames;
  var maxBytes = config.maxBytes;
  var maxNodes = config.maxNodes;
  var maxDepth = config.maxDepth;

  function fail(code) {
    var error = new Error(code);
    error.code = code;
    return error;
  }

  function isObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function hasOwn(value, key) {
    return Object.prototype.hasOwnProperty.call(value, key);
  }

  function validDate(value) {
    return typeof value === 'string' && value.length > 0 && value.length <= 64 &&
      isFinite(Date.parse(value));
  }

  function requireString(record, key, maxLength) {
    if (typeof record[key] !== 'string' || !record[key] || record[key].length > maxLength) {
      throw fail('backup_invalid_record');
    }
  }

  function optionalString(record, key, maxLength) {
    if (hasOwn(record, key) && record[key] !== null &&
        (typeof record[key] !== 'string' || record[key].length > maxLength)) {
      throw fail('backup_invalid_record');
    }
  }

  function optionalDate(record, key) {
    if (hasOwn(record, key) && record[key] !== null && !validDate(record[key])) {
      throw fail('backup_invalid_record');
    }
  }

  function scanJson(value, depth, counter) {
    counter.count += 1;
    if (counter.count > maxNodes || depth > maxDepth) throw fail('backup_complexity_limit');
    if (!value || typeof value !== 'object') return;

    var keys = Object.keys(value);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      if (key.length > 1024 || key === '__proto__' || key === 'prototype' || key === 'constructor') {
        throw fail('backup_unsafe_key');
      }
      scanJson(value[key], depth + 1, counter);
    }
  }

  function validateOwnerRecord(record, ownerId, ownerField) {
    if (!isObject(record)) throw fail('backup_invalid_record');
    requireString(record, 'id', 200);
    if (record[ownerField] !== ownerId) throw fail('backup_owner_mismatch');
  }

  function validateCreation(record, ownerId) {
    validateOwnerRecord(record, ownerId, 'user_id');
    optionalString(record, 'studio', 100);
    optionalString(record, 'type', 40);
    optionalString(record, 'title', 500);
    optionalString(record, 'original_prompt', 2000000);
    optionalString(record, 'ai_output', 2000000);
    optionalString(record, 'media_type', 100);
    optionalString(record, 'media_mime', 200);
    optionalString(record, 'media_data', maxBytes);
    if (hasOwn(record, 'is_favorite') &&
        typeof record.is_favorite !== 'number' && typeof record.is_favorite !== 'boolean') {
      throw fail('backup_invalid_record');
    }
    optionalDate(record, 'created_at');
    optionalDate(record, 'updated_at');
  }

  function validateProject(record, ownerId) {
    validateOwnerRecord(record, ownerId, 'user_id');
    requireString(record, 'title', 120);
    optionalString(record, 'description', 500);
    optionalDate(record, 'created_at');
    optionalDate(record, 'updated_at');
  }

  function validateSession(record, ownerId) {
    validateOwnerRecord(record, ownerId, 'ownerId');
    requireString(record, 'studio', 40);
    optionalString(record, 'title', 120);
    if (hasOwn(record, 'status') &&
        ['active', 'archived'].indexOf(record.status) === -1) throw fail('backup_invalid_record');
    if (hasOwn(record, 'draft') && !isObject(record.draft)) throw fail('backup_invalid_record');
    optionalDate(record, 'createdAt');
    optionalDate(record, 'updatedAt');
  }

  function validateHandoff(record, ownerId) {
    validateOwnerRecord(record, ownerId, 'ownerId');
    if (record.contractVersion !== 1) throw fail('backup_invalid_record');
    requireString(record, 'source', 40);
    requireString(record, 'target', 40);
    if (['story', 'content', 'short', 'image', 'voice', 'shop'].indexOf(record.target) === -1) {
      throw fail('backup_invalid_record');
    }
    if (!isObject(record.payload)) throw fail('backup_invalid_record');
    optionalDate(record, 'createdAt');
  }

  function validateResult(record, ownerId) {
    validateOwnerRecord(record, ownerId, 'ownerId');
    requireString(record, 'sessionId', 200);
    requireString(record, 'type', 40);
    if (!hasOwn(record, 'content')) throw fail('backup_invalid_record');
    optionalDate(record, 'createdAt');
  }

  function validateEnvelope(envelope, expectedOwnerId) {
    if (!isObject(envelope) || typeof expectedOwnerId !== 'string' || !expectedOwnerId) {
      throw fail('backup_invalid_envelope');
    }

    var allowedTopLevel = {
      format: true, exportVersion: true, schemaVersion: true, exportedAt: true, stores: true
    };
    var topKeys = Object.keys(envelope);
    for (var i = 0; i < topKeys.length; i++) {
      if (!allowedTopLevel[topKeys[i]]) throw fail('backup_unknown_field');
    }
    if (envelope.format !== formatId) throw fail('backup_format_unsupported');
    if (envelope.exportVersion !== exportVersion) throw fail('backup_export_version_unsupported');
    if (envelope.schemaVersion !== schemaVersion) throw fail('backup_schema_version_unsupported');
    if (!validDate(envelope.exportedAt)) throw fail('backup_invalid_exported_at');
    if (!isObject(envelope.stores)) throw fail('backup_invalid_stores');

    var storeKeys = Object.keys(envelope.stores);
    if (storeKeys.length !== storeNames.length) throw fail('backup_invalid_stores');
    for (var s = 0; s < storeNames.length; s++) {
      if (!hasOwn(envelope.stores, storeNames[s]) || !Array.isArray(envelope.stores[storeNames[s]])) {
        throw fail('backup_invalid_stores');
      }
    }
    for (var k = 0; k < storeKeys.length; k++) {
      if (storeNames.indexOf(storeKeys[k]) === -1) throw fail('backup_unknown_store');
    }

    scanJson(envelope, 0, { count: 0 });

    var seen = {};
    var resultSessionIds = [];
    var validators = {
      creations: function (record) { validateCreation(record, expectedOwnerId); },
      projects: function (record) { validateProject(record, expectedOwnerId); },
      studio_sessions: function (record) { validateSession(record, expectedOwnerId); },
      studio_handoffs: function (record) { validateHandoff(record, expectedOwnerId); },
      session_results: function (record) {
        validateResult(record, expectedOwnerId);
        resultSessionIds.push(record.sessionId);
      }
    };

    for (var n = 0; n < storeNames.length; n++) {
      var storeName = storeNames[n];
      var records = envelope.stores[storeName];
      seen[storeName] = {};
      for (var r = 0; r < records.length; r++) {
        validators[storeName](records[r]);
        var id = records[r].id;
        if (seen[storeName][id]) throw fail('backup_duplicate_record_id');
        seen[storeName][id] = true;
      }
    }

    for (var x = 0; x < resultSessionIds.length; x++) {
      if (!seen.studio_sessions[resultSessionIds[x]]) throw fail('backup_orphan_session_result');
    }

    return {
      valid: true,
      backup: envelope,
      recordCount: storeNames.reduce(function (total, name) {
        return total + envelope.stores[name].length;
      }, 0)
    };
  }

  function utf8ByteLength(value) {
    var bytes = 0;
    for (var i = 0; i < value.length; i++) {
      var code = value.charCodeAt(i);
      if (code <= 0x7f) bytes += 1;
      else if (code <= 0x7ff) bytes += 2;
      else if (code >= 0xd800 && code <= 0xdbff && i + 1 < value.length &&
               value.charCodeAt(i + 1) >= 0xdc00 && value.charCodeAt(i + 1) <= 0xdfff) {
        bytes += 4;
        i += 1;
      } else bytes += 3;
      if (bytes > maxBytes) return bytes;
    }
    return bytes;
  }

  function validateText(text, ownerId) {
    if (typeof text !== 'string' || !text) throw fail('backup_invalid_text');
    if (utf8ByteLength(text) > maxBytes) throw fail('backup_file_too_large');
    var parsed;
    try { parsed = JSON.parse(text); }
    catch (error) { throw fail('backup_invalid_json'); }
    return validateEnvelope(parsed, ownerId);
  }

  target.__AICS_VALIDATE_BACKUP = {
    validateEnvelope: validateEnvelope,
    validateText: validateText,
    maxBytes: maxBytes
  };
}

const VALIDATOR_CONFIG = Object.freeze({
  formatId: BACKUP_FORMAT_ID,
  exportVersion: BACKUP_EXPORT_VERSION,
  schemaVersion: STORAGE_SCHEMA_VERSION,
  storeNames: BACKUP_STORE_NAMES,
  maxBytes: BACKUP_MAX_FILE_BYTES,
  maxNodes: BACKUP_MAX_JSON_NODES,
  maxDepth: BACKUP_MAX_JSON_DEPTH
});

export function backupValidationScript() {
  return '(' + installBackupValidator.toString() + ')(window,' + JSON.stringify(VALIDATOR_CONFIG) + ');';
}

export function validateBackupEnvelope(envelope, expectedOwnerId) {
  const scope = {};
  installBackupValidator(scope, VALIDATOR_CONFIG);
  return scope.__AICS_VALIDATE_BACKUP.validateEnvelope(envelope, expectedOwnerId);
}

export function validateBackupText(text, expectedOwnerId) {
  const scope = {};
  installBackupValidator(scope, VALIDATOR_CONFIG);
  return scope.__AICS_VALIDATE_BACKUP.validateText(text, expectedOwnerId);
}
