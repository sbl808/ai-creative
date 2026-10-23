#!/usr/bin/env node
/**
 * AI Creative Studio — Studio page/export verification.
 *
 * Checks that all six backward-compatible frontend entry points and their
 * modular page implementations exist, export the expected HTML string, and
 * expose the same value. This verifies the current module wiring; it does NOT
 * claim byte identity with historical v1 source files.
 *
 * Run:
 *   node --experimental-default-type=module scripts/verify-split.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FRONTEND = path.join(ROOT, 'worker', 'src', 'frontend');
const STUDIOS = [
  { slug: 'story', exp: 'STORY_HTML' },
  { slug: 'content', exp: 'CONTENT_HTML' },
  { slug: 'short', exp: 'SHORT_HTML' },
  { slug: 'image', exp: 'IMAGE_HTML' },
  { slug: 'voice', exp: 'VOICE_HTML' },
  { slug: 'shop', exp: 'SHOP_HTML' },
];

let failed = 0;
for (const studio of STUDIOS) {
  const shimPath = path.join(FRONTEND, `${studio.slug}.js`);
  const pagePath = path.join(FRONTEND, 'studios', studio.slug, 'page.js');
  const problems = [];

  if (!fs.existsSync(shimPath)) problems.push(`missing entry point: ${path.relative(ROOT, shimPath)}`);
  if (!fs.existsSync(pagePath)) problems.push(`missing page module: ${path.relative(ROOT, pagePath)}`);

  if (problems.length === 0) {
    try {
      const cacheKey = `?verify=${Date.now()}-${studio.slug}`;
      const shim = await import(pathToFileURL(shimPath).href + cacheKey);
      const page = await import(pathToFileURL(pagePath).href + cacheKey);
      const shimValue = shim[studio.exp];
      const pageValue = page[studio.exp];

      if (typeof pageValue !== 'string') {
        problems.push(`page module does not export string ${studio.exp}`);
      }
      if (typeof shimValue !== 'string') {
        problems.push(`entry point does not export string ${studio.exp}`);
      }
      if (typeof shimValue === 'string' && typeof pageValue === 'string' && shimValue !== pageValue) {
        problems.push(`entry-point export differs from page export ${studio.exp}`);
      }
      if (problems.length === 0) {
        console.log(`PASS ${studio.slug}: ${studio.exp} exists and entry point matches modular page (${pageValue.length} chars)`);
      }
    } catch (error) {
      problems.push(`module import failed: ${error?.stack || error}`);
    }
  }

  if (problems.length) {
    failed++;
    console.error(`FAIL ${studio.slug}:\n  - ${problems.join('\n  - ')}`);
  }
}

if (failed > 0) {
  console.error(`\nVerification failed for ${failed} of ${STUDIOS.length} studios.`);
  process.exitCode = 1;
} else {
  console.log(`\nAll ${STUDIOS.length} studio entry points match their modular page exports. Historical byte identity was not tested.`);
}
