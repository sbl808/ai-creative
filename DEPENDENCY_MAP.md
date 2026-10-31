# DEPENDENCY MAP — AI Creative Studio V2

> Rule 11: ပြင်မည့် File တစ်ခုချင်းစီအတွက် WHAT / WHY / DEPENDENCY / IMPACT / RISK

Legend: 🟢 = new file · 🟡 = modified (safe) · 🔴 = modified (protected — WHY/IMPACT/RISK ရှင်းပြပြီး) · ⚪ = unchanged

---

## A. Studio Frontend Packages (V2 — rule 6/9)

### `frontend/studios/{story,content,short,image,voice,shop}/` (44 files total)

| File | WHAT | WHY | DEPENDENCY | IMPACT | RISK |
|---|---|---|---|---|---|
| `page.js` | v1 ၏ final HTML template ကို ကိုင်ပြီး `<script>` ကို segment modules များဖြင့် ပေါင်းစပ် | Studio package ၏ entry point (lazy-load target) | `../../shared.js` (renderSidebar, sidebarScript, renderStudioShell, aicsResultLoadingHtml), `./ui.js`, segment modules | HTML output v1 နှင့် byte-identical (verify 6/6) | မရှိ — စက်ဖြင့် ပြန်လည်တပ်ဆင်ထားပြီး byte-identity ဖြင့် အာမခံ |
| `ui.js` | STEPS / STEP*_HTML fragments (v1 verbatim) | `../../shared.js` (aicsResultLoadingHtml) | UI markup မပြောင်း | မရှိ |
| `fragments.js` (content) | Additional STEP*_HTML fragments + concat (STEP22/STEP24) | `./ui.js` (STEP1/3/12/14), `../../shared.js` | 500-line rule (ui 511 → 373+131) | မရှိ |
| `constants.js` | Browser-side constant data (X_SCRIPT string) | state/constants ခွဲထားရန် (rule 6) | မရှိ | မရှိ | မရှိ |
| `state.js` | Browser-side mutable state (X_SCRIPT string) | state သီးခြား (rule 6) | shop: `./ui.js` (STEPS — line 604 interpolation) | မရှိ | မရှိ |
| `helpers.js` | Browser-side utilities (X_SCRIPT string) | helpers သီးခြား (rule 6) | မရှိ | မရှိ | မရှိ |
| `api.js` (content, image) | Browser-side API-calling actions | api သီးခြား (rule 6) | မရှိ | မရှိ | မရှိ |
| `actions.js` | Browser-side UI actions | actions သီးခြား (rule 6) | မရှိ | မရှိ | မရှိ |
| `stepper.js` / `video.js` / `audio.js` / `image.js` / `shell.js` | Branch/stepper/draft slices | ဖိုင်ကြီးများ 500+ အောက် (rule 9) | မရှိ | မရှိ | မရှိ |
| `index.js` (package) | Back-compat re-export | old import path ဆက်အလုပ်လုပ်ရန် (rule 3) | `./page.js` | မရှိ | မရှိ |

**Dependency direction:** page.js → ui.js / segments → shared.js (အောက်သို့သာ)။ Studio package တစ်ခုက အခြား studio package ကို **import မလုပ်** (rule 6 — studio isolation)။

## B. Frontend shims (🟡)

### `frontend/{story,content,short,image,voice,shop}.js` (6 files)

| WHAT | WHY | DEPENDENCY | IMPACT | RISK |
|---|---|---|---|---|
| v1 ဖိုင်များကို re-export shim (3 lines) ဖြင့် အစားထိုး | back-compat (rule 3) — index.js/အခြား importers မထိခိုက် | `./studios/<slug>/page.js` | v1 import path များ ဆက်အလုပ်လုပ် (regression ✔) | မရှိ |

## C. Lazy Loading (🟢 + 🔴)

### `frontend/studioPages.js` (🟢 NEW)

