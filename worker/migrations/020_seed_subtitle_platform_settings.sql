-- Seed Subtitle Studio platform settings for existing installations.
-- INSERT OR IGNORE preserves any Admin-configured values already stored.
-- This migration changes platform configuration only; it does not store user content.

INSERT OR IGNORE INTO studio_settings (studio_id, enabled, updated_at)
VALUES ('subtitle', 1, datetime('now'));

INSERT OR IGNORE INTO feature_settings (feature_id, enabled, access, limit_value, updated_at)
VALUES ('subtitle.transcribe', 1, 'FREE', 0, datetime('now'));
