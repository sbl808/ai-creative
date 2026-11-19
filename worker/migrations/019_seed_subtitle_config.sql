-- ============================================================
-- Migration 019: Seed Subtitle Studio platform configuration
--
-- Adds the Subtitle transcription task to the existing transcribe
-- model without replacing administrator-managed model settings.
-- Seeds the Subtitle feature only when no setting already exists.
-- User-created content is not stored by this migration.
-- ============================================================

-- Preserve existing model configuration; append only the missing task.
UPDATE ai_models
SET supported_tasks_json = json_insert(
      supported_tasks_json,
      '$[#]',
      'subtitle.transcribe'
    ),
    updated_at = datetime('now')
WHERE id = 'gemini-3.6-flash'
  AND json_valid(supported_tasks_json)
  AND NOT EXISTS (
    SELECT 1
    FROM json_each(ai_models.supported_tasks_json)
    WHERE value = 'subtitle.transcribe'
  );

-- Preserve any administrator override already saved for this feature.
INSERT OR IGNORE INTO feature_settings
  (feature_id, enabled, access, limit_value, updated_at)
VALUES
  ('subtitle.transcribe', 1, 'FREE', 0, datetime('now'));
