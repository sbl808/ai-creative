// AI Creative Studio — Shop Studio Backend 
// Studio Isolation: ဤ File သည် Shop Studio နှင့်သာ သက်ဆိုင်သည်။
// အခြား Studio (Content/Story/Short/Image/Voice) ကို မထိခိုက်စေရ။
// Shared Logic (AI Call, CMS, Parser) ကို core/ မှ ခေါ်သုံးသည်။
//
// Phase 14 — Shop Video Plan ကို Structured JSON (Product + Characters + Scenes)
// ဦးစားပေး ထုတ်သည်။ Scene တစ်ခုစီတွင် id / duration / characterIds / emotion /
// camera / lighting ပါဝင်ပြီး Character နှင့် Scene ကို ID ဖြင့် ချိတ်ဆက်သည်။
// Legacy format ([SCENE_START]/[CHARACTER_START]/[PRODUCT_START]) ရလာလျှင်လည်း
// Backward Compatible ဖြစ်အောင် ဆက်လက် Parse လုပ်ပေးသည်။
// API Endpoint / Auth / Usage / Feature Check များကို မပြောင်းပါ။

import { getCMSData, buildSystemPrompt } from '../core/cms.js';
import { callGeminiText, callGeminiImage, callGeminiMultimodal } from '../core/ai.js';
import { resolveModel } from '../core/aiModels.js';
import { parseContentResponse, parseVideoPlan, referenceImageInstruction } from '../core/utilities.js';

const CMS_CONTENT = 'SHOPCONTENT';
const CMS_VIDEO = 'SHOPVIDEO';

// ============================================================
// Tab 1 — Content Maker: Generate
// Reference ပုံ (Optional) ပါလျှင် Multimodal Call သုံးသည်
// ============================================================
export async function generateShopContent(env, { idea, type, plan, apiKey, images, model }) {
  if (!idea || !String(idea).trim()) throw new Error('missing_idea');
  const c = await getCMSData(env, CMS_CONTENT, plan, type);
  const system = c ? buildSystemPrompt(c) : '';
  let prompt = system
    ? (system + '\n\nPRODUCT INFO:\n' + String(idea).trim())
    : ('PRODUCT INFO:\n' + String(idea).trim());

  const imgList = Array.isArray(images) ? images.filter(Boolean) : [];
  if (imgList.length > 0) {
    prompt += referenceImageInstruction(imgList, 'product');
    const raw = await callGeminiMultimodal(env, {
      model: await resolveModel(env, 'text', plan, model), prompt, images: imgList, apiKey,
    });
    return parseContentResponse(raw);
  }

  const raw = await callGeminiText(env, { model: await resolveModel(env, 'text', plan, model), prompt, apiKey });
  return parseContentResponse(raw);
}

// ============================================================
// Tab 1 — Content Maker: Revise (Chat)
// ============================================================
export async function reviseShopContent(env, { idea, type, currentContent, instruction, plan, apiKey, model }) {
  if (!currentContent) throw new Error('missing_current_content');
  if (!instruction || !String(instruction).trim()) throw new Error('missing_instruction');
  const c = await getCMSData(env, CMS_CONTENT, plan, type);
  const system = c ? buildSystemPrompt(c) : '';
  let prompt = system + '\n\n';
  prompt += 'PRODUCT INFO (မူရင်းအချက်အလက်):\n' + (idea || '') + '\n\n';
  prompt += 'လက်ရှိ Content:\n' + currentContent + '\n\n';
  prompt += 'User ရဲ့ ထပ်ညွှန်ကြားချက်:\n' + String(instruction).trim() + '\n\n';
  prompt += 'အထက်ပါညွှန်ကြားချက်အတိုင်း Content ကို ပြင်ဆင်ပါ။ Content အပြည့်အစုံကိုသာ ပြန်ပေးပါ၊ ရှင်းလင်းချက် မထည့်ပါနှင့်။';
  const raw = await callGeminiText(env, { model: await resolveModel(env, 'text', plan, model), prompt, apiKey });
  return parseContentResponse(raw);
}

