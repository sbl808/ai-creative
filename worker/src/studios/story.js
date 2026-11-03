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
import { getStudioStoryTypeConfig } from '../cms/studio-brains/index.js';
import { buildPromptContext } from '../prompt/orchestrator/index.js';
import { generateText } from '../core/ai/aiService.js';
import { resolveModel } from '../core/aiModels.js';

import { mapLegacyCMSTemplate } from './studios/story/shared.js';

export { buildStoryFactsBlock } from './studios/story/shared.js';
export { generateStoryVideoPlan, generateStoryVideoImage, parseStoryVideoResponse } from './studios/story/video-plan.js';

const CMS_STUDIO = 'STORY';

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
    taskInstructions: {
      ...mapLegacyCMSTemplate(legacy),
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

// Video Workflow default directions (code default — CMS VIDEO_WORKFLOW knowledge rows က override လုပ်နိုင်)
