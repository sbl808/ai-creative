-- Minimal platform audit metadata only.
-- Never store admin email, user identifiers, user content, API keys, or payloads.

CREATE TABLE IF NOT EXISTS admin_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action_code TEXT NOT NULL,
  result_code TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at
  ON admin_logs (created_at);