| WHAT | WHY | DEPENDENCY | IMPACT | RISK |
|---|---|---|---|---|
| slug → dynamic import loader map + `getStudioPage(slug)` | rule 10 — Studio ဖွင့်မှသာ code load | studio packages (static literal specifiers — wrangler bundle အတွက် statically analyzable) | unknown slug → null (404 ဆက်ဖြစ်) | မရှိ — try/catch + null fallback |

### `worker/src/index.js` (🔴 PROTECTED — rule 5 အောက်တွင် ပြင်ရန် လိုအပ်)

| WHAT | WHY | DEPENDENCY | IMPACT | RISK |
|---|---|---|---|---|
| Studio HTML import 6 ခု (lines 21–26) ဖယ်ပြီး `getStudioPage` lazy loader ဖြင့် အစားထိုး; `/app/{studio}` route ကို `const studioHtml = await getStudioPage(studioSlug)` ဖြစ်အောင် ပြောင်း | **WHY**: rule 10 (Lazy Loading) ကို လိုက်နာရန် — Studio page code ကို boot မှာ အကုန်အဆင်သင့် လုပ်နေခြင်းမှ ရှောင်ရန်။ index.js ကသာ route ကို ထိန်းထားသောကြောင့် ဤနေရာ၌သာ ပြောင်းလို့ရသည်။ | `./frontend/studioPages.js` | boot မှာ Studio HTML 6 ခုလုံး၏ template evaluation မလိုတော့ (startup မြန်); route behavior အတိအကျ တူညီ (regression 20/20 ✔) | **RISK**: dynamic import သည် wrangler bundling တွင် static literal ဖြင့်သာ အလုပ်လုပ်သည် — specifiers အားလုံး literal ဖြစ်ပြီး runtime error ရှိလျှင် fallback null → 404 သာ ဖြစ်သည် (system မပျက်) |

## D. Generic Shared Components (🟢 NEW)

### `frontend/shared-ui.js`

| WHAT | WHY | DEPENDENCY | IMPACT | RISK |
|---|---|---|---|---|
| Toast / Copy / Error Dialog / Confirm / Modal / Common Utilities ၏ canonical implementations (AICS_*_SCRIPT strings + aicsToastHtml + aicsResultLoadingHtml re-export) | rule 7 — Generic shared components များကို တစ်နေရာတည်း merge လုပ်ရန် | `./shared.js` (aicsResultLoadingHtml re-export) | **Additive သာ** — studio packages များ မထိခိုက် (rule 8: duplicates ကို regression ပြီးမှသာ migrate) | မရှိ |

## E. Legacy Archive (🟢 NEW)

### `frontend/_legacy/{story,content,short,image,voice,shop}_v1_full.js`

| WHAT | WHY | DEPENDENCY | IMPACT | RISK |
|---|---|---|---|---|
| v1 မူရင်း ဖိုင်အပြည့် 6 ခုကို archive | rule 8/14 — မဖျက်; audit/reference; ပြန်ပြောင်းနိုင် | import path ကို `'../shared.js'` သို့ ညှိ (loadable ဖြစ်ရန်) — **runtime တွင် မသုံး** | မရှိ (import လုပ်သူ မရှိ) | မရှိ |

## F. Refactor Scripts (🟢 NEW — dev tools)

| Script | WHAT | WHY |
|---|---|---|
| `scripts/split-studios.mjs` | Studio frontend များကို packages ခွဲ (anchor-based, verbatim) | Reproducible refactor |
| `scripts/verify-split.mjs` | Reassembled HTML vs v1 byte-identity | Split ၏ အဓိက အာမခံ |
| `scripts/write-shims.mjs` | Back-compat shims ရေးသည် | Rule 3 |
| `scripts/check-browser-scripts.mjs` | Browser <script> syntax check | Rule 12 |
| `scripts/regression-test.mjs` | Route-level test (mock D1) | Rule 12 |

## G. Unchanged (⚪ — protected/core — မထိ)

