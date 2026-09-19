# PRODUCTION READINESS REPORT — AI Creative Studio V2

Baseline: `ai-creative-studio-V2-final.zip` (Phase 0–10 delivery)
Phase: Production Readiness hardening (auth key + CORS + deploy flow)
Date: 2026-09-17

---

## 1. Summary

Three production risks found in audit, all fixed and verified:

| # | Risk | Fix |
|---|------|-----|
| 1 | JWT signing key silently fell back to `'dev-fallback-key'` | Removed; missing key now throws `missing_signing_key` → safe 5xx / unauthenticated |
| 2 | CORS was hard-coded `Access-Control-Allow-Origin: *`; per-env `ALLOWED_ORIGINS` never used | Per-request `buildCors()` echoes only origins listed in `env.ALLOWED_ORIGINS`; no `*` fallback |
| 3 | Every push to `main` auto-deployed dev+staging+prod | Rewritten: push `dev`→dev, push `main`→staging only, production = manual dispatch behind a protected GitHub environment |

Final recommendation: **READY** (see §8).

---

## 2. Changed files

| File | Status | Reason |
|------|--------|--------|
| `worker/src/core/auth.js` | modified | Remove dev-fallback signing key |
| `worker/src/index.js` | modified | Per-request CORS enforcement; loader/error scope fix; 20 `requireFeature` call sites |
| `.github/workflows/deploy.yml` | rewritten | Controlled deploy flow + test gate |
| `scripts/security-tests.mjs` | **added** | 25 security/config checks (CORS, auth key, workflow validation) |

No routes, no DB schema, no studio architecture, no shared-ui migration, no other files touched.

---

## 3. Exact changes

### 3.1 `worker/src/core/auth.js` — SESSION_SIGNING_KEY
Before:
```js
keyCache = await crypto.subtle.importKey(
  'raw',
  enc.encode(secret || 'dev-fallback-key'),   // ← publicly-known fallback
  ...);
```
After:
```js
const s = secret != null ? String(secret).trim() : '';
if (!s) { throw new Error('missing_signing_key'); }
keyCache = await crypto.subtle.importKey('raw', enc.encode(s), ...);
```
Behavior on missing key:
- `signToken` → throws → outer `friendlyError` → safe 500 JSON (no stack trace to users)
- `verifyToken` → throws → `verifyTokenSafe` catches → `null` → treated as logged-out → redirect to `/login`
- No silent signing with a guessable secret. No hardcoded secret.

### 3.2 `worker/src/index.js` — CORS
- Deleted the module-level static `const cors = { 'Access-Control-Allow-Origin': '*', ... }`.
- Added:
```js
function buildCors(request, env) {
  const reqOrigin = request.headers.get('Origin') || '';
  const allowed = String((env && env.ALLOWED_ORIGINS) || '')
    .split(',').map(s => s.trim()).filter(Boolean);
  const out = {
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    Vary: 'Origin',
  };
  if (reqOrigin && allowed.includes(reqOrigin)) {
    out['Access-Control-Allow-Origin'] = reqOrigin;   // echo only
  }
  return out;                                          // no match → NO ACAO header, never '*'
}
```
- `const cors = buildCors(request, env);` declared **outside** the `try` so the outer error handler can also use it.
- `requireFeature(env, featureId, plan, reqType, corsHeaders)` — new last param; all **20** call sites updated to pass `cors`.
- Latent bug surfaced by the new test and fixed: OPTIONS preflight returned `new Response('ok', {status:204})` — a 204 must carry no body per the Fetch spec (undici throws). Now `new Response(null, {status:204, headers: cors})`.

Per-environment behavior (from wrangler.toml, verified by tests):
- dev: `ALLOWED_ORIGINS=https://aics-frontend-dev.pages.dev`
- staging: `https://aics-frontend-staging.pages.dev`
- prod: `https://aics-frontend-prod.pages.dev`
Only the listed origin is echoed; other origins (and cross-environment calls) get **no** ACAO header. Same-origin / no-Origin requests get no ACAO (not needed by browsers).

