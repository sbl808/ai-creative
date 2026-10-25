#!/usr/bin/env node
/**
 * AI Creative Studio V2 — guarded backward-compatible shim writer.
 *
 * Safety rules:
 *   - Default mode is dry-run; no files are written.
 *   - Pass --write to request changes.
 *   - Before writing, the source-only architecture verifier must pass.
 *   - Every target is preflighted before any write; symlinks and unexpected
 *     content without a regular _legacy backup are rejected.
 *
 * Run:
 *   node --experimental-default-type=module scripts/write-shims.mjs
 *   node --experimental-default-type=module scripts/write-shims.mjs --write
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const FRONTEND = path.join(ROOT, 'worker', 'src', 'frontend');
const VERIFY_SCRIPT = path.join(__dirname, 'verify-split.mjs');

const args = process.argv.slice(2);
const WRITE_FLAG = '--write';
const HELP_FLAG = '--help';

if (args.some(arg => arg !== WRITE_FLAG && arg !== HELP_FLAG) ||
    (args.includes(WRITE_FLAG) && args.includes(HELP_FLAG))) {
  console.error('Usage: node --experimental-default-type=module scripts/write-shims.mjs [--write | --help]');
  process.exit(2);
}

if (args.includes(HELP_FLAG)) {
  console.log('Default mode previews changes only. Use --write to request guarded file writes.');
  process.exit(0);
}

const WRITE = args.includes(WRITE_FLAG);

const STUDIOS = [
  { slug: 'story', src: 'story.js', exp: 'STORY_HTML' },
  { slug: 'content', src: 'content.js', exp: 'CONTENT_HTML' },
  { slug: 'short', src: 'short.js', exp: 'SHORT_HTML' },
  { slug: 'image', src: 'image.js', exp: 'IMAGE_HTML' },
  { slug: 'voice', src: 'voice.js', exp: 'VOICE_HTML' },
  { slug: 'shop', src: 'shop.js', exp: 'SHOP_HTML' },
];

function makeShim(studio) {
  const name = studio.slug[0].toUpperCase() + studio.slug.slice(1);
  return `// AI Creative Studio — ${name} Studio (V2 refactor — backward-compatible shim)
// v1 implementation archived at frontend/_legacy/${studio.slug}_v1_full.js
// New implementation: ./studios/${studio.slug}/ (page.js / ui.js / state.js / constants.js /
// helpers.js / api.js / actions.js / stepper.js …) — see MASTER_ARCHITECTURE_AUDIT.md.
export { ${studio.exp} } from './studios/${studio.slug}/page.js';
`;
}

function lstatRegularFile(filePath, label) {
  let stat;
  try {
    stat = fs.lstatSync(filePath);
  } catch {
    throw new Error(label + ' is missing or unreadable: ' + path.relative(ROOT, filePath));
  }
  if (stat.isSymbolicLink() || !stat.isFile()) {
    throw new Error(label + ' must be a regular file (symlinks are not allowed): ' + path.relative(ROOT, filePath));
  }
}

const plan = [];
const failures = [];

// Preflight every target before making any changes.
for (const studio of STUDIOS) {
  const target = path.join(FRONTEND, studio.src);
  const backup = path.join(FRONTEND, '_legacy', studio.slug + '_v1_full.js');
  const expected = makeShim(studio);

  try {
    lstatRegularFile(target, 'Shim target');
    const current = fs.readFileSync(target, 'utf8');
    const unchanged = current === expected;

    if (!unchanged) {
      try {
        lstatRegularFile(backup, 'Legacy backup');
      } catch {
        throw new Error(
          'Refusing to overwrite unexpected content without a regular legacy backup: ' +
          path.relative(ROOT, target)
        );
      }
    }

    plan.push({ studio, target, expected, current, unchanged });
  } catch (error) {
    failures.push(error.message);
  }
}

if (failures.length > 0) {
  console.error('Preflight failed. No files were modified.');
  for (const failure of failures) console.error('  ✘ ' + failure);
  process.exit(1);
}

const changes = plan.filter(item => !item.unchanged);
for (const item of plan) {
  console.log((item.unchanged ? 'OK   ' : (WRITE ? 'WRITE ' : 'WOULD WRITE ')) +
    path.relative(ROOT, item.target));
}

if (!WRITE) {
  console.log(changes.length
    ? '\nDry-run only: ' + changes.length + ' file(s) would change. Re-run with --write to request guarded writes.'
    : '\nDry-run complete: all six shim files already match. No files were modified.');
  process.exit(0);
}

// The architecture verifier is read-only. Never write unless it passes.
console.log('\nRunning source-only architecture verifier before writing...');
try {
  execFileSync(process.execPath, [
    '--experimental-default-type=module',
    VERIFY_SCRIPT,
  ], { cwd: ROOT, stdio: 'inherit' });
} catch {
  console.error('Architecture verification failed. No files were modified.');
  process.exit(1);
}

if (changes.length === 0) {
  console.log('\nAll shim files already match. No files needed to be written.');
  process.exit(0);
}

// Recheck the complete write set immediately before writing. If any target
// changed since preflight, abort before the first write.
const changedDuringPreflight = [];
for (const item of changes) {
  lstatRegularFile(item.target, 'Shim target');
  const current = fs.readFileSync(item.target, 'utf8');
  if (current !== item.current) {
    changedDuringPreflight.push(path.relative(ROOT, item.target));
  }
}
if (changedDuringPreflight.length > 0) {
  console.error('Targets changed after preflight. No files were modified.');
  for (const target of changedDuringPreflight) console.error('  ✘ ' + target);
  process.exit(1);
}

const pendingWrites = changes.filter(item => !item.unchanged);
for (const item of pendingWrites) {
  fs.writeFileSync(item.target, item.expected, { encoding: 'utf8', flag: 'w' });
  console.log('✔ wrote ' + path.relative(ROOT, item.target));
}

console.log('\nShim write operation complete. Review the diff and run the relevant tests before committing.');
