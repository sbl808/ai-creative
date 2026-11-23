// AI Creative Studio — Subtitle Studio Backend
// Subtitle workflows are isolated from Voice Studio (TTS only).

import { getCMSData } from '../cms/repositories/index.js';
import { buildSrtInstruction } from '../media-adapters/prompts/srt-prompt.js';
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

const DEFAULT_LINE_RULE =
  'TEXT LINE RULE (အရေးကြီး): Subtitle Block တစ်ခုစီရဲ့ Text Line ကို ' +
  "'အဓိပ္ပါယ်ပြည့်စုံပြီး အလယ်အလတ် ရှည်လျားမှုရှိသော စကားစု (Phrase)' တစ်ခုအလိုက်သာ ခွဲပါ — " +
  'Character အရေအတွက် ရေတွက်၍ လုံးဝ မခွဲပါနှင့်။\n' +
  '- အရမ်းတိုတိုမဖြစ်စေရ: စကားလုံးတစ်လုံး/နှစ်လုံးတည်းနဲ့ Phrase လုံးဝ မဖန်တီးပါနှင့်။\n' +
  '- အရမ်းရှည်လျားလည်း မဖြစ်စေရ: Sentence တစ်ခုလုံး/Clause များစွာ ပေါင်းထားသော ရှည်လျားသည့် ' +
  'Phrase လည်း လုံးဝ မဖန်တီးပါနှင့်။\n' +
  '- ရည်ရွယ်ချက်: Phrase တစ်ခုစီသည် ပုံမှန် Speech ဖြင့် ၁.၅-၃ စက္ကန့်ခန့် ပြောသည့် ပမာဏ ' +
  '(ခန့်မှန်းခြေ စကားလုံး 4-8 လုံး) ရှိသင့်သည်။ Sentence ရှည်ရင် Comma/Breath Pause/Clause ' +
  'အဆုံးတို့တွင် သဘာဝကျစွာ ပိုင်းခြားပါ။\n\n' +
  'ဥပမာ (မှားသော ပုံစံ — Phrase အလွန် တိုနေသည်၊ ဒီလို လုံးဝ မလုပ်ပါနှင့်):\n' +
  '1\n00:00:00,000 --> 00:00:00,700\nဒီနေ့\n\n2\n00:00:00,700 --> 00:00:01,400\nကျွန်တော်တို့\n\n' +
  '3\n00:00:01,400 --> 00:00:02,100\nAI Voice\n\n4\n00:00:02,100 --> 00:00:02,800\nဖန်တီးပြီး\n\n' +
  'ဥပမာ (မှားသော ပုံစံ — Phrase အလွန် ရှည်နေသည်၊ ဒီလို လုံးဝ မလုပ်ပါနှင့်):\n' +
  '1\n00:00:00,000 --> 00:00:05,000\nဒီနေ့ ကျွန်တော်တို့ AI Voice ဖန်တီးပြီး Subtitle လေးတွေ ' +
  'အများကြီး ဆက်တိုက် လုပ်ကြရအောင်\n\n' +
  'ဥပမာ (မှန်ကန်သော ပုံစံ — Phrase အလယ်အလတ်ရှည်လျား၊ ဒီပုံစံအတိုင်း လုပ်ပါ):\n' +
  '1\n00:00:00,000 --> 00:00:01,500\nဒီနေ့ ကျွန်တော်တို့\n\n' +
  '2\n00:00:01,500 --> 00:00:03,000\nAI Voice ဖန်တီးပြီး\n\n' +
  '3\n00:00:03,000 --> 00:00:04,500\nSubtitle လေးတွေ လုပ်ကြမယ်';

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
