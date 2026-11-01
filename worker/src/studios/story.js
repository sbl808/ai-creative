// AI Creative Studio — Story Studio Backend 
// Studio Isolation: ဤ File သည် Story Studio နှင့်သာ သက်ဆိုင်သည်။
// အခြား Studio (Content/Short/Image/Voice/Shop) ကို မထိခိုက်စေရ။
// Story Studio Workflow (01→06) အတွက် Video Plan ကို Structured JSON ဖြင့် ဦးစားပေးထုတ်သည်။
// 12-Layer Brain (§4): Generic Engine တစ်ခုတည်း — Story Type / Video Workflow အတွက်
// သီးခြား Engine မဖန်တီးဘဲ CMS မှ Selected Config / Knowledge / Prompt ကို dynamic load လုပ်သည်။
// Knowledge Isolation (§5): selected Story Type / Visual Style / Video Workflow rows များသာ
// AI context ထဲ ဝင်မည် — အခြား type ၏ knowledge ကို ထည့်မည် မဟုတ်ပါ။

import { getCMSData } from '../cms/repositories/index.js';
import { getGlobalPolicyConfig } from '../cms/global-policies/index.js';
import { getStudioStoryTypeConfig, getStudioVideoContext } from '../cms/studio-brains/index.js';
import { buildPromptContext } from '../prompt/orchestrator/index.js';
import { generateText, generateImage } from '../core/ai/aiService.js';
import { resolveModel } from '../core/aiModels.js';

const CMS_STUDIO = 'STORY';
const CMS_VIDEO = 'STORYVIDEO';

function mapLegacyStoryTemplate(row) {
  if (!row) return {};
  return {
    role: row.core,
    memory: row.memory,
    knowledge: row.knowledge,
    workflow: row.workflow,
    template: row.template,
    prompt_rule: row.prompt,
    quality_check: row.quality_check,
    final_output: row.final_output,
  };
}

function mapBrainFields(config, prefix = '') {
  const fields = {};
  const used = new Set();
  for (const [key, value] of Object.entries(config || {})) {
    let normalized = String(key).replace(/[^a-zA-Z0-9_.-]/g, '_');
    if (!/^[a-zA-Z]/.test(normalized)) normalized = 'field_' + normalized;
    normalized = normalized.slice(0, 64);
    let field = prefix ? prefix + '.' + normalized : normalized;
    let suffix = 1;
    while (used.has(field)) {
      const tail = '_' + suffix++;
      field = (prefix ? prefix + '.' : '') + normalized.slice(0, 64 - tail.length) + tail;
    }
    used.add(field);
    fields[field] = value;
  }
  return fields;
}

// Story text context — Global Policy > selected Story Brain > legacy CMS fallback.
async function buildStoryTextContext(env, typeId, plan, taskInstructions, userInput) {
  const [globalPolicy, studioBrain] = await Promise.all([
    getGlobalPolicyConfig(env, plan),
    getStudioStoryTypeConfig(env, typeId, plan),
  ]);
  const hasStudioBrain = Object.keys(studioBrain).length > 0;
  const legacy = hasStudioBrain ? null : await getCMSData(env, CMS_STUDIO, plan, typeId);
  return buildPromptContext({
    globalPolicy,
    studioBrain,
    taskTemplate: {
      ...mapLegacyStoryTemplate(legacy),
      task_instructions: taskInstructions,
    },
    userInput,
  });
}

