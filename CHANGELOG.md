# CHANGELOG — V2 (AI Creative Studio Refactor)

> Version: **V2** (Studio Isolation Refactor) · Date: 2026-09-17 · Breaking changes: **None**

---

## v2.1.0 — Story 11-Layer Brain (Audit + Safe Implementation)

> Date: 2026-09-22 · Breaking changes: **None** (Story Video ကို feature-level PRO gate သို့ ပြောင်းသည် — Free users အတွက် Story Video ပိတ်သည်)

### Added
- **11-Layer Brain CMS** — `worker/migrations/014_create_cms_brain.sql` (additive table: `scope` / `module` / `type` / `plan` / `key` / `value` / `active` / `version`); `worker/src/core/cmsBrain.js` (scope loader + `buildBrainPrompt`) — **Knowledge Isolation**: selected Story Type / Visual Style / Video Workflow rows **သာ** load လုပ်သည် (WHERE scope+module+type+plan)။
- **Story Facts (Structured Story Data)** — `generateStory()` response `{ story }` ကို မဖျက်ဘဲ `storyFacts` additive: `storyId / storyType / title / summary / characters / locations / timeline / events / dialogue / emotion / importantObjects / visualFacts / sceneInformation`; `parseStoryWithFacts()` + `buildStoryFactsBlock()` (video-relevant facts သာ video သို့ ပို့သည်)။
- **Visual Style** — Video Type (1–5) အစား `VISUAL_STYLES` (Realism / Anime / 3D Animation / 2D Illustration / Documentary / Film Noir / Fantasy) — "video ဘယ်လိုမြင်ရမလဲ"။
- **Video Workflow** — `VIDEO_WORKFLOWS` (CINEMATIC_FEATURE / CHARACTER_FOCUS / DOCUMENTARY / EPISODIC_SERIES / NON_LINEAR_THRILLER) — "video ကို ဘယ်လိုတည်ဆောက်မလဲ"; Story Type နှင့် သီးခြားရွေးနိုင် (Visual Style + Video Workflow)။
- **Generic Video Engine** — `generateStoryVideoPlan()` သည် Story Facts + Video Knowledge + Selected Visual Style + Selected Video Workflow ကို **separate contexts** အဖြစ် assemble ပြီး generic engine ဖြင့် လုပ်သည် (per-type engine မဖန်တီး)။
- **Story Video PRO gate** — `story.video` + `story.video_image` → feature-level **PRO** (type-based 1–5 gate မသုံးတော့); Flow: Story Result → Create Video → PRO Check → Story Video။
- **Brain CMS Admin** — Admin Panel တွင် Brain CMS tab (GLOBAL_BRAIN / STORY_TYPES / STORY_VIDEO rows စီမံခြင်း) + `/api/brain` CRUD။
- **Tests** — `scripts/story-brain-test.mjs` (22 checks): Story-Type Isolation / Visual-Style & Workflow Isolation / Facts parsing / PRO gate / Frontend contract။

### Changed
- `worker/src/studios/story.js` — generate/revise brain context; video plan style+workflow+facts; Story Type နဲ့ Story Video ကို သီးခြား (dual generic engines)။
- `worker/src/config/features.js` — `story.video` / `story.video_image` access → `PRO` (DB `feature_settings` override ဖြင့် admin ပြောင်းနိုင်)။
- `worker/src/index.js` — story video route: feature-level gate (reqType '1') + `workflow/visualStyle/storyFacts` params; video-image route တွင် feature gate ထည့်။
- Story frontend package (constants/state/helpers/ui/actions) — Video Type selector ဖယ်; Video Workflow selector + Visual Style (အသစ်) ထည့်; PRO toast; draft/workflow restore။
- Docs — README / DATABASE / ARCHITECTURE / STUDIOS။

### Not changed (protected)
- အခြား Studio 5 ခု (Content/Short/Image/Voice/Shop) — code + CMS rows လုံးဝ မထိ။
- `cms_prompts` table + legacy path — brain config မရှိမှသာ fallback။
- Save-to-creations (IndexedDB), auth, models, studio registry, shared components။

---

## v2.0.0 — Studio Isolation Refactor

### Added
- **Studio package architecture** — `worker/src/frontend/studios/<studio>/` 6 packages (44 files):
  `page.js`, `ui.js`, `constants.js`, `state.js`, `api.js`, `actions.js`, `helpers.js`, `stepper.js`, plus branch slices (`video.js`/`audio.js`/`image.js`/`shell.js` for shop/content/short)
- **Lazy loading** — `worker/src/frontend/studioPages.js` (`getStudioPage(slug)`); studio page code ကို ထို studio ဖွင့်မှသာ load
- **Generic shared components** — `worker/src/frontend/shared-ui.js` (Toast/Copy/Error Dialog/Confirm/Modal/Common Utilities canonical; rule 7 merge target)
- **Backward-compatible shims** — old `frontend/<studio>.js` import paths ဆက် အလုပ်လုပ်သည်
- **Legacy archive** — v1 မူရင်းဖိုင်များ → `frontend/_legacy/<studio>_v1_full.js` (rule 14)
- **Refactor toolchain** — `scripts/split-studios.mjs`, `scripts/verify-split.mjs`, `scripts/write-shims.mjs`, `scripts/check-browser-scripts.mjs`, `scripts/regression-test.mjs`
- **Reports** — MASTER_ARCHITECTURE_AUDIT.md, DEPENDENCY_MAP.md, DUPLICATE_REPORT.md, SAFE_REFACTOR_PLAN.md, REGRESSION_TEST_REPORT.md, CHANGELOG_V2.md

### Changed
- `worker/src/index.js` (protected — WHY/IMPACT/RISK → SAFE_REFACTOR_PLAN.md §5): Studio HTML eager imports 6 ခုကို `getStudioPage()` lazy loader ဖြင့် အစားထိုး; `/app/{studio}` route သည် async loader ဖြင့် ဆောင်ရွက်
- `frontend/{story,content,short,image,voice,shop}.js`: v1 monolithic → re-export shim (implementation → studio packages)
- `frontend/_legacy/*_v1_full.js`: import path `'./shared.js'` → `'../shared.js'` (archive loadable ဖြစ်ရန် — runtime မသုံး)

### Removed
- (V2 တွင် မည်သည့် feature/studio/API/DB မျှ မဖျက်ပါ — rule 15)

### Fixed
- N/A (refactor only — functionality မပြောင်း)

## Compatibility

| Layer | V1 → V2 |
|---|---|
| API endpoints | ✅ unchanged (rule 3) |
| Page routes | ✅ unchanged (same HTML output — byte-identical) |
| DB schema/data | ✅ unchanged (rule 4) |
| Studio set | ✅ unchanged (6 studios, rule 2) |
| Old import paths | ✅ unchanged (shims) |
| Browser behavior | ✅ byte-identical scripts |

## Verification Summary

- Byte-identity (rebuilt HTML vs v1): **6/6 PASS**
- Browser script syntax: **6/6 PASS**
- Route regression (mock D1 + JWT): **20/20 PASS**
- File syntax (44 packages + shims + index.js + new modules): **all PASS**

## Known Follow-ups (NEXT — post-V2)

1. Migrate identical helper duplicates (`debounce`, `sel`) → shared-ui after browser E2E
2. Delete `frontend/story_legacy.js` + `core/creations.js` (unused — DELETE LATER, rule 8)
3. Backend studio parsers → `studios/<slug>/helpers.js` (MOVE)
4. Browser E2E suite (Playwright) for generate/revise flows
