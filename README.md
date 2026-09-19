# AI Creative Studio

**Personal + Modular + Maintainable + Secure + Responsive + Scalable + Admin-Controlled**
AI Creative Studio — a multi-studio content creation platform (Story / Content / Short / Image / Voice / Shop), rebuilt from a Google Apps Script + Google Sheets + Gemini web app onto **Cloudflare Worker + D1 + GitHub Actions**.

This is the fully re-architected version produced under the **Master Development Instruction** (Phases 1–7): App Shell → Personal User System → Studio System → Admin Panel → Responsive → Testing & Documentation.

## ✨ Features

- **6 Studios** — Story, Content, Short, Image, Voice, Shop (Studio Registry — new studios plug in without touching core).
- **Personal User System** — every user sees only their own Profile, Settings, Preferences, Projects, Creations, API Keys, Usage. Accounts/config are enforced **server-side**; creations are stored **in the user's own browser** (IndexedDB, Phase 13 — D1 stores no user content).
- **Global Shared Sidebar** — one component, responsive across Desktop / iPad / Phone.
- **Free / Pro** — controlled by configuration (feature registry), not hard-coded.
- **Usage Tracking** — AI requests, images, voice, projects per user, viewable in Admin.
- **Admin Panel** — Dashboard, Users, Studios, Features, AI Models/API, Usage, Plans, Projects, Announcements, Logs, System Settings (role-protected: `USER` / `ADMIN` / `SUPER_ADMIN`).
- **BYOK** — user API keys stored & used only server-side (never returned to the frontend).
- **Dark theme** preserved; shared UI components; responsive layout.

## 🚀 Quick Start (local)

```bash
# 1. Install Wrangler
npm i -g wrangler

# 2. Authenticate
wrangler login

# 3. Create D1 database & bind it (see wrangler.toml; binding name: DB)
#    Then apply all migrations in order:
wrangler d1 execute DB --local --file=worker/migrations/001_create_users.sql
# ... repeat for 002..012

# 4. Local dev (the project has no package.json — use wrangler directly)
cd worker && npx wrangler@4 dev

# 5. Deploy (GitHub Actions does this automatically on push to main)
npx wrangler@4 deploy
```

> `wrangler.toml` defines `dev / staging / prod` environments. GitHub Actions `.github/workflows/deploy.yml` runs deploy + D1 migrations.

## 📁 Structure (top level)

```
ai-creative-studio-main/
├── .github/workflows/deploy.yml   # CI/CD — Worker deploy + D1 migrations
├── README.md / ARCHITECTURE.md / DATABASE.md / STUDIOS.md / ADMIN.md / SECURITY.md
├── V2_AUDIT.md                    # Phase 0 production-readiness audit (V2)
├── IMPLEMENTATION_REPORT.md       # Phase 1–10 change/test report (V2)
├── worker/
│   ├── wrangler.toml              # environments + D1 binding
│   ├── migrations/                # 001–012 D1 schema (see DATABASE.md)
│   └── src/
│       ├── index.js               # entry: routing, auth, plan/feature gates, pages
│       ├── admin.js               # Admin panel HTML + admin API
│       ├── studio.js              # legacy generic generator (Story/Content)
│       ├── config/                # STUDIO_REGISTRY, FEATURE_REGISTRY, AI_MODEL_REGISTRY
│       ├── core/                  # auth, ai, cms, projects, settings, usage,
│       │                          #   studioSettings, featureSettings, adminLogs, utilities
│       ├── studios/               # story, content, short, image, voice, shop (business logic)
│       └── frontend/              # V2 modular UI (see below)
│           ├── studios/<slug>/    # per-studio packages (page/ui/state/constants/helpers/
│           │                      #   actions/stepper/shell/audio/video/… — NO cross-studio imports)
│           ├── studioPages.js     # V2 lazy loader (getStudioPage)
│           ├── shared.js          # app shell: sidebar, stepper, loading, drafts
│           ├── shared-ui.js       # canonical aics* UI helpers (merge target, unused)
│           ├── {story,content,short,image,voice,shop}.js  # back-compat shims
│           └── _legacy/           # v1 archive (rollback/reference — keep)
├── scripts/                       # tests (Node ≥ 20):
│   ├── regression-test.mjs        # route-level regression (mock D1 + real JWT) — 22 checks
│   ├── e2e-smoke.mjs              # Playwright browser E2E — 6 studios, 90 checks
│   ├── e2e-server.mjs             # worker HTTP test server (real worker + mock D1)
│   ├── api-integration-test.mjs   # API integration (auth/AI error path/projects) — 16 checks
│   ├── verify-split.mjs           # byte-identity v2 vs v1 (6/6)
│   └── check-browser-scripts.mjs  # browser script syntax (6/6)
```

## 🧪 Tests (V2 production gate)

```bash
node --experimental-default-type=module scripts/verify-split.mjs
node --experimental-default-type=module scripts/check-browser-scripts.mjs
node --experimental-default-type=module scripts/regression-test.mjs
node --experimental-default-type=module scripts/e2e-smoke.mjs      # needs Playwright + Chromium
node --experimental-default-type=module scripts/api-integration-test.mjs
```

- AI *success* paths are **BLOCKED without staging credentials** (`GEMINI_API_KEY` / staging D1) — tests never fake success.
- Unknown studio → `404 STUDIO_NOT_FOUND`; known studio module failure → `500 STUDIO_PAGE_LOAD_FAILED` (server log has slug + error id).

See **ARCHITECTURE.md**, **DATABASE.md**, **STUDIOS.md**, **ADMIN.md**, **SECURITY.md** for details.

## ✅ How to extend

- **Add a Studio** → see `STUDIOS.md` (Registry + module, no core changes).
- **Toggle Free/Pro** → Admin → Features, or edit `config/features.js`.
- **Enable/disable a Studio** → Admin → Studios (server-side enforced).

## 📝 Note on placeholders

`SITE_LINKS` (Telegram / Facebook) in `worker/src/config/studios.js` are placeholders — replace with your real links before launch.

## 🤖 AI Models (Phase C — Phase 14)

- **Before (hard-coded):** every Studio file (`studios/*.js`) had `TEXT_MODEL` / `IMAGE_MODEL` constants and `core/ai.js` hard-coded the TTS model. Changing a model meant editing code + redeploying.
- **Now (Admin-controlled):**
  - `config/models.js` — built-in registry (`AI_MODEL_REGISTRY`, 3 models) + fallback defaults.
  - `worker/migrations/010_create_ai_models.sql` — `ai_models` table, seeded with the 3 built-in models.
  - `core/aiModels.js` — `getAiModels` (registry + DB merge), `listEnabledModels` (enabled + plan filter), `resolveModel` (user choice → admin default → fallback), `setAiModel` / `deleteAiModel` (with last-model protection).
  - **Admin → AI Models** — add / rename / enable / disable / set default / delete any Google Gemini model **without touching code**.
  - **User side** — every Studio shows an **AI Model dropdown** (filtered by category + plan); Settings → ပုံမှန် AI Model is now a real dropdown; the selected model is sent with every request (`body.model`) and used by the server.
- **Deploy for this phase:** `wrangler d1 migrations apply <DB_NAME> --remote` **then** `wrangler deploy --env prod` (two steps — this phase adds a migration).