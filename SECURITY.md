# SECURITY.md — security model and operational cautions

This document describes intended security boundaries and known implementation caveats. It is not a security certification or proof that production is configured safely.

## 1. Authentication and sessions

- The app supports Google OAuth and optional email/password authentication.
- Protected APIs verify the session/JWT and derive the user identity from the verified token (for example, `payload.sub`); never trust a client-supplied user ID.
- Browser navigation uses the `aics_token` HttpOnly cookie fallback. The cookie is intended to be Secure and SameSite=Lax.
- Passwords must never be stored in plaintext. The current schema adds `name` and `password_hash` via migration 009; confirm the implementation and configuration when changing authentication.

## 2. Roles and admin routes

- App roles include `USER`, `ADMIN`, and `SUPER_ADMIN`.
- Admin APIs and pages must enforce authorization on the server. Hiding a UI button is not an authorization control.
- Configure the authorized admin identity through secrets/environment configuration; do not commit credentials.

## 3. User data isolation

- User-scoped server-side queries must use the verified session identity and scope records to that user.
- Creations are stored in browser IndexedDB (`aics_creations_v1`) in the current implementation. Browser-only storage should not be described as a D1 backup or cross-device sync.
- Do not return another user's settings, projects, usage, or API-key information.

## 4. Studio and feature gates

- Studio enablement and Free/Pro feature access are checked server-side; frontend hiding alone is insufficient.
- Feature defaults are declared in `worker/src/config/features.js`; database overrides are stored in `feature_settings`.
- The configured rule is: a PRO-only feature requires a PRO plan; FREE features may restrict non-default types. Verify each feature's actual registry entry rather than relying on a generic statement about all studios or features.

**Known caveat requiring a separate code fix:** the current `worker/src/core/featureSettings.js` returns the registry default (enabled) when a feature-settings database read throws. That is fail-open for an admin-disabled override during a database read error. This documentation-only change does not fix that behavior. Do not describe feature-setting read failures as fail-closed until the implementation and tests are updated.

The registry currently lists Content Studio SRT and SRT translation as FREE, while Voice Studio SRT and translation are PRO. If the product requirement is different, resolve it through a separately approved code-and-test change; this documentation task does not change access behavior.

## 5. API keys and secrets (BYOK)

- Never commit API keys, OAuth secrets, JWT signing keys, encryption secrets, or production credentials.
- Keep secrets in the hosting provider's secret/configuration system, not in Markdown or source control.
- API-key storage and retrieval changes require review of encryption, user ownership, and response filtering. Do not assume a secret is safe solely because the UI hides it.

## 6. Output and errors

- Escape untrusted user/AI-generated text before inserting it as HTML.
- Validate URLs before use in links or media.
- Return generic client-facing errors; keep sensitive internal details out of API responses. Logs must not expose tokens, passwords, or API keys.

## 7. Pre-production review checklist

- [ ] Verify real environment bindings, D1 IDs, and secrets independently.
- [ ] Confirm admin access is server-enforced.
- [ ] Test user-to-user data isolation with separate test accounts.
- [ ] Test FREE/PRO, expired-plan, unknown-plan, and admin-disabled feature cases.
- [ ] Verify database-read failures cannot accidentally bypass a required feature restriction.
- [ ] Review API-key encryption, ownership, deletion, and response handling.
- [ ] Replace placeholder `SITE_LINKS` values.
- [ ] Review migration history before any remote schema operation.
- [ ] Run the applicable CI checks and separately verify real provider behavior where credentials are available.

CI/static/offline tests alone do not establish that production secrets, remote D1, or a deployment are configured correctly.
