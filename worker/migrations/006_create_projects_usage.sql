-- ============================================================
-- AI CREATIVE STUDIO — Migration 006: Projects + Usage + Favorites
-- Phase 3 — Project System (DB), Usage Tracking, Creation Favorite
-- ============================================================

-- Projects — User ကိုယ်ပိုင် Project များ (နောက်ပိုင်း Creations များနှင့် ချိတ်ဆက်မည်)
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_at TEXT,
  updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id, created_at DESC);

-- Usage — User တစ်ယောက်ချင်းစီ၏ AI/Image/Voice အသုံးပြုမှု မှတ်တမ်း
-- (Admin Panel အတွက် Statistics ကို Phase 5 တွင် ဤ Table မှ ထုတ်ပါမည်)
CREATE TABLE IF NOT EXISTS usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  category TEXT NOT NULL,
  amount INTEGER DEFAULT 1,
  created_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_usage_user ON usage(user_id, created_at);

-- Creations အတွက် Favorite ခလုတ် (မူလ Table ကို မပြောင်း — Column အသစ်သာ ထည့်သည်)
ALTER TABLE creations ADD COLUMN is_favorite INTEGER DEFAULT 0;
