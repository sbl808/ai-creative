import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, beforeEach, test } from 'node:test';

const SCRIPT_SOURCE = fs.readFileSync(
  new URL('./write-shims.mjs', import.meta.url),
  'utf8',
);
const STUDIOS = [
  { slug: 'story', src: 'story.js', exp: 'STORY_HTML' },
  { slug: 'content', src: 'content.js', exp: 'CONTENT_HTML' },
  { slug: 'short', src: 'short.js', exp: 'SHORT_HTML' },
  { slug: 'image', src: 'image.js', exp: 'IMAGE_HTML' },
  { slug: 'voice', src: 'voice.js', exp: 'VOICE_HTML' },
  { slug: 'shop', src: 'shop.js', exp: 'SHOP_HTML' },
];

let tempRoot;
let scriptsDir;
let frontendDir;

function expectedShim(studio) {
  const name = studio.slug[0].toUpperCase() + studio.slug.slice(1);
  return `// AI Creative Studio — ${name} Studio (V2 refactor — backward-compatible shim)
// v1 implementation archived at frontend/_legacy/${studio.slug}_v1_full.js
// New implementation: ./studios/${studio.slug}/ (page.js / ui.js / state.js / constants.js /
// helpers.js / api.js / actions.js / stepper.js …) — see MASTER_ARCHITECTURE_AUDIT.md.
export { ${studio.exp} } from './studios/${studio.slug}/page.js';
`;
}

function targetPath(studio) {
  return path.join(frontendDir, studio.src);
}

function backupPath(studio) {
  return path.join(frontendDir, '_legacy', studio.slug + '_v1_full.js');
}

function runScript(...args) {
  return spawnSync(process.execPath, [
    '--experimental-default-type=module',
    path.join(scriptsDir, 'write-shims.mjs'),
    ...args,
  ], { cwd: tempRoot, encoding: 'utf8' });
}

function readTargets() {
  return STUDIOS.map(studio => ({
    path: targetPath(studio),
    content: fs.readFileSync(targetPath(studio), 'utf8'),
  }));
}

beforeEach(() => {
  tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'safe-shims-test-'));
  scriptsDir = path.join(tempRoot, 'scripts');
  frontendDir = path.join(tempRoot, 'worker', 'src', 'frontend');
  fs.mkdirSync(scriptsDir, { recursive: true });
  fs.mkdirSync(path.join(frontendDir, '_legacy'), { recursive: true });
  fs.writeFileSync(path.join(scriptsDir, 'write-shims.mjs'), SCRIPT_SOURCE);
  fs.writeFileSync(
    path.join(scriptsDir, 'verify-split.mjs'),
    'if (process.env.TEST_VERIFIER_FAIL === "1") process.exit(1);\n',
  );
  for (const studio of STUDIOS) {
    fs.writeFileSync(targetPath(studio), expectedShim(studio));
    fs.writeFileSync(backupPath(studio), 'legacy backup fixture\n');
  }
});

afterEach(() => {
  if (tempRoot) fs.rmSync(tempRoot, { recursive: true, force: true });
});

test('default invocation is a dry-run and does not modify targets', () => {
  const before = readTargets();
  const result = runScript();
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Dry-run complete/);
  assert.deepEqual(readTargets(), before);
});

test('--help succeeds without modifying targets', () => {
  const before = readTargets();
  const result = runScript('--help');
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Use --write/);
  assert.deepEqual(readTargets(), before);
});

test('unknown or conflicting arguments fail without modifying targets', () => {
  const before = readTargets();
  for (const args of [['--force'], ['--write', '--help']]) {
    const result = runScript(...args);
    assert.equal(result.status, 2, result.stderr);
    assert.match(result.stderr, /Usage:/);
    assert.deepEqual(readTargets(), before);
  }
});

test('unexpected target content without a regular legacy backup is rejected before writes', () => {
  fs.writeFileSync(targetPath(STUDIOS[0]), 'unexpected user content\n');
  fs.rmSync(backupPath(STUDIOS[0]));
  const before = readTargets();

  const result = runScript('--write');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Preflight failed/);
  assert.match(result.stderr, /No files were modified/);
  assert.deepEqual(readTargets(), before);
});

test('symlink target is rejected before any target is written', (t) => {
  const link = targetPath(STUDIOS[0]);
  const original = fs.readFileSync(link, 'utf8');
  fs.rmSync(link);
  try {
    fs.symlinkSync(backupPath(STUDIOS[0]), link);
  } catch (error) {
    if (['EPERM', 'EACCES', 'ENOSYS'].includes(error.code)) {
      t.skip('symlink creation is unavailable in this environment');
      return;
    }
    throw error;
  }

  const result = runScript('--write');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Preflight failed/);
  assert.match(result.stderr, /regular file/);
  assert.equal(fs.lstatSync(link).isSymbolicLink(), true);
  for (const studio of STUDIOS.slice(1)) {
    assert.equal(fs.readFileSync(targetPath(studio), 'utf8'), expectedShim(studio));
  }
  assert.equal(original, expectedShim(STUDIOS[0]));
});

test('verifier failure prevents all writes', () => {
  const changedStudio = STUDIOS[0];
  fs.writeFileSync(targetPath(changedStudio), 'legacy content to replace\n');
  const before = readTargets();
  const result = spawnSync(process.execPath, [
    '--experimental-default-type=module',
    path.join(scriptsDir, 'write-shims.mjs'),
    '--write',
  ], {
    cwd: tempRoot,
    encoding: 'utf8',
    env: { ...process.env, TEST_VERIFIER_FAIL: '1' },
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Architecture verification failed/);
  assert.deepEqual(readTargets(), before);
});

test('--write replaces approved changed targets only after verifier succeeds', () => {
  const changedStudio = STUDIOS[0];
  fs.writeFileSync(targetPath(changedStudio), 'legacy content to replace\n');

  const result = runScript('--write');
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Running source-only architecture verifier/);
  assert.match(result.stdout, /Shim write operation complete/);
  for (const studio of STUDIOS) {
    assert.equal(fs.readFileSync(targetPath(studio), 'utf8'), expectedShim(studio));
  }
});

test('missing target is rejected before any target is written', () => {
  fs.rmSync(targetPath(STUDIOS[0]));
  const before = STUDIOS.slice(1).map(studio => ({
    path: targetPath(studio),
    content: fs.readFileSync(targetPath(studio), 'utf8'),
  }));

  const result = runScript('--write');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Preflight failed/);
  for (const item of before) {
    assert.equal(fs.readFileSync(item.path, 'utf8'), item.content);
  }
});