| File | Reason |
|---|---|
| `core/ai.js`, `core/auth.js`, `config/studios.js`, `frontend/shared.js` | Protected (rule 5) — V2 တွင် ပြင်စရာ မလို |
| `config/features.js`, `config/models.js`, `core/*`, `studios/*` (backend), `frontend/{login,creations,settings,projects}.js` | Non-500+ / already isolated / server logic — functionality မပြောင်း (rule 9) |
| `worker/src/admin.js`, `worker/src/frontend.js` | ပြင်ဆင်ထားသော compatibility re-export entry များ — မူလ import path များ ဆက်အလုပ်လုပ် |
| `migrations/*.sql`, `wrangler.toml` | DB schema + deploy config — မပြောင်း (rule 4) |


## H. Backend Modular Route Extraction (Option B)

| Module | WHAT | DEPENDENCY | IMPACT / COMPATIBILITY |
|---|---|---|---|
| `worker/src/index.js` | Worker composition root, HTML page dispatch, shared helper ownership, route orchestration | middleware + routes + core + frontend | API URL များကို မပြောင်းဘဲ handler များကို သီးခြားခွဲထား |
| `middleware/cors.js` | Per-request CORS allowlist | Worker Request + environment | မူလ origin allowlist behavior ထိန်းသိမ်း |
| `middleware/requestGuards.js` | API body-size guard + shared AI generation rate limit | Worker Request + injected auth/response helpers + D1 | မူလ 32 MiB limit နှင့် 30-per-10-minute limit ထိန်းသိမ်း |
| `routes/auth.routes.js` | Google OAuth, session, signup, signin, logout APIs | `core/auth.js` + injected session helpers | Existing auth endpoints နှင့် cookie contract ထိန်းသိမ်း |
| `routes/plans.routes.js` | User-facing plan catalog endpoint | `core/planCatalog.js` | Existing response shape ထိန်းသိမ်း |
| `routes/users.routes.js` | User profile, settings, preferences, usage summary | `core/settings.js`, `core/studioSettings.js` | Existing user response fields ထိန်းသိမ်း |
| `routes/aiModels.routes.js` | User-facing AI model list | `core/aiModels.js` | Existing query filters and model response shape ထိန်းသိမ်း |
| `routes/byok.routes.js` | Save/status/delete API key endpoints | `core/utilities.js` | Encryption implementation မပြောင်း |
| `routes/ai.routes.js` | AI connection test endpoint | `core/ai/aiService.js`, AI error mapper | Existing validation mode and error contract ထိန်းသိမ်း |
| `routes/cms.routes.js` | CMS prompt endpoint | `core/cms.js`; Admin API gate still runs before this dispatch | Explicit Admin email check ထိန်းသိမ်း |
| `routes/ideas.routes.js` | Idea generation endpoint | `core/ideas.js` + feature/usage/BYOK helpers | Existing validation and usage tracking ထိန်းသိမ်း |
| `routes/studio.routes.js` | Legacy generic Studio generation endpoint | `studio.js` | Backward-compatible API path ထိန်းသိမ်း |
| `routes/projects.routes.js` | Project create/list/delete endpoints | `core/projects.js` + injected auth/response helpers | User ownership checks and response contract ထိန်းသိမ်း |
| `routes/studios/*.routes.js` | Dedicated API endpoints for Story, Content, Short, Image, Voice, Shop | Corresponding `studios/*.js` + shared helpers | Studio ၆ ခု၏ existing API paths and feature gates ထိန်းသိမ်း |
| `admin/ui.js` / `admin/api.js` | Admin UI template and Admin API handlers split into separate modules | Admin frontend + core admin services | `admin.js` compatibility barrel keeps existing imports working |
| `frontend/home.js` | Application home page template | Frontend shared shell | `frontend.js` compatibility export keeps existing imports working |

**Dependency direction:** `index.js` → middleware/routes → core or Studio service. Studio route modules do not call another Studio's route module. Legacy CMS (`core/cms.js`) and Story Brain (`core/cmsBrain.js`) remain separate. Database migration files and Wrangler configuration were not changed.
