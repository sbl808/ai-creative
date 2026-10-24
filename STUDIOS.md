# STUDIOS.md

## Studio Registry (config/studios.js)

All studios are declared in a single **registry**, which records studio identity and integration metadata. A registry entry alone does **not** guarantee a fully working studio. Adding a studio may require a backend module, frontend package and loader, API routes, access gates, Home/navigation integration, CMS/configuration, and tests. Check the current implementation before assuming any step is automatic.

```js
const STUDIO_REGISTRY = {
  story:   { id: 'story',   name: 'Story Studio',   nameMy: 'ဇာတ်လမ်း Studio',   icon: '📖', route: '/app/story',   component: 'StoryStudio',   enabled: true },
  content: { id: 'content', name: 'Content Studio', nameMy: 'Content Studio',    icon: '✍️', route: '/app/content', component: 'ContentStudio', enabled: true },
  short:   { id: 'short',   name: 'Short Studio',   nameMy: 'Short Studio',      icon: '🎬', route: '/app/short',   component: 'ShortStudio',   enabled: true },
  image:   { id: 'image',   name: 'Image Studio',   nameMy: 'ပုံ Studio',         icon: '🎨', route: '/app/image',   component: 'ImageStudio',   enabled: true },
  voice:   { id: 'voice',   name: 'Voice Studio',   nameMy: 'အသံ Studio',        icon: '🎙', route: '/app/voice',   component: 'VoiceStudio',   enabled: true },
  shop:    { id: 'shop',    name: 'Shop Studio',    nameMy: 'ရောင်းချရေး Studio', icon: '🛒', route: '/app/shop',    component: 'ShopStudio',    enabled: true },
};
```

Helpers: `getStudio(id)`, `isStudioEnabled(id)` (registry), `listEnabledStudios()`, plus `STUDIO_ORDER` and `SITE_LINKS`.

## Studio isolation

Each studio owns its three layers, kept apart from the others:

```
frontend/studios/<id>/  → UI package (V2 modular: page/ui/state/constants/helpers/actions/stepper/shell/…)
studios/<id>.js         → business logic (generate / revise / tts / video / …)
config/studios.js       → registry entry
frontend/<id>.js        → back-compat shim (re-exports the studio package page)
```

A change to Story never touches Content, because they share **only** the generic core (`core/*`) and the shared shell (`frontend/shared.js`). **V2 rule (enforced & tested): a studio package never imports another studio package's internal files; any shared functionality must live in a shared module (`frontend/shared.js`, `frontend/shared-ui.js`).** Studio pages are lazy-loaded by `frontend/studioPages.js`.

## Server-side ON/OFF (Rule 14)

- **DB override** — `studio_settings.studio_id` / `enabled` (Admin → Studios toggles it). `core/studioSettings.js` resolves `enabled = DB_value ?? registry_default`.
- **Page gate** — `index.js` shows a "studio disabled" page for `/app/<id>`.
- **API gate** — `index.js` rejects `/api/studio/<id>/…` with **403 `studio_disabled`** when disabled.

Hiding in the UI is never the only control; the API enforces it too.

## How to add a new studio (e.g. Music)

The following is a **current-repository checklist**, not a claim that studio creation is already automated. Verify the relevant files and tests before making changes:

1. Create `worker/src/studios/music.js` (business logic).
2. Create `worker/src/frontend/studios/music/` package (page/ui/… modules exporting the assembled `MUSIC_HTML`) and register it in `frontend/studioPages.js` `STUDIO_LOADERS`.
3. If root compatibility shims are still required, add `frontend/music.js` to re-export the studio package page.
4. Add `music` to `STUDIO_REGISTRY` and `STUDIO_ORDER`.
5. Add the required `/api/studio/music/*` routes in `index.js` and verify that studio-enabled/disabled gates cover the new id.
6. Update Home/navigation integration and any explicit studio lists or patterns that are not registry-driven.
7. Add or verify the studio's configuration/CMS requirements, input/output validation, and tests.
8. Run the relevant isolation, contract, security, and regression checks.

