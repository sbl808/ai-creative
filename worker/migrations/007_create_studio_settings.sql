-- ============================================================
-- AI CREATIVE STUDIO — Migration 007: Studio Settings (Admin Control)
-- Phase 4 — Admin က Code မပြင်ဘဲ Studio ကို ON/OFF ပြုလုပ်နိုင်ရန်
-- (Registry ထဲက enabled flag ကို Database မှ Override လုပ်သည်)
-- ============================================================

CREATE TABLE IF NOT EXISTS studio_settings (
  studio_id TEXT PRIMARY KEY,
  enabled INTEGER DEFAULT 1,
  updated_at TEXT
);
