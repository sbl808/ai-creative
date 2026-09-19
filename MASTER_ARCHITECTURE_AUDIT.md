# MASTER ARCHITECTURE AUDIT — AI Creative Studio V2

> Refactor မလုပ်မီ ပထမဆုံး ထုတ်ပေးရမည့် Audit Report (Instruction §1)
> Audit ကာလ: 2026-09-17 · Project Root: `worker/` (Cloudflare Worker, wrangler.toml → `src/index.js`)

---

## 1. Studio စာရင်း (All Studios — Rule 2: မဖျက်/မပြောင်း)

| Studio | Slug | Frontend (v1 → v2 package) | Backend module | Route prefix |
|---|---|---|---|---|
| Story Studio | `story` | `frontend/story.js` → `frontend/studios/story/` | `studios/story.js` (328 lines) | `/app/story`, `/api/studio/story/*` |
| Content Studio | `content` | `frontend/content.js` → `frontend/studios/content/` | `studios/content.js` (345 lines) | `/app/content`, `/api/studio/content/*` |
| Short Studio | `short` | `frontend/short.js` → `frontend/studios/short/` | `studios/short.js` (286 lines) | `/app/short`, `/api/studio/short/*` |
| Image Studio | `image` | `frontend/image.js` → `frontend/studios/image/` | `studios/image.js` (125 lines) | `/app/image`, `/api/studio/image/*` |
| Voice Studio | `voice` | `frontend/voice.js` → `frontend/studios/voice/` | `studios/voice.js` (130 lines) | `/app/voice`, `/api/studio/voice/*` |
| Shop Studio | `shop` | `frontend/shop.js` → `frontend/studios/shop/` | `studios/shop.js` (355 lines) | `/app/shop`, `/api/studio/shop/*` |

- Studio အသစ် မဖန်တီး၊ Studio နာမည် မပြောင်း၊ Studio မဖျက်။ ✓
- Studio Registry: `config/studios.js` (protected — မပြောင်း) — `STUDIO_REGISTRY` + `getStudio(id)`.

## 2. Routes အားလုံး (index.js — single router)

### Page Routes
| Path | Handler | Auth |
|---|---|---|
| `/` | homePage() | Public |
| `/login`, `/login/` | LOGIN_HTML (loginGuardRedirect: session ရှိပြီးသားဆို → `/app`) | Public |
| `/app`, `/app/` | APP_HTML (appSessionGuard → /login) | Session |
| `/app/{studio}` | **V2: lazy `getStudioPage(slug)`** (v1: static STUDIO_PAGES map) → studioEnabled စစ် → HTML | Session |
| `/app/creations` | CREATIONS_HTML | Session |
| `/app/settings` | SETTINGS_HTML | Session |
| `/app/projects` | PROJECTS_HTML | Session |
| `/admin`, `/admin/` | ADMIN_HTML (email role check) | Session + admin email |
| `/auth/result`, `/ai-test`, `/cms-test`, `/studio-test`, `/creations-test` | Test/result pages | Public |

### API Routes (contract — Rule 3: မပြောင်း)
| Method | Path | Backend |
|---|---|---|
| GET | `/api/auth/login` | Google OAuth redirect |
| GET | `/api/auth/callback` | OAuth code → token |
| GET | `/api/auth/session` | Session info |
| GET | `/api/auth/logout` | Clear cookie |
| POST | `/api/auth/signup` / `/api/auth/signin` | Email/password |
| GET | `/api/users/me` | resolvePlan + user profile |
| PUT | `/api/users/me/profile` / `/api/users/me/settings` | Update profile/settings |
| POST | `/api/user/apikey` · GET `/api/user/apikey/status` | User API key |
| GET | `/api/ai-models` · POST `/api/ai/test` | Model list / AI test |
| POST | `/api/cms/prompt` | CMS prompt (admin) |
| POST | `/api/studio/generate` | Generic studio generate |
| POST | `/api/studio/story/{generate,revise,video,video-image}` | Story backend |
| POST | `/api/studio/content/{generate,revise,tts,srt,translate-srt,video,video-image}` | Content backend |
| POST | `/api/studio/short/{generate,revise,video,video-image}` | Short backend |
| POST | `/api/studio/image/{prompt,generate,ad-prompt}` | Image backend |
| POST | `/api/studio/voice/{tts,transcribe,srt,translate-srt}` | Voice backend |
| POST | `/api/studio/shop/content/{generate,revise}` · `/api/studio/shop/video/{generate,video-image}` | Shop backend |
| GET/POST | `/api/projects`, DELETE `/api/projects/{id}` | Projects (D1) |

