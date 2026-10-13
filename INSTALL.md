# AI Creative Studio — v2.1 Update (Story 11-Layer Brain)
## ဘယ်ဖိုင်က ဘယ်မှာ ထည့်ရမလဲ — Install Guide

> ဤ Zip ထဲမှ ဖိုင်အားလုံးသည် **project root (ai-creative-studio-main/) နှင့် တူညီသော
> directory structure** ဖြင့် ပါဝင်ပါသည်။ သင့် project folder ထဲသို့ extract/overwrite လုပ်ရုံဖြင့်
> နေရာမှန် ရောက်ပါသည် (path များ အောက်တွင် သီးခြား ရှင်းပြထားသည်)။

---

## 1. Installation (အဆင့်ဆင့်)

```bash
# ① ဤ Zip ကို သင့် project folder (ai-creative-studio-main/) ထဲသို့ extract လုပ်ပါ
#    (ဖိုင် path တွေ ထပ်တူကျသွားပါမည် — overwrite လုပ်ပါ)
unzip -o ai-creative-studio-v2.1-update.zip -d ai-creative-studio-main/

# ② Migration 014 ကို D1 database တွင် အရင် apply လုပ်ပါ (additive — ဟောင်းကို မဖျက်)
wrangler d1 execute DB --remote --file=worker/migrations/014_create_cms_brain.sql
#   (local dev ဆိုလျှင်: wrangler d1 execute DB --local --file=... )

# ③ Deploy
cd worker && npx wrangler@4 deploy
```

> ⚠️ **အစဉ်လိုက်:** Migration (014) ကို **အရင်** apply ပြီးမှ deploy လုပ်ပါ
> (README ရှိ model-phase နှင့် အတူတူ — ဤ update တွင် migration တစ်ခု ပါသည်)။
> Migration မတင်ရသေးရင်တောင် app က brain-fallback ဖြင့် **ဆက် အလုပ်လုပ်နိုင်သည်** (safe)။

---

## 2. File-by-File ရှင်းလင်းချက်

### (A) အသစ် ထပ်ထည့်ရမည့် ဖိုင်များ (NEW — ဖိုင် ၃ ခု)

| # | Zip ထဲက ဖိုင် | ထည့်ရမည့်နေရာ (project root မှ) | အလုပ်လုပ်ပုံ |
|---|---|---|---|
| 1 | `worker/migrations/014_create_cms_brain.sql` | `worker/migrations/014_create_cms_brain.sql` | **Brain CMS table** အသစ် — `scope / module / type / plan / key / value` ဖြင့် GLOBAL_BRAIN / STORY_TYPES / STORY_VIDEO knowledge များကို သီးခြားသိမ်းနိုင်ရန်။ **Additive** — ရှိပြီးသား tables မထိ။ **Deploy မှာ apply ရန် လို** |
| 2 | `worker/src/core/cmsBrain.js` | `worker/src/core/cmsBrain.js` | **11-Layer Brain loader** — `getStoryTypeContext` / `getStoryVideoContext` / `buildBrainPrompt`။ **Knowledge Isolation:** selected Story Type / Visual Style / Video Workflow rows **သာ** load လုပ်သည် (WHERE scope+module+type+plan) — TYPE_1 ရွေးလျှင် TYPE_2/3 knowledge မဝင်။ Table မရှိလျှင် legacy `cms_prompts` သို့ fallback |
| 3 | `scripts/story-brain-test.mjs` | `scripts/story-brain-test.mjs` | **အသစ် test** — 22 checks (Knowledge Isolation / PRO gate / Story Facts / Frontend contract)။ Run: `node --experimental-default-type=module scripts/story-brain-test.mjs` |

### (B) ပြင်ထားသော ဖိုင်များ (MODIFIED — ဖိုင် ၁၄ ခု)

