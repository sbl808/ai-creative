-- Platform account metadata only.
-- Google OAuth is the only supported identity provider.
-- User-created content and profile preferences remain in browser IndexedDB.

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  google_sub TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'FREE',
  expiry TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
