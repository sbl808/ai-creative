-- ============================================================
-- AI CREATIVE STUDIO — Migration 005: Personal User System
-- Phase 3 — User Settings + User Preferences
-- (Existing tables များကို မဖျက်ဘဲ အသစ်သာ ထည့်သည်)
-- ============================================================

-- User Settings — အကောင့်အခြေခံ ဆက်တင်များ (Default Studio / Voice / Model / Language / Theme)
CREATE TABLE IF NOT EXISTS user_settings (
  user_id INTEGER PRIMARY KEY,
  default_studio TEXT DEFAULT 'story',
  default_voice TEXT DEFAULT 'Kore',
  default_model TEXT DEFAULT 'gemini-3.6-flash',
  language TEXT DEFAULT 'my',
  theme TEXT DEFAULT 'dark',
  updated_at TEXT
);

-- User Preferences — နောက်ပိုင်း တိုးချဲ့နိုင်သော Key-Value ဆက်တင်များ
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id INTEGER NOT NULL,
  pref_key TEXT NOT NULL,
  pref_value TEXT,
  updated_at TEXT,
  PRIMARY KEY (user_id, pref_key)
);
