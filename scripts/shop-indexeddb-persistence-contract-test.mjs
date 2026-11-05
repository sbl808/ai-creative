#!/usr/bin/env node
/**
 * Shop Studio IndexedDB draft migration and persistence wiring contract.
 * Run: node --experimental-default-type=module scripts/shop-indexeddb-persistence-contract-test.mjs
 */
import assert from 'node:assert/strict';
import { SHOP_HTML } from '../worker/src/frontend/studios/shop/page.js';

assert.match(SHOP_HTML, /window\.AICS_DRAFTS\.get\(SHELL_ID\)/,
  'Shop Studio must restore its owner-scoped IndexedDB draft');
assert.match(SHOP_HTML, /studio: SHELL_ID/,
  'Shared shell must save the current supported studio draft in IndexedDB');
assert.match(SHOP_HTML, /SHELL_ID !== "short" && SHELL_ID !== "shop"/,
  'Shared IndexedDB persistence must explicitly support Shop Studio');
assert.match(SHOP_HTML, /window\.studioPersistDraft\(false\)/,
  'Shop automatic draft saves must use IndexedDB');
assert.match(SHOP_HTML, /AICS_DRAFTS\.remove\(SHELL_ID\)/,
  'Confirmed Shop reset must remove its IndexedDB draft');
assert.match(SHOP_HTML, /localStorage\.getItem\(draftKey\)/,
  'Legacy Shop draft must remain readable for one-time migration');
assert.doesNotMatch(SHOP_HTML, /localStorage\.setItem\(['"]aics_draft_shop['"]/,
  'Shop Studio must not write new drafts to localStorage');

console.log('Shop Studio IndexedDB persistence contract tests passed.');
