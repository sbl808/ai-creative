// AI Creative Studio — Image Studio Backend
// Studio Isolation: ဤ File သည် Image Studio နှင့်သာ သက်ဆိုင်သည်။
// အခြား Studio ကို မထိခိုက်စေရ။
// IMAGE MAP — /api/studio/image/prompt က AI အား structured MAP
// (subject / style / environment / lighting / camera / finalPrompt) JSON ပြန်ထုတ်စေသည်။
// ရှိပြီးသား API contract (prompt field) ကို မပျက်စေဘဲ map field ထပ်ဖြည့်သည်။

import { getCMSData, buildSystemPrompt } from '../core/cms.js';
import { callGeminiText, callGeminiImage, callGeminiMultimodal } from '../core/ai.js';
import { resolveModel } from '../core/aiModels.js';

const CMS_IMAGE = 'IMAGE';
const CMS_IMAGEAD = 'IMAGEAD';

// AI ကို ဖွဲ့စည်းတည်ဆောက်ထားသော JSON (IMAGE MAP) ပြန်ထုတ်ရန် ညွှန်ကြားချက်
const MAP_INSTRUCTION = [
  'OUTPUT FORMAT (အလွန်အရေးကြီး — ဤအတိုင်း အတိအကျ ထုတ်ပေးပါ):',
  'Return ONLY a single valid JSON object. No markdown, no code fences, no extra text.',
  'Use EXACTLY this structure:',
  '{',
  '  "subject": "ပုံထဲတွင် အဓိက ပါဝင်မည့် အရာ/လူ — အသက်၊ ကျား/မ၊ အသွင်အပြင်၊ အဝတ်အစား၊ ကိုယ်ဟန်အနေအထား",',
  '  "style": "ပုံဆွဲပုံစံ — e.g. cinematic, photorealistic, high detail",',
  '  "environment": "နေရာ/နောက်ခံ/ပတ်ဝန်းကျင် အသေးစိတ်",',
  '  "lighting": "အလင်းရောင်နှင့် ခံစားချက် (mood/atmosphere)",',
  '  "camera": "ကင်မရာထောင့် / Shot အမျိုးအစား / လန်း / ဖွဲ့စည်းပုံ",',
  '  "finalPrompt": "အထက်ပါအားလုံးကို ပေါင်းစပ်ထားသော အပြည့်အစုံ နောက်ဆုံး Image Prompt"',
  '}',
  '',
  'All values must be plain text strings. finalPrompt must be ONE complete, detailed image-generation prompt.',
].join('\n');

// AI Raw Output မှ IMAGE MAP JSON ကို ထုတ်ယူသည်။
// - Markdown code fence (```json) ကို ဖယ်သည်
// - ပထမဆုံး { မှ နောက်ဆုံး } အထိ JSON အဖြစ် parse လုပ်သည်
// - Parse မအောင်လျှင် null ပြန်သည် (Frontend က fallback MAP သုံးမည်)
export function parseImageMap(raw) {
  if (!raw) return null;
  let text = String(raw).trim();
  text = text.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  let obj;
  try {
    obj = JSON.parse(text.slice(start, end + 1));
  } catch (e) {
    return null;
  }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;
  const str = (v) => {
    if (v === null || v === undefined) return '';
    return typeof v === 'string' ? v.trim() : String(v).trim();
  };
  const map = {
    subject: { description: str(obj.subject) },
    style: { description: str(obj.style) },
    environment: { description: str(obj.environment) },
    lighting: { description: str(obj.lighting) },
    camera: { description: str(obj.camera) },
  };
  const hasSection =
    map.subject.description || map.style.description || map.environment.description ||
    map.lighting.description || map.camera.description;
  const finalPrompt = str(obj.finalPrompt) ||
    [map.subject.description, map.style.description, map.environment.description, map.lighting.description, map.camera.description]
      .filter(Boolean).join(', ');
  if (!finalPrompt && !hasSection) return null;
  return { ...map, finalPrompt };
}

