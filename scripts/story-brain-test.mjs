#!/usr/bin/env node
/**
 * AI Creative Studio — Story Brain tests (11-Layer / Knowledge Isolation / PRO gate)
 * ----------------------------------------------------------------------------------
 * Run: node --experimental-default-type=module scripts/story-brain-test.mjs
 *
 * Covers (Testing Requirement §22):
 *  - Story Type Isolation: TYPE_1 ရွေးလျှင် TYPE_2 knowledge မဝင်ရ
 *  - Video Isolation:      Video သို့ Story Type knowledge အားလုံး မဝင်ရ
 *  - Workflow Isolation:   CINEMATIC_FEATURE ရွေးလျှင် DOCUMENTARY rules မဝင်ရ
 *  - Visual Style Isolation: ANIME ရွေးလျှင် REALISM knowledge မဝင်ရ
 *  - generateStory → { story, storyFacts } additive contract
 *  - Story Video = Feature-level PRO gate (FREE → 403 pro_only; PRO → passes to AI)
 *  - Frontend: Video Type (1–5) မရှိတော့; Visual Style + Video Workflow ရှိသည်
 */
import { signToken } from '../worker/src/core/auth.js';

const worker = (await import('../worker/src/index.js?r=' + Date.now())).default;
const { parseStoryWithFacts, buildStoryFactsBlock } = await import('../worker/src/studios/story.js?r=' + Date.now());
const { getStoryTypeContext, getStoryVideoContext, buildBrainPrompt } = await import('../worker/src/core/cmsBrain.js?r=' + Date.now());
const { FEATURE_REGISTRY } = await import('../worker/src/config/features.js?r=' + Date.now());

// ---------------------------------------------------------------- mock D1
class BrainMockD1 {
  constructor({ users = {}, brain = [] } = {}) { this.users = users; this.brain = brain; }
  prepare(sql) {
    const self = this;
    return {
      bind(...args) { this._args = args; return this; },
      async first() {
        if (/SELECT plan, expiry FROM users/.test(sql)) {
          const id = this._args && this._args[0];
          return self.users[id] || null;
        }
        return null;
      },
      async all() {
        if (/FROM cms_brain/.test(sql)) {
          const [scope, module, type, plan] = this._args || [];
          return { results: self.brain.filter((r) => r.scope === scope && r.module === module && r.type === type && r.plan === plan && r.active !== 0) };
        }
        return { results: [] };
      },
      async run() { return { success: true }; },
    };
  }
}

let passed = 0, failed = 0;
const failures = [];
function check(name, fn) {
  return fn().then((result) => {
    if (result.ok) { passed++; console.log('  ✔ ' + name); }
    else { failed++; failures.push(name + ' — ' + (result.msg || '')); console.log('  ✘ ' + name + ' — ' + (result.msg || '')); }
  }).catch((e) => {
    failed++; failures.push(name + ' — THREW: ' + e.message); console.log('  ✘ ' + name + ' — THREW: ' + e.message);
  });
}

// ---------------------------------------------------------------- 1. Story Type Knowledge Isolation
console.log('\n— Story Type Knowledge Isolation —');
const brainRows = [
  { scope: 'STORY_TYPES', module: 'STORY_TYPE', type: 'TYPE_1', plan: 'FREE', key: 'knowledge', value: 'TYPE1_KNOWLEDGE_ONLY', active: 1 },
  { scope: 'STORY_TYPES', module: 'STORY_TYPE', type: 'TYPE_1', plan: 'FREE', key: 'prompt', value: 'TYPE1_PROMPT_ONLY', active: 1 },
  { scope: 'STORY_TYPES', module: 'STORY_TYPE', type: 'TYPE_2', plan: 'FREE', key: 'knowledge', value: 'TYPE2_KNOWLEDGE_ONLY', active: 1 },
  { scope: 'STORY_TYPES', module: 'STORY_TYPE', type: 'TYPE_3', plan: 'FREE', key: 'knowledge', value: 'TYPE3_KNOWLEDGE_ONLY', active: 1 },
  { scope: 'GLOBAL_BRAIN', module: 'GLOBAL_FRAMEWORK', type: 'BASE', plan: 'FREE', key: 'knowledge', value: 'GLOBAL_SAFETY', active: 1 },
];
const isoEnv = { DB: new BrainMockD1({ brain: brainRows }) };

