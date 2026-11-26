-- Seed every current Studio and Feature registry entry into Platform D1.
-- These rows are required because settings readers fail closed once the tables
-- contain any persisted settings. INSERT OR IGNORE preserves Admin overrides.
--
-- Keep the legacy gemini-3.5-transcribe row from 0006 intact. The current code
-- registry uses gemini-3.6-flash; seed that canonical ID without overwriting a
-- pre-existing Admin-managed row.

INSERT OR IGNORE INTO studio_settings (studio_id, enabled, updated_at)
VALUES
  ('story', 1, datetime('now')),
  ('content', 1, datetime('now')),
  ('short', 1, datetime('now')),
  ('image', 1, datetime('now')),
  ('voice', 1, datetime('now')),
  ('subtitle', 1, datetime('now')),
  ('shop', 1, datetime('now'));

INSERT OR IGNORE INTO feature_settings
  (feature_id, enabled, access, limit_value, updated_at)
VALUES
  ('generate', 1, 'FREE', 0, datetime('now')),
  ('ideas.generate', 1, 'FREE', 0, datetime('now')),
  ('content.generate', 1, 'FREE', 0, datetime('now')),
  ('content.revise', 1, 'FREE', 0, datetime('now')),
  ('content.tts', 1, 'FREE', 0, datetime('now')),
  ('content.video', 1, 'FREE', 0, datetime('now')),
  ('content.video_image', 1, 'FREE', 0, datetime('now')),
  ('content.srt', 1, 'FREE', 0, datetime('now')),
  ('content.translate_srt', 1, 'FREE', 0, datetime('now')),
  ('story.generate', 1, 'FREE', 0, datetime('now')),
  ('story.revise', 1, 'FREE', 0, datetime('now')),
  ('story.video', 1, 'PRO', 0, datetime('now')),
  ('story.video_image', 1, 'PRO', 0, datetime('now')),
  ('short.generate', 1, 'FREE', 0, datetime('now')),
  ('short.revise', 1, 'FREE', 0, datetime('now')),
  ('short.video', 1, 'FREE', 0, datetime('now')),
  ('short.video_image', 1, 'FREE', 0, datetime('now')),
  ('image.prompt', 1, 'FREE', 0, datetime('now')),
  ('image.ad_prompt', 1, 'FREE', 0, datetime('now')),
  ('image.generate', 1, 'FREE', 0, datetime('now')),
  ('voice.tts', 1, 'FREE', 0, datetime('now')),
  ('voice.transcribe', 1, 'FREE', 0, datetime('now')),
  ('voice.srt', 1, 'PRO', 0, datetime('now')),
  ('voice.translate_srt', 1, 'PRO', 0, datetime('now')),
  ('subtitle.transcribe', 1, 'FREE', 0, datetime('now')),
  ('subtitle.srt', 1, 'PRO', 0, datetime('now')),
  ('subtitle.translate_srt', 1, 'PRO', 0, datetime('now')),
  ('shop.content_generate', 1, 'FREE', 0, datetime('now')),
  ('shop.content_revise', 1, 'FREE', 0, datetime('now')),
  ('shop.video_generate', 1, 'FREE', 0, datetime('now')),
  ('shop.video_image', 1, 'FREE', 0, datetime('now'));

INSERT OR IGNORE INTO ai_models
  (id, name, category, enabled, is_default, plan_access, updated_at,
   provider, capabilities_json, supported_tasks_json, status)
VALUES
  ('gemini-3.6-flash', 'သာမန်', 'transcribe', 1, 1, 'FREE', datetime('now'),
   'gemini',
   '["audio-transcription","subtitle-generation","text-translation"]',
   '["content.transcribe","voice.transcribe","subtitle.transcribe"]',
   'active');
