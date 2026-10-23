#!/usr/bin/env node
/**
 * AI Creative Studio — guarded backward-compatible shim writer.
 *
 * Safe default: dry-run only.
 * To write, pass --write. Even then, this refuses to replace any existing
 * frontend entry point unless it already matches the expected shim exactly.
 * This prevents accidentally overwriting a full/legacy implementation.
 *
 * This script does not create or archive _legacy source files.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FRONTEND = path.join(ROOT, 'worker', 'src', 'frontend');
const WRITE = process.argv.includes('--write');
const STUDIOS = [
  { slug: 'story', exp: 'STORY_HTML' },
  { slug: 'content', exp: 'CONTENT_HTML' },
  { slug: 'short', exp: 'SHORT_HTML' },
  { slug: 'image', exp: 'IMAGE_HTML' },
  { slug: 'voice', exp: 'VOICE_HTML' },
  { slug: 'shop', exp: 'SHOP_HTML' },
];

function expectedShim(slug, exp) {
  const name = slug[0].toUpperCase() + slug.slice(1);
  return `// AI Creative Studio — ${name} Studio (V2 refactor — backward-compatible shim)
// New implementation: ./studios/${slug}/page.js
export { ${exp} } from './studios/${slug}/page.js';
`;
}

function isExpectedShim(current, slug, exp) {\n  // Accept the older generated shim comments while requiring the only executable\n  // statement to be the exact expected re-export.\n  const statements = current.split(/\\r?\\n/).map(line => line.trim()).filter(line => line && !line.startsWith('//'));\n  return statements.length === 1 && statements[0] === `export { ${exp} } from './studios/${slug}/page.js';`;\n}\n\nconst plan = [];
const errors = [];
for (const studio of STUDIOS) {
  const target = path.join(FRONTEND, `${studio.slug}.js`);
  const page = path.join(FRONTEND, 'studios', studio.slug, 'page.js');
  if (!fs.existsSync(page)) {
    errors.push(`Missing modular page: ${path.relative(ROOT, page)}`);
    continue;
  }

  const content = expectedShim(studio.slug, studio.exp);
  if (fs.existsSync(target)) {
    const current = fs.readFileSync(target, 'utf8');
    if (!isExpectedShim(current, studio.slug, studio.exp)) {
      errors.push(`Refusing to overwrite non-shim file: ${path.relative(ROOT, target)}`);
      continue;
    }
  }
  plan.push({ target, content, slug: studio.slug, existed: fs.existsSync(target) });
}

if (errors.length) {
  console.error('Safety checks failed; no files were written.');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

for (const item of plan) {
  console.log(`${WRITE ? 'READY' : 'DRY-RUN'} ${item.slug}: ${path.relative(ROOT, item.target)} ${item.existed ? '(already correct)' : '(would create)'}`);
}

if (!WRITE) {
  console.log('\nDry run only; no files changed. Pass --write to apply, after reviewing this output.');
} else {
  for (const item of plan) {
    if (!item.existed) fs.writeFileSync(item.target, item.content, { flag: 'wx' });
  }
  console.log('\nShim checks complete. No existing file was overwritten.');
}
