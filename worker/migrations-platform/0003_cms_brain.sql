-- Platform-managed CMS Brain configuration.
-- Keep scope/module/type/key isolation in the database contract.

CREATE TABLE IF NOT EXISTS cms_brain (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scope TEXT NOT NULL,
  module TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'BASE',
  plan TEXT NOT NULL DEFAULT 'FREE',
  key TEXT NOT NULL,
  value TEXT,
  active INTEGER DEFAULT 1,
  version INTEGER DEFAULT 1,
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(scope, module, type, plan, key)
);

CREATE INDEX IF NOT EXISTS idx_cms_brain_lookup
  ON cms_brain (scope, module, type, active);
