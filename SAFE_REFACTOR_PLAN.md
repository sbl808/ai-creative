# SAFE REFACTOR PLAN — AI Creative Studio V2

> မလိုက်နာရမည့်အရာများ (rule 15) ကို အလေးထားပြီး ဘေးကင်းသော refactor plan + execution log.

---

## 1. ရည်မှန်းချက်

**"Studio တစ်ခု Update/Delete/New Feature ထည့်လျှင် တခြား Studio မထိခိုက်စေရန်"**
Code သန့် · Duplicate လျှော့ · File Size သေး · AI ဖတ်ရလွယ် · Maintain လွယ် · Backward Compatible။

## 2. မပြောင်းရမည့်အရာ (Guarantee)

| Constraint | Status |
|---|---|
| Studio 6 ခုလုံး (Story/Content/Short/Image/Voice/Shop) — မဖျက်/မပြောင်း/အသစ် မထည့် (rule 2) | ✅ V2 အပြီးတွင်လည်း 6 ခုတည်း |
| API Contract — endpoint/request/response မပြောင်း (rule 3) | ✅ Regression 20/20 |
| DB Schema — table/column/data/migration မပြောင်း (rule 4) | ✅ D1 queries မထိ |
| Protected files — core/ai.js, core/auth.js, config/studios.js, frontend/shared.js | ✅ မထိ (index.js သာ rule 5 အောက်တွင် WHY/IMPACT/RISK ရှင်းပြ၍ ပြင်သည် — §5) |
| User Data / Feature / Project တစ်ခုလုံး ပြန်ရေး | ✅ မလုပ် |

## 3. Refactor Strategy

1. **Audit** — Studio/Routes/API/Shared/State/localStorage/DB/Duplicate/Legacy ရှာဖွေ → MASTER_ARCHITECTURE_AUDIT.md
2. **Split (mechanical + verified)** — Studio frontend တစ်ခုချင်းစီကို package အဖြစ် ခွဲ:
   - Splitter script က v1 file ကို ဖတ်ပြီး `<script>` body ကို anchor lines များဖြင့် slices ခွဲ (verbatim)
   - Segment modules: constants/state/helpers/api/actions/stepper(+branch files) — တစ်ခုချင်းစီက string export
   - `page.js` က HTML template + `<script>` ပေါင်းစပ် (original source order)
   - **Byte-identity check** — rebuilt HTML === v1 HTML (char-for-char) → မညီလျှင် split fail
3. **Shim** — old `frontend/<studio>.js` ကို re-export shim ပြောင်း; v1 ကို `_legacy/` သို့ archive
4. **Lazy Loading** — `frontend/studioPages.js` + index.js route ပြောင်း (protected — §5)
5. **Shared Components** — `frontend/shared-ui.js` (additive canonical module) — rule 8 အရ duplicates ကို မဖျက်
6. **Regression** — route-level test (mock D1) + browser-script syntax + byte-identity
7. **Reports + ZIP**

## 4. Execution Log

| # | Step | Result |
|---|---|---|
| 1 | Extract zip → audit all 60+ files | 6 studios, 40+ routes, 16k lines |
| 2 | Write `scripts/split-studios.mjs` (anchor-based splitter) | First run: off-by-one newline bug → fixed |
| 3 | Split + byte-identity verify | **6/6 PASS** (story 115,670B · content 133,238B · short 105,492B · image 88,541B · voice 88,926B · shop 159,065B) |
| 4 | short.js actions 647 lines → split further (actions 468 + shell 179) | Re-split → 6/6 PASS again |
| 5 | Write shims + archive v1 to `_legacy/` | 6 shims, 6 archives |
| 6 | `studioPages.js` lazy loader + index.js route update | Regression ✔ |
| 7 | `shared-ui.js` canonical shared components | Additive — no impact |
| 8 | Syntax check: 44 package files + shims + index.js + new modules | All OK |
| 9 | Browser script syntax check (extracted from rebuilt pages) | 6/6 valid |
| 10 | Route-level regression (mock D1 + real JWT) | **20/20 PASS** |
| 11 | Reports (6 files) | Written |
| 12 | ZIP packaging | Done |

## 5. Protected File Change — `worker/src/index.js` (rule 5)

**File:** `worker/src/index.js` (protected)
**WHY:** Rule 10 (Lazy Loading) ကို လိုက်နာရန် မဖြစ်မနေ လို — Studio page routing ကို ထိန်းထားသော ဖိုင်သည် index.js တစ်ခုတည်းသာ ဖြစ်သည်။ v1 တွင် Studio HTML 6 ခုလုံးကို module level တွင် eagerly import လုပ်ပြီး Worker boot တိုင်း template 6 ခုလုံး evaluate လုပ်သည်။ V2 တွင် `getStudioPage(slug)` ကို သုံး၍ ထို Studio ဖွင့်မှသာ load လုပ်သည်။
**IMPACT:**
- Route/API contract လုံးဝ မပြောင်း (အတူတူ route, အတူတူ HTML output)
- Boot cost ကျသည် (Studio HTML 6 ခု၏ evaluation ကို on-demand သို့ ရွှေ့)
- `STUDIO_PAGES` static map ကို ဖယ်ရှား (equivalent async loader ဖြင့် အစားထိုး)
- Unknown slug → `getStudioPage` က null ပြန် → 404 (v1 နှင့် တူညီ)
**RISK:**
- Dynamic import သည် static literal specifier ဖြင့်သာ wrangler bundling တွင် အလုပ်လုပ်သည် — ကျွန်ုပ်တို့၏ loaders အားလုံး literal ဖြစ်သည်
- Runtime error ရှိလျှင် try/catch → null → 404 (system မပျက်; v1 နှင့် အတူတူ response)
- Regression test 20/20 တွင် 6 studio pages + 404 path အားလုံး စစ်ဆေးပြီးဖြစ်သည်

## 6. လုပ်ပြီးသား / မလုပ်ရသေးသော

**လုပ်ပြီး (V2):** Studio package isolation · File size < 500 (frontend) · Lazy loading · Shared-ui canonical module · Back-compat shims · Archive · Reports · Tests
**မလုပ်ရသေး (NEXT — browser-level regression လိုအပ်):** helper duplicates ကို shared-ui သို့ migrate (DUPLICATE_REPORT §6) · `story_legacy.js` / `core/creations.js` ဖျက်ခြင်း · backend studio parsers → `studios/<slug>/helpers.js` သို့ MOVE
