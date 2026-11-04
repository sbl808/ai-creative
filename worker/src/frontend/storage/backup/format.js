import { STORAGE_SCHEMA_VERSION } from '../schema/version.js';

export const BACKUP_FORMAT_ID = 'aics-browser-backup';
export const BACKUP_EXPORT_VERSION = 1;

export const BACKUP_STORE_NAMES = Object.freeze([
  'creations',
  'projects',
  'studio_sessions',
  'studio_handoffs',
  'session_results'
]);

/**
 * Build a portable backup envelope from already owner-filtered IndexedDB records.
 * This function deliberately does not read IndexedDB or perform network requests.
 */
export function createBackupEnvelope(stores, exportedAt = new Date().toISOString()) {
  if (!stores || typeof stores !== 'object' || Array.isArray(stores)) {
    throw new TypeError('invalid_backup_stores');
  }

  const timestamp = new Date(exportedAt);
  if (!Number.isFinite(timestamp.getTime())) {
    throw new TypeError('invalid_backup_exported_at');
  }

  const snapshot = {};
  for (const storeName of BACKUP_STORE_NAMES) {
    const records = stores[storeName];
    if (!Array.isArray(records)) {
      throw new TypeError('invalid_backup_store:' + storeName);
    }
    snapshot[storeName] = records.slice();
  }

  return {
    format: BACKUP_FORMAT_ID,
    exportVersion: BACKUP_EXPORT_VERSION,
    schemaVersion: STORAGE_SCHEMA_VERSION,
    exportedAt: timestamp.toISOString(),
    stores: snapshot
  };
}