// ============================================================
// Tab 2 — Video Maker: Generate Video Plan (Structured JSON first)
// Product Block + Character (ID) + Scene (ID/Duration/CharacterIds/
// Emotion/Camera/Lighting) — Story Map အတွက် လိုအပ်သော data contract
// ============================================================
export async function generateShopVideo(env, { idea, type, plan, apiKey, images, model }) {
  if (!idea || !String(idea).trim()) throw new Error('missing_idea');
  const c = await getCMSData(env, CMS_VIDEO, plan, type);
  const system = c ? buildSystemPrompt(c) : '';

  let prompt = [
    system,
    'PRODUCT INFO:',
    String(idea).trim(),
    '',
    'အောက်ပါ အလုပ်များကို လုပ်ပါ:',
    '1. ကုန်ပစ္စည်း (Product) အတွက် name နှင့် Product Reference Prompt ကို ရေးပါ။',
    '2. ကြော်ငြာ/Video တွင် ပါဝင်နိုင်မည့် ဇာတ်ကောင် (Character) များရှိလျှင် character တစ်ယောက်စီအတွက် id (char_01, char_02 ...) သတ်မှတ်ပြီး Character Reference Prompt ရေးပါ။ ဇာတ်ကောင် မလိုအပ်ပါက characters ကို [] ထားပါ။',
    '3. Video ကို Scene များအဖြစ် ခွဲပါ။ Scene တစ်ခုစီအတွက် id (scene_01, scene_02 ...), duration (စက္ကန့်), characterIds (ပါဝင်သော character id များ), emotion, camera, lighting, videoPrompt, environmentPrompt ကို သတ်မှတ်ပါ။',
    '4. Character Continuity — တူညီသော ဇာတ်ကောင်သည် Scene များတွင် character ID တူတူသာ သုံးရပါမည်။',
    '5. environmentPrompt သည် Scene ၏ နောက်ခံပတ်ဝန်းကျင် (နေရာ/အလင်းရောင်/အသေးစိတ်) ကို တိကျစွာ ဖော်ပြရပါမည်။',
    '',
    'ရလဒ်ကို အောက်ပါ JSON format အတိုင်းသာ ပြန်ပေးပါ (စာသားရှင်းလင်းချက် မထည့်ပါနှင့်):',
    '{',
    '  "product": { "name": "", "prompt": "" },',
    '  "characters": [ { "id": "char_01", "name": "", "role": "", "age": "", "description": "", "characterPrompt": "" } ],',
    '  "scenes": [ { "id": "scene_01", "number": 1, "title": "", "duration": 8, "characterIds": ["char_01"], "emotion": "", "camera": "", "lighting": "", "videoPrompt": "", "environmentPrompt": "" } ]',
    '}',
  ].filter(Boolean).join('\n');

  const imgList = Array.isArray(images) ? images.filter(Boolean) : [];
  if (imgList.length > 0) {
    prompt += referenceImageInstruction(imgList, 'product');
    const raw = await callGeminiMultimodal(env, {
      model: await resolveModel(env, 'text', plan, model), prompt, images: imgList, apiKey,
    });
    return parseShopVideoResponse(raw);
  }

  const raw = await callGeminiText(env, { model: await resolveModel(env, 'text', plan, model), prompt, apiKey });
  return parseShopVideoResponse(raw);
}

// ============================================================
// Tab 2 — Video Maker: Generate Scene/Character/Product Image
// ============================================================
// Shop Image Branch — Product Reference ပုံများ ပါလာပါက multimodal ဖြင့် prompt ကို ပိုမိုတိကျအောင် ဖြည့်စွက်ပြီး
// ထို့နောက် Image Generation ပြုလုပ်သည် (reference မရှိလျှင် မူလ flow အတိုင်း တိုက်ရိုက် generate — backward compatible)
export async function generateShopVideoImage(env, { prompt, apiKey, model, plan, images }) {
  if (!prompt || !String(prompt).trim()) throw new Error('missing_prompt');
  let finalPrompt = String(prompt).trim();
  const imgList = Array.isArray(images) ? images.filter(Boolean) : [];
  if (imgList.length > 0) {
    try {
      const desc = await callGeminiMultimodal(env, {
        model: await resolveModel(env, 'text', plan, model),
        prompt: finalPrompt + '\n\n' + referenceImageInstruction(imgList, 'product') +
          '\n\nအထက်ပါ product reference ပုံများနှင့် ကိုက်ညီသော image generation prompt တစ်ခုတည်းကိုသာ ပြန်ပေးပါ။ (Return only the final image prompt, no extra text.)',
        images: imgList,
        apiKey,
      });
      if (desc && String(desc).trim()) finalPrompt = String(desc).trim();
    } catch (e) {
      // Reference prompt ဖြည့်စွက်မရပါက မူလ prompt ဖြင့်သာ ဆက်လုပ်သည် (fallback)
    }
  }
  const out = await callGeminiImage(env, {
    model: await resolveModel(env, 'image', plan, model),
    prompt: finalPrompt,
    apiKey,
  });
  return { data: out.data, mimeType: out.mimeType };
}

