-- Final clean-baseline schema for the platform AI model registry.
-- Preserve the existing model identifiers and capability metadata.

CREATE TABLE IF NOT EXISTS ai_models (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'text',
  enabled INTEGER NOT NULL DEFAULT 1,
  is_default INTEGER NOT NULL DEFAULT 0,
  plan_access TEXT NOT NULL DEFAULT 'FREE',
  updated_at TEXT,
  provider TEXT NOT NULL DEFAULT 'gemini',
  capabilities_json TEXT NOT NULL DEFAULT '[]',
  supported_tasks_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active'
);

CREATE INDEX IF NOT EXISTS idx_ai_models_category
  ON ai_models (category);

CREATE INDEX IF NOT EXISTS idx_ai_models_provider_status
  ON ai_models (provider, status);

INSERT OR IGNORE INTO ai_models
  (id, name, category, enabled, is_default, plan_access, updated_at,
   provider, capabilities_json, supported_tasks_json, status)
VALUES
  ('gemini-3.5-flash-lite', 'သာမန်', 'text', 1, 1, 'FREE', datetime('now'),
   'gemini',
   '["text-generation","text-revision","multimodal-input"]',
   '["story.text","content.text","short.text","image.text","shop.text"]',
   'active'),
  ('gemini-3.1-flash-lite-image', 'သာမန်', 'image', 1, 1, 'FREE', datetime('now'),
   'gemini',
   '["image-generation"]',
   '["story.image","content.image","short.image","image.image","shop.image"]',
   'active'),
  ('gemini-2.5-flash-preview-tts', 'သာမန်', 'voice', 1, 1, 'FREE', datetime('now'),
   'gemini',
   '["text-to-speech"]',
   '["content.voice","voice.voice"]',
   'active'),
  ('gemini-3.5-transcribe', 'သာမန်', 'transcribe', 1, 1, 'FREE', datetime('now'),
   'gemini',
   '["audio-transcription","subtitle-generation","text-translation"]',
   '["content.transcribe","voice.transcribe"]',
   'active');
