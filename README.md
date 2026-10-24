# AI Creative Studio

**Modular · Maintainable · Secure · Responsive · Admin-controlled**

AI Creative Studio is a multi-studio content-creation app built with a Cloudflare Worker backend and D1 database configuration. The repository contains six studios: **Story, Content, Short, Image, Voice, and Shop**.

> **Current environment status:** the repository is under development. D1 database IDs may still be placeholders, and a live Cloudflare D1 database or production deployment must not be assumed to exist. CI checks do not create a database, run remote migrations, or deploy the Worker.

## Features

- **Six studios** with studio-specific frontend modules and backend business logic.
- **Story 11-Layer Brain** with scoped CMS knowledge for Story types, visual styles, and video workflows (migration 014).
- **Personal user system** with server-side authentication and per-user settings, projects, usage, and API-key records.
- **Creations storage:** browser IndexedDB (`aics_creations_v1`); do not assume creations are backed up to D1.
- **Free/Pro feature gates** resolved on the server from the feature registry and database overrides.
- **Admin panel** for users, studios, features, models, usage, plans, and system settings.
- **BYOK** (Bring Your Own Key); API-key handling is server-side. Check the implementation and configuration before production use.
- Responsive shared app shell for desktop, iPad, and phone.

## Repository map

```text
.github/workflows/       CI workflows
worker/
  wrangler.toml           Worker environments and D1 bindings
  migrations/             D1 migration SQL files
  src/index.js            Router, auth, gates, and page routes
  src/config/             Studio, feature, and model registries
  src/core/               Auth, AI, CMS, settings, usage, and services
  src/studios/            Studio backend modules
  src/frontend/           Modular frontend and shared shell
scripts/                  Regression, security, static, and offline migration tests
```

See [ARCHITECTURE.md](ARCHITECTURE.md), [STUDIOS.md](STUDIOS.md), [ADMIN.md](ADMIN.md), [DATABASE.md](DATABASE.md), and [SECURITY.md](SECURITY.md).

## Local development

Requirements: Node.js 22 (the CI version), npm/npx, and Wrangler 4 for Worker development. The repository currently uses Wrangler directly; do not assume a root `package.json` exists.

```bash
# From the repository root
npx wrangler@4 --config worker/wrangler.toml dev
```

This starts the Worker locally. Local development may require configuration and local D1 migrations depending on the route being tested. Read [DATABASE.md](DATABASE.md) before running migrations.

**Do not run remote D1 commands or deploy commands as part of local setup.** Before any remote operation, independently verify the target environment and database ID, inspect migration history, and obtain explicit approval. A placeholder database ID is not a valid target.

## Tests and CI

The current `.github/workflows/ci.yml` defines these CI jobs:

| Job | Command | What it checks |
|---|---|---|
| Worker route regression | `node --experimental-default-type=module scripts/regression-test.mjs` | Route and feature contracts with test fixtures/mocked D1 |
| Security contracts | `node --experimental-default-type=module scripts/security-tests.mjs` | Static/security contracts and isolated test fixtures |
| Browser script static checks | `node --experimental-default-type=module scripts/check-browser-scripts.mjs` | Browser script syntax/contracts |
| D1 migration schema contract (offline) | `python scripts/test-all-migrations.py` and `python scripts/test-api-test-limits-migration.py` | SQLite/offline migration checks; **not** a live D1 test |

Run the CI commands locally from the repository root:

```bash
node --experimental-default-type=module scripts/regression-test.mjs
node --experimental-default-type=module scripts/security-tests.mjs
node --experimental-default-type=module scripts/check-browser-scripts.mjs
python scripts/test-all-migrations.py
python scripts/test-api-test-limits-migration.py
```

Other scripts (for example Story Brain, browser E2E, and API integration tests) may be useful, but are not all part of the four-job CI workflow. Browser E2E requires its browser dependencies. Real AI-provider success paths require valid credentials and a suitable environment.

**A passing offline CI run does not prove that a live D1 database exists, that remote migrations are applied, that real Gemini requests succeed, or that production deployment works.**

## Extending the app

- Add or update a studio only after reviewing [STUDIOS.md](STUDIOS.md) and the registry/module boundaries.
- Review [SECURITY.md](SECURITY.md) before changing authentication, user data, API keys, or feature gates.
- Update [DATABASE.md](DATABASE.md) whenever migration files or schema change.
- Keep changes on a feature branch and review the exact diff before merging.
- Never commit real credentials, tokens, or database secrets.

## Known placeholders and limitations

- `SITE_LINKS` in the studio configuration may contain placeholder social links; replace them before launch.
- Environment-specific D1 IDs and secrets must be independently configured and verified.
- This documentation does not certify production readiness or a live deployment.