await check('TYPE_1 → TYPE_1 knowledge သာ (TYPE_2/3 မဝင်)', async () => {
  const ctx = await getStoryTypeContext(isoEnv, '1', 'FREE');
  const p = buildBrainPrompt(ctx.type);
  const ok = ctx.type.knowledge === 'TYPE1_KNOWLEDGE_ONLY' && ctx.type.prompt === 'TYPE1_PROMPT_ONLY'
    && !p.includes('TYPE2') && !p.includes('TYPE3');
  return { ok, msg: JSON.stringify({ type: ctx.type }) };
});
await check('TYPE_2 → TYPE_2 knowledge သာ (TYPE_1/3 မဝင်)', async () => {
  const ctx = await getStoryTypeContext(isoEnv, '2', 'FREE');
  const p = buildBrainPrompt(ctx.type);
  return { ok: ctx.type.knowledge === 'TYPE2_KNOWLEDGE_ONLY' && !p.includes('TYPE1') && !p.includes('TYPE3'), msg: JSON.stringify({ type: ctx.type }) };
});
await check('GLOBAL_BRAIN framework သည် type နှင့် မရော (global သီးခြား)', async () => {
  const ctx = await getStoryTypeContext(isoEnv, '1', 'FREE');
  return { ok: ctx.global.knowledge === 'GLOBAL_SAFETY', msg: JSON.stringify(ctx.global) };
});
await check('cms_brain table မရှိသော env → graceful fallback (empty, no throw)', async () => {
  const ctx = await getStoryTypeContext({ DB: new BrainMockD1({ brain: [] }) }, '1', 'FREE');
  return { ok: Object.keys(ctx.type).length === 0 && Object.keys(ctx.global).length === 0, msg: JSON.stringify(ctx) };
});

// ---------------------------------------------------------------- 2. Video Context Isolation (Style + Workflow)
console.log('\n— Visual Style / Video Workflow Isolation —');
const videoRows = [
  { scope: 'STORY_VIDEO', module: 'VIDEO_KNOWLEDGE', type: 'BASE', plan: 'FREE', key: 'knowledge', value: 'CINEMATOGRAPHY_BASE', active: 1 },
  { scope: 'STORY_VIDEO', module: 'VISUAL_STYLE', type: 'ANIME', plan: 'FREE', key: 'knowledge', value: 'ANIME_LOOK', active: 1 },
  { scope: 'STORY_VIDEO', module: 'VISUAL_STYLE', type: 'REALISM', plan: 'FREE', key: 'knowledge', value: 'REALISM_LOOK', active: 1 },
  { scope: 'STORY_VIDEO', module: 'VISUAL_STYLE', type: 'FANTASY', plan: 'FREE', key: 'knowledge', value: 'FANTASY_LOOK', active: 1 },
  { scope: 'STORY_VIDEO', module: 'VIDEO_WORKFLOW', type: 'CINEMATIC_FEATURE', plan: 'FREE', key: 'rules', value: 'CINE_RULES', active: 1 },
  { scope: 'STORY_VIDEO', module: 'VIDEO_WORKFLOW', type: 'CHARACTER_FOCUS', plan: 'FREE', key: 'rules', value: 'CHAR_RULES', active: 1 },
  { scope: 'STORY_VIDEO', module: 'VIDEO_WORKFLOW', type: 'DOCUMENTARY', plan: 'FREE', key: 'rules', value: 'DOC_RULES', active: 1 },
];
const vEnv = { DB: new BrainMockD1({ brain: videoRows }) };

await check('ANIME + CHARACTER_FOCUS → ထို ၂ ခုသာ (REALISM/FANTASY/DOCUMENTARY/CINE မဝင်)', async () => {
  const ctx = await getStoryVideoContext(vEnv, { visualStyle: 'ANIME', workflow: 'CHARACTER_FOCUS', plan: 'FREE' });
  const vsP = buildBrainPrompt(ctx.visualStyle);
  const wfP = buildBrainPrompt(ctx.workflow);
  const vkP = buildBrainPrompt(ctx.videoKnowledge);
  const all = vsP + '\n' + wfP + '\n' + vkP;
  const ok = ctx.visualStyle.knowledge === 'ANIME_LOOK' && ctx.workflow.rules === 'CHAR_RULES'
    && ctx.videoKnowledge.knowledge === 'CINEMATOGRAPHY_BASE'
    && !all.includes('REALISM_LOOK') && !all.includes('FANTASY_LOOK')
    && !all.includes('CINE_RULES') && !all.includes('DOC_RULES');
  return { ok, msg: all || '(empty)' };
});
await check('REALISM + DOCUMENTARY → ထို ၂ ခုသာ (ANIME/CHARACTER မဝင်)', async () => {
  const ctx = await getStoryVideoContext(vEnv, { visualStyle: 'REALISM', workflow: 'DOCUMENTARY', plan: 'FREE' });
  const all = buildBrainPrompt(ctx.visualStyle) + '\n' + buildBrainPrompt(ctx.workflow) + '\n' + buildBrainPrompt(ctx.videoKnowledge);
  return { ok: ctx.visualStyle.knowledge === 'REALISM_LOOK' && ctx.workflow.rules === 'DOC_RULES' && !all.includes('ANIME_LOOK') && !all.includes('CHAR_RULES'), msg: all };
});