A future registry-driven loader may reduce these manual integration points, but do not claim that capability until it exists and is tested. Keep unrelated studios unchanged.

## Studio endpoints (per studio)

| Studio | Endpoints (prefix `/api/studio/<id>/`) |
|---|---|
| story | generate, revise, video, video-image |
| content | generate, revise, tts, video, video-image, srt, translate-srt |
| short | generate, revise, video, video-image |
| image | prompt, ad-prompt, generate |
| voice | tts, transcribe, srt, translate-srt |
| shop | content/generate, content/revise, video/generate, video-image |

Legacy: `/api/studio/generate` (generic) remains for backward compatibility.

### Story Studio — current Brain/CMS flow (v2.1)
> ဤနေရာရှိ “11-Layer Brain” အမည်သည် legacy documentation ဖြစ်သည်။ Target standard သည် `ARCHITECTURE_STANDARD.md` တွင် သတ်မှတ်ထားသော 12-layer order ဖြစ်သည်။ Current code နှင့် tests များက layer 12 ခုလုံးကို အမှန်တကယ် အကောင်အထည်ဖော်ထားကြောင်း မစစ်ဆေးရသေးသရွေ့ implemented ဟု မယူဆရ။

- **Story Engine** (`/generate`, `/revise`) — Story Type (1–5) အတိုင်း Free/Pro type-based logic ဆက် သုံးသည်; response `{ story, storyFacts }` (storyFacts additive — legacy `story` မပျက်)။
- **Video Engine** (`/video`, `/video-image`) — **Feature-level PRO gate** (Story Type နှင့် သီးခြား)။ Body မှာ Visual Style + Video Workflow ကို configuration အဖြစ် ပို့သည်:
  - `visualStyle` — `Realism` / `Anime` / `3D Animation` / `2D Illustration` / `Documentary` / `Film Noir` / `Fantasy` (video ဘယ်လိုမြင်ရမလဲ)
  - `workflow` — `CINEMATIC_FEATURE` / `CHARACTER_FOCUS` / `DOCUMENTARY` / `EPISODIC_SERIES` / `NON_LINEAR_THRILLER` (video ကို ဘယ်လိုတည်ဆောက်မလဲ)
  - `storyFacts` — generate မှ ရလာသော structured facts (video-relevant သာ; မရှိလျှင် story text fallback)
- **Backward compat** — `body.story` / `body.idea`, `body.type` (legacy CMS key), `body.videoType` (legacy) များကို ဆက် လက်ခံသည်။
- **Brain CMS** — Admin → Brain CMS tab မှ GLOBAL_BRAIN / STORY_TYPES / STORY_VIDEO rows စီမံနိုင် (migration 014) — selected rows သာ AI context ထဲ ဝင်သည် (Knowledge Isolation)။

### Voice Studio — dropdown ၂ ခု
- `aiModelSel` (category=voice) — Text → Voice (TTS) အတွက်
- `aiModelSel2` (category=transcribe) — Voice → Text / SRT / ဘာသာပြန် အတွက်
- `/transcribe` သို့မဟုတ် `/srt` ပါသော Request များတွင် `aiModelSel2` ၏ Model ကို သုံးသည်

## AI Model dropdown (Phase C — Phase 14)

- Every Studio page now shows an **AI Model** dropdown at the top (`#aiModelSel`, category = `text` for Story/Content/Short/Shop, `image` for Image, `voice` for Voice).
- It is populated from `GET /api/ai-models?category=<cat>` (logged-in, plan-filtered) and remembers the user's choice in `localStorage.aics_default_model`.
- The selected id is sent as `body.model` with every request; the server resolves the final model via `core/aiModels.js` (user choice → admin default → fallback).
- Settings → ပုံမှန် AI Model is the same dropdown (all categories) so the user can set a global default.