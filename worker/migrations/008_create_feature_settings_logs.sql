-- ============================================================
-- AI CREATIVE STUDIO — Migration 008: Feature Settings + Admin Logs
-- Phase 5 — Admin Panel (Rules 15 & 18)
--   feature_settings : Free/Pro Feature ကို Code မပြင်ဘဲ ထိန်းချုပ်နိုင်ရန်
--   admin_logs       : Admin ၏ အရေးကြီး လုပ်ဆောင်ချက်များ (Log Audit)
-- ============================================================

CREATE TABLE IF NOT EXISTS feature_settings (
  feature_id TEXT PRIMARY KEY,
  enabled INTEGER DEFAULT 1,
  access TEXT DEFAULT 'FREE',
  limit_value INTEGER DEFAULT 0,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS admin_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_email TEXT,
  action TEXT,
  detail TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
