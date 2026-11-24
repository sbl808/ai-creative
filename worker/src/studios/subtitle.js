// AI Creative Studio — Subtitle Studio Backend
// Subtitle workflows are isolated from Voice Studio (TTS only).

import { getCMSData } from '../cms/repositories/index.js';
import { DEFAULT_LINE_RULE, buildSrtInstruction } from '../media-adapters/prompts/srt-prompt.js';
import { buildSystemPrompt } from '../cms/prompt-templates/index.js';
import { generateSubtitleSrtShared } from '../media-adapters/subtitle/srt.adapter.js';
import { translateSubtitleSrtShared } from '../media-adapters/subtitle/translation.adapter.js';
import { transcribeSubtitleAudio } from '../media-adapters/subtitle/audio.adapter.js';

const CMS_STUDIO = 'SUBTITLE';

// Tab 2 — Audio → Text (Transcribe)
// CMS VOICE prompt ကို system instruction အဖြစ် သုံးသည်
// ============================================================
export async function transcribeAudio(env, { audioBase64, mimeType, type, plan, apiKey, model }) {
  if (!audioBase64) throw new Error('missing_audio');
  const c = await getCMSData(env, CMS_STUDIO, plan, type || '1');
  const system = c ? buildSystemPrompt(c) : '';
  const prompt = system
    ? (system + '\n\nအထက်ပါ instruction အတိုင်း အောက်က Audio ကို Text အဖြစ် တိကျစွာ Transcribe လုပ်ပါ။ Transcribe လုပ်ထားသော Text ကိုသာ ပြန်ပေးပါ။')
    : 'အောက်က Audio ကို Text အဖြစ် တိကျစွာ Transcribe လုပ်ပါ။ Transcribe လုပ်ထားသော Text ကိုသာ ပြန်ပေးပါ။';
  return transcribeSubtitleAudio(env, {
    audioBase64, mimeType, plan, apiKey, model, prompt,
  });
}

// knownText (optional): Text→Voice မှ ရလာသော အသံဖြစ်ပါက မူရင်းစာသားကို အမှန်အဖြစ်သုံးပြီး
// Audio ကို Timestamp ခန့်မှန်းရန်သာ သုံးသည် (ပြန် Transcribe မလုပ်ခြင်းဖြင့် စာလုံးပေါင်း မကွဲစေရန်)။
// မပေးလျှင် အရင်အတိုင်း Audio ကို Transcribe လုပ်သည် (Shop Studio စသည့် ရှိပြီးသား ခေါ်သူများ မပြောင်း)။
export function buildSubtitleSrtInstruction(lineRule, knownText) {
  return buildSrtInstruction(lineRule, knownText);
}
export async function buildSubtitleSrtPrompt(env, knownText) {
  let lineRule = '';
  try {
    const c = await getCMSData(env, CMS_STUDIO, 'PRO', '3');
    if (c) lineRule = buildSystemPrompt(c);
  } catch (e) { /* CMS မရှိရင် Default သုံးသည် */ }
  if (!lineRule || !lineRule.trim()) lineRule = DEFAULT_LINE_RULE;
  return buildSubtitleSrtInstruction(lineRule, knownText);
}

export async function generateSubtitleSrt(env, { audioBase64, mimeType, type, plan, apiKey, model, knownText }) {
  if (!audioBase64) throw new Error('missing_audio');
  const instruction = await buildSubtitleSrtPrompt(env, knownText);
  return generateSubtitleSrtShared(env, {
    audioBase64,
    mimeType: mimeType || 'audio/mpeg',
    apiKey,
    model,
    plan,
    prompt: instruction,
  });
}

export async function translateSubtitleSrt(env, { srtText, direction, type, plan, apiKey, model }) {
  if (!srtText || !String(srtText).trim()) throw new Error('missing_srt');
  return translateSubtitleSrtShared(env, { srtText, direction, type, plan, apiKey, model });
}
