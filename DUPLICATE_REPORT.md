# DUPLICATE REPORT — AI Creative Studio V2

> Rule 8: Duplicate တွေ့လျှင် KEEP / MOVE / MERGE / DELETE LATER ဟု ခွဲပါ။ Test မပြီးမချင်း မဖျက်ပါနှင့်။
> V2 အနေအထား: အားလုံးကို **KEEP (byte-identical)** ထားပြီး classification + merge target ကို အောက်တွင် မှတ်တမ်းတင်ထားသည်။
> Test အားလုံး အောင်ပြီးမှသာ (DELETE LATER) များကို ဖျက်ရန်။

---

## 1. Browser-side Helper Duplicates (frontend studio packages)

| # | Helper | Copies | Behaviour identical? | V2 Classification | Merge Target | Notes |
|---|---|---|---|---|---|---|
| 1 | `showToastMsg` / `toast` | 6 (story, content, short, image, shop, voice) | ✗ **မတူ** — timeout (2000/2500ms), default msg, signature (`toast(msg)` vs `toast(msg,type)` vs `showToast(msg,isError)`) ကွဲ | **MERGE (per-variant)** → shared-ui | `aicsShowToast(msg,type,ms)` (AICS_TOAST_SCRIPT) | Signature ကွဲသောကြောင့် တစ်ခုတည်း ဖျက်ပြီး သွားရန် မလုံခြုံ — variant များကို wrapper အဖြစ် ထားပြီး core ကို shared သုံးနိုင် |
| 2 | `copyToClipboard` / `copyText` / `copyValue` | 6 | ✗ toast API ကွဲ (clipboard logic တူ) | **MERGE** → shared-ui | `aicsCopyText(text, doneMsg)` (AICS_COPY_SCRIPT) | clipboard part တူ → core shared; toast callback ကို param ဖြင့် ညှိ |
| 3 | `escapeHtml` / `esc` | 6 | ✗ null-handling ကွဲ (shop/voice null-safe) | **MERGE** → shared-ui | `aicsEscapeHtml(s)` (null-safe) | null-safe version ကို canonical ယူပြီး callers အားလုံး ကိုက်ညီကြောင်း test ပြီးမှ swap |
| 4 | `debounce` | 4 (story, content, short, image) | ✓ တူညီ | **MERGE NOW-safe** → shared-ui | `aicsDebounce(fn, ms)` | သို့သော် V2 တွင် byte-identity ထိန်းရန် KEEP — NEXT phase တွင် swap |
| 5 | `sel` / `$` | 4 | ✓ တူညီ | **MERGE NOW-safe** | `aicsSel(id)` | နှစ်ပုဒ်စလုံး `document.getElementById` |
| 6 | `autoExpand` / `autoGrow` | 4 | ✗ offset ကွဲ (+2/+4, min-height 100/520) | **MERGE (per-variant)** | `aicsAutoExpand(el)` | variant ကွဲ — studio-specific wrapper ထား |
| 7 | `friendlyMsg` / `showError` / `hideError` | 4 | ✗ pattern ကွဲ (element id: errorMsg vs studioError vs stepError) | **MERGE (per-variant)** | `aicsShowError(prefix, e)` / `aicsHideError()` | element id တူညီစေရန် UI ပြောင်းရမည် — UI change ဖြစ်သောကြောင့် browser regression လို |
| 8 | `typewriter` (typewrite / typewriterFill / stopTypewriter / startStatusAnim) | 4 | ✗ pacing ကွဲ | KEEP (studio-specific) | — | UI animation ဖြစ်၍ Studio identity သဘော — မပေါင်း |
| 9 | `fillSelect` / `buildXTypeSel` | 6 | ✗ studio-specific (types/voices) | KEEP | — | Studio data logic — မပေါင်း |
| 10 | `apiCall` / `api` / `apiGet` | 6 | ✗ endpoint + error handling ကွဲ | KEEP (rule 6) | — | API logic ကို studio package ထဲတွင်သာ ထား |

