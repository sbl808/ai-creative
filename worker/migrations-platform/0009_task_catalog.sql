-- Platform-managed task metadata only.
-- User-created task content remains in browser IndexedDB.

CREATE TABLE IF NOT EXISTS task_catalog (
  task_id TEXT PRIMARY KEY,
  studio_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL
    CHECK (category IN ('text', 'image', 'voice', 'transcribe')),
  required_capabilities_json TEXT NOT NULL
    CHECK (
      json_valid(required_capabilities_json)
      AND json_type(required_capabilities_json, '$.any_of') = 'array'
      AND json_array_length(required_capabilities_json, '$.any_of') > 0
    ),
  description TEXT NOT NULL DEFAULT '',
  enabled INTEGER NOT NULL DEFAULT 1
    CHECK (enabled IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_task_catalog_studio_enabled
  ON task_catalog (studio_id, enabled, category);
