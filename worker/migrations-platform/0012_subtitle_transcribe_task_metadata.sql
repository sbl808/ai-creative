-- Append subtitle transcription support to existing Platform model rows.
-- Preserve all existing task entries and Admin-managed model settings.
-- Invalid or non-array metadata is left untouched for explicit review.

UPDATE ai_models
SET supported_tasks_json = json_insert(
  supported_tasks_json,
  '$[#]',
  'subtitle.transcribe'
)
WHERE category = 'transcribe'
  AND CASE
    WHEN json_valid(supported_tasks_json) THEN
      json_type(supported_tasks_json) = 'array'
      AND NOT EXISTS (
        SELECT 1
        FROM json_each(supported_tasks_json)
        WHERE value = 'subtitle.transcribe'
      )
    ELSE 0
  END;
