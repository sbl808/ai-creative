// AI Creative Studio — 12-Layer Brain CMS loader (additive, Story Studio scope)
// Knowledge Isolation Rule (§5 / instruction §13):
//   - getStoryTypeContext  → GLOBAL_FRAMEWORK + SELECTED Story Type (TYPE_n) rows သာ load
//   - getStoryVideoContext → GLOBAL_FRAMEWORK + VIDEO_KNOWLEDGE(base) + SELECTED VISUAL_STYLE
//                            + SELECTED VIDEO_WORKFLOW rows သာ load
//   - အခြား type / style / workflow ၏ knowledge ကို context ထဲ ထည့်မည် မဟုတ်ပါ။
// cms_brain table မရှိသေးသော env (migration မတင်ရသေး) → graceful fallback (empty config)။
// Legacy cms_prompts ကို မထိပါ — brain config မရှိမှသာ legacy ကို fallback အဖြစ် သုံးမည်။

export const BRAIN_SCOPE_GLOBAL = 'GLOBAL_BRAIN';
export const BRAIN_SCOPE_STORY_TYPES = 'STORY_TYPES';
export const BRAIN_SCOPE_STORY_VIDEO = 'STORY_VIDEO';
export const BRAIN_MODULE_GLOBAL_FRAMEWORK = 'GLOBAL_FRAMEWORK';
export const BRAIN_MODULE_STORY_TYPE = 'STORY_TYPE';
export const BRAIN_MODULE_VIDEO_KNOWLEDGE = 'VIDEO_KNOWLEDGE';
export const BRAIN_MODULE_VISUAL_STYLE = 'VISUAL_STYLE';
export const BRAIN_MODULE_VIDEO_WORKFLOW = 'VIDEO_WORKFLOW';
export const BRAIN_TYPE_BASE = 'BASE';
/** Canonical, versioned layer order. Layer identifiers are stable CMS contract values. */
export const BRAIN_LAYER_ORDER = [
  '00_GATEKEEPER',
  '01_CORE',
  '02_MEMORY',
  '03_KNOWLEDGE',
  '04_WORKFLOW',
  '05_TEMPLATE',
  '06_PROMPT_GEN',
  '07_QUALITY_CHECK',
  '08_FEEDBACK_LOOP',
  '09_SAFETY_GUARD',
  '10_FINAL_OUTPUT',
  '11_POST_NOTE',
];


// Selected (scope, module, type, plan) ၏ active rows များကိုသာ key→value map အဖြစ် ပြန်ပေးသည်။
export async function getBrainConfig(env, { scope, module, type = BRAIN_TYPE_BASE, plan = 'FREE' }) {
  const out = {};
  if (!env || !env.DB) return out;
  try {
    const { results } = await env.DB.prepare(
      'SELECT key, value FROM cms_brain WHERE scope=? AND module=? AND type=? AND plan=? AND active=1 ORDER BY version ASC'
    ).bind(scope, module, type, plan).all();
    (results || []).forEach((r) => {
      if (r && r.key && r.value !== null && r.value !== undefined) out[r.key] = String(r.value);
    });
  } catch (e) {
    // cms_brain table မရှိသေးလျှင် — fallback (legacy cms_prompts) သို့ သွားမည်
  }
  return out;
}

// Story Engine context — GLOBAL + SELECTED Story Type (Knowledge Isolation)
export async function getStoryTypeContext(env, typeId, plan) {
  const type = 'TYPE_' + String(typeId || '1');
  const global = await getBrainConfig(env, { scope: BRAIN_SCOPE_GLOBAL, module: BRAIN_MODULE_GLOBAL_FRAMEWORK, type: BRAIN_TYPE_BASE, plan });
  const typeCfg = await getBrainConfig(env, { scope: BRAIN_SCOPE_STORY_TYPES, module: BRAIN_MODULE_STORY_TYPE, type, plan });
  return { global, type: typeCfg };
}

// Video Engine context — GLOBAL + VIDEO_KNOWLEDGE + SELECTED VISUAL_STYLE + SELECTED VIDEO_WORKFLOW
export async function getStoryVideoContext(env, { visualStyle, workflow, plan }) {
  const global = await getBrainConfig(env, { scope: BRAIN_SCOPE_GLOBAL, module: BRAIN_MODULE_GLOBAL_FRAMEWORK, type: BRAIN_TYPE_BASE, plan });
  const videoKnowledge = await getBrainConfig(env, { scope: BRAIN_SCOPE_STORY_VIDEO, module: BRAIN_MODULE_VIDEO_KNOWLEDGE, type: BRAIN_TYPE_BASE, plan });
  const styleCfg = await getBrainConfig(env, { scope: BRAIN_SCOPE_STORY_VIDEO, module: BRAIN_MODULE_VISUAL_STYLE, type: String(visualStyle || 'REALISM').toUpperCase(), plan });
  const workflowCfg = await getBrainConfig(env, { scope: BRAIN_SCOPE_STORY_VIDEO, module: BRAIN_MODULE_VIDEO_WORKFLOW, type: String(workflow || 'CINEMATIC_FEATURE').toUpperCase(), plan });
  return { global, videoKnowledge, visualStyle: styleCfg, workflow: workflowCfg };
}

// config map → canonical 12-layer order when layer IDs are present; legacy order otherwise.
// Existing legacy CMS keys keep their previous order and output format.
export function buildBrainPrompt(config) {
  if (!config || typeof config !== 'object') return '';
  const sections = [];
  const keys = Object.keys(config);
  const layerKey = (layer) => keys.find((key) => key.toUpperCase() === layer);
  const hasCanonicalLayers = BRAIN_LAYER_ORDER.some((layer) => layerKey(layer) !== undefined);

  if (hasCanonicalLayers) {
    BRAIN_LAYER_ORDER.forEach((layer) => {
      const key = layerKey(layer);
      if (key === undefined) return;
      const value = config[key];
      if (value && String(value).trim()) sections.push(layer + ':\n' + String(value).trim());
    });
  }

  // Keep legacy CMS fields even when canonical 12-layer fields are also present.
  const legacyOrder = ['role', 'memory', 'knowledge', 'rules', 'structure', 'prompt', 'quality_check', 'final_output'];
  legacyOrder.forEach((legacyKey) => {
    const key = keys.find((candidate) => candidate.toLowerCase() === legacyKey);
    if (key === undefined) return;
    const value = config[key];
    if (value && String(value).trim()) sections.push(legacyKey.toUpperCase() + ':\n' + String(value).trim());
  });

  keys.forEach((key) => {
    if (BRAIN_LAYER_ORDER.includes(key.toUpperCase())) return;
    if (legacyOrder.includes(key.toLowerCase())) return;
    const value = config[key];
    if (value && String(value).trim()) sections.push(key.toUpperCase() + ':\n' + String(value).trim());
  });
  return sections.join('\n\n');
}
