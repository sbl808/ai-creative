// AI Creative Studio — Voice Studio Backend 
// Studio Isolation: ဤ File သည် Voice Studio နှင့်သာ သက်ဆိုင်သည်။
// အခြား Studio (Content/Story/Short/Image/Shop) ကို မထိခိုက်စေရ။
// Shared Logic (AI Call, CMS, WAV) ကို core/ မှ ခေါ်သုံးသည်။

import { getCMSData, buildSystemPrompt } from '../core/cms.js';
import { callGeminiText, callGeminiMultimodal, callGeminiTTS } from '../core/ai.js';
import { resolveModel } from '../core/aiModels.js';
import { pcmToWavBase64 } from '../core/utilities.js';

const CMS_STUDIO = 'VOICE';

// ============================================================
// Tab 1 — Text → Voice (TTS)
// Gemini TTS မှ L16 PCM ကို WAV အဖြစ် ပြောင်းပြီး ပြန်ပေးသည်
// ============================================================
export async function generateVoiceAudio(env, { text, voiceName, apiKey, model, plan }) {
  if (!text || !String(text).trim()) throw new Error('missing_text');
  const tts = await callGeminiTTS(env, {
    text: String(text).trim(),
    voiceName: voiceName || 'Kore',
    apiKey,
    model: await resolveModel(env, 'voice', plan, model),
  });
  const wavBase64 = pcmToWavBase64(tts.data, 24000, 1, 16);
  return { data: wavBase64, mimeType: 'audio/wav' };
}

// ============================================================
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
  const text = await callGeminiMultimodal(env, {
    model: await resolveModel(env, 'transcribe', plan, model),
    prompt,
    images: [{ mimeType: mimeType || 'audio/mpeg', base64: audioBase64 }],
    apiKey,
  });
  if (!text || !String(text).trim()) throw new Error('empty_transcription');
  return { text };
}

// ============================================================
// Tab 1 & 2 — SRT Subtitle from Audio (PRO only)
// CMS VOICE/PRO/3 က Line-Splitting Rule အဖြစ် သုံးသည်
// ============================================================
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
export function buildVoiceSrtInstruction(lineRule, knownText) {
  const text = knownText == null ? '' : String(knownText).trim().slice(0, 20000);
  if (!text) {
    return (
      'အောက်ပါ Audio ကို SRT (SubRip Subtitle) format အတိုင်း Transcribe လုပ်ပါ။ ' +
      'Audio ရဲ့ speech pacing ကို ကြည့်ပြီး Timestamp ကို အကြမ်းဖျင်း ခန့်မှန်းပါ။\n\n' +
      lineRule +
      '\n\nSRT format text ကိုသာ ပြန်ပေးပါ၊ ရှင်းလင်းချက် မထည့်ပါနှင့်။'
    );
  }
  return (
    'ပါလာသော Audio သည် အောက်ပါ မူရင်းစာသားကို ဖတ်ထားသော အသံဖြစ်သည်။ ' +
    'မူရင်းစာသားကိုသာ အမှန်အဖြစ် အသုံးပြုပါ — စာလုံး၊ စာလုံးပေါင်း၊ ပုဒ်ဖြတ်ပုဒ်ရပ်ကို ' +
    'မပြောင်း၊ မထည့်၊ မဖျက်ပါနှင့်။ Audio ကို Timestamp ခန့်မှန်းရန်အတွက်သာ (speech pacing ကြည့်၍) သုံးပါ။ ' +
    'ရလဒ်ကို SRT (SubRip Subtitle) format ဖြင့် ပေးပါ။\n\n' +
    lineRule +
    '\n\nမူရင်းစာသား:\n"""\n' + text + '\n"""' +
    '\n\nSRT format text ကိုသာ ပြန်ပေးပါ၊ ရှင်းလင်းချက် မထည့်ပါနှင့်။'
  );
}

