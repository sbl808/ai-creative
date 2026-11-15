const SCRIPT = String.raw`const __AICS_SCHEMA_MIGRATIONS = [
  { version: 4, up: function (db) {
    if (!db.objectStoreNames.contains('creations')) { var store = db.createObjectStore('creations', { keyPath: 'id' }); store.createIndex('user_id', 'user_id', { unique: false }); }
    if (!db.objectStoreNames.contains('projects')) { var store = db.createObjectStore('projects', { keyPath: 'id' }); store.createIndex('user_id', 'user_id', { unique: false }); }
    if (!db.objectStoreNames.contains('studio_sessions')) { var store = db.createObjectStore('studio_sessions', { keyPath: 'id' }); store.createIndex('ownerId', 'ownerId', { unique: false }); store.createIndex('updatedAt', 'updatedAt', { unique: false }); store.createIndex('owner_updatedAt', ['ownerId', 'updatedAt'], { unique: false }); }
    if (!db.objectStoreNames.contains('studio_handoffs')) { var store = db.createObjectStore('studio_handoffs', { keyPath: 'id' }); store.createIndex('ownerId', 'ownerId', { unique: false }); store.createIndex('owner_target_createdAt', ['ownerId', 'target', 'createdAt'], { unique: false }); }
    if (!db.objectStoreNames.contains('session_results')) { var store = db.createObjectStore('session_results', { keyPath: 'id' }); store.createIndex('ownerId', 'ownerId', { unique: false }); store.createIndex('sessionId', 'sessionId', { unique: false }); store.createIndex('session_createdAt', ['sessionId', 'createdAt'], { unique: false }); store.createIndex('owner_sessionId', ['ownerId', 'sessionId'], { unique: false }); }
  }},
  { version: 5, up: function (db) { if (!db.objectStoreNames.contains('drafts')) { var drafts = db.createObjectStore('drafts', { keyPath: 'id' }); drafts.createIndex('ownerId', 'ownerId', { unique: false }); drafts.createIndex('updatedAt', 'updatedAt', { unique: false }); drafts.createIndex('owner_studio', ['ownerId', 'studio'], { unique: true }); } }},
  { version: 6, up: function (db) { if (!db.objectStoreNames.contains('ideas')) { var ideas = db.createObjectStore('ideas', { keyPath: 'id' }); ideas.createIndex('ownerId', 'ownerId', { unique: false }); ideas.createIndex('owner_updatedAt', ['ownerId', 'updatedAt'], { unique: false }); ideas.createIndex('category', 'category', { unique: false }); ideas.createIndex('owner_category', ['ownerId', 'category'], { unique: false }); } }},
  { version: 7, up: function (db) { if (!db.objectStoreNames.contains('media_assets')) { var mediaAssets = db.createObjectStore('media_assets', { keyPath: 'id' }); mediaAssets.createIndex('ownerId', 'ownerId', { unique: false }); mediaAssets.createIndex('owner_studio', ['ownerId', 'studioId'], { unique: false }); mediaAssets.createIndex('owner_mediaType', ['ownerId', 'mediaType'], { unique: false }); mediaAssets.createIndex('owner_createdAt', ['ownerId', 'createdAt'], { unique: false }); } }},
  { version: 8, up: function (db) { if (!db.objectStoreNames.contains('user_settings')) { var settings = db.createObjectStore('user_settings', { keyPath: 'id' }); settings.createIndex('ownerId', 'ownerId', { unique: true }); settings.createIndex('updatedAt', 'updatedAt', { unique: false }); } }},
  { version: 9, up: function (db) { if (!db.objectStoreNames.contains('app_preferences')) { db.createObjectStore('app_preferences', { keyPath: 'key' }); } }}
];
function __aicsRunSchemaMigrations(db, oldVersion, newVersion) {
  var currentVersion = Number(oldVersion || 0);
  for (var i = 0; i < __AICS_SCHEMA_MIGRATIONS.length; i++) {
    var migration = __AICS_SCHEMA_MIGRATIONS[i];
    if (migration.version > currentVersion && migration.version <= newVersion) { migration.up(db); currentVersion = migration.version; }
  }
  if (currentVersion !== newVersion) throw new Error('unsupported_schema_migration');
}`;
export function schemaMigrationsScript() { return SCRIPT; }
