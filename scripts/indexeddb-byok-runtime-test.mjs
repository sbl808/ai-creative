import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { byokRuntimeScript } from '../worker/src/frontend/storage/byok-runtime.js';

const runtime = byokRuntimeScript();
assert.match(runtime, /window\.AICS_BYOK/);
assert.match(runtime, /window\.AICS_API_KEYS\.save/);
assert.match(runtime, /window\.AICS_API_KEYS\.decrypt/);
assert.match(runtime, /window\.AICS_API_KEYS\.remove/);
assert.match(runtime, /fetch\('\/api\/users\/me'/);
assert.doesNotMatch(runtime, /localStorage\.setItem|sessionStorage|document\.cookie/);

const settings = await readFile(new URL('../worker/src/frontend/settings.js', import.meta.url), 'utf8');
const shared = await readFile(new URL('../worker/src/frontend/shared.js', import.meta.url), 'utf8');
assert.match(settings, /AICS_BYOK\.hasGemini/);
assert.match(settings, /AICS_BYOK\.withGeminiKey/);
assert.match(settings, /AICS_BYOK\.removeGemini/);
assert.doesNotMatch(settings, /\/api\/user\/apikey/);
assert.match(shared, /AICS_BYOK\.saveGemini/);
assert.doesNotMatch(shared, /\/api\/user\/apikey/);

console.log('IndexedDB BYOK runtime contract tests passed.');