// Tab 1 — Story Generate
// Backward Compat: { story } ကို ဆက်ထိန်းပြီး { storyFacts } ကို additive ထည့်သည်။
// GLOBAL RESULT STREAMING: onChunk(deltaText) ကို ရရှိလာတိုင်း ခေါ်သည် (real streaming)။
export async function generateStory(env, { idea, type, plan, apiKey, model, onChunk }) {
  if (!idea || !String(idea).trim()) throw new Error('missing_idea');
  const typeId = String(type || '1');
  const factsSchema = [
    '{ "storyId": "", "storyType": "' + typeId + '", "title": "", "summary": "",',
    '  "characters": [ { "name": "", "role": "", "attributes": "" } ],',
    '  "locations": [], "timeline": [], "events": [], "dialogue": [],',
    '  "emotion": "", "importantObjects": [], "visualFacts": [], "sceneInformation": [] }',
  ].join('\n');
  const context = await buildStoryTextContext(env, typeId, plan, [
    'အလုပ် ၂ ခု လုပ်ပါ:',
    '1) ဇာတ်လမ်းအပြည့်အစုံကို ရေးပါ။',
    '2) ဇာတ်လမ်းပြီးနောက် storyFacts ကို JSON block တစ်ခုအဖြစ် ထည့်ပါ (\x60\x60\x60json ဖြင့် စ၍ \x60\x60\x60 ဖြင့် ဆုံးပါ)။ Format:',
    factsSchema,
    'storyFacts သည် ဇာတ်လမ်းစာသားအတွင်း မရောပါစေနှင့် — သီးခြား JSON block သာ ဖြစ်ရမည်။',
  ].join('\n'), { idea: String(idea).trim() });
  const raw = await generateText(env, {
    model: await resolveModel(env, 'text', plan, model, 'story.text'),
    task: 'story.text',
    system: context.system,
    prompt: context.prompt,
    apiKey,
    onChunk,
  });
  const parsed = parseStoryWithFacts(raw);
  return { story: parsed.story, storyFacts: parsed.storyFacts };
}

// Tab 1 — Story Revise (Chat Revision) — brain context ကို ထိုနည်းတူ သုံးသည်
export async function reviseStory(env, { idea, type, currentStory, instruction, plan, apiKey, model, onChunk }) {
  if (!instruction || !String(instruction).trim()) throw new Error('missing_instruction');
  if (!currentStory) throw new Error('missing_current_story');
  const typeId = String(type || '1');
  const context = await buildStoryTextContext(env, typeId, plan, [
    'ပေးထားသော လက်ရှိဇာတ်လမ်းကို User ၏ ပြင်ဆင်လိုသည့်အချက်များအတိုင်း ပြင်ဆင်ပါ။',
    'ဇာတ်လမ်းအပြည့်အစုံကိုသာ ပြန်ပေးပါ၊ ရှင်းလင်းချက်များ မထည့်ပါနှင့်။',
  ].join('\n'), {
    idea: String(idea || '(empty)'),
    current_story: String(currentStory),
    revision_instruction: String(instruction).trim(),
  });
  const raw = await generateText(env, {
    model: await resolveModel(env, 'text', plan, model, 'story.text'),
    task: 'story.text',
    system: context.system,
    prompt: context.prompt,
    apiKey,
    onChunk,
  });
  return { story: raw ? raw.trim() : '' };
}

// ---- Story Facts (Structured Story Data — §9) ----
// generateStory မှ JSON block ကို ခွဲထုတ်သည်။ video သို့ story facts (video-relevant) သာ ပို့မည်။
export function parseStoryWithFacts(rawText) {
  let text = String(rawText || '').trim();
  if (!text) return { story: '', storyFacts: {} };
  let storyFacts = {};
  // 1) ```json ... ``` block (နောက်ဆုံးတစ်ခုကို ယူ)
  const fence = /```(?:json)?\s*([\s\S]*?)```/gi;
  let m;
  let lastFence = null;
  let lastIndex = -1;
  while ((m = fence.exec(text)) !== null) { lastFence = m; lastIndex = m.index; }
  if (lastFence) {
    try {
      const obj = JSON.parse(String(lastFence[1]).trim());
      if (obj && typeof obj === 'object') {
        storyFacts = obj;
        text = (text.slice(0, lastIndex) + text.slice(lastIndex + String(lastFence[0]).length)).trim();
      }
    } catch (e) { /* fall through */ }
  }
  // 2) fence မရလျှင် — နောက်ဆုံး {...} (storyFacts / storyId / characters ပါသော) ကို စမ်းကြည့်
  if (!Object.keys(storyFacts).length) {
    const idx = text.lastIndexOf('{');
    const endIdx = text.lastIndexOf('}');
    if (idx !== -1 && endIdx > idx) {
      try {
        const obj = JSON.parse(text.slice(idx, endIdx + 1));
        if (obj && typeof obj === 'object') {
          const candidate = (obj.storyFacts && typeof obj.storyFacts === 'object') ? obj.storyFacts : obj;
          if (candidate.storyId || candidate.characters || candidate.sceneInformation || candidate.summary) {
            storyFacts = candidate;
            text = text.slice(0, idx).trim();
          }
        }
      } catch (e) { /* ignore */ }
    }
  }
  return { story: text.trim(), storyFacts };
}

