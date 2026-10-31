#!/usr/bin/env node
/**
 * Storage Core assembly and compatibility contract.
 * Run: node --experimental-default-type=module scripts/indexeddb-storage-core-test.mjs
 */
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { sidebarScript } from '../worker/src/frontend/shared.js';
import { clientStorageScript } from '../worker/src/frontend/storage/client-storage.js';

const storageSource = clientStorageScript();
assert.match(storageSource, /indexedDB\.open\('aics_creations_v1', 1\)/);
assert.match(storageSource, /createObjectStore\('creations'/);
assert.match(storageSource, /function __aicsStorageError\(/);
assert.match(storageSource, /function __aicsRequireUserId\(/);
assert.match(storageSource, /window\.AICS_CREATIONS\s*=\s*\{/);
assert.match(storageSource, /save:\s*function/);
assert.match(storageSource, /list:\s*function/);
assert.match(storageSource, /remove:\s*function/);
assert.match(storageSource, /toggleFav:\s*function/);
new vm.Script(storageSource, { filename: 'client-storage.js' });
const assembled = sidebarScript();
assert.ok(assembled.includes(storageSource), 'sidebarScript must inject the Storage Core source');
assert.ok(assembled.includes('<script>'), 'sidebarScript must continue returning a script tag');
assert.ok(assembled.includes('window.AICS_CREATIONS'), 'legacy Creations API must remain available');
console.log('IndexedDB Storage Core tests passed.');
