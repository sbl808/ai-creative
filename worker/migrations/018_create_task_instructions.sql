-- ============================================================
-- AI Creative Studio — Migration 018: Task Catalog + Task Instructions CMS
--
-- Platform-managed configuration only.
-- User-created projects, prompts, generated content and history remain
-- in the user's browser IndexedDB and must never be written here.
--
-- Task Catalog metadata is separate from trusted instruction content.
-- Drafts are editable; instruction versions are immutable snapshots.
-- ============================================================

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

CREATE TABLE IF NOT EXISTS task_instruction_sets (
  instruction_id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL UNIQUE,
  active_version_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (task_id)
    REFERENCES task_catalog (task_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  FOREIGN KEY (instruction_id, active_version_id)
    REFERENCES task_instruction_versions (instruction_id, version_id)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS task_instruction_drafts (
  draft_id TEXT PRIMARY KEY,
  instruction_id TEXT NOT NULL UNIQUE,
  fields_json TEXT NOT NULL
    CHECK (json_valid(fields_json) AND json_type(fields_json) = 'object'),
  revision INTEGER NOT NULL DEFAULT 1
    CHECK (revision >= 1),
  updated_by TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (instruction_id)
    REFERENCES task_instruction_sets (instruction_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS task_instruction_versions (
  version_id TEXT PRIMARY KEY,
  instruction_id TEXT NOT NULL,
  version_number INTEGER NOT NULL
    CHECK (version_number >= 1),
  fields_json TEXT NOT NULL
    CHECK (json_valid(fields_json) AND json_type(fields_json) = 'object'),
  content_hash TEXT NOT NULL
    CHECK (length(content_hash) = 64),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'published')),
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  published_at TEXT,
  UNIQUE (instruction_id, version_number),
  UNIQUE (instruction_id, version_id),
  FOREIGN KEY (instruction_id)
    REFERENCES task_instruction_sets (instruction_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CHECK (
    (status = 'published' AND published_at IS NOT NULL)
    OR (status <> 'published' AND published_at IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_task_instruction_versions_history
  ON task_instruction_versions (instruction_id, version_number DESC);

CREATE INDEX IF NOT EXISTS idx_task_instruction_versions_status
  ON task_instruction_versions (status, created_at);

CREATE TABLE IF NOT EXISTS task_instruction_reviews (
  review_id TEXT PRIMARY KEY,
  version_id TEXT NOT NULL,
  decision TEXT NOT NULL
    CHECK (decision IN ('approved', 'rejected')),
  reviewed_by TEXT,
  comment TEXT,
  reviewed_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (version_id)
    REFERENCES task_instruction_versions (version_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_task_instruction_reviews_version
  ON task_instruction_reviews (version_id, reviewed_at DESC);
