-- AI Creative Studio — 11-Layer Brain CMS (additive, Story Studio scope)
-- GLOBAL_BRAIN / STORY_TYPES / STORY_VIDEO များကို scope+module+type+key ဖြင့် သီးခြားစီမံနိုင်ရန်။
-- Knowledge Isolation Rule (§5): loader သည် selected scope/module/type ရှိ active rows များကိုသာ
-- load လုပ်မည် — အခြား Story Type / Visual Style / Video Workflow ၏ knowledge ကို မထည့်ရ။
-- cms_prompts ကို မပြောင်းပါ (Content/Short/Shop/Voice/Image များအတွက် legacy path ဆက်အလုပ်လုပ်မည်)။
CREATE TABLE IF NOT EXISTS cms_brain (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scope TEXT NOT NULL,
  module TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'BASE',
  plan TEXT NOT NULL DEFAULT 'FREE',
  key TEXT NOT NULL,
  value TEXT,
  active INTEGER DEFAULT 1,
  version INTEGER DEFAULT 1,
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(scope, module, type, plan, key)
);
CREATE INDEX IF NOT EXISTS idx_cms_brain_lookup ON cms_brain(scope, module, type, active);
