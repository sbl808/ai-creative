#!/usr/bin/env node
/**
 * AI Creative Studio V2 — Split verification
 * Byte-identity check: for each studio, the reassembled page.js HTML export must
 * equal the ORIGINAL v1 export exactly (char-for-char). Run with:
 *   node --experimental-default-type=module scripts/verify-split.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const FRONTEND = path.join(ROOT, 'worker', 'src', 'frontend');

const STUDIOS = [
  { slug: 'story',   src: 'story.js',   exp: 'STORY_HTML' },
  { slug: 'content', src: 'content.js', exp: 'CONTENT_HTML' },
  { slug: 'short',   src: 'short.js',   exp: 'SHORT_HTML' },
  { slug: 'image',   src: 'image.js',   exp: 'IMAGE_HTML' },
  { slug: 'voice',   src: 'voice.js',   exp: 'VOICE_HTML' },
  { slug: 'shop',    src: 'shop.js',    exp: 'SHOP_HTML' },
];

let allPass = true;
let detail = [];
for (const s of STUDIOS) {
  const original = await import(path.join(FRONTEND, '_legacy', `${s.slug}_v1_full.js`) + `?t=${Date.now()}`);
  const rebuilt = await import(path.join(FRONTEND, 'studios', s.slug, 'page.js') + `?t=${Date.now()}`);
  const a = original[s.exp];
  const b = rebuilt[s.exp];
  const ok = typeof a === 'string' && typeof b === 'string' && a === b;
  if (!ok) {
    allPass = false;
    const la = typeof a === 'string' ? a.length : -1;
    const lb = typeof b === 'string' ? b.length : -1;
    let firstDiff = -1;
    if (typeof a === 'string' && typeof b === 'string') {
      const n = Math.min(la, lb);
      for (let i = 0; i < n; i++) if (a[i] !== b[i]) { firstDiff = i; break; }
    }
    detail.push(`${s.slug}: FAIL (orig=${la}B rebuilt=${lb}B firstDiff@${firstDiff})`);
    console.error(`--- ${s.slug} first difference context ---`);
    if (firstDiff >= 0) {
      console.error('ORIG  :', JSON.stringify(a.slice(Math.max(0, firstDiff - 60), firstDiff + 60)));
      console.error('REBUILT:', JSON.stringify(b.slice(Math.max(0, firstDiff - 60), firstDiff + 60)));
    }
  } else {
    detail.push(`${s.slug}: PASS (${a.length} chars byte-identical)`);
    console.log(`✔ ${s.slug}: PASS — ${a.length} chars byte-identical`);
  }
}

if (!allPass) {
  console.error('\nVERIFY FAILED:\n' + detail.join('\n'));
  process.exit(1);
}
console.log('\nALL STUDIOS BYTE-IDENTICAL ✔ — safe to apply shims (write-shims.mjs).');
