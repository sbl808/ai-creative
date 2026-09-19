// AI Creative Studio — Short Studio Backend
// Studio Isolation: ဤ File သည် Short Studio နှင့်သာ သက်ဆိုင်သည်။
// အခြား Studio (Story/Content/Image/Voice/Shop) ၏ State/Data/API ကို မသုံးပါ။
// Short Studio Workflow (01→06):
//   01 Short အချက်အလက် → 02 AI ရေးသားနေသည် → 03 Short Script ရလဒ်
//   → 04 Short Video ဖန်တီးရန် → 05 AI ပြင်ဆင်နေသည် → 06 MAP / ရလဒ်
// API Contract (index.js နှင့် ညီရမည်):
//   generateShort(env,{idea,type,plan,apiKey,model})            → { short }
//   reviseShort(env,{idea,type,currentShort,instruction,...})   → { short }
//   generateShortVideoPlan(env,{idea,type,images,...})          → { scenes, characters, rawFallback }
//   generateShortVideoImage(env,{prompt,...})                   → { data, mimeType }
// Shared core များသာ ခေါ်သည် (core/cms.js, core/ai.js, core/aiModels.js) — Story နှင့် မမှီခိုပါ။

import { getCMSData, buildSystemPrompt } from '../core/cms.js';
import { callGeminiText, callGeminiImage, callGeminiMultimodal } from '../core/ai.js';
import { resolveModel } from '../core/aiModels.js';

const CMS_STUDIO = 'SHORT';
const CMS_VIDEO = 'SHORTVIDEO';

// ============================================================
// Step 01 → 02 → 03 — Short Script Generate
// Short-form script: Hook (first 3s), short sentences, voiceover + on-screen text, CTA
// ============================================================
export async function generateShort(env, { idea, type, plan, apiKey, model }) {
  if (!idea || !String(idea).trim()) throw new Error('missing_idea');
  const c = await getCMSData(env, CMS_STUDIO, plan, type);
  const system = c ? buildSystemPrompt(c) : '';
  const prompt = [
    system,
    'USER SHORT IDEA:',
    String(idea).trim(),
    '',
    'အောက်ပါ Short Video Script ကို ရေးပါ:',
    '1. Hook — ပထမ ၃ စက္ကန့်အတွင်း ကြည့်ရှုသူကို ရပ်တန့်ကြည့်ရှုစေမည့် အစပြုချက် ပါရမည်။',
    '2. စာကြောင်းတိုများ၊ လျင်မြန်သော အရှိန်အဟုန်ဖြင့် ရေးပါ (TikTok / Reels / Shorts ပုံစံ)။',
    '3. စကားပြော (Voiceover) နှင့် ဖန်သားပြင် စာသား (On-screen Text) တို့ကို ခွဲခြားဖော်ပြပါ။',
    '4. Call To Action ဖြင့် အဆုံးသတ်ပါ။',
    '5. Short Script စာသားကိုသာ ပြန်ပေးပါ — ရှင်းလင်းချက် (Explanation) မထည့်ပါနှင့်။',
  ].filter(Boolean).join('\n');
  const raw = await callGeminiText(env, { model: await resolveModel(env, 'text', plan, model), prompt, apiKey });
  return { short: raw ? raw.trim() : '' };
}

