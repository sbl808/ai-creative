-- ============================================================
-- 013 — Transcribe Model ပြောင်းခြင်း
-- ------------------------------------------------------------
-- အကြောင်း: gemini-3.5-transcribe က HTTP 200 + candidates[0].content.parts=[{}]
--            (output tokens 0) ဖြင့် ဗလာ ပြန်ပေးသော upstream bug
--            (Google AI Developers Forum, 2026-08-28 — "returns empty transcription,
--             HTTP 200, zero output tokens on all documented REST paths";
--             usageMetadata မှာ audio tokens ဝင်သော်လည်း output မရှိ)။
-- ဖြေရှင်း: Audio+Text multimodal အလုပ်ဖြစ်ကြောင်း အထောက်အထားရှိသော
--           gemini-3.6-flash (Stable) ကို transcribe category default ပြုလုပ်သည်။
-- Idempotent — ထပ်လုပ်လည်း မပျက်စီး။
-- ============================================================

-- 1) ယခင် ပျက်နေသော transcribe row ဖယ်ရှား
DELETE FROM ai_models WHERE category='transcribe' AND id='gemini-3.5-transcribe';

-- 2) အသစ် row ထည့် (ဟောင်း/disabled legacy row ရှိပါက IGNORE → အဆင့် 3 တွင် ပြန်ဖွင့်)
INSERT OR IGNORE INTO ai_models (id, name, category, enabled, is_default, plan_access, updated_at) VALUES
('gemini-3.6-flash', 'သာမန်', 'transcribe', 1, 1, 'FREE', datetime('now'));

-- 3) row ရှိပြီးသား (ဟောင်း/disabled) ဖြစ်ခဲ့လျှင် transcribe category သို့ ပြန်သတ်မှတ် + ဖွင့် + default
UPDATE ai_models SET category='transcribe', enabled=1, is_default=1, name='သာမန်', plan_access='FREE', updated_at=datetime('now')
WHERE id='gemini-3.6-flash';

-- 4) transcribe category ထဲ အခြား row မှ default မဖြစ်စေရန် (ဘေးကင်းရန်)
UPDATE ai_models SET is_default=0, updated_at=datetime('now')
WHERE category='transcribe' AND id!='gemini-3.6-flash';