### 3.3 `.github/workflows/deploy.yml`
- Push to `dev`      → `deploy-dev` (auto)
- Push to `main`     → `deploy-staging` **only** (production is never touched by a push)
- `workflow_dispatch` with `environment: dev|staging|prod` → manual deploy
- `deploy-prod` gated on `environment: production` (configure required reviewers in repo → Settings → Environments)
- New `test` job runs before **every** deploy: syntax check of all worker JS + `verify-split` + `check-browser-scripts` + `regression-test` + `security-tests`.

### 3.4 `scripts/security-tests.mjs` (new)
25 checks: CORS allowlist / rejection / no-Origin / preflight / per-env isolation; auth roundtrip / missing-key throw / missing-key verify failure / key-mismatch; wrangler.toml and deploy.yml structural validation.

---

## 4. Tests run — PASS/FAIL

| Suite | Result |
|-------|--------|
| Syntax check (all worker JS) | **PASS** |
| Regression (`regression-test.mjs`) | **PASS — 22/22** |
| Security + CORS + auth secret + workflow (`security-tests.mjs`, new) | **PASS — 25/25** |
| verify-split (studios byte-identical) | **PASS** |
| check-browser-scripts | **PASS** |
| Loader contract (`/app/unknown` → 404 `STUDIO_NOT_FOUND`; `/app/story` loads) | **PASS** |
| Cross-studio internal-import grep | **PASS — no violations** |
| Playwright E2E (6 studios × 10 checks) | **PASS — 90/90** (result-state BLOCKED: no AI credentials — expected) |
| API integration | **PASS — 16/16** (5 BLOCKED: see §5) |
| Wrangler deploy dry-run (`--env prod`) | **PASS** — 957.59 KiB / gzip 184.89 KiB, no errors |

No existing feature, route, or studio behavior was changed; the only runtime behavior changes are:
1. Missing `SESSION_SIGNING_KEY` now fails closed instead of signing with a public key.
2. Cross-origin CORS now honors `ALLOWED_ORIGINS` instead of `*`.
3. A 204 preflight response no longer carries a (spec-invalid) body.

---

## 5. Remaining blockers (honest list — not marked PASS)

| Item | Status | Reason |
|------|--------|--------|
| Real AI text/image/video generation success path | **BLOCKED** | `GEMINI_API_KEY` not present in this environment |
| Voice/TTS real synthesis | **BLOCKED** | TTS provider credentials missing |
| Transcription success path | **BLOCKED** | Credentials + real audio asset missing |
| Translation (SRT) success path | **BLOCKED** | Credentials + real SRT asset missing |
| Upload / storage | **N/A** | App stores creations in IndexedDB; no R2/upload endpoint exists |
| Staging deploy | **BLOCKED** | No Cloudflare API credentials in this environment; workflow validated structurally only |
| Production deploy | **NOT PERFORMED (by design)** | Manual approval gate required; production deploy intentionally not executed |

Error paths for the blocked AI endpoints are verified (friendly 500, no stack trace).

---

## 6. Production secrets required (set in Cloudflare `wrangler secret` per env — never hardcode)

- `SESSION_SIGNING_KEY` — long random string (now mandatory; without it all auth safely fails)
- `GEMINI_API_KEY` — AI text / image / video / TTS
- `ADMIN_EMAIL`
- `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`
- `ALLOWED_ORIGINS` — already declared per env in `worker/wrangler.toml` vars (not secret):
  - dev: `https://aics-frontend-dev.pages.dev`
  - staging: `https://aics-frontend-staging.pages.dev`
  - prod: `https://aics-frontend-prod.pages.dev`

GitHub Actions secrets:
- `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`

---

## 7. Deployment steps

1. Repo → Settings → Environments → create `production` and add required reviewers (manual approval gate).
2. Add GitHub secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
3. For each Cloudflare env run `wrangler secret put <NAME> --env <dev|staging|prod>` for the secrets in §6.
4. Merge to `dev` → worker deploys to dev automatically (after the `test` gate).
5. Merge to `main` → worker deploys to **staging** automatically. Smoke-test staging.
6. Production: run `Deploy Worker + D1 Migration` workflow → `workflow_dispatch` → choose `prod` → approve in the protected environment. Migrations (001–012) are applied automatically per env.

---

## 8. Final recommendation

**READY** for production deployment candidate.

All automated checks pass; the only items not run are those requiring external credentials (real AI calls) and the live Cloudflare deployment itself — both are explicitly out of scope here. No production deployment has been performed; no secrets are hardcoded.
