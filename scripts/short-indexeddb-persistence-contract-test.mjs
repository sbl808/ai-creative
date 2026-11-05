#!/usr/bin/env node
/**
 * Short Studio IndexedDB draft migration and persistence wiring contract.
 * Run: node --experimental-default-type=module scripts/short-indexeddb-persistence-contract-test.mjs
 */
import assert from 'node:assert/strict';
import { SHORT_HTML } from '../worker/src/frontend/studios/short/page.js';

assert.match(SHORT_HTML, /window\.AICS_DRAFTS\.get\("short"\)/,
  'Short Studio must restore its draft from the owner-scoped IndexedDB repository');
assert.match(SHORT_HTML, /window\.AICS_DRAFTS\.save\(\{[\s\S]*?studio: SHELL_ID/,
  'Short Studio must save its draft to IndexedDB');
assert.match(SHORT_HTML, /imgCache:imgCache/,
  'Short draft must persist the image cache together with the draft');
assert.match(SHORT_HTML, /function autoSave\(\)\{\s*if\(window\.studioPersistDraft\)window\.studioPersistDraft\(false\);/,
  'automatic draft saves must use the IndexedDB persistence path');
assert.match(SHORT_HTML, /function autoSaveImgCache\(\)\{\s*if\(window\.studioPersistDraft\)window\.studioPersistDraft\(false\);/,
  'image cache changes must use the IndexedDB persistence path');
assert.match(SHORT_HTML, /aics_draft_short_imgcache/,
  'legacy image cache key must remain readable for migration');
assert.doesNotMatch(SHORT_HTML, /localStorage\.setItem\(['"]aics_draft_short(?:_imgcache)?['"]/,
  'Short Studio must not write new user draft data to localStorage');
assert.match(SHORT_HTML, /localStorage\.getItem\(draftKey\)/,
  'legacy draft must remain available for migration');
assert.match(SHORT_HTML, /AICS_DRAFTS\.remove\("short"\)/,
  'confirmed Short reset must remove the IndexedDB draft');

console.log('Short Studio IndexedDB persistence contract tests passed.');