> V2 တွင် API Route/Endpoint/Request/Response Format တစ်ခုမျှ မပြောင်းပါ။ ✓

## 3. Frontend / Backend Mapping

```
Browser (inline <script> in HTML strings)
  │  fetch('/api/studio/...')
  ▼
worker/src/index.js  (router: auth → plan/feature gate → studio backend)
  ├─ studios/*.js            → AI/API logic per studio (imports core/*)
  ├─ admin.js                → ADMIN_HTML + admin API
  ├─ core/ai.js              → model routing (callGeminiText / callGeminiImage / callGeminiVision…)
  ├─ core/auth.js            → JWT sign/verify, PBKDF2, OAuth
  ├─ core/utilities.js       → user API keys, HTTP helpers
  ├─ core/{cms,settings,projects,creations,usage,studioSettings,featureSettings,adminLogs,aiModels}.js
  ├─ config/{studios,features,models}.js
  └─ frontend/               → HTML string modules (see §4)
```

Frontend → Backend တစ်ခုချင်းစီသည် HTTP API မှသာ ဆက်သွယ်သည်။ Studio → Studio Communication အားလုံးသည် API/Handoff (e.g. `aics_voice_transfer` via `/api/studio/voice/transcribe`) ဖြင့်သာ ဖြစ်သည်။ **Studio တစ်ခုက နောက် Studio ၏ UI ကို Import မလုပ်** — V2 ပြီးနောက် code အဆင့်တွင်ပါ သေချာသည် (frontend package များ သီးခြား ဖြစ်သွားပြီ)။

## 4. Frontend Structure (V2 — Studio Isolation, Rule 6)

v1: Studio တစ်ခုလျှင် **ဖိုင် ၁ ခု** (HTML string + inline script အားလုံး) — Story 1244 / Content 1759 / Short 1128 / Image 923 / Voice 619 / Shop 2136 lines.

V2: Studio တစ်ခုစီ → သီးသန့် Package:

```
frontend/studios/<studio>/
  page.js       — final HTML composition (head/CSS/body + <script> assembly) + default export
  ui.js         — STEPS / STEP*_HTML fragments
  fragments.js  — additional STEP*_HTML fragments [content — 500-line rule]
  constants.js  — browser-side constant data   (X_SCRIPT string)
  state.js      — browser-side mutable state   (X_SCRIPT string)
  helpers.js    — browser-side utility functions (X_SCRIPT string)
  api.js        — browser-side API-calling actions (X_SCRIPT string) [content, image]
  actions.js    — browser-side UI actions      (X_SCRIPT string) [story, short, image, voice, shop]
  stepper.js    — step state machine + boot    [story, short, image]
  video.js / audio.js / image.js / shell.js    — branch slices [shop, content, short]
  index.js      — (back-compat shim: export { X_HTML } from './page.js')
```

- အဟောင်း `frontend/<studio>.js` များကို **backward-compatible shim** ပြောင်းထားသည် — old import path များ ဆက်အလုပ်လုပ်သည်။
- v1 မူရင်း ဖိုင်အပြည့်ကို `frontend/_legacy/<studio>_v1_full.js` တွင် archive ထားသည် (Rule 8/14 — မဖျက်)။
- **Byte-identical guarantee**: reassembled HTML သည် v1 နှင့် 100% တူညီ (scripts/verify-split.mjs — 6/6 PASS)။

## 5. Shared Functions (Rule 7)

| Shared | Location | Used by |
|---|---|---|
| `renderSidebar`, `sidebarScript` (IndexedDB store, model selector, result loading) | `frontend/shared.js` (protected) | All pages |
| `renderStudioShell` (stepper shell) | `frontend/shared.js` | All studios |
| `aicsResultLoadingHtml` (Loading) | `frontend/shared.js` + re-export in `frontend/shared-ui.js` | All studios |
| **NEW** `shared-ui.js` (Toast/Copy/Error/Confirm/Modal/Common utils canonical) | `frontend/shared-ui.js` (V2, additive) | Merge target (rule 8) |
| `getStudioPage(slug)` — lazy loader | `frontend/studioPages.js` (V2, new) | index.js |

Shared **မလုပ်**သော Studio-specific များ: Story/Content/Voice/Image UI, Shop/Short workflow — studio packages ထဲတွင်သာ ရှိသည် (Studio Identity မပျောက်)။

## 6. Shared State (browser-side)