// Video Engine သို့ ပို့မည့် video-relevant story facts သာ (Story Type Knowledge မဟုတ်)
export function buildStoryFactsBlock(facts) {
  if (!facts || typeof facts !== 'object') return '';
  const keys = ['storyId', 'storyType', 'title', 'summary', 'characters', 'locations', 'timeline', 'events', 'dialogue', 'emotion', 'importantObjects', 'visualFacts', 'sceneInformation'];
  const out = {};
  let n = 0;
  keys.forEach((k) => {
    if (facts[k] !== undefined && facts[k] !== null && String(facts[k]).trim() !== '') { out[k] = facts[k]; n++; }
  });
  if (!n) return '';
  try { return JSON.stringify(out); } catch (e) { return ''; }
}

// Video Workflow default directions (code default — CMS VIDEO_WORKFLOW knowledge rows က override လုပ်နိုင်)
const WORKFLOW_DIRECTIONS = {
  CINEMATIC_FEATURE: 'Feature-film structure: three-act arc, establishing shots, character beats, polished pacing.',
  CHARACTER_FOCUS: 'Character-driven: prioritize character presence, expressions, performance and emotional beats.',
  DOCUMENTARY: 'Observational realism: natural environments, factual tone, documentary narration style.',
  EPISODIC_SERIES: 'Episodic series framing: episode-level arcs, recurring settings and characters, serial pacing.',
  NON_LINEAR_THRILLER: 'Non-linear thriller: fractured timeline, suspense pacing, reveal-driven structure.',
};