// Tab 1 — Image Prompt Generate + IMAGE MAP (structured)
export async function generateImagePrompt(env, { idea, type, plan, apiKey, images, model }) {
  if (!idea || !String(idea).trim()) throw new Error('missing_idea');
  const c = await getCMSData(env, CMS_IMAGE, plan, type);
  const system = c ? buildSystemPrompt(c) : '';
  let prompt = system
    ? (system + '\n\nUSER DESCRIPTION:\n' + String(idea).trim())
    : String(idea).trim();
  prompt += '\n\n' + MAP_INSTRUCTION;

  let raw;
  if (images && images.length > 0) {
    prompt +=
      '\n\n(User သည် Reference ပုံ ' + images.length + ' ပုံ ပူးတွဲပေးထားပါသည် — ' +
      'ဒီပုံများထဲက အဓိကအင်္ဂါရပ်များ (မျက်နှာ/ပုံပန်းသဏ္ဌာန်/ဝတ်စုံ/ပတ်ဝန်းကျင်/အရောင်) ' +
      'ကို လေ့လာပြီး အထက်ပါ JSON ရှိ subject/environment စသည့် အပိုင်းများတွင် ' +
      'ထည့်သွင်းပါ — JSON ပုံစံအတိုင်းသာ ပြန်ထုတ်ပါ။)';
    raw = await callGeminiMultimodal(env, { model: await resolveModel(env, 'text', plan, model), prompt, images, apiKey });
  } else {
    raw = await callGeminiText(env, { model: await resolveModel(env, 'text', plan, model), prompt, apiKey });
  }

  const parsed = parseImageMap(raw);
  const promptText = (parsed && parsed.finalPrompt) ? parsed.finalPrompt : (raw ? raw.trim() : '');
  return { prompt: promptText, map: parsed };
}

// Tab 2 — Ad Image Prompt Generate (ကြော်ငြာပုံ) — မပြောင်း (API contract ထိန်းသည်)
export async function generateAdImagePrompt(env, { idea, type, plan, apiKey, images, model }) {
  if (!idea || !String(idea).trim()) throw new Error('missing_idea');
  const c = await getCMSData(env, CMS_IMAGEAD, plan, type);
  const system = c ? buildSystemPrompt(c) : '';
  let prompt = system
    ? (system + '\n\nPRODUCT/AD DESCRIPTION:\n' + String(idea).trim())
    : String(idea).trim();

  let raw;
  if (images && images.length > 0) {
    prompt +=
      '\n\n(User သည် Product Reference ပုံ ' + images.length + ' ပုံ ပူးတွဲပေးထားပါသည် — ' +
      'ဒီပုံများထဲက ကုန်ပစ္စည်း/Product ရဲ့ တကယ့် အရောင်/ပုံသဏ္ဌာန်/Design ကို လေ့လာပြီး ' +
      'ကြော်ငြာပုံ Prompt ရေးတဲ့အခါ ပုံနှင့် ကိုက်ညီအောင် တိကျစွာ ထည့်သွင်းရေးပါ။ PRODUCT/AD ' +
      'DESCRIPTION Text ထက် ပုံအစစ်ကို ဦးစားပေး ကိုးကားပါ။)';
    raw = await callGeminiMultimodal(env, { model: await resolveModel(env, 'text', plan, model), prompt, images, apiKey });
  } else {
    raw = await callGeminiText(env, { model: await resolveModel(env, 'text', plan, model), prompt, apiKey });
  }
  return { prompt: raw ? raw.trim() : '' };
}

// Tab 1 & 2 — Image Prompt (Text) ကို အခြေခံပြီး AI ပုံအစစ် ထုတ်ခြင်း — မပြောင်း
export async function generateImageFromPrompt(env, { prompt, apiKey, model, plan }) {
  if (!prompt || !String(prompt).trim()) throw new Error('missing_prompt');
  return callGeminiImage(env, { model: await resolveModel(env, 'image', plan, model), prompt: String(prompt).trim(), apiKey });
}
