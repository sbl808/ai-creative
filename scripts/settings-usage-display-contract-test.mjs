#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const settingsPath = path.join(root, 'worker', 'src', 'frontend', 'settings.js');
const source = fs.readFileSync(settingsPath, 'utf8');

// The API intentionally no longer returns server-side usage counters.
// Never render missing counters as zero: that would misreport historical usage.
assert.doesNotMatch(source, /d\.usage\s*\|\|\s*\{\}/);
assert.doesNotMatch(source, /📊\s*အသုံးပြုမှု/);
assert.doesNotMatch(source, /ai_requests|image_generations|voice_generations/);

// Keep the account information that is still supplied by /api/users/me.
assert.match(source, /အီးမေးလ်/);
assert.match(source, /d\.plan/);
assert.match(source, /d\.user_id/);
assert.match(source, /d\.is_admin/);

console.log('Settings usage display contract passed ✔');