// Tab 2 — Story Video Plan (Characters + Scenes — Structured JSON)
// Generic Video Engine (§7): Story Type Engine နှင့် သီးခြား — Story Facts + Video Knowledge
// + Selected Visual Style + Selected Video Workflow ကို separate context အဖြစ် assemble လုပ်သည်။
export async function generateStoryVideoPlan(env, {
  story, idea, type, videoType, workflow, visualStyle, duration, sceneDuration, aspectRatio,
  cameraStyle, language, environmentStyle, characterContinuity,
  characterConsistency, referenceImage, additionalInstructions,
  characterDirection, cameraDirection, lighting, environmentDetails,
  colorMood, transitionPacing, audioDirection, storyFacts, plan, apiKey, model,
}) {
  const text = String(story || idea || '').trim();
  if (!text) throw new Error('missing_idea');
  const wf = String(workflow || 'CINEMATIC_FEATURE').toUpperCase();
  const vs = String(visualStyle || (videoType && /^[A-Za-z]/.test(String(videoType)) ? videoType : '') || 'REALISM');
  // Load only the selected video knowledge, visual style and workflow.
  const [globalPolicy, ctx] = await Promise.all([
    getGlobalPolicyConfig(env, plan),
    getStudioVideoContext(env, { visualStyle: vs, workflow: wf, plan }),
  ]);
  const hasBrainVideo = [
    ctx.videoKnowledge,
    ctx.visualStyle,
    ctx.workflow,
  ].some((config) => Object.keys(config || {}).length > 0);
  const legacy = hasBrainVideo ? null : await getCMSData(env, CMS_VIDEO, plan, type || '1');

  // Global policy and base video knowledge share field names so global values win.
  // Style and workflow fields are namespaced to preserve their independent knowledge.
  const studioBrain = {
    ...mapBrainFields(ctx.videoKnowledge),
    ...mapBrainFields(ctx.visualStyle, 'visual_style'),
    ...mapBrainFields(ctx.workflow, 'video_workflow'),
  };
  const factsBlock = buildStoryFactsBlock(storyFacts);
  const settings = {
    visual_style: vs,
    video_workflow: wf + (WORKFLOW_DIRECTIONS[wf] ? ' — ' + WORKFLOW_DIRECTIONS[wf] : ''),
    video_duration: duration || '30 sec',
    scene_duration: sceneDuration || '8 sec',
    aspect_ratio: aspectRatio || '16:9',
    camera_style: cameraStyle || 'Feature Film',
    language: language || 'မြန်မာ',
    environment_style: environmentStyle || 'Realistic',
    character_continuity: String(characterContinuity) === 'false' || characterContinuity === false
      ? 'No'
      : 'YES — တူညီသော ဇာတ်ကောင်ကို Scene တိုင်းတွင် character ID တူတူသုံးပါ (char_01 စသည်)',
    character_consistency: String(characterConsistency) === 'false' || characterConsistency === false
      ? 'No'
      : 'YES — ဇာတ်ကောင်၏ အသွင်အပြင် / ဝတ်စုံ / အသွင်လက္ခဏာများကို Scene တိုင်းတွင် တစ်သမတ်တည်း ဖော်ပြပါ',
    reference_image: referenceImage ? 'Provided (user reference — character / visual style အတွက်)' : 'Not provided',
  };
  const optionalSettings = {
    character_direction: characterDirection,
    camera_direction: cameraDirection,
    lighting,
    environment_details: environmentDetails,
    color_mood: colorMood,
    transition_pacing: transitionPacing,
    audio_direction: audioDirection,
  };
  for (const [key, value] of Object.entries(optionalSettings)) {
    if (value !== undefined && value !== null && String(value).trim()) {
      settings[key] = String(value).trim();
    }
  }

  const taskInstructions = [
    'အောက်ပါ အလုပ်များကို လုပ်ပါ:',
    '1. ဇာတ်လမ်းထဲမှ ဇာတ်ကောင်များကို ရှာပြီး character တစ်ယောက်စီအတွက် id (char_01, char_02 ...) သတ်မှတ်ပါ။',
    '2. ဇာတ်လမ်းကို Scene များအဖြစ် ခွဲပါ။ Scene တစ်ခုစီအတွက် title, description (မြင်ကွင်းဖော်ပြချက်), visualDescription (ရုပ်ပုံအသေးစိတ်), Video Prompt နှင့် Environment Reference Prompt ကို ရေးပါ။',
    '3. Character Continuity — တူညီသော ဇာတ်ကောင်သည် Scene အားလုံးတွင် character ID တူတူသာ သုံးရပါမည်။',
    '4. Video Prompt သည် Visual Style, Video Workflow, Camera Style, Aspect Ratio, Language, Scene Duration စသည်တို့နှင့် ကိုက်ညီအောင် ရေးပါ။',
    '5. STORY FACTS ပါလျှင် ဇာတ်ကောင်၊ နေရာ၊ ဖြစ်ရပ်များကို facts မှ တိုက်ရိုက် ယူသုံးပါ (story စာသားကို ပြန်ခွဲစရာ မလို)။',
    'ရလဒ်ကို အောက်ပါ JSON format အတိုင်းသာ ပြန်ပေးပါ (စာသားရှင်းလင်းချက် မထည့်ပါနှင့်):',
    '{',
    '  "characters": [',
    '    { "id": "char_01", "name": "", "role": "Main Character", "age": "", "description": "", "characterPrompt": "" }',
    '  ],',
    '  "scenes": [',
    '    { "id": "scene_01", "number": 1, "title": "", "description": "", "visualDescription": "", "duration": 8, "characterIds": ["char_01"], "videoPrompt": "", "environmentPrompt": "" }',
    '  ]',
    '}',
  ].join('\n');
  const context = buildPromptContext({
    globalPolicy,
    studioBrain,
    taskTemplate: {
      ...mapLegacyStoryTemplate(legacy),
      task_instructions: taskInstructions,
    },
    userInput: Object.fromEntries(
      Object.entries(settings).map(([key, value]) => ['setting.' + key, value])
    ),
    userPrompt: [
      'USER STORY:',
      text,
      factsBlock ? ('STORY FACTS (structured — video အတွက် လိုအပ်သော facts သာ):\n' + factsBlock) : '',
      additionalInstructions && String(additionalInstructions).trim()
        ? ('ADDITIONAL INSTRUCTIONS:\n' + String(additionalInstructions).trim())
        : '',
    ].filter(Boolean).join('\n'),
  });
  const raw = await generateText(env, {
    model: await resolveModel(env, 'text', plan, model, 'story.text'),
    task: 'story.text',
    system: context.system,
    prompt: context.prompt,
    apiKey,
  });
  return parseStoryVideoResponse(raw);
}

