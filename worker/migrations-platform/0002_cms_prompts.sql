-- Final clean-baseline schema for platform-managed CMS prompts.
-- User-created prompts and generated content must remain in browser IndexedDB.

CREATE TABLE IF NOT EXISTS cms_prompts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  studio TEXT NOT NULL,
  plan TEXT NOT NULL,
  type TEXT NOT NULL,
  core TEXT,
  memory TEXT,
  knowledge TEXT,
  workflow TEXT,
  template TEXT,
  prompt TEXT,
  quality_check TEXT,
  final_output TEXT,
  updated_at TEXT DEFAULT (datetime('now')),
  feature TEXT DEFAULT '',
  tab TEXT DEFAULT '',
  step TEXT DEFAULT '',
  status TEXT DEFAULT 'ACTIVE',
  version INTEGER DEFAULT 1,
  UNIQUE(studio, plan, type)
);