// ---------------------------------------------------------------- 3. generateStory → story + storyFacts (additive)
console.log('\n— Story Facts (Structured Story Data) —');
await check('story + ```json storyFacts``` → story နှင့် facts ခွဲထွက်', async () => {
  const raw = 'ဇာတ်လမ်းစာသား...\n```json\n{"storyId":"s1","storyType":"1","title":"T","summary":"S","characters":[{"name":"A","attributes":"brave"}],"locations":["Yangon"],"timeline":[],"events":[],"dialogue":[],"emotion":"happy","importantObjects":[],"visualFacts":[],"sceneInformation":[]}\n```';
  const p = parseStoryWithFacts(raw);
  return { ok: p.story === 'ဇာတ်လမ်းစာသား...' && p.storyFacts.title === 'T' && p.storyFacts.storyType === '1' && p.storyFacts.characters[0].name === 'A', msg: JSON.stringify(p) };
});
await check('JSON block မပါသော story → storyFacts {} (legacy compat)', async () => {
  const p = parseStoryWithFacts('plain text only');
  return { ok: p.story === 'plain text only' && Object.keys(p.storyFacts).length === 0, msg: JSON.stringify(p) };
});
await check('empty → { story:"", storyFacts:{} }', async () => {
  const p = parseStoryWithFacts('');
  return { ok: p.story === '' && Object.keys(p.storyFacts).length === 0, msg: JSON.stringify(p) };
});
await check('buildStoryFactsBlock — empty facts → ""', async () => {
  return { ok: buildStoryFactsBlock({}) === '' && buildStoryFactsBlock(null) === '', msg: buildStoryFactsBlock({}) };
});
await check('buildStoryFactsBlock — video-relevant keys သာ (storyType knowledge မပါ)', async () => {
  const out = buildStoryFactsBlock({ storyId: 's1', characters: [{ name: 'A' }], knowledge: 'SHOULD_NOT_INCLUDE', tone: 'x' });
  return { ok: out.includes('"storyId"') && out.includes('"characters"') && !out.includes('knowledge') && !out.includes('tone'), msg: out };
});

// ---------------------------------------------------------------- 4. Feature registry (PRO gate)
console.log('\n— Story Video PRO gate —');
await check('FEATURE_REGISTRY: story.video + story.video_image = PRO', async () => {
  return { ok: FEATURE_REGISTRY['story.video'].access === 'PRO' && FEATURE_REGISTRY['story.video_image'].access === 'PRO', msg: JSON.stringify({ video: FEATURE_REGISTRY['story.video'], image: FEATURE_REGISTRY['story.video_image'] }) };
});

const apiEnv = (users) => ({
  SESSION_SIGNING_KEY: 'brain-test-secret-key',
  GOOGLE_OAUTH_CLIENT_ID: 'test-client',
  GOOGLE_OAUTH_CLIENT_SECRET: 'test-secret',
  ALLOWED_ORIGINS: 'https://test.local',
  ADMIN_EMAIL: 'a@b.com',
  DB: new BrainMockD1({ users, brain: [] }),
});
const post = (env, path, body, token) => worker.fetch(new Request('https://test.local' + path, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
  body: JSON.stringify(body),
}), env, {});

const freeToken = await signToken(apiEnv({}), { sub: 'u-free', email: 'f@x.com', name: 'Free' });
const proToken = await signToken(apiEnv({ 'u-pro': { plan: 'PRO', expiry: null } }), { sub: 'u-pro', email: 'p@x.com', name: 'Pro' });