- **localStorage**: `aics_token`, `aics_email`, `aics_plan`, `aics_default_model`, `aics_draft_story`, `aics_draft_story_imgcache`, `aics_draft_short`, `aics_draft_short_imgcache`, `aics_draft_image`, `aics_draft_shop`, `aics_voice_transfer`
- **IndexedDB**: `aics_creations_v1` (creations saved client-side — sidebarScript)
- **Server (D1)**: `users`, `studio_settings`, `feature_settings`, `projects`, `usage_logs`, `admin_logs`, `user_api_keys` (migrations/ — **Schema မပြောင်း, Rule 4**)
- Studio cross-handoff: `aics_voice_transfer` (Voice → other studios, server `/api/studio/voice/transcribe` response)

## 7. Database Usage

- Queries များကို `core/*` မှ env.DB (D1) သို့ prepared statements ဖြင့်သာ လုပ်သည်။
- V2 refactor သည် DB Schema / Tables / Columns / User Data ကို **လုံးဝ မထိ**။ Migration မရှိ။ ✓

## 8. Duplicate Code (အသေးစိတ် → DUPLICATE_REPORT.md)

- `showToastMsg/toast` (story/content/short/image/shop/voice — signature ကွဲပြား) — 6 copies
- `copyToClipboard/copyText/copyValue` — 6 copies (မတူညီသော variants)
- `escapeHtml/esc` — 6 copies
- `debounce` — 4 copies (တူညီ)
- `sel/$` — 4 copies (တူညီ)
- `autoExpand/autoGrow` — 4 copies (variant ကွဲ)
- `friendlyMsg/showError/hideError` — 4 copies (pattern ကွဲ)
- `fillSelect/buildXTypeSel` — studio-specific (မပေါင်း)
- `typewriter` (typewrite/typewriterFill/stopTypewriter) — 4 copies

## 9. Legacy / Unused Code

| File | Status |
|---|---|
| `frontend/story_legacy.js` (533 lines) | **Unused** — import လုပ်သူ မရှိ (grep confirmed). DELETE-LATER (Rule 8: test ပြီးမှ) |
| `frontend/_legacy/*_v1_full.js` (6 files) | V2 archive — မဖျက် (audit/reference) |
| `core/creations.js` (48 lines) | Server-side creations endpoints ဖယ်ပြီးနောက် ကျန်နေ — **unused** (DELETE-LATER) |
| Test pages (`/ai-test`, `/cms-test`, `/studio-test`, `/creations-test`) | Dev tools — KEEP (ဖျက်ရန် မလို) |

## 10. File Size Optimization (Rule 9 — 500+ line files)

| File (v1) | Lines | V2 Split |
|---|---|---|
| `frontend/shop.js` | 2136 | 9 files (max 390 lines) |
| `frontend/content.js` | 1759 | 9 files (max 497 lines — ui split into ui.js + fragments.js) |
| `frontend/story.js` | 1244 | 7 files (max ~490 lines) |
| `frontend/short.js` | 1128 | 8 files (max 468 lines) |
| `frontend/image.js` | 923 | 6 files (max ~331 lines) |
| `frontend/voice.js` | 619 | 5 files (max ~385 lines) |
| `index.js` | 1342 | KEEP (router — protected, V2 မှာ lazy loader ဖြင့် studio HTML များ ဖယ်) |
| `admin.js` | 799 | KEEP (single admin module — protected pattern, V2 တွင် မထိ) |
| `frontend/shared.js` | 889 | KEEP (protected — additive shared-ui.js ထဲမှ မဟုတ်) |

> V2 ပြီးစီးပြီးနောက် frontend ဖိုင်အားလုံး (studio packages + shared-ui.js + studioPages.js) သည် 500 lines အောက် ဖြစ်သည်။
> `index.js` (router, 1342) / `admin.js` (799) / `shared.js` (889) များသည် protected/core ဖြစ်၍ v1 အတိုင်း ထားသည်။
> v1 မူရင်း ဖိုင်ကြီးများကို `frontend/_legacy/` တွင် archive ထားသည်။

## 11. Studio Isolation Status (Rule 6 — အဓိကရည်ရွယ်ချက်)

| Criterion | V1 | V2 |
|---|---|---|
| Studio အားလုံး သီးခြား Package | ✗ (ဖိုင် ၁ ခုစီ) | ✓ (folder package: page/ui/state/api/actions/helpers/constants…) |
| Studio → Studio UI import | ✗ (မရှိ — သို့သော် ဖိုင်တွဲမရှိ) | ✓ (package ခွဲ → structural ဖြင့် အာမခံ) |
| Studio → Studio communication | API/Handoff သာ | API/Handoff သာ (မပြောင်း) |
| Lazy Loading | ✗ (boot တွင် 6 ခုလုံး အဆင်သင့်) | ✓ (studio ဖွင့်မှသာ import) |
| Backward Compatible | — | ✓ (shim + byte-identical) |
