# Regression Test Report — AI Creative Studio

## Report scope and freshness

This file now documents the current CI test configuration and its limits. The detailed per-studio measurements below in older revisions were historical results from 2026-09-17; they must not be interpreted as a fresh test run for the current commit.

**No regression suite was executed as part of this documentation-only update.** Check the GitHub Actions run for the branch/commit you intend to review before recording a new PASS result.

## 1. CI regression and contract checks

The current `.github/workflows/ci.yml` defines four jobs:

| CI job | Command | Coverage / limitation |
|---|---|---|
| Worker route regression | `node --experimental-default-type=module scripts/regression-test.mjs` | Route-level checks using test fixtures/mocked D1; not a live provider test |
| Security contracts | `node --experimental-default-type=module scripts/security-tests.mjs` | Security contracts, static checks, and test doubles |
| Browser script static checks | `node --experimental-default-type=module scripts/check-browser-scripts.mjs` | Browser script syntax/static contracts |
| D1 migration schema contract (offline) | `python scripts/test-all-migrations.py` and `python scripts/test-api-test-limits-migration.py` | SQLite/offline schema checks only; no remote D1 connection |

## 2. Additional test scripts

Other scripts in `scripts/` include Story Brain tests, browser E2E smoke tests, API integration tests, and module-split verification. They are not all included in the four-job CI workflow. Review each script's prerequisites and assertions before relying on its result.

## 3. What a PASS means

A passing CI run means only that the configured jobs completed successfully for that commit. Depending on the script, tests may use mocked D1, test fixtures, static source inspection, or local SQLite.

A PASS does **not** prove that:

- A Cloudflare account or live D1 database exists
- Remote migrations have been applied to the intended environment
- Production secrets or environment variables are correct
- Real Gemini requests succeed
- Browser IndexedDB, media playback, and all user interactions work in a deployed browser
- A production deployment is healthy

## 4. Important coverage gaps to track

- Full FREE/PRO matrix: FREE Type 1, FREE Type 2–5, PRO, expired PRO, and unknown/malformed plan values
- Admin-disabled features and database-read failures
- Real browser interactions and IndexedDB behavior
- Real AI-provider success paths with approved test credentials
- Remote D1 schema/history and deployment verification (only when separately approved)

The feature-gate gaps above are test coverage items, not evidence that the cases currently pass. In particular, `featureSettings.js` currently falls back to an enabled registry default when reading a feature override fails; see [SECURITY.md](SECURITY.md). A documentation change does not fix or test this behavior.

## 5. How to record a new run

For a new test report, record the commit SHA, branch, date/time, exact commands or GitHub Actions run URL, pass/fail counts, skipped/not-tested cases, and whether D1/provider dependencies were mocked or real. Do not copy historical counts into a new report without rerunning the tests.