// ============================================================
// Step 03 — Short Script Revise (Chat Revision)
// User နောက်ဆုံး ပြင်ထားသော Script ကို လက်ခံပြီး ပြန်ရေးသည်
// ============================================================
export async function reviseShort(env, { idea, type, currentShort, instruction, plan, apiKey, model }) {
  if (!instruction || !String(instruction).trim()) throw new Error('missing_instruction');
  if (!currentShort) throw new Error('missing_current_short');
  const c = await getCMSData(env, CMS_STUDIO, plan, type);
  const system = c ? buildSystemPrompt(c) : '';
  const prompt = [
    system,
    'USER SHORT IDEA (မူရင်းစိတ်ကူး):',
    (idea || '(empty)'),
    '',
    'လက်ရှိ Short Script:',
    String(currentShort),
    '',
    'User ရဲ့ ထပ်ညွှန်ကြားချက်:',
    String(instruction).trim(),
    '',
    'အထက်ပါညွှန်ကြားချက်အတိုင်း Short Script အပြည့်အစုံကို ပြင်ဆင်ပါ။ ' +
      'Short Video ပုံစံ (Hook → လျင်မြန်သော အရှိန် → CTA) ကို ဆက်ထိန်းပါ။ ' +
      'Script စာသားကိုသာ ပြန်ပေးပါ — ရှင်းလင်းချက် မထည့်ပါနှင့်။',
  ].filter(Boolean).join('\n');
  const raw = await callGeminiText(env, { model: await resolveModel(env, 'text', plan, model), prompt, apiKey });
  return { short: raw ? raw.trim() : '' };
}

// ============================================================
// Step 04 → 05 → 06 — Short Video Plan (Characters + Scenes — Structured JSON)
// Short-specific: Aspect Ratio default 9:16, Scene Duration default 5 sec,
// Character Continuity ကို Character ID (char_01 ...) ဖြင့် ချိတ်သည်။
// Reference ပုံများ (images) ပါလာပါက Multimodal ဖြင့် ထည့်ဖတ်သည်။
// ============================================================
export async function generateShortVideoPlan(env, {
  idea, script, type, images,
  videoStyle, aspectRatio, duration, sceneDuration, visualStyle, cameraStyle,
  language, characterContinuity, additionalInstructions,
  plan, apiKey, model,
}) {
  const text = String(script || idea || '').trim();
  if (!text) throw new Error('missing_idea');
  const c = await getCMSData(env, CMS_VIDEO, plan, type);
  const system = c ? buildSystemPrompt(c) : '';
  const scDur = sceneDuration || '5 sec';
  const settings = [
    'Short Video Style: ' + (videoStyle || 'Cinematic'),
    'Aspect Ratio: ' + (aspectRatio || '9:16'),
    'Video Duration: ' + (duration || '30 sec'),
    'Scene Duration: ' + scDur,
    'Visual Style: ' + (visualStyle || 'Realistic'),
    'Camera Style: ' + (cameraStyle || 'Dynamic'),
    'Language: ' + (language || 'မြန်မာ'),
    'Character Continuity: ' + (String(characterContinuity) === 'false' || characterContinuity === false
      ? 'No'
      : 'YES — တူညီသော ဇာတ်ကောင်ကို Scene တိုင်းတွင် character ID တူတူသုံးပါ (char_01 စသည်)'),
  ].join('\n');
  const extra = String(additionalInstructions || '').trim();
  const prompt = [
    system,
    'USER SHORT SCRIPT:',
    text,
    '',
    'VIDEO SETTINGS:',
    settings,
    extra ? ('ADDITIONAL INSTRUCTIONS:\n' + extra) : '',
    (images && images.length) ? ('REFERENCE IMAGES: ' + images.length + ' ပုံ ပူးတွဲထားသည် — ဤပုံများကို Character/Environment ဖော်ပြချက်တွင် ကိုက်ညီအောင် ကိုးကားပါ။') : '',
    '',
    'အောက်ပါ အလုပ်များကို လုပ်ပါ:',
    '1. Short Script ထဲမှ ဇာတ်ကောင်များကို ရှာပြီး character တစ်ယောက်စီအတွက် id (char_01, char_02 ...) သတ်မှတ်ပါ။',
    '2. Short Script ကို Scene များအဖြစ် ခွဲပါ — Scene တစ်ခုစီသည် ခန့်မှန်း ' + scDur + ' ခန့် ရှိရမည်။',
    '3. Scene တစ်ခုစီအတွက် Video Prompt (vertical ' + (aspectRatio || '9:16') + ', ' + (cameraStyle || 'Dynamic') + ' camera, ' + (visualStyle || 'Realistic') + ') နှင့် Environment Reference Prompt ကို ရေးပါ။',
    '4. Character Continuity — တူညီသော ဇာတ်ကောင်သည် Scene အားလုံးတွင် character ID တူတူသာ သုံးရပါမည်။',
    '',
    'ရလဒ်ကို အောက်ပါ JSON format အတိုင်းသာ ပြန်ပေးပါ (စာသားရှင်းလင်းချက် မထည့်ပါနှင့်):',
    '{',
    '  "characters": [',
    '    { "id": "char_01", "name": "", "role": "Main Character", "age": "", "description": "", "characterPrompt": "" }',
    '  ],',
    '  "scenes": [',
    '    { "id": "scene_01", "number": 1, "title": "", "duration": 5, "characterIds": ["char_01"], "videoPrompt": "", "environmentPrompt": "" }',
    '  ]',
    '}',
  ].filter(Boolean).join('\n');

  const raw = images && images.length
    ? await callGeminiMultimodal(env, {
        model: await resolveModel(env, 'text', plan, model),
        prompt,
        images: images.map(function (img) {
          return { mimeType: img.mimeType || 'image/png', base64: img.base64 || img.data };
        }),
        apiKey,
      })
    : await callGeminiText(env, { model: await resolveModel(env, 'text', plan, model), prompt, apiKey });

  return parseShortVideoResponse(raw, scDur);
}

