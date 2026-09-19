#!/usr/bin/env node
/**
 * AI Creative Studio V2 — write backward-compatible shims
 * Replaces the v1 studio frontend files with re-export shims pointing at the new
 * packages. Run ONLY after scripts/verify-split.mjs passes.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const FRONTEND = path.join(ROOT, 'worker', 'src', 'frontend');

const STUDIOS = [
  { slug: 'story', src: 'story.js', exp: 'STORY_HTML' },
  { slug: 'content', src: 'content.js', exp: 'CONTENT_HTML' },
  { slug: 'short', src: 'short.js', exp: 'SHORT_HTML' },
  { slug: 'image', src: 'image.js', exp: 'IMAGE_HTML' },
  { slug: 'voice', src: 'voice.js', exp: 'VOICE_HTML' },
  { slug: 'shop', src: 'shop.js', exp: 'SHOP_HTML' },
];

for (const s of STUDIOS) {
  const name = s.slug[0].toUpperCase() + s.slug.slice(1);
  const file = `// AI Creative Studio — ${name} Studio (V2 refactor — backward-compatible shim)
// v1 implementation archived at frontend/_legacy/${s.slug}_v1_full.js
// New implementation: ./studios/${s.slug}/ (page.js / ui.js / state.js / constants.js /
// helpers.js / api.js / actions.js / stepper.js …) — see MASTER_ARCHITECTURE_AUDIT.md.
export { ${s.exp} } from './studios/${s.slug}/page.js';
`;
  fs.writeFileSync(path.join(FRONTEND, s.src), file);
  console.log(`✔ shim ${s.src} → ./studios/${s.slug}/page.js`);
}
console.log('Shims written. Original v1 files archived in frontend/_legacy/.');
