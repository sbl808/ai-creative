# ARCHITECTURE.md

## 1. System overview

Single Cloudflare **Worker** (`worker/src/index.js`) serves the whole product. The entry point coordinates request middleware and dispatches the dedicated Studio and Project route modules; legacy auth/user and generic API handlers remain in the entry point during incremental extraction. The app renders HTML pages and exposes the JSON API, using **Cloudflare D1** (SQLite) and the **Gemini API** (directly, or via the user's **BYOK** key). GitHub Actions CI runs repository checks; this workflow does not deploy.

```
Browser ──▶ Cloudflare Worker (index.js)
                ├── middleware/ (CORS, request-size and AI rate guards)
                ├── routes/ (Auth, Plans, Users, AI Models, BYOK, AI Test, CMS, Ideas, Generic Studio, Projects + six Studio API modules)
                ├── admin/ (Admin UI + Admin API)
                ├── frontend/ (Home + shared pages + six Studio UIs)
                ├── core/ services (auth, ai, cms, projects, settings, usage, …)
                ├── studios/ (story, content, short, image, voice, shop)
                └── config/ (STUDIO_REGISTRY, FEATURE_REGISTRY, AI_MODEL_REGISTRY)
                │  ──▶ D1 (migrations 001–017)
                │  ──▶ Gemini API (built-in key OR user BYOK key)
```

## 2. Logical layers

```
AI CREATIVE STUDIO
├── USER APP
│   ├── App Shell (Global Sidebar, Topbar, Responsive Layout, User Context, Routing)
│   ├── User Profile / Settings / Preferences / API Keys
│   ├── Studios (6) — via Studio Registry
│   ├── My Creations / Projects / Favorites
│   └── Usage / Plan
├── STUDIOS
│   ├── Story · Content · Short · Image · Voice · Shop
│   └── Each studio = UI (frontend/) + business logic (studios/) + config
├── SHARED CORE (core/)
│   ├── Authentication (auth.js)
│   ├── User / Settings (settings.js)
│   ├── AI Service (ai.js)
│   ├── Project Service (projects.js)
│   ├── Usage Service (usage.js)
│   ├── Studio Settings (studioSettings.js)
│   ├── Feature / Free-Pro (featureSettings.js)
│   └── CMS / Prompt (cms.js), Utilities (utilities.js), Admin Logs (adminLogs.js)
└── ADMIN APP (`admin/ui.js` + `admin/api.js`; `admin.js` remains a compatibility entry)
    ├── Dashboard · Users · Studios · Features · Usage · Logs · CMS · …
```

> **Phase 13 (Option 2) — Client-side Creations:** `core/creations.js` and all `/api/creations*` server endpoints were removed; the file itself was deleted in the V2 Phase 8 cleanup. User creations are stored **only in the browser** via an IndexedDB store (`aics_creations_v1`) shipped inside `sidebarScript()` as `window.AICS_CREATIONS` (save / list / remove / toggleFav, keyed by JWT `sub`). D1 stores **no user content** — only accounts, config, projects and usage counters.

## 3. Frontend pages & shared shell

Every page is rendered server-side by `index.js` from a JS template module in `worker/src/frontend/`:

| Route | Module | Purpose |
|---|---|---|
| `/` | `frontend/home.js` (re-exported by `frontend.js`) | Home — greeting, hero banner, 6 Studio cards, recent projects, API-key pill |
| `/app/story` `/app/content` `/app/short` `/app/image` `/app/voice` `/app/shop` | `frontend/studios/<slug>/` packages, lazy-loaded via `frontend/studioPages.js` (`getStudioPage`) — root `frontend/{story,content,short,image,voice,shop}.js` are back-compat shims | Studio UIs (V2 modular: page/ui/state/constants/helpers/actions/stepper/shell/…) |
| `/app/creations` | `frontend/creations.js` | My Creations (filter/sort/search/favorite) — reads/writes **IndexedDB only** (Phase 13) |
| `/app/settings` | `frontend/settings.js` | Profile / Preferences / API Key tabs |
| `/app/projects` | `frontend/projects.js` | Projects |
| `/admin` | `admin/ui.js` (re-exported by `admin.js`) | Admin panel (light theme, separate) |

Studio page loading contract (V2 Phase 1): unknown slug → `404 STUDIO_NOT_FOUND`; known studio whose module fails to load → `500 STUDIO_PAGE_LOAD_FAILED` (module errors are never reported as 404; the server log records slug + message + error id, and the user never sees a stack trace).

**Shared shell** — `frontend/shared.js` provides `renderSidebar(activeId, opts)` + `sidebarScript()`. Every page includes it, so there is **one global sidebar** (no duplicated sidebar per studio) and **one shared responsive CSS** (Desktop ≥1200px / iPad 769–1199px compact / Phone ≤768px drawer) plus shared helpers (`toggleSidebar`, `logout`, `setApiKey`, `__sbToast`, user hydration).

## 4. Backend request flow (personalization & security)

1. **Routing** — `index.js` runs the shared middleware and dispatches API groups to `routes/*.routes.js`; the route modules delegate business logic to `core/` or `studios/` services. HTML page rendering and final 404 handling remain in the Worker entry point.
2. **Auth** — `/api/auth/login` → Google OAuth → JWT (7-day). `/api/users/me` returns the current user + settings + preferences + studio settings + admin flag.
3. **Role check** — Admin routes (`/admin`, `/api/admin/*`) verify server-side role (`USER` / `ADMIN` / `SUPER_ADMIN`), never trusting frontend flags.
4. **Studio gate** — Studio page/API checks `isStudioEnabled(env, id)`; a disabled studio is rejected **server-side** (403), not just hidden. Studio **page** routes match only under `/app/*` (Phase 7 fix: an admin API path like `/api/admin/studios/shop` is never intercepted as a studio page).
5. **Feature gate** — `requireFeature` / `checkFeature` resolve Free vs Pro from `FEATURE_REGISTRY` + DB overrides.
6. **Ownership** — every query scopes by `user_id` from the verified JWT (`projects.js`, `settings.js`, `usage.js`). User A can never read/write User B's rows. (Creations moved client-side in Phase 13 — see note above.)
7. **BYOK** — user API keys are stored encrypted in `user_keys` and used only server-side; they are **never returned** to the browser.

## 5. Modular route ownership

- `middleware/cors.js` owns the per-request CORS policy.
- `middleware/requestGuards.js` owns API body-size checks and the shared AI generation rate-limit guard.
- `routes/auth.routes.js` owns Google OAuth callback/login, cookie session, email/password signup, signin, and logout API endpoints.
- `routes/plans.routes.js`, `routes/users.routes.js`, and `routes/aiModels.routes.js` own plan catalog, user profile/settings, and user-facing AI model list endpoints.
- `routes/byok.routes.js`, `routes/ai.routes.js`, `routes/cms.routes.js`, and `routes/ideas.routes.js` own BYOK, AI connection test, CMS prompt, and Idea generation endpoints.
- `routes/studio.routes.js` owns the backward-compatible generic Studio endpoint.
- `routes/projects.routes.js` owns `/api/projects` while preserving the existing authentication and response contract.
- `routes/studios/{content,story,short,image,voice,shop}.routes.js` own the six dedicated Studio API endpoint groups. Their business logic remains in `studios/*.js` and shared services remain in `core/`.
- `admin/ui.js` and `admin/api.js` separate the Admin page template from Admin API handlers. `admin.js` re-exports both for existing imports.
- `frontend/home.js` owns the app home template. `frontend.js` re-exports `APP_HTML` for existing imports.
- This is an incremental modularization: authentication/user routes and generic API endpoints still live in `index.js`; do not claim they have been extracted yet.

## 6. Config

- `config/studios.js` — `STUDIO_REGISTRY` (id, name, nameMy, icon, route, component, enabled), `STUDIO_ORDER`, `SITE_LINKS`, helpers `getStudio` / `isStudioEnabled` / `listEnabledStudios`.
- `config/features.js` — `FEATURE_REGISTRY` (27 features: access FREE/PRO + limit) — mirrors the legacy hard-coded plan logic.

## 7. Story 11-Layer Brain (v2.1 — Story Studio only)

Generic Engine တစ်ခုတည်း — Story Type / Video Workflow တစ်ခုချင်းစီအတွက် Engine မဖန်တီး (per-type duplicate engine မရှိ)။ Config / Knowledge / Prompt များကို CMS မှ selected သာ dynamic-load လုပ်သည်။

```
STORY ENGINE  (generic)                     VIDEO ENGINE (generic)
User Input                                   Story Facts (video-relevant သာ)
  → Select Story Type (1–5)                   → Select Visual Style (Realism/Anime/…)
  → Load GLOBAL_BRAIN + TYPE_n rows (သာ)      → Select Video Workflow (CINEMATIC_FEATURE/…)
  → Generate Story                             → Load GLOBAL + VIDEO_KNOWLEDGE + STYLE + WORKFLOW rows (သာ)
  → Quality Check                              → Video Prompt → Video Output (characters+scenes JSON)
  → Final Story
  → { story, storyFacts } (additive)
```

- **Knowledge Isolation** — `core/cmsBrain.js`: `WHERE scope=? AND module=? AND type=? AND plan=?` — TYPE_1 ရွေးလျှင် TYPE_2/3/4/5 knowledge မဝင်; CINEMATIC_FEATURE ရွေးလျှင် DOCUMENTARY rules မဝင်။
- **Story Type ≠ Video Workflow** — Story Type သည် Story Engine အတွက်; Visual Style + Video Workflow သည် Video Engine အတွင်း configuration (သီးခြားရွေးချယ်နိုင်)။
- **Structured Story Data** — `generateStory()` က `{ story, storyFacts }` ပြန်သည် (storyFacts = storyId/title/summary/characters/locations/timeline/events/dialogue/emotion/objects/visualFacts/scenes) — legacy `story` ကို မဖျက်။
- **CMS separation** — `cms_brain` (014) scope: `GLOBAL_BRAIN` / `STORY_TYPES` / `STORY_VIDEO`; module: `GLOBAL_FRAMEWORK` / `STORY_TYPE` / `VIDEO_KNOWLEDGE` / `VISUAL_STYLE` / `VIDEO_WORKFLOW`။ `cms_prompts` (002) ကို မထိ — အခြား Studio 5 ခုနှင့် legacy path ဆက် အလုပ်လုပ်သည်။
- **Story Video PRO** — `story.video` / `story.video_image` = feature-level PRO gate (type-based 1–5 မဟုတ်); Story Type ၏ Free/Pro logic နှင့် သီးခြား။
- **Dynamic expansion** — TYPE_6 / TRAILER အသစ် = Brain CMS တွင် rows ထည့်ရုံဖြင့် code မပြန် (frontend workflow/style list မှာ ရွေးစရာ ထည့်ရန် constants ကိုတော့ update လိုအပ်သည်)။
- Admin → **Brain CMS** tab (GLOBAL_BRAIN / STORY_TYPES / STORY_VIDEO rows CRUD) + `/api/brain` endpoints။

## 8. Legacy note

`/api/studio/generate` (`studio.js`) is the original generic generator kept for backward compatibility; it still auto-saves a creation on success. The per-studio endpoints (`/api/studio/<id>/…`) are the current path and save explicitly on user action. See `STUDIOS.md`.

### Unified Menu Button (Phase 12 fix)
- All pages share ONE hamburger style defined in `frontend/shared.js` (`responsiveStyles`): `position:fixed; top:14px; left:14px; z-index:300; background:#151b2b; border:1px solid #2a3350; white icon; 44×44px; radius 10px`.
- App pages use `.hamburger`, studio pages use `.menu-btn` — both render identically (same position, color, size) on every page.
- On phones, studio headers get `padding-left:64px` so the logo never collides with the fixed button.

## 9. AI Model Service (Phase C — Phase 14)

```
Admin Panel ──(PUT/POST/DELETE /api/admin/models)──► ai_models (D1)
      ▲                                                     │
      │ getAiModels (registry + DB merge)                   ▼
  User App ──(GET /api/ai-models?category=text|image|voice)──► listEnabledModels
      │                                                       (enabled + plan filter)
      ▼
Studio pages: AI Model dropdown (#aiModelSel, data-category)
      │ body.model
      ▼
index.js studio endpoints ──► resolveModel(userChoice, plan, category)
                                   │
                                   ▼
                  studios/*.js call Gemini with the resolved model
```

- `resolveModel` priority: **user-selected** (enabled + plan + category match) → **admin default** (`is_default`) → registry/DEFAULT fallback.
- PRO-only models (`plan_access='PRO'`) are hidden from FREE users on the server (list + resolution), never just in the UI.
- `core/ai.js` `callGeminiTTS` now accepts a `model` parameter (TTS model is also admin-controlled).
- Last-model protection: Admin cannot disable/delete the **only enabled model** of a category — the app can never lose its fallback.

## 10. Deployment, database, and recovery boundaries

- Application code and checked-in SQL migrations describe intended behavior; they do not prove the state of a remote D1 database.
- `worker/wrangler.toml` currently contains environment-specific names for dev, staging, and prod, but its D1 IDs are placeholders. Do not run remote commands or replace these values until the Cloudflare account, target database, and intended environment are independently confirmed and approved.
- The repository's currently listed `.github/workflows/ci.yml` runs tests and declares `contents: read`; it does not deploy. At the time of this review, `.github/workflows/` listed only `ci.yml`. This repository observation does not establish whether deployment is configured outside this directory or through GitHub settings.
- The CI migration checks use offline/in-memory SQLite. They do not confirm remote D1 migration history, backups, or restore success.
- My Creations uses browser IndexedDB (`aics_creations_v1`). D1 backups alone do not protect that browser-local data; export/import and recovery must be designed and tested separately.
- Before any production deployment or database migration, require an explicit environment/target check, reviewed migration plan, suitable backup, a tested recovery path, and owner approval for the named operation.
- Never use documentation checks or offline tests as evidence that production is safe to change. Keep database and Cloudflare operations outside this repository-only safety workflow.