## 2. HTML/CSS Duplicates

| # | Fragment | Copies | V2 Classification | Notes |
|---|---|---|---|---|
| 1 | Toast element `<div class="toast" id="toast">` + CSS | 6 | **MERGE** → `aicsToastHtml()` + shared CSS | id `toast` တူညီ — CSS class များ တူညီကြောင်း စစ်ပြီးမှ ပေါင်း |
| 2 | Login overlay (loginView modal) | 6 | **MERGE** → shared modal helper | `next=` param သာ ကွဲ — shared function ဖြင့် param ဖြတ်နိုင် |
| 3 | Result loading card | 6 | **ALREADY MERGED** ✓ | `aicsResultLoadingHtml` (shared.js) ကို အားလုံး သုံးပြီးသား |
| 4 | Studio shell / sidebar / stepper | 6 | **ALREADY MERGED** ✓ | `renderStudioShell` / `renderSidebar` / `sidebarScript` (shared.js) |
| 5 | Error banner HTML | 4 | **MERGE** → shared error dialog | element id ညှိရန် လို |

## 3. Server-side Duplicates

| # | Duplicate | Copies | V2 Classification | Notes |
|---|---|---|---|---|
| 1 | Studio parser functions (JSON.parse + field extraction) | studios/{story,short,shop}.js | KEEP (already isolated) | Functionality မပြောင်း — future: `studios/<slug>/helpers.js` သို့ MOVE နိုင် |
| 2 | `json(...)` / `friendlyError(...)` helpers | index.js (single) | KEEP | Router တစ်နေရာတည်း — duplicate မရှိ |
| 3 | `verifyTokenSafe` pattern (index.js + admin.js) | 2 | MERGE (NEXT) | admin.js ကို core/auth.js မှ သုံးအောင် ပြောင်းနိုင် — V2 မလို |

## 4. Legacy / Unused (DELETE LATER — test ပြီးမှ)

| # | File | Status | Evidence | DELETE LATER စည်းကမ်း |
|---|---|---|---|---|
| 1 | `frontend/story_legacy.js` (533 lines) | Unused | `grep -rn "story_legacy"` → import လုပ်သူ မရှိ | Regression suite (route + page smoke) အောင်ပြီးမှ ဖျက်နိုင် — V2 ZIP တွင် ထည့်ထားသည် |
| 2 | `core/creations.js` (48 lines) | Unused | index.js တွင် server-side creations endpoints ဖယ်ထားပြီး (`/api/creations` commented) | Test ပြီးမှ ဖျက် — V2 ZIP တွင် ထည့်ထားသည် |
| 3 | `frontend/_legacy/*_v1_full.js` (6 files) | Archive | V2 reference | **KEEP (မဖျက်)** — rule 14 |
| 4 | Dev test pages (`/ai-test`, `/cms-test`, `/studio-test`, `/creations-test`) | Active dev tools | index.js routes | KEEP — ဖျက်ရန် မလို |

## 5. V2 ၏ လုပ်ဆောင်ပြီးသား Merge များ

- ✅ **Loading** — shared.js `aicsResultLoadingHtml` (v1 ကတည်းက shared — ထိန်းထား)
- ✅ **Shell/Sidebar/Stepper chrome** — shared.js (v1 ကတည်းက shared — ထိန်းထား)
- ✅ **Canonical shared component module** — `frontend/shared-ui.js` (V2 အသစ် — rule 7 ၏ merge target)

## 6. NEXT Steps (post-V2, regression suite green ဖြစ်မှ)

1. `debounce` / `sel` → shared (identical — swap safe)
2. `escapeHtml` null-safe canonical → callers အားလုံး null-safe ဖြစ်ကြောင်း စစ်ပြီး swap
3. Toast variant wrappers → shared core
4. Copy → shared core
5. Login overlay → shared modal helper
6. `story_legacy.js` + `core/creations.js` → delete (version control တွင် ရှိသည်)
