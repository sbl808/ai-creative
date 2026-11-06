#!/usr/bin/env node
/**
 * AI Creative Studio V2 — browser-side script syntax check
 *
 * Extracts inline JavaScript from each assembled studio page and validates
 * every block independently. External scripts and non-JavaScript data blocks
 * are intentionally excluded.
 *
 * Run: node --experimental-default-type=module scripts/check-browser-scripts.mjs
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const STUDIOS = [
  { slug: 'story', exportName: 'STORY_HTML' },
  { slug: 'content', exportName: 'CONTENT_HTML' },
  { slug: 'short', exportName: 'SHORT_HTML' },
  { slug: 'image', exportName: 'IMAGE_HTML' },
  { slug: 'voice', exportName: 'VOICE_HTML' },
  { slug: 'shop', exportName: 'SHOP_HTML' },
  { slug: 'story-video-plan', exportName: 'STORY_VIDEO_PLAN_HTML' },
];

const SCRIPT_TAG_RE = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
const JS_TYPES = new Set([
  '',
  'text/javascript',
  'application/javascript',
  'text/ecmascript',
  'application/ecmascript',
  'module',
]);

function getAttribute(attributes, name) {
  const escapedName = name.replace(/[.*+?^\u0024{}()|[\]\\]/g, '\\$&');
  const match = attributes.match(
    new RegExp('(?:^|\\s)' + escapedName + '\\s*=\\s*(?:"([^"]*)"|\\'([^\\']*)\\'|([^\\s>]+))', 'i'),
  );
  return match ? (match[1] ?? match[2] ?? match[3] ?? '') : null;
}

function extractInlineJavaScript(html) {
  const scripts = [];
  for (const match of html.matchAll(SCRIPT_TAG_RE)) {
    const attributes = match[1] || '';
    const source = match[2] || '';
    const type = (getAttribute(attributes, 'type') || '').trim().toLowerCase();
    const externalSource = getAttribute(attributes, 'src');

    if (externalSource !== null || !JS_TYPES.has(type) || !source.trim()) continue;

    scripts.push({
      index: scripts.length,
      source,
      htmlLine: html.slice(0, match.index).split('\n').length,
    });
  }
  return scripts;
}

function getSyntaxLocation(diagnostic, temporaryFile) {
  const escapedPath = temporaryFile.replace(/[.*+?^\u0024{}()|[\]\\]/g, '\\$&');
  const match = diagnostic.match(new RegExp(escapedPath + ':(\\d+)(?::(\\d+))?'));
  return match
    ? { line: Number(match[1]), column: match[2] ? Number(match[2]) : null }
    : { line: null, column: null };
}

let checked = 0;
let failed = 0;
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'aics-browser-script-check-'));

try {
  for (const studio of STUDIOS) {
    const pagePath = path.join(ROOT, 'worker', 'src', 'frontend', 'studios', studio.slug, 'page.js');

    try {
      const moduleUrl = pathToFileURL(pagePath).href + '?syntax-check=' + Date.now();
      const pageModule = await import(moduleUrl);
      const html = pageModule[studio.exportName];

      if (typeof html !== 'string') {
        console.error('✘ ' + studio.slug + ': export ' + studio.exportName + ' is missing or not a string');
        failed++;
        continue;
      }

      const scripts = extractInlineJavaScript(html);
      if (scripts.length === 0) {
        console.error('✘ ' + studio.slug + ': no inline JavaScript script blocks found');
        failed++;
        continue;
      }

      for (const script of scripts) {
        const temporaryFile = path.join(
          temporaryDirectory,
          studio.slug + '-inline-' + script.index + '.js',
        );
        fs.writeFileSync(temporaryFile, script.source, 'utf8');
        checked++;

        try {
          execFileSync(
            process.execPath,
            ['--experimental-default-type=module', '--check', temporaryFile],
            { stdio: 'pipe' },
          );
          console.log(
            '✔ ' + studio.slug + ': inline script ' + script.index +
            ' valid (HTML line ' + script.htmlLine + ', ' + script.source.length + ' chars)',
          );
        } catch (error) {
          failed++;
          const diagnostic = String(error.stderr || error.message || 'Syntax check failed').trim();
          const location = getSyntaxLocation(diagnostic, temporaryFile);
          const sourceLocation = location.line === null
            ? 'JavaScript line unavailable'
            : 'JavaScript line ' + location.line +
              (location.column === null ? '' : ', column ' + location.column);
          console.error(
            '✘ ' + studio.slug + ': inline script ' + script.index +
            ' INVALID (' + sourceLocation + ', HTML line ' + script.htmlLine + ')',
          );
          console.error(diagnostic.slice(0, 1000));
        }
      }
    } catch (error) {
      failed++;
      console.error(
        '✘ ' + studio.slug + ': unable to load page module (' +
        String(error && error.name || 'Error') + ')',
      );
    }
  }
} finally {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
}

console.log(
  failed === 0
    ? '\nAll ' + checked + ' inline browser scripts syntactically valid ✔'
    : '\nFAILED: ' + failed + ' error(s) across ' + checked + ' inline browser script(s)',
);
if (failed > 0) process.exitCode = 1;