| # | Zip ထဲက ဖိုင် | ထည့်ရမည့်နေရာ | ဘာပြောင်းထားလဲ |
|---|---|---|---|
| 1 | `worker/src/studios/story.js` | `worker/src/studios/story.js` | **Story backend core** — ① `generateStory()` → `{story, storyFacts}` additive (structured data: characters/locations/timeline/…); ② `generateStoryVideoPlan()` → **Generic Video Engine**: Story Facts + Visual Style + Video Workflow + Video Knowledge ကို **separate contexts** ဖြင့် assemble; ③ `parseStoryWithFacts` / `buildStoryFactsBlock` အသစ် |
| 2 | `worker/src/index.js` | `worker/src/index.js` | **Router** — Story Video route: type-based gate → **feature-level PRO gate** + `workflow/visualStyle/storyFacts` params pass; `video-image` route တွင် feature gate ထည့် |
| 3 | `worker/src/config/features.js` | `worker/src/config/features.js` | **Feature registry** — `story.video` နှင့် `story.video_image` access → **PRO** (Story Video = PRO feature) |
| 4 | `worker/src/admin.js` | `worker/src/admin.js` | **Admin Panel** — **Brain CMS** tab အသစ် (GLOBAL_BRAIN / STORY_TYPES / STORY_VIDEO rows CRUD) + `/api/brain` endpoints (admin-only) |
| 5 | `worker/src/frontend/studios/story/constants.js` | `worker/src/frontend/studios/story/constants.js` | **UI constants** — Video Type (1–5) ဖယ်; **VIDEO_WORKFLOWS** (CINEMATIC_FEATURE/CHARACTER_FOCUS/DOCUMENTARY/EPISODIC_SERIES/NON_LINEAR_THRILLER) + **VISUAL_STYLES** အသစ် (Realism/Anime/3D Animation/2D Illustration/Documentary/Film Noir/Fantasy) |
| 6 | `worker/src/frontend/studios/story/ui.js` | `worker/src/frontend/studios/story/ui.js` | **Video form UI** — Video Type select ဖယ်; **Video Workflow select** ထည့် (Visual Style select နှင့် သီးခြား) |
| 7 | `worker/src/frontend/studios/story/helpers.js` | `worker/src/frontend/studios/story/helpers.js` | **Workflow select builder** အသစ် (`buildWorkflowSel`) — Video Type builder ဖယ် |
| 8 | `worker/src/frontend/studios/story/actions.js` | `worker/src/frontend/studios/story/actions.js` | **Actions** — Create Video မှာ **PRO check** (toast) + video request body: `workflow`/`visualStyle`/`storyFacts`; draft save/restore workflow; save-to-creations type → workflow |
| 9 | `worker/src/frontend/studios/story/state.js` | `worker/src/frontend/studios/story/state.js` | **State** — `selectedVideoType` → `selectedWorkflow` + `currentStoryFacts` |
| 10 | `README.md` | `README.md` | Features/migrations/tests ဖော်ပြချက် update (014 + brain test) |
| 11 | `ARCHITECTURE.md` | `ARCHITECTURE.md` | **Story 11-Layer Brain** section အသစ် |
| 12 | `DATABASE.md` | `DATABASE.md` | `cms_brain` (014) table documentation |
| 13 | `STUDIOS.md` | `STUDIOS.md` | Story Studio — Visual Style + Video Workflow + PRO gate ရှင်းလင်းချက် |
| 14 | `CHANGELOG.md` | `CHANGELOG.md` | v2.1 changelog entry |

---

## 3. ဘာတွေ မပြောင်းထားလဲ (ဤ update နဲ့ မသက်ဆိုင်)

- အခြား Studio 5 ခု (Content / Short / Image / Voice / Shop) — code + frontend **လုံးဝ မထိ**
- `worker/src/core/cms.js` · `auth.js` · `ai.js` · `aiModels.js` — **မပြောင်း**
- `cms_prompts` table (002) + migrations 001–013 — **မပြောင်း** (brain rows မရှိမှသာ fallback)
- `wrangler.toml` · `config/studios.js` · shared components · IndexedDB creations — **မပြောင်း**

---

## 4. Install ပြီးနောက် (သိထားရမည့်အချက် ၃ ခု)

1. **Story Video သည် PRO ဖြစ်သွားသည်** — FREE user က Story ရေးနိုင်၊ Story Video မလုပ်နိုင်
   (server 403 + UI toast). Admin → Plans & Features မှာ `story.video` / `story.video_image` ကို
   ပြန် FREE လုပ်နိုင်သည် (DB override — code မပြန်)။
2. **Brain CMS rows မထည့်ရသေးသရွေ့** — ယခင် လက်ရှိ behavior အတိုင်း ဆက် အလုပ်လုပ်သည်
   (legacy `cms_prompts` STORY/STORYVIDEO fallback)။ ထို့နောက် Admin → **Brain CMS** မှာ
   GLOBAL_BRAIN / STORY_TYPES (TYPE_1..) / STORY_VIDEO (VISUAL_STYLE + VIDEO_WORKFLOW)
   knowledge rows ထည့်၍ တဖြည်းဖြည်း upgrade လုပ်နိုင်သည်။
3. **Test** — `node --experimental-default-type=module scripts/story-brain-test.mjs`
   (22 checks) + `scripts/regression-test.mjs` (22 checks) က install ပြီးနောက် ပြန် run ကြည့်ပါ။