export async function generateVoiceSrt(env, { audioBase64, mimeType, type, plan, apiKey, model, knownText }) {
  if (!audioBase64) throw new Error('missing_audio');
  let lineRule = '';
  try {
    const c = await getCMSData(env, CMS_STUDIO, 'PRO', '3');
    if (c) lineRule = buildSystemPrompt(c);
  } catch (e) { /* CMS မရှိရင် Default သုံးသည် */ }
  if (!lineRule || !lineRule.trim()) lineRule = DEFAULT_LINE_RULE;

  const instruction = buildVoiceSrtInstruction(lineRule, knownText);

  const srt = await callGeminiMultimodal(env, {
    model: await resolveModel(env, 'transcribe', plan, model),
    prompt: instruction,
    images: [{ mimeType: mimeType || 'audio/mpeg', base64: audioBase64 }],
    apiKey,
  });
  if (!srt || !String(srt).trim()) throw new Error('empty_transcription');
  return { srt };
}

// ============================================================
// Tab 1 & 2 — Translate SRT Text (PRO only)
// ============================================================
export async function translateVoiceSrt(env, { srtText, direction, type, plan, apiKey, model }) {
  if (!srtText || !String(srtText).trim()) throw new Error('missing_srt');
  const dir = direction || 'MY_TO_CN';

  let langInstruction;
  if (dir === 'MY_TO_CN') {
    langInstruction =
      'အောက်ပါ SRT ထဲက Text များသည် မြန်မာဘာသာ ဖြစ်ပါသည်။ Text line တစ်ကြောင်းစီအောက်မှာ ' +
      'ယင်းစာကြောင်း၏ တရုတ်ဘာသာပြန် line တစ်ကြောင်းကို ထပ်ထည့်ပါ။';
  } else {
    langInstruction =
      'အောက်ပါ SRT ထဲက Text များသည် တရုတ်ဘာသာ ဖြစ်ပါသည်။ Text line တစ်ကြောင်းစီအောက်မှာ ' +
      'ယင်းစာကြောင်း၏ မြန်မာဘာသာပြန် line တစ်ကြောင်းကို ထပ်ထည့်ပါ။ TEXT LINE WRAPPING RULE: ' +
      'ဒီ မြန်မာဘာသာပြန် Line ကို စာလုံးရေ ၁၅ လုံးထက် မကျော်စေရပါ။ ၁၅ လုံးကျော်ရင် Number/Timestamp ' +
      'အသစ် ထပ်မဖန်တီးဘဲ Subtitle block တူညီတဲ့ အတွင်းမှာပဲ ဘာသာပြန် line ကို line အသစ် ထပ်ခွဲပြီး ရေးပါ။';
  }

  const instruction =
    'အောက်ပါ SRT (SubRip Subtitle) Text ကို ဖတ်ပါ။ ' + langInstruction + ' ' +
    'SRT Number (1, 2, 3...) နှင့် Timestamp (00:00:00,000 --> 00:00:03,000 ပုံစံ) များကို ' +
    'လုံးဝ မပြောင်းလဲပါနှင့် — မူရင်းအတိုင်းသာ ထားပါ။ မူရင်း Text Line ကိုလည်း မပြောင်းလဲပါနှင့်၊ ' +
    'ဖျက်လည်း မဖျက်ပါနှင့်။ Format ဥပမာ:\n' +
    '1\n00:00:00,000 --> 00:00:03,000\n[မူရင်းစာကြောင်း]\n[ဘာသာပြန်စာကြောင်း]\n\n' +
    '2\n00:00:03,000 --> 00:00:06,000\n[မူရင်းစာကြောင်း]\n[ဘာသာပြန်စာကြောင်း]\n\n' +
    'SRT format text ကိုသာ ပြန်ပေးပါ၊ ရှင်းလင်းချက် (explanation) မထည့်ပါနှင့်။\n\n' +
    'SRT:\n' + String(srtText).trim();

  const srt = await callGeminiText(env, { model: await resolveModel(env, 'transcribe', plan, model), prompt: instruction, apiKey });
  return { srt };
}
