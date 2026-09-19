#!/usr/bin/env node
/**
 * AI Creative Studio V2 — browser-side script syntax check
 * Extracts the assembled <script> body from each rebuilt studio page and runs
 * node --check on it (browser JS must be syntactically valid).
 * Run: node --experimental-default-type=module scripts/check-browser-scripts.mjs
 */
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const STUDIOS = [
  { slug: 'story', exp: 'STORY_HTML' },
  { slug: 'content', exp: 'CONTENT_HTML' },
  { slug: 'short', exp: 'SHORT_HTML' },
  { slug: 'image', exp: 'IMAGE_HTML' },
  { slug: 'voice', exp: 'VOICE_HTML' },
  { slug: 'shop', exp: 'SHOP_HTML' },
];

let pass = 0;
for (const s of STUDIOS) {
  const mod = await import(path.join(ROOT, 'worker', 'src', 'frontend', 'studios', s.slug, 'page.js') + '?t=' + Date.now());
  const html = mod[s.exp];
  const open = html.lastIndexOf('<script>');
  const close = html.lastIndexOf('</script>');
  const body = html.slice(open + '<script>'.length, close);
  const tmp = path.join(ROOT, '.tmp-check-' + s.slug + '.js');
  fs.writeFileSync(tmp, body);
  try {
    execFileSync(process.execPath, ['--check', tmp], { stdio: 'pipe' });
    console.log(`✔ ${s.slug}: browser script valid (${body.length} chars)`);
    pass++;
  } catch (e) {
    console.error(`✘ ${s.slug}: browser script INVALID`);
    console.error(String(e.stderr || e.message).slice(0, 500));
    process.exitCode = 1;
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}
console.log(pass === STUDIOS.length ? '\nAll browser scripts syntactically valid ✔' : '\nFAILED');
