# ARCHITECTURE.md

## 1. System overview

Single Cloudflare **Worker** (`worker/src/index.js`) serves the whole product — it handles routing, renders HTML pages, exposes the JSON API, checks auth/roles/plans/features, and talks to **Cloudflare D1** (SQLite) and the **Gemini API** (directly, or via the user's **BYOK** key). GitHub Actions deploys the Worker and applies D1 migrations.

```
Browser ──▶ Cloudflare Worker (index.js)
                │  routes /app/* pages  │  /api/* JSON  │  /admin  │  /api/admin/*
                ├── core/ services (auth, ai, cms, projects,
                │         settings, usage, studioSettings, featureSettings, adminLogs)
                ├── studios/ (story, content, short, image, voice, shop)
                └── config/ (STUDIO_REGISTRY, FEATURE_REGISTRY, AI_MODEL_REGISTRY)
                │  ──▶ D1 (migrations 001–012)
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
└── ADMIN APP (admin.js + /api/admin/*)
    ├── Dashboard · Users · Studios · Features · Usage · Logs · CMS · …
```

> **Phase 13 (Option 2) — Client-side Creations:** `core/creations.js` and all `/api/creations*` server endpoints were removed; the file itself was deleted in the V2 Phase 8 cleanup. User creations are stored **only in the browser** via an IndexedDB store (`aics_creations_v1`) shipped inside `sidebarScript()` as `window.AICS_CREATIONS` (save / list / remove / toggleFav, keyed by JWT `sub`). D1 stores **no user content** — only accounts, config, projects and usage counters.

## 3. Frontend pages & shared shell

Every page is rendered server-side by `index.js` from a JS template module in `worker/src/frontend/`:

| Route | Module | Purpose |
|---|---|---|
| `/` | `frontend.js` | Home — greeting, hero banner, 6 Studio cards, recent projects, API-key pill |
| `/app/story` `/app/content` `/app/short` `/app/image` `/app/voice` `/app/shop` | `frontend/studios/<slug>/` packages, lazy-loaded via `frontend/studioPages.js` (`getStudioPage`) — root `frontend/{story,content,short,image,voice,shop}.js` are back-compat shims | Studio UIs (V2 modular: page/ui/state/constants/helpers/actions/stepper/shell/…) |
| `/app/creations` | `frontend/creations.js` | My Creations (filter/sort/search/favorite) — reads/writes **IndexedDB only** (Phase 13) |
| `/app/settings` | `frontend/settings.js` | Profile / Preferences / API Key tabs |
| `/app/projects` | `frontend/projects.js` | Projects |
| `/admin` | `admin.js` | Admin panel (light theme, separate) |

Studio page loading contract (V2 Phase 1): unknown slug → `404 STUDIO_NOT_FOUND`; known studio whose module fails to load → `500 STUDIO_PAGE_LOAD_FAILED` (module errors are never reported as 404; the server log records slug + message + error id, and the user never sees a stack trace).

**Shared shell** — `frontend/shared.js` provides `renderSidebar(activeId, opts)` + `sidebarScript()`. Every page includes it, so there is **one global sidebar** (no duplicated sidebar per studio) and **one shared responsive CSS** (Desktop ≥1200px / iPad 769–1199px compact / Phone ≤768px drawer) plus shared helpers (`toggleSidebar`, `logout`, `setApiKey`, `__sbToast`, user hydration).

## 4. Backend request flow (personalization & security)

1. **Routing** — `index.js` matches path + method.
2. **Auth** — `/api/auth/login` → Google OAuth → JWT (7-day). `/api/users/me` returns the current user + settings + preferences + studio settings + admin flag.
3. **Role check** — Admin routes (`/admin`, `/api/admin/*`) verify server-side role (`USER` / `ADMIN` / `SUPER_ADMIN`), never trusting frontend flags.
4. **Studio gate** — Studio page/API checks `isStudioEnabled(env, id)`; a disabled studio is rejected **server-side** (403), not just hidden. Studio **page** routes match only under `/app/*` (Phase 7 fix: an admin API path like `/api/admin/studios/shop` is never intercepted as a studio page).
5. **Feature gate** — `requireFeature` / `checkFeature` resolve Free vs Pro from `FEATURE_REGISTRY` + DB overrides.
6. **Ownership** — every query scopes by `user_id` from the verified JWT (`projects.js`, `settings.js`, `usage.js`). User A can never read/write User B's rows. (Creations moved client-side in Phase 13 — see note above.)
7. **BYOK** — user API keys are stored encrypted in `user_keys` and used only server-side; they are **never returned** to the browser.

## 5. Config

- `config/studios.js` — `STUDIO_REGISTRY` (id, name, nameMy, icon, route, component, enabled), `STUDIO_ORDER`, `SITE_LINKS`, helpers `getStudio` / `isStudioEnabled` / `listEnabledStudios`.
- `config/features.js` — `FEATURE_REGISTRY` (27 features: access FREE/PRO + limit) — mirrors the legacy hard-coded plan logic.

## 6. Story 11-Layer Brain (v2.1 — Story Studio only)

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

## 7. Legacy note

`/api/studio/generate` (`studio.js`) is the original generic generator kept for backward compatibility; it still auto-saves a creation on success. The per-studio endpoints (`/api/studio/<id>/…`) are the current path and save explicitly on user action. See `STUDIOS.md`.

### Unified Menu Button (Phase 12 fix)
- All pages share ONE hamburger style defined in `frontend/shared.js` (`responsiveStyles`): `position:fixed; top:14px; left:14px; z-index:300; background:#151b2b; border:1px solid #2a3350; white icon; 44×44px; radius 10px`.
- App pages use `.hamburger`, studio pages use `.menu-btn` — both render identically (same position, color, size) on every page.
- On phones, studio headers get `padding-left:64px` so the logo never collides with the fixed button.

## 8. AI Model Service (Phase C — Phase 14)

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