// ============================================================
// Step 06 — Short Video Scene/Character Image Generate
// ============================================================
export async function generateShortVideoImage(env, { prompt, apiKey, model, plan }) {
  if (!prompt || !String(prompt).trim()) throw new Error('missing_prompt');
  return callGeminiImage(env, {
    model: await resolveModel(env, 'image', plan, model),
    prompt: String(prompt).trim(),
    apiKey,
  });
}

// ============================================================
// Short-specific Structured JSON Parser
// (Story Studio ၏ parser ကို မသုံးပါ — Short data schema သီးခြားထားသည်)
// ============================================================
function tryParseJson(rawText) {
  let text = String(rawText || '').trim();
  if (!text) return null;
  text = text.replace(/```json\s*([\s\S]*?)```/gi, '$1').replace(/```\s*([\s\S]*?)```/gi, '$1');
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const obj = JSON.parse(text.slice(start, end + 1));
    if (!obj || typeof obj !== 'object') return null;
    if (!Array.isArray(obj.characters) && !Array.isArray(obj.scenes)) return null;
    return obj;
  } catch (e) {
    return null;
  }
}

function normalizeDuration(v, fallback) {
  if (v === undefined || v === null || v === '') return fallback;
  if (typeof v === 'number') return isNaN(v) ? fallback : v;
  const n = parseInt(String(v), 10);
  return isNaN(n) ? fallback : n;
}

function normalizeShortCharacters(list) {
  const out = [];
  const seen = {};
  (list || []).forEach(function (ch, i) {
    if (!ch || typeof ch !== 'object') return;
    const rawId = String(ch.id || ch.name || 'char').trim();
    let id = seen[rawId];
    if (!id) { id = 'char_' + String(i + 1).padStart(2, '0'); seen[rawId] = id; seen[id] = id; }
    const name = String(ch.name || 'Character ' + (i + 1)).trim();
    const prompt = String(ch.characterPrompt || ch.prompt || '').trim();
    out.push({
      id: id,
      name: name || '(အမည်မသိ)',
      role: String(ch.role || 'Main Character').trim(),
      age: String(ch.age || ch.ageRange || '').trim(),
      description: String(ch.description || '').trim(),
      characterPrompt: prompt,
      prompt: prompt, // legacy alias — ရှိပြီးသား API/UI နှင့် မပျက်စီးစေရ
      referenceImage: String(ch.referenceImage || '').trim(),
    });
  });
  return out;
}

