-- ============================================================
-- AI CREATIVE STUDIO — Migration 010 (Phase C)
-- AI Models ထိန်းချုပ်မှု — Admin မှ Code မပြင်ဘဲ ထည့်/ပြင်/ဖွင့်/ပိတ်/ဖျက် လုပ်နိုင်သည်
-- Registry (config/models.js) ၏ မူလပုံသေ ၃ ခုကို Seed ထည့်ပေးသည်
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_models (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'text',
  enabled INTEGER NOT NULL DEFAULT 1,
  is_default INTEGER NOT NULL DEFAULT 0,
  plan_access TEXT NOT NULL DEFAULT 'FREE',
  updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_ai_models_category ON ai_models (category);

INSERT OR IGNORE INTO ai_models (id, name, category, enabled, is_default, plan_access, updated_at) VALUES
('gemini-3.5-flash-lite', 'သာမန်', 'text', 1, 1, 'FREE', datetime('now')),
('gemini-3.1-flash-lite-image', 'သာမန်', 'image', 1, 1, 'FREE', datetime('now')),
('gemini-2.5-flash-preview-tts', 'သာမန်', 'voice', 1, 1, 'FREE', datetime('now')),
('gemini-3.5-transcribe', 'သာမန်', 'transcribe', 1, 1, 'FREE', datetime('now'));
