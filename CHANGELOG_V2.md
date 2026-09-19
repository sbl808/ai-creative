# CHANGELOG — V2 (AI Creative Studio Refactor)

> Version: **V2** (Studio Isolation Refactor) · Date: 2026-09-17 · Breaking changes: **None**

---

## v2.0.0 — Studio Isolation Refactor

### Added
- **Studio package architecture** — `worker/src/frontend/studios/<studio>/` 6 packages (44 files):
  `page.js`, `ui.js`, `constants.js`, `state.js`, `api.js`, `actions.js`, `helpers.js`, `stepper.js`, plus branch slices (`video.js`/`audio.js`/`image.js`/`shell.js` for shop/content/short)
- **Lazy loading** — `worker/src/frontend/studioPages.js` (`getStudioPage(slug)`); studio page code ကို ထို studio ဖွင့်မှသာ load
- **Generic shared components** — `worker/src/frontend/shared-ui.js` (Toast/Copy/Error Dialog/Confirm/Modal/Common Utilities canonical; rule 7 merge target)
- **Backward-compatible shims** — old `frontend/<studio>.js` import paths ဆက် အလုပ်လုပ်သည်
- **Legacy archive** — v1 မူရင်းဖိုင်များ → `frontend/_legacy/<studio>_v1_full.js` (rule 14)
- **Refactor toolchain** — `scripts/split-studios.mjs`, `scripts/verify-split.mjs`, `scripts/write-shims.mjs`, `scripts/check-browser-scripts.mjs`, `scripts/regression-test.mjs`
- **Reports** — MASTER_ARCHITECTURE_AUDIT.md, DEPENDENCY_MAP.md, DUPLICATE_REPORT.md, SAFE_REFACTOR_PLAN.md, REGRESSION_TEST_REPORT.md, CHANGELOG_V2.md

### Changed
- `worker/src/index.js` (protected — WHY/IMPACT/RISK → SAFE_REFACTOR_PLAN.md §5): Studio HTML eager imports 6 ခုကို `getStudioPage()` lazy loader ဖြင့် အစားထိုး; `/app/{studio}` route သည် async loader ဖြင့် ဆောင်ရွက်
- `frontend/{story,content,short,image,voice,shop}.js`: v1 monolithic → re-export shim (implementation → studio packages)
- `frontend/_legacy/*_v1_full.js`: import path `'./shared.js'` → `'../shared.js'` (archive loadable ဖြစ်ရန် — runtime မသုံး)

### Removed
- (V2 တွင် မည်သည့် feature/studio/API/DB မျှ မဖျက်ပါ — rule 15)

### Fixed
- N/A (refactor only — functionality မပြောင်း)

## Compatibility

| Layer | V1 → V2 |
|---|---|
| API endpoints | ✅ unchanged (rule 3) |
| Page routes | ✅ unchanged (same HTML output — byte-identical) |
| DB schema/data | ✅ unchanged (rule 4) |
| Studio set | ✅ unchanged (6 studios, rule 2) |
| Old import paths | ✅ unchanged (shims) |
| Browser behavior | ✅ byte-identical scripts |

## Verification Summary

- Byte-identity (rebuilt HTML vs v1): **6/6 PASS**
- Browser script syntax: **6/6 PASS**
- Route regression (mock D1 + JWT): **20/20 PASS**
- File syntax (44 packages + shims + index.js + new modules): **all PASS**

## Known Follow-ups (NEXT — post-V2)

1. Migrate identical helper duplicates (`debounce`, `sel`) → shared-ui after browser E2E
2. Delete `frontend/story_legacy.js` + `core/creations.js` (unused — DELETE LATER, rule 8)
3. Backend studio parsers → `studios/<slug>/helpers.js` (MOVE)
4. Browser E2E suite (Playwright) for generate/revise flows
