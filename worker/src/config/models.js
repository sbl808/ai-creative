// ============================================================
// AI CREATIVE STUDIO — AI Model Registry (Phase C — Rule: Admin AI Models)
// ------------------------------------------------------------
// Model များ၏ မူလပုံသေ (Default) စာရင်း — Admin Panel မှ Database
// (ai_models) တွင် ထည့်/ပြင်/ဖျက် လုပ်နိုင်သည်။
// Database တွင် Row မရှိလျှင် / ချို့ယွင်းလျှင် ဤ Registry ကို အရံအဖြစ် သုံးသည်။
// ============================================================

export const AI_MODEL_REGISTRY = [
  { id: 'gemini-3.5-flash-lite', name: 'သာမန်', category: 'text', enabled: true, is_default: true, plan_access: 'FREE' },
  { id: 'gemini-3.1-flash-lite-image', name: 'သာမန်', category: 'image', enabled: true, is_default: true, plan_access: 'FREE' },
  { id: 'gemini-2.5-flash-preview-tts', name: 'သာမန်', category: 'voice', enabled: true, is_default: true, plan_access: 'FREE' },
  { id: 'gemini-3.5-transcribe', name: 'သာမန်', category: 'transcribe', enabled: true, is_default: true, plan_access: 'FREE' },
];

// Category တစ်ခုချင်းစီအတွက် နောက်ဆုံး အရံ Model (Registry မှာလည်း မရှိတဲ့အခါသာ)
export const DEFAULT_MODELS = {
  text: 'gemini-3.5-flash-lite',
  image: 'gemini-3.1-flash-lite-image',
  voice: 'gemini-2.5-flash-preview-tts',
  transcribe: 'gemini-3.5-transcribe',
};

export const MODEL_CATEGORIES = ['text', 'image', 'voice', 'transcribe'];
