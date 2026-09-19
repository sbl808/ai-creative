# V2_AUDIT.md — AI Creative Studio V2 (Production-Readiness Audit)

> ဤ Audit သည် Code မပြင်မီ ထုတ်ပေးရမည့် အကြိုစာရင်း (Phase 0) ဖြစ်သည်။
> Audit ကာလ: 2026-09-17 · စစ်ဆေးသည့် အတိုင်းအတာ: ဖိုင် 125 ခုလုံး (worker/ + scripts/ + docs/ + CI)
> Project Root: `worker/` (Cloudflare Worker + D1, wrangler.toml → `src/index.js`)

---

## 1. Architecture (လက်ရှိ အနေအထား)

```
Browser ──▶ worker/src/index.js (single router: auth → plan/feature gate → pages/API)
              ├── frontend/  (HTML-string modules)
              │     ├── studios/<slug>/  ← V2 studio packages (page/ui/state/constants/helpers/actions/stepper/…)
              │     ├── studioPages.js   ← V2 lazy loader (getStudioPage)
              │     ├── shared.js        ← shell/sidebar/loading (v1 shared, protected)
              │     ├── shared-ui.js     ← V2 canonical aics* helpers (merge target, မသုံးရသေး)
              │     ├── {story,content,short,image,voice,shop}.js ← back-compat shims
              │     └── _legacy/*_v1_full.js ← v1 archive (6 files)
              ├── studios/*.js   (backend business logic ×6)
              ├── core/*.js      (auth, ai, cms, settings, projects, usage, aiModels, adminLogs,
              │                   featureSettings, studioSettings, utilities, creations[unused])
              ├── config/*.js    (STUDIO_REGISTRY, FEATURE_REGISTRY, AI_MODEL_REGISTRY)
              ├── admin.js       (admin panel HTML + /api/admin/*)
              └── migrations/*.sql (001–012, D1)
```

- **V2 core guarantee (confirmed):** Studio 6 ခုစလုံး → 6 packages (44 files)။ Reassembled HTML သည် v1 နှင့် byte-identical (verify-split.mjs **6/6 PASS** — 115,670 / 133,238 / 105,492 / 88,541 / 88,926 / 159,065 chars)။
- **Cross-studio imports: မရှိ** (grep confirmed — studio package တစ်ခုမှ အခြား studio package ကို import မလုပ်; shared.js သို့သာ သုံးသည်)။
- **Lazy loading:** `/app/<slug>` → `getStudioPage(slug)` (dynamic import, static literal specifiers — wrangler bundling အတွက် OK)။

## 2. Routes Inventory (index.js — 40+ routes)

### Page routes
| Path | Handler | Auth |
|---|---|---|
| `/` | homePage() | Public |
| `/login`, `/login/` | LOGIN_HTML + loginGuardRedirect | Public |
| `/app`, `/app/` | APP_HTML + appSessionGuard | Session |
| `/app/{story,content,short,image,voice,shop}` | lazy getStudioPage → isStudioEnabled → HTML | Session |
| `/app/creations` / `/app/settings` / `/app/projects` | CREATIONS/SETTINGS/PROJECTS_HTML | Session |
| `/admin`, `/admin/` | ADMIN_HTML (email role check) | Session + admin email |
| `/auth/result`, `/ai-test`, `/cms-test`, `/studio-test`, `/creations-test` | test pages | Public |
| `/favicon.ico` | inline SVG | Public |

### API routes (contract — မပြောင်း)
`/api/auth/{login,callback,session,logout,signup,signin}` · `/api/users/me` (+profile/settings PUT) · `/api/user/apikey` (+status) · `/api/ai-models` · `/api/ai/test` · `/api/cms/prompt` · `/api/studio/generate` · `/api/studio/story/{generate,revise,video,video-image}` · `/api/studio/content/{generate,revise,tts,video,video-image,srt,translate-srt}` · `/api/studio/short/{generate,revise,video,video-image}` · `/api/studio/image/{prompt,ad-prompt,generate}` · `/api/studio/voice/{tts,transcribe,srt,translate-srt}` · `/api/studio/shop/content/{generate,revise}` + `video/{generate,video-image}` · `/api/projects` (GET/POST/DELETE /{id}) · `/api/admin/*` (admin.js)

## 3. Dependencies

