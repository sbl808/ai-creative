# DATABASE.md

Cloudflare **D1** (SQLite). Schema is applied by migrations in `worker/migrations/`, **in order 001 → 012**. Each migration is incremental and additive — existing tables are never dropped.

## Migrations

| # | File | Adds |
|---|---|---|
| 001 | `001_create_users.sql` | `users` |
| 002 | `002_create_cms_prompts.sql` | `cms_prompts` |
| 003 | `003_create_creations.sql` | `creations` (+ index) |
| 004 | `004_create_user_keys.sql` | `user_keys` (BYOK) |
| 005 | `005_create_user_settings.sql` | `user_settings`, `user_preferences` |
| 006 | `006_create_projects_usage.sql` | `projects`, `usage`, `creations.is_favorite` |
| 007 | `007_create_studio_settings.sql` | `studio_settings` (Admin ON/OFF) |
| 008 | `008_create_feature_settings_logs.sql` | `feature_settings`, `admin_logs` |
| 009 | `009_create_user_auth_columns.sql` | `users.auth_password_hash`, `users.auth_salt` (email/password Phase 12) |
| 010 | `010_create_ai_models.sql` | `ai_models` (seeded with 3 built-ins) |
| 011 | `011_add_transcribe_model.sql` | `transcribe` category + `gemini-3.5-transcribe` seed |
| 012 | `012_upgrade_cms_workflow.sql` | CMS workflow upgrade (see file) |

## Tables

### users (001)
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK AUTOINCREMENT | |
| email | TEXT UNIQUE NOT NULL | Google OAuth email |
| plan | TEXT DEFAULT 'FREE' | `FREE` / `PRO` |
| expiry | TEXT | plan expiry |
| created_at / updated_at | TEXT | |

### cms_prompts (002)
Studio prompt templates — `UNIQUE(studio, plan, type)`; columns `core`, `memory`, `knowledge`, `workflow`, `template`, `prompt`, `quality_check`, `final_output`, `updated_at`.

### creations (003)
> **Phase 13 (Option 2):** this table is **deprecated/unused** — user creations are stored **only in the browser** (IndexedDB `aics_creations_v1`, keyed by JWT `sub`). No new rows are written; old rows remain until cleared manually (`DELETE FROM creations;`). D1 stores **no user content** going forward.

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | |
| user_id | INTEGER FK→users | **ownership scope** |
| studio | TEXT | |
| title / original_prompt / ai_output / type | TEXT | |
| is_favorite | INTEGER (added in 006) | 0/1 |
| created_at | TEXT | index `(user_id, created_at DESC)` |

### user_keys (004) — BYOK
| Column | Type | Notes |
|---|---|---|
| user_id | INTEGER PK FK→users | |
| gemini_key | TEXT | stored server-side, never returned to frontend |
| updated_at | TEXT | |

### user_settings (005)
Per-user defaults: `default_studio`, `default_voice`, `default_model`, `language` (default `my`), `theme` (default `dark`), `updated_at`. PK = `user_id`.

### user_preferences (005)
Key-value extensible preferences: `(user_id, pref_key)` PK, `pref_value`, `updated_at`.

### projects (006)
`id` TEXT PK, `user_id` FK (ownership), `title`, `description`, `created_at`, `updated_at`; index `(user_id, created_at DESC)`.

### usage (006)
`id` PK, `user_id` FK, `category` (e.g. `ai`, `image`, `voice`), `amount` default 1, `created_at`; index `(user_id, created_at)` — powers Admin usage statistics.

### studio_settings (007) — Admin control
`studio_id` TEXT PK, `enabled` INTEGER default 1, `updated_at`. Overrides the `enabled` flag in `config/studios.js` registry.

### feature_settings (008) — Free/Pro control
`feature_id` TEXT PK, `enabled` INTEGER default 1, `access` TEXT default `FREE` (`FREE`/`PRO`), `limit_value` INTEGER default 0, `updated_at`. Overrides `config/features.js`.

### admin_logs (008) — Audit
`id` PK, `admin_email`, `action`, `detail`, `created_at`. Written (best-effort) on admin actions: CMS create/update/delete, user plan change, studio toggle, feature update.

## Ownership rule

**Every** query in `core/` (`projects`, `settings`, `usage`, `user_keys`) filters by `user_id` taken from the **verified JWT** (`payload.sub`), never from client-supplied values. This guarantees User A cannot access User B's data. (Creations are no longer server-side — Phase 13, see the `creations` table note above.)

## Adding a new migration

Create `worker/migrations/013_xxx.sql` (additive `CREATE TABLE` / `ALTER TABLE ... ADD COLUMN`), apply it, and update this file. Do **not** drop or rename existing tables/columns without a documented plan.

### users — Phase 12 additions (009)
`name` TEXT NOT NULL DEFAULT '' (personal display name, set from Google profile or Sign Up), `password_hash` TEXT NOT NULL DEFAULT '' (PBKDF2-SHA256 hash of optional email/password login — **never** plaintext). Existing Google-only accounts keep `name=''` / `password_hash=''`; the app falls back to the email prefix for display.

### Auth routes (Phase 12)
- `GET /login` — professional personal login UI (Google primary + email/password sign in + sign up).
- `POST /api/auth/signup` — `{name, email, password}` → creates user (FREE plan), returns JWT. Duplicate email → 409.
- `POST /api/auth/signin` — `{email, password}` → verifies PBKDF2 hash, returns JWT. Wrong creds → 401 (same message for unknown email / wrong password).
- `PUT /api/users/me/profile` — `{name}` (whitelist, ≤60 chars) updates display name.
- `GET /api/users/me` now also returns `name` + `usage {ai_requests, image_generations, voice_generations}`.
- Google callback default destination changed from `/auth/result` to `/app` (legacy `/auth/result` still served).

### Session guard (Phase 12 fix)
- `GET /app`, `/app/{studio}`, `/app/creations|settings|projects` — **server-side session guard**: no valid `aics_token` cookie → `302 /login` (users never see the app shell before logging in); bad cookie → cleared + `302 /login`.
- `GET /login` — valid session → `302 /app` (remember session, Rule 14).
- `GET /api/auth/session` — returns `{token, email, plan}` when the cookie is valid (lets the sidebar restore a session when `localStorage` is empty).
- Email/password Sign In & Sign Up now also set the `aics_token` cookie so browser navigation to `/app` works after login.

### ai_models — transcribe Model (011)
- `011_add_transcribe_model.sql` — `transcribe` (အသံ→စာသား) Category + `gemini-3.5-transcribe` မူလပုံသေ Model ထည့်သည်
- 010 အစောပိုင်း Seed (`gemini-3.6-flash` / `gemini-3.1-flash-image` / `gemini-3.1-flash-tts-preview`) ရှိခဲ့လျှင် `enabled=0` ပိတ်ပေးသည် (Idempotent)

### ai_models — Phase C (010)

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | Gemini model id, e.g. `gemini-3.5-flash-lite` |
| name | TEXT | Display name (Myanmar) |
| category | TEXT | `text` / `image` / `voice` |
| enabled | INTEGER | 1/0 — disabled models never reach users |
| is_default | INTEGER | 1 = this category's default |
| plan_access | TEXT | `FREE` or `PRO` |
| updated_at | TEXT | |

- Seeded with the 3 original built-ins (`010_create_ai_models.sql`).
- Admin upserts via `core/aiModels.js`; the registry in `config/models.js` is the code-side fallback if the table is empty.
- Rule: never allow disabling/deleting the last enabled model of a category.