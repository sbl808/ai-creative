#!/usr/bin/env node
/**
 * AI Creative Studio V2 — browser-side script syntax check
 * Extracts every inline JavaScript <script> block from each assembled studio
 * page and runs node --check on each block independently.
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

const SCRIPT_TAG_RE = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
const JS_TYPES = new Set(['', 'text/javascript', 'application/javascript', 'module']);
let checked = 0;
let failed = 0;

for (const studio of STUDIOS) {
  const mod = await import(
    path.join(ROOT, 'worker', 'src', 'frontend', 'studios', studio.slug, 'page.js') +
    '?t=' + Date.now()
  );
  const html = mod[studio.exp];
  if (typeof html !== 'string') {
    console.error(`✘ ${studio.slug}: exported HTML is missing or not a string`);
    failed++;
    continue;
  }

  const matches = [...html.matchAll(SCRIPT_TAG_RE)];
  let inlineIndex = 0;

  for (let index = 0; index < matches.length; index++) {
    const match = matches[index];
    const attributes = match[1] || '';
    const body = match[2] || '';
    const typeMatch = attributes.match(/\btype\s*=\s*["']?([^\s"' >]+)/i);
    const scriptType = (typeMatch?.[1] || '').toLowerCase();

    // External scripts and non-JavaScript data blocks are not browser JS source.
    if (/\bsrc\s*=/i.test(attributes) || !JS_TYPES.has(scriptType) || !body.trim()) {
      continue;
    }

    const sourceLine = html.slice(0, match.index).split('\n').length;
    const tmp = path.join(ROOT, `.tmp-check-${studio.slug}-${inlineIndex}.js`);
    fs.writeFileSync(tmp, body);
    checked++;

    try {
      execFileSync(process.execPath, ['--check', tmp], { stdio: 'pipe' });
      console.log(
        `✔ ${studio.slug}: inline script ${inlineIndex} valid (HTML line ${sourceLine}, ${body.length} chars)`
      );
    } catch (error) {
      failed++;
      const diagnostic = String(error.stderr || error.message).trim();
      console.error(
        `✘ ${studio.slug}: inline script ${inlineIndex} INVALID (HTML line ${sourceLine})`
      );
      console.error(diagnostic.slice(0, 1000));
    } finally {
      fs.rmSync(tmp, { force: true });
    }

    inlineIndex++;
  }

  if (inlineIndex === 0) {
    console.error(`✘ ${studio.slug}: no inline JavaScript script blocks found`);
    failed++;
  }
}

console.log(
  failed === 0
    ? `\nAll ${checked} inline browser scripts syntactically valid ✔`
    : `\nFAILED: ${failed} error(s) across ${checked} inline browser script(s)`
);
if (failed > 0) process.exitCode = 1;