// ============================================================
// Structured JSON Parser (Shop Video Plan)
// 1) Structured JSON (ဦးစားပေး)   2) Legacy [SCENE_START] format (Backward Compat)
// ရလဒ်: { product, characters:[{id,name,role,age,description,characterPrompt,prompt,referenceImage}],
//          scenes:[{id,number,title,duration,characterIds,emotion,camera,lighting,videoPrompt,environmentPrompt}] }
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
    if (!Array.isArray(obj.characters) && !Array.isArray(obj.scenes) && !obj.product) return null;
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

function normalizeShopCharacters(list) {
  const out = [];
  const seen = {};
  (list || []).forEach(function (ch, i) {
    if (!ch || typeof ch !== 'object') return;
    const rawId = String(ch.id || ch.name || 'char').trim();
    let id = seen[rawId] || ('char_' + String(i + 1).padStart(2, '0'));
    if (seen[rawId]) id = seen[rawId];
    else { seen[rawId] = id; seen[id] = id; }
    const name = String(ch.name || 'Character ' + (i + 1)).trim();
    const prompt = String(ch.characterPrompt || ch.prompt || '').trim();
    out.push({
      id: id,
      name: name || '(အမည်မသိ)',
      role: String(ch.role || '').trim(),
      age: String(ch.age || ch.ageRange || '').trim(),
      description: String(ch.description || '').trim(),
      characterPrompt: prompt,
      prompt: prompt, // legacy alias — ရှိပြီးသား UI/API နှင့် မပျက်စီးစေရ
      referenceImage: String(ch.referenceImage || '').trim(),
    });
  });
  return out;
}

function normalizeShopScenes(list, characters) {
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
    const videoPrompt = String(sc.videoPrompt || '').trim();
    const environmentPrompt = String(sc.environmentPrompt || '').trim();
    let characterIds = Array.isArray(sc.characterIds) ? mapIds(sc.characterIds) : [];
    // Scene တွင် characterIds မပါလျှင် ဇာတ်ကောင်အမည်များ ပါသလား စစ်ပြီး ချိတ်ပေးသည် (Continuity fallback)
    if (characterIds.length === 0) {
      const hay = (videoPrompt + ' ' + environmentPrompt + ' ' + String(sc.title || '')).toLowerCase();
      (characters || []).forEach(function (ch) {
        if (ch.name && hay.indexOf(String(ch.name).trim().toLowerCase()) !== -1) {
          if (characterIds.indexOf(ch.id) === -1) characterIds.push(ch.id);
        }
      });
    }
    out.push({
      id: String(sc.id || ('scene_' + String(num).padStart(2, '0'))).trim(),
      number: num,
      title: String(sc.title || '').trim(),
      duration: normalizeDuration(sc.duration, 8),
      characterIds: characterIds,
      emotion: String(sc.emotion || '').trim(),
      camera: String(sc.camera || '').trim(),
      lighting: String(sc.lighting || '').trim(),
      location: String(sc.location || '').trim(),
      videoPrompt: videoPrompt,
      environmentPrompt: environmentPrompt,
    });
  });
  return out;
}

function normalizeShopProduct(p) {
  if (!p || typeof p !== 'object') return null;
  return {
    name: String(p.name || '(ကုန်ပစ္စည်း)').trim(),
    prompt: String(p.prompt || '').trim(),
  };
}

