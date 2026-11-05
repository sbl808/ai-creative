import assert from 'node:assert/strict';
import vm from 'node:vm';
import { clientStorageScript } from '../worker/src/frontend/storage/client-storage.js';

const source = clientStorageScript();
assert.match(source, /indexedDB\.open\('aics_creations_v1', 6\)/);
assert.match(source, /version:\s*6/);
assert.match(source, /createObjectStore\('ideas',\s*\{\s*keyPath:\s*'id'\s*\}\)/);
assert.match(source, /createIndex\('ownerId',\s*'ownerId'/);
assert.match(source, /createIndex\('owner_category'/);
assert.match(source, /window\.AICS_IDEAS\s*=\s*\{/);
assert.match(source, /__aicsRequireUserId\(\)/);
assert.match(source, /__aicsOwnedStoreMutation\('ideas'/);
new vm.Script(source, { filename: 'client-storage.js' });
console.log('IndexedDB Idea Foundation tests passed.');
