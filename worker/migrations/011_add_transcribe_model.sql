-- ============================================================
-- AI Creative Studio — Migration 011 (Model အသစ် စနစ် မွမ်းမံမှု)
-- ------------------------------------------------------------
-- 010 ပြီးနောက် မွမ်းမံမှု:
--   1) transcribe (အသံ → စာသား) Category အသစ် + Model ထည့်သည်
--   2) အဟောင်း Model IDs (010 အစောပိုင်း Seed) ရှိခဲ့လျှင် ပိတ်ပေးသည်
--      (Registry နှင့် ကိုက်ညီစေရန် — Database က Registry ထက် ဦးစားပေးသောကြောင့်)
-- Idempotent — ထပ်လုပ်လည်း မပျက်စီး
-- ============================================================

-- 1) Category အသစ် Model (ထပ်တူပါက ignore)
INSERT OR IGNORE INTO ai_models (id, name, category, enabled, is_default, plan_access, updated_at) VALUES
('gemini-3.5-transcribe', 'သာမန်', 'transcribe', 1, 1, 'FREE', datetime('now'));

-- 2) အဟောင်း Model IDs များ (010 Seed အဟောင်း) ရှိခဲ့လျှင် ပိတ်ပစ်သည်
UPDATE ai_models SET enabled = 0, updated_at = datetime('now')
WHERE id IN ('gemini-3.6-flash', 'gemini-3.1-flash-image', 'gemini-3.1-flash-tts-preview')
  AND enabled = 1;
