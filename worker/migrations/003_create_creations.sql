-- AI Creative Studio — creations table
CREATE TABLE IF NOT EXISTS creations (
  id TEXT PRIMARY KEY,
  user_id INTEGER,
  studio TEXT,
  title TEXT,
  original_prompt TEXT,
  ai_output TEXT,
  type TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_creations_user_created ON creations (user_id, created_at DESC);