// Tab 2 — Story Video Scene/Character Image Generate
export async function generateStoryVideoImage(env, { prompt, apiKey, model, plan }) {
  if (!prompt || !String(prompt).trim()) throw new Error('missing_prompt');
  return generateImage(env, {
    model: await resolveModel(env, 'image', plan, model, 'story.image'), task: 'story.image',
    prompt: String(prompt).trim(),
    apiKey,
  });
}

// ---- Structured JSON ရလဒ်ကို ဦးစားပေးဖတ်သည် ----
// Legacy format ([SCENE_START]/[SCENE_END], [CHARACTER_START]/[CHARACTER_END]) ကိုလည်း ဆက်ထောက်ပံ့သည်။
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

function normalizeCharacters(list) {
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
      role: String(ch.role || 'Main Character').trim(),
      age: String(ch.age || ch.ageRange || '').trim(),
      description: String(ch.description || '').trim(),
      characterPrompt: prompt,
      prompt: prompt, // legacy alias — ရှိပြီးသား UI/API နှင့် မပျက်စီးစေရ
      referenceImage: String(ch.referenceImage || '').trim(),
    });
  });
  return out;
}

function normalizeScenes(list, characters) {
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
    const description = String(sc.description || '').trim();
    const visualDescription = String(sc.visualDescription || '').trim();
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
      description: description,
      visualDescription: visualDescription,
      duration: normalizeDuration(sc.duration, 8),
      characterIds: characterIds,
      videoPrompt: videoPrompt,
      environmentPrompt: environmentPrompt,
      emotion: String(sc.emotion || '').trim(),
      camera: String(sc.camera || '').trim(),
      lighting: String(sc.lighting || '').trim(),
      visualStyle: String(sc.visualStyle || '').trim(),
      location: String(sc.location || '').trim(),
    });
  });
  return out;
}

