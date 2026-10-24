# DATABASE.md — D1 schema and migration safety

The app is configured to use Cloudflare **D1 (SQLite)** through `worker/wrangler.toml`. Migration SQL files live in `worker/migrations/`. The presence of a migration file does **not** mean it has been applied to any remote database.

## Migration inventory

The current source inventory includes migrations 001–015 and two files with the `006_` prefix. Keep historical filenames unchanged unless the actual target database's migration history has been inspected and a separate migration plan is approved.

| File | Purpose |
|---|---|
| `001_create_users.sql` | User accounts |
| `002_create_cms_prompts.sql` | Legacy CMS prompt rows |
| `003_create_creations.sql` | Legacy creations table |
| `004_create_user_keys.sql` | Per-user BYOK key storage |
| `005_create_user_settings.sql` | User settings and preferences |
| `006_create_api_test_limits.sql` | Per-user API connection-test rate-limit counters |
| `006_create_projects_usage.sql` | Projects, usage, and legacy creations favorite column |
| `007_create_studio_settings.sql` | Admin studio enable/disable overrides |
| `008_create_feature_settings_logs.sql` | Feature overrides and admin logs |
| `009_create_user_auth_columns.sql` | User display name and password hash columns |
| `010_create_ai_models.sql` | AI model registry table and initial rows |
| `011_add_transcribe_model.sql` | Transcription model category/seed update |
| `012_upgrade_cms_workflow.sql` | CMS workflow schema/data upgrade |
| `013_switch_transcribe_model.sql` | Transcription model switch |
| `014_create_cms_brain.sql` | Story 11-Layer Brain CMS |
| `015_create_api_generation_limits.sql` | Shared per-user AI-generation rate-limit counters |

**Important:** both `006_` files exist. Do not infer the remote application order or migration state from the numeric prefix alone. Use the migration tool's reported history for the specific, verified environment.

## Main tables and purpose

- `users`: account identity, plan, expiry, and authentication profile fields.
- `cms_prompts`: legacy studio prompt/configuration records.
- `creations`: legacy schema. The current app's creations feature uses browser IndexedDB (`aics_creations_v1`); do not assume new creations are written to D1.
- `user_keys`: per-user Gemini API key record; review the current encryption and key-handling implementation before production use.
- `user_settings`, `user_preferences`: user-specific settings.
- `projects`, `usage`: user projects and usage counters/history.
- `studio_settings`: admin overrides for studio enablement.
- `feature_settings`: admin overrides for feature enablement, FREE/PRO access, and optional limits.
- `admin_logs`: administrative action log.
- `ai_models`: available AI model configuration.
- `cms_brain`: scoped Story Brain rows; the loader selects rows for the requested scope/module/type/plan.
- `api_test_limits`: API connection-test rate limiting.
- `api_generation_limits`: shared AI generation rate limiting.

## Ownership and data boundaries

Queries for user-scoped server-side records must derive the user identity from a verified session/JWT, not a client-supplied user ID. Creations are currently browser-side; browser storage is not the same as a server-side backup and may not automatically sync across devices.

## Offline migration checks vs remote D1

The CI migration-contract job runs SQLite/offline scripts:

```bash
python scripts/test-all-migrations.py
python scripts/test-api-test-limits-migration.py
```

These tests validate migration/schema contracts in an isolated environment. They do **not** connect to Cloudflare, confirm that a D1 database exists, or prove that any remote migration has been applied.

## Safe migration procedure — documentation only

Before any remote migration is considered:

1. Confirm that a Cloudflare account and the intended D1 database actually exist.
2. Inspect `worker/wrangler.toml` and verify the environment name and database ID independently. A placeholder is not a valid database ID.
3. Inspect the migration history for the exact intended environment; do not infer it from local SQLite results.
4. Review the migration SQL and expected schema effects.
5. Obtain explicit approval for the named environment and operation before running a remote command.
6. Re-check the migration history and application behavior after the approved operation.

Do not create a database, apply remote migrations, rename historical migration files, drop tables, or deploy as part of a documentation or offline-test task.
