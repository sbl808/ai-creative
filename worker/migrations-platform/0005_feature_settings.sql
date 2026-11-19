-- Platform-managed feature access and display settings.
-- Usage counters and user activity are not stored in this table.

CREATE TABLE IF NOT EXISTS feature_settings (
  feature_id TEXT PRIMARY KEY,
  enabled INTEGER DEFAULT 1,
  access TEXT DEFAULT 'FREE',
  limit_value INTEGER DEFAULT 0,
  updated_at TEXT
);