function normalizeShortScenes(list, characters, defaultSceneDuration) {
  const out = [];
  const charNameToId = {};
  (characters || []).forEach(function (ch) {
    if (ch && ch.name) charNameToId[String(ch.name).trim().toLowerCase()] = ch.id;
    if (ch && ch.id) charNameToId[String(ch.id).trim().toLowerCase()] = ch.id;
  });
  function mapIds(ids) {
    const mapped = [];
    (ids || []).forEach(function (v) {
      if (v === undefined || v === null) return;
      const s = String(v).trim();
      if (!s) return;
      const direct = characters && characters.find(function (c) { return c.id === s; });
      const byName = charNameToId[s.toLowerCase()];
      const id = direct ? s : (byName || s);
      if (mapped.indexOf(id) === -1) mapped.push(id);
    });
    return mapped;
  }
  (list || []).forEach(function (sc, i) {
    if (!sc || typeof sc !== 'object') return;
    const number = sc.number !== undefined && sc.number !== null ? parseInt(String(sc.number), 10) : (i + 1);
    const num = isNaN(number) ? (i + 1) : number;
    const title = String(sc.title || '').trim();
    const videoPrompt = String(sc.videoPrompt || '').trim();
    const environmentPrompt = String(sc.environmentPrompt || '').trim();
    let characterIds = Array.isArray(sc.characterIds) ? mapIds(sc.characterIds) : [];
    // Scene တွင် characterIds မပါလျှင် ဇာတ်ကောင်အမည်များ ပါသလား စစ်ပြီး ချိတ်ပေးသည် (Continuity fallback)
    if (characterIds.length === 0) {
      const hay = (videoPrompt + ' ' + environmentPrompt + ' ' + title).toLowerCase();
      (characters || []).forEach(function (ch) {
        if (ch.name && hay.indexOf(String(ch.name).trim().toLowerCase()) !== -1) {
          if (characterIds.indexOf(ch.id) === -1) characterIds.push(ch.id);
        }
      });
    }
    out.push({
      id: String(sc.id || ('scene_' + String(num).padStart(2, '0'))).trim(),
      number: num,
      title: title,
      duration: normalizeDuration(sc.duration, defaultSceneDuration),
      characterIds: characterIds,
      videoPrompt: videoPrompt,
      environmentPrompt: environmentPrompt,
      emotion: String(sc.emotion || '').trim(),
      camera: String(sc.camera || '').trim(),
      lighting: String(sc.lighting || '').trim(),
      location: String(sc.location || '').trim(),
      visualStyle: String(sc.visualStyle || '').trim(),
    });
  });
  return out;
}

// Short-specific Parser — Short Video Response
// 1) Structured JSON (ဦးစားပေး)   2) Fallback — Raw Output ကို Scene 1 အဖြစ် ပြသည်
export function parseShortVideoResponse(rawText, sceneDuration) {
  const result = { scenes: [], characters: [], rawFallback: false };
  if (!rawText) return result;
  const fallbackDur = normalizeDuration(sceneDuration, 5);

  const parsed = tryParseJson(rawText);
  if (parsed) {
    const characters = normalizeShortCharacters(parsed.characters);
    const scenes = normalizeShortScenes(parsed.scenes, characters, fallbackDur);
    result.characters = characters;
    result.scenes = scenes;
    if (result.scenes.length === 0 && result.characters.length === 0) {
      result.scenes.push({ id: 'scene_01', number: 1, title: '', duration: fallbackDur, characterIds: [], videoPrompt: String(rawText).trim(), environmentPrompt: '' });
      result.rawFallback = true;
    }
    return result;
  }

  result.scenes.push({ id: 'scene_01', number: 1, title: '', duration: fallbackDur, characterIds: [], videoPrompt: String(rawText).trim(), environmentPrompt: '' });
  result.rawFallback = true;
  return result;
}