// Legacy format ([SCENE_START]/[CHARACTER_START]/[PRODUCT_START]) ကို
// Structured Shape အဖြစ် ပြောင်းပေးသည် — Frontend Story Map နှင့် ကိုက်ညီရန်
function enrichLegacyShopPlan(legacy) {
  const chars = (legacy.characters || []).map(function (ch, i) {
    const prompt = String(ch.prompt || ch.characterPrompt || '').trim();
    return {
      id: 'char_' + String(i + 1).padStart(2, '0'),
      name: String(ch.name || 'Character ' + (i + 1)).trim() || '(အမည်မသိ)',
      role: String(ch.role || '').trim(),
      age: String(ch.age || '').trim(),
      description: String(ch.description || '').trim(),
      characterPrompt: prompt,
      prompt: prompt,
      referenceImage: String(ch.referenceImage || '').trim(),
    };
  });
  const nameToId = {};
  chars.forEach(function (ch) {
    nameToId[String(ch.name).trim().toLowerCase()] = ch.id;
    nameToId[ch.id] = ch.id;
  });
  const scenes = (legacy.scenes || []).map(function (sc, i) {
    const num = sc.number || (i + 1);
    const videoPrompt = String(sc.videoPrompt || '').trim();
    const environmentPrompt = String(sc.environmentPrompt || '').trim();
    const ids = [];
    if (Array.isArray(sc.characterIds)) {
      sc.characterIds.forEach(function (v) {
        const s = String(v).trim().toLowerCase();
        const id = nameToId[s] || v;
        if (id && ids.indexOf(id) === -1) ids.push(id);
      });
    }
    if (ids.length === 0) {
      const hay = (videoPrompt + ' ' + environmentPrompt).toLowerCase();
      chars.forEach(function (ch) {
        if (ch.name && hay.indexOf(String(ch.name).trim().toLowerCase()) !== -1 && ids.indexOf(ch.id) === -1) ids.push(ch.id);
      });
    }
    return {
      id: String(sc.id || ('scene_' + String(num).padStart(2, '0'))).trim(),
      number: num,
      title: String(sc.title || '').trim(),
      duration: normalizeDuration(sc.duration, 8),
      characterIds: ids,
      emotion: String(sc.emotion || '').trim(),
      camera: String(sc.camera || '').trim(),
      lighting: String(sc.lighting || '').trim(),
      location: String(sc.location || '').trim(),
      videoPrompt: videoPrompt,
      environmentPrompt: environmentPrompt,
    };
  });
  return {
    product: normalizeShopProduct(legacy.product),
    characters: chars,
    scenes: scenes,
    rawFallback: !!legacy.rawFallback,
  };
}

export function parseShopVideoResponse(rawText) {
  const result = { scenes: [], characters: [], product: null, rawFallback: false };
  if (!rawText) return result;

  const parsed = tryParseJson(rawText);
  if (parsed) {
    const characters = normalizeShopCharacters(parsed.characters);
    const scenes = normalizeShopScenes(parsed.scenes, characters);
    result.characters = characters;
    result.scenes = scenes;
    result.product = normalizeShopProduct(parsed.product);
    if (result.scenes.length === 0 && !result.product) {
      result.scenes.push({
        id: 'scene_01', number: 1, title: '', duration: 8, characterIds: [],
        emotion: '', camera: '', lighting: '', location: '',
        videoPrompt: String(rawText).trim(), environmentPrompt: '',
      });
      result.rawFallback = true;
    }
    return result;
  }

  // Legacy fallback — shared parser ကို reuse လုပ်ပြီး shape ပြန်ညှိသည်
  const legacy = parseVideoPlan(rawText, { product: true });
  const enriched = enrichLegacyShopPlan(legacy);
  result.product = enriched.product;
  result.characters = enriched.characters;
  result.scenes = enriched.scenes;
  result.rawFallback = enriched.rawFallback;

  // Legacy မှာလည်း ဘာမှ မရပါက Raw Text ကို Scene 1 အဖြစ် ပြသည် (Backward Compat)
  if (result.scenes.length === 0 && !result.product) {
    result.scenes.push({
      id: 'scene_01', number: 1, title: '', duration: 8, characterIds: [],
      emotion: '', camera: '', lighting: '', location: '',
      videoPrompt: String(rawText).trim(), environmentPrompt: '',
    });
    result.rawFallback = true;
  }
  return result;
}
