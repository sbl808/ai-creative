-- ============================================================
-- AI CREATIVE STUDIO — Migration 009: Personal Login (Phase 12)
-- users table တွင် Name + Password Hash ထည့်သည်
-- (Password ကို Plain Text ဖြင့် ဘယ်တော့မှ မသိမ်းပါ — PBKDF2 Hash သာ သိမ်းသည်)
-- ============================================================

ALTER TABLE users ADD COLUMN name TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN password_hash TEXT NOT NULL DEFAULT '';
