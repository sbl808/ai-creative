-- ============================================================
-- AI Creative Studio — Migration 019
-- Enable Subtitle Studio audio transcription in the model registry.
--
-- Additive and idempotent:
-- - preserves existing supported task entries
-- - appends subtitle.transcribe only when it is not already present
-- - changes platform model configuration only; no user content is stored
-- - does not execute against a remote Cloudflare D1 database
-- ============================================================

UPDATE ai_models
SET supported_tasks_json = json_insert(
  supported_tasks_json,
  '$[#]',
  'subtitle.transcribe'
)
WHERE category = 'transcribe'
  AND json_valid(supported_tasks_json)
  AND NOT EXISTS (
    SELECT 1
    FROM json_each(ai_models.supported_tasks_json)
    WHERE value = 'subtitle.transcribe'
  );
