import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const api = readFileSync(new URL('../worker/src/admin/api.js', import.meta.url), 'utf8');
const ui = readFileSync(new URL('../worker/src/admin/ui.js', import.meta.url), 'utf8');

assert.equal(api.includes("SELECT COUNT(*) AS c FROM projects"), false);
assert.equal(api.includes("projects: (projects && projects.c) || 0"), false);
assert.equal(ui.includes("'Projects','Saved projects','projects'"), false);
assert.equal(api.includes("SELECT COUNT(*) AS c FROM users"), true);
assert.equal(api.includes("SELECT COUNT(*) AS c FROM users WHERE plan='PRO'"), true);

console.log('Admin Dashboard IndexedDB boundary contract: passed');
