# ADMIN.md

## Access

- **Route** — `/admin` (UI) and `/api/admin/*` (API).
- **Role model** — server-side, resolved from the verified JWT, never from a frontend flag:
  - `USER` → User App only
  - `ADMIN` → Admin Panel
  - `SUPER_ADMIN` → full system control
- **Fallback admin email** — `index.js` / `admin.js` use `env.ADMIN_EMAIL || 'saialin808@gmail.com'` to decide who is admin. Set `ADMIN_EMAIL` in Cloudflare secrets for production.

Admin routes are protected **server-side**; the Admin UI is a separate app (light theme `#F4F3EE`) split from the User App UI/routes.

## Admin tabs

| Tab | Source | Description |
|---|---|---|
| Dashboard | `/api/admin/dashboard` | overview stats |
| CMS | existing CMS API | edit prompt templates (create/update/delete → logged) |
| Users | admin user list + plan change | manage users, set Free/Pro (→ logged) |
| Studios | `/api/admin/studios` GET + PUT | toggle a studio ON/OFF (server-enforced; → logged) |
| Features | `/api/admin/features` GET + PUT | per-feature Enabled / Disabled / FREE / PRO / limit (→ logged) |
| Usage | `/api/admin/usage` | per-user usage statistics |
| Logs | `/api/admin/logs` | admin action audit trail |

## Studio control (Rule 14)

Admin toggles `studio_settings.enabled`; the **API** rejects disabled studios with 403 even if the UI tried to call them. See `STUDIOS.md`.

## Free/Pro control (Rule 15)

- Defaults live in `config/features.js` (`FEATURE_REGISTRY`, 27 features).
- Admin can override per feature: `enabled`, `access` (`FREE`/`PRO`), `limit_value` via `feature_settings`.
- Resolution: `enabled = DB_value ?? registry_default`; `access = DB_value ?? registry_default`.

## Audit

Key admin actions write a row to `admin_logs` (best-effort): CMS create/update/delete, user plan change, studio toggle, feature update.

## Do not

- Do **not** hide admin buttons in the UI and call that security — every admin API re-checks the role on the server.

## 🤖 AI Models tab (Phase C — Phase 14)

- **ထည့်ရန် (Add):** fill Model ID (real Google Gemini id), ပြမည့်နာမည်, category (စာသား/ပုံ/အသံ), plan (လူတိုင်း/PRO သာ) → ＋ Add.
- **ပြင်ရန် (Update):** edit the **နာမည် (name)** box and/or the plan dropdown on any row → 💾 Save. The new name is what users see in every Studio's AI Model dropdown (e.g. rename `Gemini 3.6 Flash (စာသား)` to `သာမန်`).
- **ဖွင့်/ပိတ် (Toggle):** ⏻ button — disabled models disappear from every user dropdown immediately.
- **မူရင်း (Default):** ★ sets this model as the category default (used when the user doesn't pick one).
- **ဖျက် (Delete):** 🗑 removes the model.
- The system refuses to disable/delete the **last enabled model** of a category (protection rule), and any model id that does not exist in Google's Gemini API will produce an error when users generate — double-check ids.
- Logs every change in Admin → Logs (`model_create` / `model_update` / `model_delete`).