await check('FREE + story/video → 403 pro_only (feature-level PRO gate)', async () => {
  const r = await post(apiEnv({}), '/api/studio/story/video', { story: 'test story' }, freeToken);
  const j = await r.json().catch(() => null);
  return { ok: r.status === 403 && j && j.error === 'pro_only', msg: `status=${r.status} ${JSON.stringify(j)}` };
});
await check('FREE + story/video-image → 403 pro_only', async () => {
  const r = await post(apiEnv({}), '/api/studio/story/video-image', { prompt: 'x' }, freeToken);
  const j = await r.json().catch(() => null);
  return { ok: r.status === 403 && j && j.error === 'pro_only', msg: `status=${r.status} ${JSON.stringify(j)}` };
});
await check('PRO + story/video → gate ကျော်ပြီး AI error path (500 video_error, no_api_key)', async () => {
  const r = await post(apiEnv({ 'u-pro': { plan: 'PRO', expiry: null } }), '/api/studio/story/video', { story: 'test', workflow: 'CINEMATIC_FEATURE', visualStyle: 'ANIME' }, proToken);
  const j = await r.json().catch(() => null);
  return { ok: r.status === 500 && j && j.error === 'video_error', msg: `status=${r.status} ${JSON.stringify(j)}` };
});
await check('FREE + story/generate (type 1) → Story Type Free logic ဆက် အလုပ်လုပ် (500 story_error, gate မတားဘူး)', async () => {
  const r = await post(apiEnv({}), '/api/studio/story/generate', { idea: 'test idea', type: '1' }, freeToken);
  const j = await r.json().catch(() => null);
  return { ok: r.status === 500 && j && j.error === 'story_error', msg: `status=${r.status} ${JSON.stringify(j)}` };
});
await check('FREE + story/generate (type 2) → type-based pro_type gate ဆက် အလုပ်လုပ် (403 + Type-1 detail)', async () => {
  const r = await post(apiEnv({}), '/api/studio/story/generate', { idea: 'test idea', type: '2' }, freeToken);
  const j = await r.json().catch(() => null);
  // requireFeature သည် pro_type/pro_only နှစ်ခုလုံးကို HTTP error key 'pro_only' ဖြင့်ပဲ ပြန်သည် — detail ဖြင့် ခွဲသည်
  return { ok: r.status === 403 && j && j.error === 'pro_only' && String(j.detail || '').includes('Type 1 ကို သုံးပါ'), msg: `status=${r.status} ${JSON.stringify(j)}` };
});

// ---------------------------------------------------------------- 5. Frontend contract
console.log('\n— Frontend contract (Video Type → Visual Style + Video Workflow) —');
const constantsMod = await import('../worker/src/frontend/studios/story/constants.js?c=' + Date.now());
const uiMod = await import('../worker/src/frontend/studios/story/ui.js?c=' + Date.now());
const helpersMod = await import('../worker/src/frontend/studios/story/helpers.js?c=' + Date.now());
const actionsMod = await import('../worker/src/frontend/studios/story/actions.js?c=' + Date.now());
const stateMod = await import('../worker/src/frontend/studios/story/state.js?c=' + Date.now());

await check('constants: VIDEO_WORKFLOWS (5) + VISUAL_STYLES အသစ်; VIDEO_TYPES မရှိတော့', async () => {
  const s = constantsMod.CONSTANTS_SCRIPT;
  const ok = s.includes('var VIDEO_WORKFLOWS') && s.includes("v:'CINEMATIC_FEATURE'") && s.includes('NON_LINEAR_THRILLER')
    && s.includes("var VISUAL_STYLES=['Realism','Anime','3D Animation','2D Illustration','Documentary','Film Noir','Fantasy']")
    && !s.includes('VIDEO_TYPES');
  return { ok, msg: 'len=' + s.length };
});
await check('ui: vidWorkflowSel ရှိ; vidTypeSel မရှိတော့', async () => {
  const s = uiMod.CONTENT_HTML;
  return { ok: s.includes('id="vidWorkflowSel"') && !s.includes('vidTypeSel') && s.includes('id="vidStyleSel"'), msg: 'len=' + s.length };
});
await check('helpers: buildWorkflowSel ရှိ; buildVideoTypeSel/VIDEO_TYPES မရှိတော့', async () => {
  const s = helpersMod.HELPERS_SCRIPT;
  return { ok: s.includes('function buildWorkflowSel') && !s.includes('buildVideoTypeSel') && !s.includes('VIDEO_TYPES'), msg: 'len=' + s.length };
});
await check('actions: workflow + storyFacts body; selectedVideoType မရှိတော့', async () => {
  const s = actionsMod.ACTIONS_SCRIPT;
  return { ok: s.includes('workflow:selectedWorkflow') && s.includes('storyFacts:currentStoryFacts||{}') && s.includes('currentStoryFacts=data.storyFacts||{}') && !s.includes('selectedVideoType') && !s.includes('vidTypeSel'), msg: 'len=' + s.length };
});
await check('state: selectedWorkflow + currentStoryFacts; selectedVideoType မရှိတော့', async () => {
  const s = stateMod.STATE_SCRIPT;
  return { ok: s.includes("var selectedWorkflow='CINEMATIC_FEATURE'") && s.includes('var currentStoryFacts={}') && !s.includes('selectedVideoType'), msg: s };
});

// ---------------------------------------------------------------- result
console.log('\n=== BRAIN RESULT: ' + passed + ' passed, ' + failed + ' failed ===');
if (failed > 0) {
  console.log('\nFailures:');
  failures.forEach((f) => console.log('  - ' + f));
  process.exit(1);
}
