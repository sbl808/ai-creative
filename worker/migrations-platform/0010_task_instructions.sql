-- Platform-managed trusted instructions only.
-- User-created prompts, projects, generated content, and history remain in IndexedDB.
-- Actor columns are retained for schema compatibility but must remain NULL:
-- no admin email or admin/user identifier is stored.

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
  updated_by TEXT CHECK (updated_by IS NULL),
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
  created_by TEXT CHECK (created_by IS NULL),
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
  reviewed_by TEXT CHECK (reviewed_by IS NULL),
  comment TEXT,
  reviewed_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (version_id)
    REFERENCES task_instruction_versions (version_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_task_instruction_reviews_version
  ON task_instruction_reviews (version_id, reviewed_at DESC);

CREATE TRIGGER IF NOT EXISTS trg_task_instruction_version_content_immutable
BEFORE UPDATE OF instruction_id, version_number, fields_json, content_hash, created_by, created_at
ON task_instruction_versions
BEGIN
  SELECT RAISE(ABORT, 'task_instruction_version_immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_task_instruction_version_status_transition
BEFORE UPDATE OF status ON task_instruction_versions
WHEN NOT (
  OLD.status = NEW.status
  OR (OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected'))
  OR (OLD.status = 'approved' AND NEW.status = 'published')
)
BEGIN
  SELECT RAISE(ABORT, 'invalid_task_instruction_version_transition');
END;

CREATE TRIGGER IF NOT EXISTS trg_task_instruction_published_at_immutable
BEFORE UPDATE OF published_at ON task_instruction_versions
WHEN OLD.status = 'published' AND NEW.published_at IS NOT OLD.published_at
BEGIN
  SELECT RAISE(ABORT, 'task_instruction_published_at_immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_task_instruction_active_version_insert
BEFORE INSERT ON task_instruction_sets
WHEN NEW.active_version_id IS NOT NULL
 AND NOT EXISTS (
   SELECT 1 FROM task_instruction_versions
   WHERE instruction_id = NEW.instruction_id
     AND version_id = NEW.active_version_id
     AND status = 'published'
 )
BEGIN
  SELECT RAISE(ABORT, 'active_task_instruction_version_must_be_published');
END;

CREATE TRIGGER IF NOT EXISTS trg_task_instruction_active_version_update
BEFORE UPDATE OF active_version_id ON task_instruction_sets
WHEN NEW.active_version_id IS NOT NULL
 AND NOT EXISTS (
   SELECT 1 FROM task_instruction_versions
   WHERE instruction_id = NEW.instruction_id
     AND version_id = NEW.active_version_id
     AND status = 'published'
 )
BEGIN
  SELECT RAISE(ABORT, 'active_task_instruction_version_must_be_published');
END;

CREATE TRIGGER IF NOT EXISTS trg_task_instruction_reviews_no_update
BEFORE UPDATE ON task_instruction_reviews
BEGIN
  SELECT RAISE(ABORT, 'task_instruction_reviews_are_append_only');
END;

CREATE TRIGGER IF NOT EXISTS trg_task_instruction_reviews_no_delete
BEFORE DELETE ON task_instruction_reviews
BEGIN
  SELECT RAISE(ABORT, 'task_instruction_reviews_are_append_only');
END;
