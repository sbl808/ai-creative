#!/usr/bin/env node
/**
 * AI Creative Studio — current Studio architecture verification.
 *
 * This is a source-only integrity check. It does not import or execute Studio
 * modules, compare generated HTML with removed legacy files, or write files.
 * Voice Studio intentionally has its own workflow and is not byte-compared to v1.
 *
 * Run manually with:
 *   node --experimental-default-type=module scripts/verify-split.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const FRONTEND = path.join(ROOT, 'worker', 'src', 'frontend');
const LOADER_FILE = path.join(FRONTEND, 'studioPages.js');

const STUDIOS = [
  { slug: 'story', exp: 'STORY_HTML' },
  { slug: 'content', exp: 'CONTENT_HTML' },
  { slug: 'short', exp: 'SHORT_HTML' },
  { slug: 'image', exp: 'IMAGE_HTML' },
  { slug: 'voice', exp: 'VOICE_HTML' },
  { slug: 'shop', exp: 'SHOP_HTML' },
];

const failures = [];
const checks = [];
function pass(message) {
  checks.push(message);
  console.log('PASS  ' + message);
}
function fail(message) {
  failures.push(message);
  console.error('FAIL  ' + message);
}
function readSource(file, label) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    fail(label + ': file is missing or unreadable (' + path.relative(ROOT, file) + ')');
    return null;
  }
}
function existsLocalModule(fromFile, specifier) {
  if (!specifier.startsWith('.')) return true;
  const target = path.resolve(path.dirname(fromFile), specifier);
  const candidates = path.extname(target)
    ? [target]
    : [target, target + '.js', target + '.mjs', path.join(target, 'index.js')];
  return candidates.some(candidate => {
    try {
      return fs.statSync(candidate).isFile();
    } catch {
      return false;
    }
  });
}
function collectJsFiles(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries.flatMap(entry => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectJsFiles(fullPath);
    return entry.isFile() && /\.m?js$/.test(entry.name) ? [fullPath] : [];
  });
}

// Verify the public flat-file shims and their matching Studio page exports.
for (const studio of STUDIOS) {
  const slug = studio.slug;
  const exp = studio.exp;
  const shimPath = path.join(FRONTEND, slug + '.js');
  const pagePath = path.join(FRONTEND, 'studios', slug, 'page.js');
  const shim = readSource(shimPath, slug + ' shim');
  const page = readSource(pagePath, slug + ' page module');

  if (shim !== null) {
    const expectedShim = new RegExp(
      "^\\s*export\\s*\\{\\s*" + exp + "\\s*\\}\\s*from\\s*['\"]\\./studios/" + slug + "/page\\.js['\"]\\s*;?",
      'm',
    );
    if (expectedShim.test(shim)) pass(slug + ': flat shim re-exports ' + exp + ' from studios/' + slug + '/page.js');
    else fail(slug + ': flat shim does not map to the expected export and page module');

    if (/from\s*['"][^'"]*_legacy\//.test(shim) || /import\s*\(\s*['"][^'"]*_legacy\//.test(shim)) {
      fail(slug + ': flat shim contains an executable _legacy dependency');
    }
  }

  if (page !== null) {
    const namedExport = new RegExp('\\bexport\\s+const\\s+' + exp + '\\b');
    const defaultExport = new RegExp('\\bexport\\s+default\\s+' + exp + '\\s*;');
    if (namedExport.test(page)) pass(slug + ': page declares named export ' + exp);
    else fail(slug + ': page is missing named export ' + exp);
    if (defaultExport.test(page)) pass(slug + ': page default export points to ' + exp);
    else fail(slug + ': page default export does not point to ' + exp);
  }
}

// Verify the lazy-loader registry maps all six slugs to the intended modules.
const loader = readSource(LOADER_FILE, 'Studio lazy loader');
if (loader !== null) {
  for (const studio of STUDIOS) {
    const slug = studio.slug;
    const mapping = new RegExp(
      "\\b" + slug + "\\s*:\\s*\\(\\s*\\)\\s*=>\\s*import\\s*\\(\\s*['\"]\\./studios/" + slug + "/page\\.js['\"]\\s*\\)",
    );
    if (mapping.test(loader)) pass('loader: ' + slug + ' maps to studios/' + slug + '/page.js');
    else fail('loader: missing or incorrect lazy-loader mapping for ' + slug);
  }
}

// Check relative module dependencies in the Studio source directories.
// Only import/export declarations and literal dynamic imports are inspected;
// no application module is imported or executed by this verifier.
const sourceFiles = [
  ...STUDIOS.flatMap(studio => collectJsFiles(path.join(FRONTEND, 'studios', studio.slug))),
  ...STUDIOS.map(studio => path.join(FRONTEND, studio.slug + '.js')),
  LOADER_FILE,
];
const uniqueFiles = [...new Set(sourceFiles)].filter(file => fs.existsSync(file));
for (const file of uniqueFiles) {
  const source = readSource(file, 'dependency scan');
  if (source === null) continue;
  const relative = path.relative(ROOT, file);
  const specifiers = new Set();
  const declarationPattern = /^\s*(?:import\s+(?:[^'";]*?\s+from\s+)?|export\s+[^'";]*?\s+from\s*)['"]([^'"]+)['"]\s*;?/gm;
  const dynamicPattern = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  for (const match of source.matchAll(declarationPattern)) specifiers.add(match[1]);
  for (const match of source.matchAll(dynamicPattern)) specifiers.add(match[1]);

  for (const specifier of specifiers) {
    if (specifier.includes('_legacy/')) {
      fail(relative + ': executable import references removed legacy path ' + specifier);
      continue;
    }
    if (specifier.startsWith('.') && !existsLocalModule(file, specifier)) {
      fail(relative + ': unresolved local import ' + specifier);
    }
  }
}

// Flag direct imports between Studio folders; shared modules remain allowed.
for (const file of uniqueFiles.filter(file => file.includes(path.sep + 'studios' + path.sep))) {
  const source = readSource(file, 'Studio isolation scan');
  if (source === null) continue;
  const sourceMatch = file.match(/[\\/]studios[\\/]([^\\/]+)[\\/]/);
  if (!sourceMatch) continue;
  const ownSlug = sourceMatch[1];
  const importPattern = /\b(?:from\s*|import\s*\()(['"])([^'"]+)\1/g;
  for (const match of source.matchAll(importPattern)) {
    const specifier = match[2];
    const targetMatch = specifier.match(/(?:^|\/)studios\/([^/]+)\//);
    if (targetMatch && targetMatch[1] !== ownSlug) {
      fail(path.relative(ROOT, file) + ': cross-Studio dependency on ' + targetMatch[1] + ' via ' + specifier);
    }
  }
}

console.log('\nStudio architecture verification: ' + checks.length + ' checks passed, ' + failures.length + ' failure(s).');
if (failures.length > 0) {
  console.error('VERIFICATION FAILED. No files were modified by this script.');
  process.exitCode = 1;
} else {
  console.log('VERIFICATION SOURCE CHECKS PASSED. This is not a runtime, browser, API, or regression test.');
}
