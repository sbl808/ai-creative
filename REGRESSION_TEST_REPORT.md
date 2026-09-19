# REGRESSION TEST REPORT — AI Creative Studio V2

> Rule 12: Studio တစ်ခုချင်းစီကို စစ်ပါ — အားလုံး အလုပ်လုပ်ရမည်။
> Test ကာလ: 2026-09-17 · Node v22.23.2 · Run: `node --experimental-default-type=module scripts/regression-test.mjs` (အခြား suite များ အောက်တွင်)

---

## 1. Verification Suite — Byte-Identity (Split ၏ အဓိက အာမခံ)

Reassembled Studio page HTML (v2 packages) vs v1 original — **char-for-char တူညီရမည်**:

| Studio | Result | HTML Size |
|---|---|---|
| story | ✅ PASS — byte-identical | 115,670 chars |
| content | ✅ PASS — byte-identical | 133,238 chars |
| short | ✅ PASS — byte-identical | 105,492 chars |
| image | ✅ PASS — byte-identical | 88,541 chars |
| voice | ✅ PASS — byte-identical | 88,926 chars |
| shop | ✅ PASS — byte-identical | 159,065 chars |

**6/6 PASS** — v1 browser behavior သည် သီအိုရီအရ 100% တူညီသည် (script ကို စာလုံးတစ်လုံးမျှ မပြောင်း)။

## 2. Browser-side Script Syntax Check

Rebuilt pages မှ `<script>` body ကို ထုတ်၍ `node --check`:

| Studio | Script Size | Result |
|---|---|---|
| story | 42,530 chars | ✅ valid |
| content | 51,570 chars | ✅ valid |
| short | 41,707 chars | ✅ valid |
| image | 30,004 chars | ✅ valid |
| voice | 34,714 chars | ✅ valid |
| shop | 71,269 chars | ✅ valid |

**6/6 PASS**

## 3. Route-level Regression (Mock D1 + real JWT — no network)

| # | Test | Expected | Result |
|---|---|---|---|
| 1 | GET `/` | 200 API home | ✅ |
| 2 | GET `/login` | 200 login page | ✅ |
| 3 | GET `/app` (no session) | 302 → /login | ✅ |
| 4 | GET `/app/story` (no session) | 302 → /login | ✅ |
| 5 | GET `/app/story` (session) — **lazy-loaded** | 200 page | ✅ |
| 6 | GET `/app/content` (session) — **lazy-loaded** | 200 page | ✅ |
| 7 | GET `/app/short` (session) — **lazy-loaded** | 200 page | ✅ |
| 8 | GET `/app/image` (session) — **lazy-loaded** | 200 page | ✅ |
| 9 | GET `/app/voice` (session) — **lazy-loaded** | 200 page | ✅ |
| 10 | GET `/app/shop` (session) — **lazy-loaded** | 200 page | ✅ |
| 11 | GET `/app/bogus` (session) | 404 | ✅ |
| 12 | GET `/api/users/me` (token) | 200 user | ✅ |
| 13 | GET `/api/users/me` (no token) | 401 | ✅ |
| 14 | GET `/admin` (admin session) | 200 admin | ✅ |
| 15–20 | Old import paths `frontend/<studio>.js` → HTML export (shim back-compat) | export === package export | ✅ ×6 |

**20/20 PASS, 0 FAILED**

## 4. Per-Studio Feature Checklist (rule 12)

> Backend endpoints များကို AI/network မလိုအပ်ဘဲ route/contract အနေဖြင့် စစ်ဆေးသည် (request/response contract မပြောင်းသောကြောင့်). Browser အတွင်း feature flow (generate→revise→scene) သည် byte-identical script ကြောင့် v1 နှင့် တူညီသည်။

| Studio | Features | Contract Verified | v2 Script Identical |
|---|---|---|---|
| Story | Generate · Revise · Scene · Video Prompt | `/api/studio/story/{generate,revise,video,video-image}` — route တည်ရှိ, backend import မပြောင်း | ✅ 42,530 chars |
| Content | Generate · Revise · TTS · SRT · Translate | `/api/studio/content/{generate,revise,tts,srt,translate-srt,video,video-image}` | ✅ 51,570 chars |
| Short | Generate · Revise · Scene | `/api/studio/short/{generate,revise,video,video-image}` | ✅ 41,707 chars |
| Image | Prompt · Generate · Regenerate | `/api/studio/image/{prompt,generate,ad-prompt}` | ✅ 30,004 chars |
| Voice | TTS · Transcribe · Subtitle · Translate Subtitle | `/api/studio/voice/{tts,transcribe,srt,translate-srt}` | ✅ 34,714 chars |
| Shop | Product Content · Video Prompt · Voice · Image | `/api/studio/shop/content/{generate,revise}`, `/api/studio/shop/video/{generate,video-image}` | ✅ 71,269 chars |

## 5. Coverage & Limits

**Covered:** Split byte-identity (full) · Browser script syntax (full) · Page routing incl. lazy loading (full) · Auth guard (no-session / session / admin role) · Back-compat shims (full) · JS syntax of all 44 package files + shims + index.js + new modules.

**Not covered (ဆက်လုပ်ရန်):** 真实 browser E2E (Playwright) — inline script behavior, drag/drop, IndexedDB, TTS playback; AI provider responses (network). These require a deployed environment; the byte-identical guarantee makes v1 behavior preservation provable at the source level.
