-- Add Subtitle transcription support to persisted platform AI model metadata.
-- Preserve existing task capabilities and avoid duplicate entries on reruns.
-- This migration changes platform configuration only; it does not store user content.

UPDATE ai_models
SET supported_tasks_json = json_insert(
  supported_tasks_json,
  '$[#]',
  'subtitle.transcribe'
)
WHERE category = 'transcribe'
  AND json_valid(supported_tasks_json)
  AND json_type(supported_tasks_json) = 'array'
  AND NOT EXISTS (
    SELECT 1
    FROM json_each(ai_models.supported_tasks_json)
    WHERE value = 'subtitle.transcribe'
  );
