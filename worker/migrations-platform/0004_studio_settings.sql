-- Platform-managed Studio availability settings.

CREATE TABLE IF NOT EXISTS studio_settings (
  studio_id TEXT PRIMARY KEY,
  enabled INTEGER DEFAULT 1,
  updated_at TEXT
);
