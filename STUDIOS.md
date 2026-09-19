# STUDIOS.md

## Studio Registry (config/studios.js)

All studios are declared in a single **registry**. Adding a new studio means adding one registry entry + one module — no changes to routing, sidebar, admin, or other studios.

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

1. Create `worker/src/studios/music.js` (business logic).
2. Create `worker/src/frontend/studios/music/` package (page/ui/… modules exporting the assembled `MUSIC_HTML`), register it in `frontend/studioPages.js` `STUDIO_LOADERS`, and (if you keep root shims) re-export it from `frontend/music.js`.
3. Add `music` entry to `STUDIO_REGISTRY` (+ `STUDIO_ORDER`).
4. In `index.js`: add `/api/studio/music/*` routes (the existing disabled-studio regex already covers any registry id you add to the pattern).
5. Add `music` to the studio-disabled regex if needed, and to Home quick-grid.

Existing six studios are unaffected.

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

### Voice Studio — dropdown ၂ ခု
- `aiModelSel` (category=voice) — Text → Voice (TTS) အတွက်
- `aiModelSel2` (category=transcribe) — Voice → Text / SRT / ဘာသာပြန် အတွက်
- `/transcribe` သို့မဟုတ် `/srt` ပါသော Request များတွင် `aiModelSel2` ၏ Model ကို သုံးသည်

## AI Model dropdown (Phase C — Phase 14)

- Every Studio page now shows an **AI Model** dropdown at the top (`#aiModelSel`, category = `text` for Story/Content/Short/Shop, `image` for Image, `voice` for Voice).
- It is populated from `GET /api/ai-models?category=<cat>` (logged-in, plan-filtered) and remembers the user's choice in `localStorage.aics_default_model`.
- The selected id is sent as `body.model` with every request; the server resolves the final model via `core/aiModels.js` (user choice → admin default → fallback).
- Settings → ပုံမှန် AI Model is the same dropdown (all categories) so the user can set a global default.