// Studio-specific Parser — Story Video Response
// 1) Structured JSON (ဦးစားပေး)   2) Legacy [SCENE_START]/[CHARACTER_START] format
export function parseStoryVideoResponse(rawText) {
  const result = { scenes: [], characters: [], rawFallback: false };
  if (!rawText) return result;

  const parsed = tryParseJson(rawText);
  if (parsed) {
    const characters = normalizeCharacters(parsed.characters);
    const scenes = normalizeScenes(parsed.scenes, characters);
    result.characters = characters;
    result.scenes = scenes;
    if (result.scenes.length === 0 && result.characters.length === 0) {
      result.scenes.push({ id: 'scene_01', number: 1, title: '', duration: 8, characterIds: [], videoPrompt: String(rawText).trim(), environmentPrompt: '' });
      result.rawFallback = true;
    }
    return result;
  }

  const sceneBlocks = rawText.match(/\[SCENE_START\][\s\S]*?\[SCENE_END\]/gi);
  if (sceneBlocks) {
    sceneBlocks.forEach(function (block, idx) {
      const numberMatch = block.match(/SCENE_NUMBER:\s*([\s\S]*?)(?=\n\s*VIDEO_PROMPT:|\[SCENE_END\])/i);
      const titleMatch = block.match(/SCENE_TITLE:\s*([\s\S]*?)(?=\n\s*VIDEO_PROMPT:|\[SCENE_END\])/i);
      const durationMatch = block.match(/SCENE_DURATION:\s*([\s\S]*?)(?=\n\s*VIDEO_PROMPT:|\[SCENE_END\])/i);
      const charMatch = block.match(/CHARACTER_IDS:\s*([\s\S]*?)(?=\n\s*VIDEO_PROMPT:|\[SCENE_END\])/i);
      const videoMatch = block.match(/VIDEO_PROMPT:\s*([\s\S]*?)(?=\n\s*ENVIRONMENT_PROMPT:|\[SCENE_END\])/i);
      const envMatch = block.match(/ENVIRONMENT_PROMPT:\s*([\s\S]*?)\[SCENE_END\]/i);
      const number = parseInt(String(numberMatch ? numberMatch[1].trim() : (idx + 1)), 10);
      const ids = (charMatch ? String(charMatch[1].trim()) : '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
      result.scenes.push({
        id: 'scene_' + String(isNaN(number) ? (idx + 1) : number).padStart(2, '0'),
        number: isNaN(number) ? (idx + 1) : number,
        title: titleMatch ? titleMatch[1].trim() : '',
        duration: normalizeDuration(durationMatch ? durationMatch[1].trim() : 8, 8),
        characterIds: ids,
        videoPrompt: videoMatch ? videoMatch[1].trim() : '',
        environmentPrompt: envMatch ? envMatch[1].trim() : '',
      });
    });
  }

  const charBlocks = rawText.match(/\[CHARACTER_START\][\s\S]*?\[CHARACTER_END\]/gi);
  if (charBlocks) {
    charBlocks.forEach(function (block, idx) {
      const nameMatch = block.match(/CHARACTER_NAME:\s*([\s\S]*?)(?=\n\s*CHARACTER_ROLE:|\[CHARACTER_END\])/i);
      const roleMatch = block.match(/CHARACTER_ROLE:\s*([\s\S]*?)(?=\n\s*CHARACTER_PROMPT:|\[CHARACTER_END\])/i);
      const ageMatch = block.match(/CHARACTER_AGE:\s*([\s\S]*?)(?=\n\s*CHARACTER_ROLE:|\[CHARACTER_END\])/i);
      const promptMatch = block.match(/CHARACTER_PROMPT:\s*([\s\S]*?)\[CHARACTER_END\]/i);
      const name = nameMatch ? nameMatch[1].trim() : '(အမည်မသိ)';
      const prompt = promptMatch ? promptMatch[1].trim() : '';
      const id = 'char_' + String(idx + 1).padStart(2, '0');
      result.characters.push({
        id: id,
        name: name,
        role: roleMatch ? roleMatch[1].trim() : '',
        age: ageMatch ? ageMatch[1].trim() : '',
        description: '',
        characterPrompt: prompt,
        prompt: prompt,
        referenceImage: '',
      });
    });
  }

  // Legacy format: scenes နှင့် characters နှစ်ခုလုံး မရပါက Raw Output ကို Scene 1 အဖြစ် ပြသည် (Backward Compat)
  if (result.scenes.length === 0 && result.characters.length === 0) {
    result.scenes.push({ id: 'scene_01', number: 1, title: '', duration: 8, characterIds: [], videoPrompt: String(rawText).trim(), environmentPrompt: '' });
    result.rawFallback = true;
  }

  // Character continuity — Scene characterIds များကို Character id နှင့် ချိတ်ပေးသည်
  if (result.characters.length) {
    const map = {};
    result.characters.forEach(function (ch) {
      map[String(ch.name).trim().toLowerCase()] = ch.id;
      map[String(ch.id).trim().toLowerCase()] = ch.id;
    });
    result.scenes.forEach(function (sc) {
      if (!Array.isArray(sc.characterIds) || sc.characterIds.length === 0) {
        const hay = (sc.videoPrompt + ' ' + sc.environmentPrompt + ' ' + sc.title).toLowerCase();
        const ids = [];
        result.characters.forEach(function (ch) {
          if (ch.name && hay.indexOf(String(ch.name).trim().toLowerCase()) !== -1 && ids.indexOf(ch.id) === -1) ids.push(ch.id);
        });
        sc.characterIds = ids;
      } else {
        sc.characterIds = sc.characterIds.map(function (v) {
          const s = String(v).trim().toLowerCase();
          return map[s] || v;
        });
      }
    });
  }
  return result;
}
