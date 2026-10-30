-- Phase 1 additive model metadata; preserves existing model rows and IDs.
ALTER TABLE ai_models ADD COLUMN provider TEXT NOT NULL DEFAULT 'gemini';
ALTER TABLE ai_models ADD COLUMN capabilities_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE ai_models ADD COLUMN supported_tasks_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE ai_models ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
UPDATE ai_models SET capabilities_json='["text-generation","text-revision","multimodal-input"]', supported_tasks_json='["story.text","content.text","short.text","image.text","shop.text"]' WHERE category='text';
UPDATE ai_models SET capabilities_json='["image-generation"]', supported_tasks_json='["story.image","content.image","short.image","image.image","shop.image"]' WHERE category='image';
UPDATE ai_models SET capabilities_json='["text-to-speech"]', supported_tasks_json='["content.voice","voice.voice"]' WHERE category='voice';
UPDATE ai_models SET capabilities_json='["audio-transcription","subtitle-generation","text-translation"]', supported_tasks_json='["content.transcribe","voice.transcribe"]' WHERE category='transcribe';
CREATE INDEX IF NOT EXISTS idx_ai_models_provider_status ON ai_models (provider, status);
