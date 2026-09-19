# SECURITY.md

## 1. Authentication

- **Google OAuth** login → signed JWT (7-day validity).
- Every protected API reads the Bearer token, verifies it, and derives the user id from `payload.sub`.
- **Never trust a client-supplied user id.**
- Browser page navigation cannot send an `Authorization` header, so login also sets an **HttpOnly `aics_token` cookie** (`Path=/; Secure; SameSite=Lax; Max-Age=604800`). Protected routes accept the header first, then the cookie. The cookie is invisible to JavaScript and is cleared on `/api/auth/logout`.

## 2. Authorization & roles (Rule 13)

- Roles: `USER` / `ADMIN` / `SUPER_ADMIN`.
- Admin access (`/admin`, `/api/admin/*`) is enforced **server-side** via the verified token + `ADMIN_EMAIL` check.
- Hiding a button in the UI is never considered security.

## 3. Personal data isolation (Rule 3)

- Every `core/` query (`projects`, `settings`, `usage`, `user_keys`) is scoped by `user_id` from the verified JWT. Creations moved to browser-only storage in Phase 13, so no user content ever reaches D1.
- User A cannot read or write User B's rows.
- Frontend never receives another user's data.

## 4. Disabled-studio enforcement (Rule 14)

- Studio disabled → `/app/<id>` shows a disabled page **and** `/api/studio/<id>/…` returns **403 `studio_disabled`**.
- UI hiding is only a convenience; the API is the real gate.

## 5. Free/Pro gating (Rule 15)

- Feature access resolved server-side from `FEATURE_REGISTRY` + DB overrides (`feature_settings`).
- Logic: `access='PRO'` + non-PRO plan → `pro_only`; `access='FREE'` + FREE plan + non-default type → `pro_type`.
- No feature gate is implemented purely in the client.

## 6. API keys / BYOK (Rule 17)

- User Gemini keys are stored in `user_keys` and used **only server-side**.
- Keys are **never** returned to the frontend; the browser only ever sends its own key when the user explicitly pastes it (which the server uses for that single request).

## 7. Output encoding / XSS (Phase 7 fix)

- AI and user-generated text rendered into the page is **HTML-escaped** before `innerHTML` injection (`escapeHtml` in frontend pages, e.g. `shop.js`).
- URLs are validated (`safeUrl`) to allow only `http(s)` / data-image / relative paths.

## 8. Error handling (Rule 22)

- API errors return a **user-friendly message** (`Something went wrong. Please try again.`).
- The real error detail/stack is written to **server logs** (`console.error('[AICS]', ...)`), never returned to the client (`friendlyError` in `index.js`).

## 9. Secrets & env

- `ADMIN_EMAIL`, `GOOGLE_CLIENT_ID/SECRET`, built-in Gemini key, JWT secret → store in Cloudflare secrets / `wrangler secret put`, not in the repo.
- `wrangler.toml` and `.gitignore` must never commit real secrets.
- `SITE_LINKS` placeholders in `config/studios.js` must be replaced with real Telegram/Facebook URLs.

## 10. Recommended deployment checklist

- [ ] Replace `SITE_LINKS` placeholders.
- [ ] Set `ADMIN_EMAIL` + all secrets in production.
- [ ] Apply all 9 migrations to prod D1.
- [ ] Re-test with a second account: User A cannot see User B data; a non-admin cannot open `/admin`; a disabled studio returns 403.

## 11. Password policy (Phase 12)

- Passwords are stored **only** as `pbkdf2$iterations$salt$hash` (PBKDF2-SHA256, per-user random 16-byte salt, 30,000 iterations — balanced for the Cloudflare Workers CPU budget).
- Verification uses a **timing-safe** constant-time compare; malformed hashes are rejected without crashing.
- Google OAuth remains the primary authentication path; email/password is an optional convenience. `password_hash` is **never** returned by any API.
- Session is unchanged: stateless JWT (7-day expiry) in `localStorage` + HttpOnly cookie fallback for browser navigation (`/admin`, `/login` redirects). Logout clears both.
- Sign in / sign up error messages do not reveal whether an email exists.

## AI Models security (Phase C — Phase 14)

- `GET /api/ai-models` requires a valid JWT; the response is filtered **server-side** by `enabled` and by the user's plan (PRO-only models are never returned to FREE users).
- `resolveModel` re-validates user-supplied model ids server-side; a disabled/PRO/unknown id falls back to the admin default — the user cannot force a model they aren't allowed to use.
- Admin model endpoints (`/api/admin/models*`) go through the same server-side admin role check as every other admin route.
- Model ids are treated as opaque strings (no dynamic imports / code execution); they are only concatenated into the Gemini REST URL path after an allow-list check (`listEnabledModels`).