- **Runtime npm dependencies: 0** (pure Worker — fetch သာ; no package.json). Cloudflare runtime APIs: `crypto.subtle`, `fetch`, D1 binding `env.DB`.
- **Dev/CI deps:** `wrangler@4` (GitHub Actions, npx ဖြင့်) · Node ≥ 20 (scripts) · Playwright (browser E2E — VM တွင် chromium 1169 preinstalled)။
- **Import graph (src):** index.js → studioPages.js → studio packages → shared.js; index.js → studios/* → core/* → config/*။ Studio package → shared.js (အောက်သို့သာ) — ရှင်းလင်းသည်။

## 4. Possible Bugs / Findings

| # | Severity | Location | Finding | Phase |
|---|---|---|---|---|
| B1 | **HIGH** | `frontend/studioPages.js` + `index.js:341-349` | Unknown studio → body `{"error":"not_found",...}` (404) သာ ဖြစ်ပြီး **`STUDIO_NOT_FOUND` မပြန်ပါ**။ ထို့ပြင် module import failure ကို try/catch → null → 404 အဖြစ် မျိုချထားသည် — **known studio module failure သည် 500 `STUDIO_PAGE_LOAD_FAILED` ဖြစ်ရမည် (404 မဟုတ်)**။ | Phase 1 |
| B2 | MEDIUM | `core/auth.js:9` | `SESSION_SIGNING_KEY` မရှိလျှင် **publicly-known fallback `'dev-fallback-key'`** ဖြင့် JWT ထိုးသည် — staging/prod တွင် secret မထည့်ပါက token အတုပြုလုပ်နိုင်သည် (production risk; behavior-preserving ထားပြီး deploy checklist တွင် စစ်ရန်) | Phase 7/10 |
| B3 | LOW | `index.js:341` | `/app/foo/bar` ကဲ့သို့ multi-segment path → last segment ကို studio slug အဖြစ် ယူသည် (unknown → 404) — v1 နှင့် တူညီ၊ ပြောင်းစရာ မလို | — |
| B4 | LOW | `index.js:278` | OAuth failure ဖြစ်စဉ်တွင် `tokenData` ကို server log ထဲ ရိုက်သည် — failure response သာ ဖြစ်၍ access_token မပါ (low risk, pre-existing, မပြောင်း) | — |
| B5 | LOW | `index.js:290-305` | `env.DB` မရှိလျှင် callback တွင် INSERT ပျက် → 500 — production တွင် D1 အမြဲရှိ; mock env အတွက်သာ | — |
| B6 | INFO | `index.js:341` | `/app/creations` ၀င်တိုင်း loader lookup တစ်ခါ လုပ်သည် (null) — အသေးစား overhead သာ၊ bug မဟုတ် | — |

## 5. Duplicate Code

| Helper | Copies | Behaviour identical? | Classification |
|---|---|---|---|
| `showToastMsg`/`toast` | 6 | ✗ timeout/default msg/signature ကွဲ | MERGE (per-variant) → shared-ui — **V2 တွင် KEEP** |
| `copyText`/`copyToClipboard`/`copyValue` | 6 | ✗ toast callback ကွဲ | MERGE → shared-ui — KEEP |
| `escapeHtml`/`esc` | 6 | ✗ null-handling ကွဲ | MERGE → shared-ui (null-safe) — KEEP |
| `debounce` | 4 | ✓ တူညီ | MERGE NOW-safe → `aicsDebounce` — KEEP (byte-identity) |
| `sel` | 4 | ✗ **`sel(id)` က element value ပြန်; `aicsSel(id)` က element ပြန် — မတူ!** | **မပေါင်း** (swap မလုံခြုံ) |
| `fillSelect` | 4 | ✗ signature ကွဲ (`(id,opts,defVal)` vs `(el,arr,valKey,labelKey)`) | KEEP (studio-specific) |
| `showError`/`hideError` | 4 | ✗ signature ကွဲ (`(id,msg)` vs `aicsShowError(prefix,e)`) | KEEP — swap မလုံခြုံ |
| `typewriter` | 4 | ✗ pacing ကွဲ | KEEP (studio identity) |
| `aics*` helpers in shared-ui.js | — | **ထို aics* 名称ကို studio မည်သူမျှ မသုံး (grep confirmed)** — shared-ui.js သည် merge target သာ | KEEP (additive) |

> **Phase 4 နိဂုံး:** shared-ui.js ၏ `aics*` helper များသည် studio-local helper များနှင့် **behavior/signature မတူ** (အထူးသဖြင့် `sel` နှင့် `showError`)။ "တူမှသာ swap" စည်းကမ်းအရ **migration မလုပ်ရ** — မှားယွင်းစွာ swap လုပ်ပါက UI behavior ပျက်မည်။

## 6. Unused / Legacy Files

| File | Status | Evidence | Action |
|---|---|---|---|
| `frontend/story_legacy.js` (533 ln) | **Unused** | grep → import လုပ်သူ မရှိ | DELETE-LATER (test ပြီးမှ) — Phase 8 |
| `core/creations.js` (48 ln) | **Unused** | server-side creations endpoints ဖယ်ပြီးဖြစ်; import မရှိ | DELETE-LATER — Phase 8 |
| `frontend/_legacy/*_v1_full.js` (6) | Archive | V2 reference | **KEEP** (rollback/reference) |
| `frontend/shared-ui.js` | Merge target | မည်သူမျှ import မလုပ် (intentional) | KEEP |
| `worker/src/wrangler.toml` | **Duplicate** | `worker/wrangler.toml` နှင့် content တူ (CI က `worker/` မှ သုံးသည်) | KEEP (uncertain — မဖျက်) |

## 7. Missing Tests

| Area | Status |
|---|---|
| Byte-identity (v2 vs v1) | ✅ scripts/verify-split.mjs — 6/6 PASS |
| Browser script syntax | ✅ scripts/check-browser-scripts.mjs — 6/6 PASS |
| Route-level regression (mock D1 + JWT) | ✅ scripts/regression-test.mjs — 20/20 PASS |
| **Loader failure behavior (B1)** | ❌ မရှိ — Phase 1 တွင် ထည့်ရန် |
| **Unknown studio body (`STUDIO_NOT_FOUND`)** | ❌ မရှိ — Phase 1 တွင် ထည့်ရန် |
| **Browser E2E (Playwright, studio 6 ခု)** | ❌ မရှိ — Phase 5 |
| **API integration (staging, real credentials)** | ❌ မရှိ — Phase 6 (credentials မရှိ → BLOCKED) |
| CI test step | ❌ deploy.yml တွင် test job မပါ | Phase 10 (optional) |

## 8. Production Risks

| # | Risk | Detail | Mitigation |
|---|---|---|---|
| R1 | **No package.json / npm scripts** | README ၏ `npm run dev` သည် run မရ (script မရှိ) — install/build စနစ် မသတ်မှတ် | Docs ပြင် (`npx wrangler@4 dev`); package.json မထည့် (CI က npx wrangler ဖြင့် အလုပ်လုပ်နေ) |
| R2 | **JWT fallback key** (B2) | `SESSION_SIGNING_KEY` မရှိလျှင် public fallback | Staging/prod deploy checklist တွင် secret စစ်ရန် |
| R3 | **No tests in CI** | regression suite များကို CI တွင် run မထား | Phase 10 တွင် note; workflow ထဲ test step ထည့်ရန် (optional, additive) |
| R4 | **Docs mismatch (Phase 9)** | README/ARCHITECTURE/STUDIOS/DATABASE များသည် v1 paths (`frontend/<slug>.js`, `npm run dev`, migrations 001–008) ဖော်ပြ — actual V2 (studio packages, 12 migrations) နှင့် မကိုက် | Phase 9 တွင် actual structure အတိုင်း ပြင် |
| R5 | **Placeholder config** | `config/studios.js` SITE_LINKS တွင် `PASTE_YOUR_TELEGRAM_USERNAME_HERE` | Deploy မတိုင်မီ real link ထည့်ရန် (config — code မဟုတ်) |
| R6 | **Admin email fallback** | `env.ADMIN_EMAIL || 'saialin808@gmail.com'` | Staging/prod တွင် ADMIN_EMAIL သတ်မှတ်ရန် |
| R7 | **wrangler.toml duplicate** | `worker/src/wrangler.toml` နှစ်ပွား | ရှုပ်ထွေးမှု ဖြစ်နိုင်; KEEP (မသေချာ) |
| R8 | **Deploy requires credentials** | Cloudflare API token/account မရှိဘဲ staging deploy မလုပ်နိုင် | Phase 10 တွင် dry-run + report BLOCKED |

## 9. Verified Baseline (audit ပြီးစီး — code မပြင်ရသေးမီ)

```
✅ All worker JS + scripts syntax OK (44 package files + shims + index.js + core + studios + admin)
✅ Byte-identity 6/6 · Browser script syntax 6/6 · Route regression 20/20
✅ Cross-studio internal imports: NONE
✅ Shared state: localStorage/IndexedDB/D1 (schema 001–012 — V2 က migration မထည့်)
```

## 10. Recommended Phase Actions (အတိုချုပ်)

1. **Phase 1** — Studio loader: unknown → 404 `STUDIO_NOT_FOUND` (text/plain); known module failure → 500 `STUDIO_PAGE_LOAD_FAILED` (text/plain); log ထဲ slug+message+error ID; regression test ထဲ loader-failure case ထည့်။
2. **Phase 2** — Modular structure ထိန်း (ပြောင်းစရာ မလို — အတည်ပြုပြီး)။
3. **Phase 3** — Cross-studio imports မရှိ (အတည်ပြုပြီး; ပြောင်းစရာ မလို)။
4. **Phase 4** — shared-ui helpers သည် studio helpers နှင့် signature မတူ → **migration မလုပ်**; audit ထဲ မှတ်တမ်းတင်ထား။
5. **Phase 5** — Playwright E2E smoke suite (studio 6 ခု) — local worker server + real JWT cookie ဖြင့်။
6. **Phase 6** — API integration: staging credentials မရှိ → **BLOCKED** report (fake success မလုပ်)။
7. **Phase 7** — Backend: behavior-preserving audit ပြီး (B2 ကို risk အဖြစ် note; code မပြင်)။
8. **Phase 8** — Legacy: `story_legacy.js` + `core/creations.js` — regression green ဖြစ်ပြီးမှသာ delete (test ဖြင့် သက်သေ)။
9. **Phase 9** — Docs ကို actual filesystem နှင့် ညှိ (README/ARCHITECTURE/STUDIOS/DATABASE)။
10. **Phase 10** — wrangler dry-run build validation; staging deploy BLOCKED (credentials)။
