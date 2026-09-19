// ============================================================
// AI CREATIVE STUDIO — FEATURE REGISTRY (Phase 5 — Rule 15)
// ------------------------------------------------------------
// Free/Pro Feature ကို Code မှာ hard-code မလုပ်ဘဲ ဤနေရာတွင် သတ်မှတ်ပြီး
// Admin Panel မှ Database (feature_settings) ဖြင့် Override လုပ်နိုင်သည်။
//
// access ၂ မျိုး:
//   'FREE' — Free User က Type 1 ကိုသာ သုံးနိုင် (Type 2-5 → PRO)
//   'PRO'  — Pro User များသာ သုံးနိုင်
// (မူလ Source ၏ လက်ရှိ Logic အတိုင်း အတိအကျ မှတ်တမ်းထားသည်)
// ============================================================

export const FEATURE_REGISTRY = {
  'generate': { name: 'Generic Generate', nameMy: 'Generate (အထွေထွေ)', access: 'FREE', desc: 'Generic AI Generate' },

  'content.generate': { name: 'Content Generate', nameMy: 'Content ရေးသားခြင်း', access: 'FREE', desc: 'Content Studio — Tab 1' },
  'content.revise': { name: 'Content Revise', nameMy: 'Content ပြင်ဆင်ခြင်း', access: 'FREE', desc: 'Content Studio — Tab 2' },
  'content.tts': { name: 'Content TTS', nameMy: 'အသံပြောင်းခြင်း (TTS)', access: 'FREE', desc: 'Content Studio — Tab 3' },
  'content.video': { name: 'Content Video Plan', nameMy: 'Video Plan ရေးခြင်း', access: 'FREE', desc: 'Content Studio — Tab 4' },
  'content.video_image': { name: 'Content Video Image', nameMy: 'Video ပုံဖန်တီးခြင်း', access: 'FREE', desc: 'Content Studio — Video Image' },
  'content.srt': { name: 'Content SRT', nameMy: 'SRT ထုတ်ခြင်း', access: 'FREE', desc: 'Content Studio — SRT' },
  'content.translate_srt': { name: 'Content Translate SRT', nameMy: 'SRT ဘာသာပြန်ခြင်း', access: 'FREE', desc: 'Content Studio — Translate SRT' },

  'story.generate': { name: 'Story Generate', nameMy: 'ဇာတ်လမ်းရေးခြင်း', access: 'FREE', desc: 'Story Studio — Tab 1' },
  'story.revise': { name: 'Story Revise', nameMy: 'ဇာတ်လမ်းပြင်ဆင်ခြင်း', access: 'FREE', desc: 'Story Studio — Tab 2' },
  'story.video': { name: 'Story Video Plan', nameMy: 'Story Video Plan', access: 'FREE', desc: 'Story Studio — Video Plan' },
  'story.video_image': { name: 'Story Video Image', nameMy: 'Story Video ပုံ', access: 'FREE', desc: 'Story Studio — Video Image' },

  'short.generate': { name: 'Short Generate', nameMy: 'Short Script ရေးခြင်း', access: 'FREE', desc: 'Short Studio — Tab 1' },
  'short.revise': { name: 'Short Revise', nameMy: 'Short ပြင်ဆင်ခြင်း', access: 'FREE', desc: 'Short Studio — Tab 2' },
  'short.video': { name: 'Short Video Plan', nameMy: 'Short Video Plan', access: 'FREE', desc: 'Short Studio — Video Plan' },
  'short.video_image': { name: 'Short Video Image', nameMy: 'Short Video ပုံ', access: 'FREE', desc: 'Short Studio — Video Image' },

  'image.prompt': { name: 'Image Prompt', nameMy: 'Image Prompt ရေးခြင်း', access: 'FREE', desc: 'Image Studio — Tab 1' },
  'image.ad_prompt': { name: 'Ad Image Prompt', nameMy: 'ကြော်ငြာပုံ Prompt', access: 'FREE', desc: 'Image Studio — Tab 2' },
  'image.generate': { name: 'Image Generate', nameMy: 'ပုံထုတ်ခြင်း', access: 'FREE', desc: 'Image Studio — Generate' },

  'voice.tts': { name: 'Voice TTS', nameMy: 'စာကို အသံပြောင်းခြင်း', access: 'FREE', desc: 'Voice Studio — Tab 1 (Text → Voice)' },
  'voice.transcribe': { name: 'Voice Transcribe', nameMy: 'အသံကို စာပြောင်းခြင်း', access: 'FREE', desc: 'Voice Studio — Tab 2' },
  'voice.srt': { name: 'Voice SRT', nameMy: 'SRT ထုတ်ခြင်း', access: 'PRO', desc: 'Voice Studio — SRT (PRO)' },
  'voice.translate_srt': { name: 'Voice Translate SRT', nameMy: 'SRT ဘာသာပြန်ခြင်း', access: 'PRO', desc: 'Voice Studio — Translate SRT (PRO)' },

  'shop.content_generate': { name: 'Shop Content Generate', nameMy: 'ဈေး Content ရေးခြင်း', access: 'FREE', desc: 'Shop Studio — Tab 1' },
  'shop.content_revise': { name: 'Shop Content Revise', nameMy: 'ဈေး Content ပြင်ဆင်ခြင်း', access: 'FREE', desc: 'Shop Studio — Tab 2' },
  'shop.video_generate': { name: 'Shop Video Plan', nameMy: 'ဈေး Video Plan', access: 'FREE', desc: 'Shop Studio — Video Plan' },
  'shop.video_image': { name: 'Shop Video Image', nameMy: 'ဈေး Video ပုံ', access: 'FREE', desc: 'Shop Studio — Video Image' },
};

export const FEATURE_ORDER = Object.keys(FEATURE_REGISTRY);
