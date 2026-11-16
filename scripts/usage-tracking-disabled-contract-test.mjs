import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const routeFiles = [
  'worker/src/routes/ideas.routes.js',
  'worker/src/routes/studio.routes.js',
  'worker/src/routes/studios/content.routes.js',
  'worker/src/routes/studios/image.routes.js',
  'worker/src/routes/studios/shop.routes.js',
  'worker/src/routes/studios/short.routes.js',
  'worker/src/routes/studios/story-video-plan.routes.js',
  'worker/src/routes/studios/story.routes.js',
  'worker/src/routes/studios/subtitle.routes.js',
  'worker/src/routes/studios/voice.routes.js',
];

for (const path of routeFiles) {
  const source = await readFile(new URL('../' + path, import.meta.url), 'utf8');
  assert.equal(source.includes('trackUsageSafe'), false, path + ' must not call server usage tracking');
}

const [entry, usage, users, settings] = await Promise.all([
  readFile(new URL('../worker/src/index.js', import.meta.url), 'utf8'),
  readFile(new URL('../worker/src/core/usage.js', import.meta.url), 'utf8'),
  readFile(new URL('../worker/src/routes/users.routes.js', import.meta.url), 'utf8'),
  readFile(new URL('../worker/src/frontend/settings.js', import.meta.url), 'utf8'),
]);

assert.equal(entry.includes('trackUsageSafe'), false, 'Worker entry must not inject usage tracking');
assert.equal(entry.includes("./core/usage.js"), false, 'Worker entry must not import D1 usage service');
assert.equal(/INSERT\\s+INTO\\s+usage/i.test(usage), false, 'Usage compatibility module must never write to D1');
assert.equal(usage.includes('env.DB'), false, 'Usage compatibility module must not access D1');
assert.equal(/FROM\\s+usage/i.test(users), false, 'User profile API must not read D1 usage records');
assert.equal(users.includes('usage, settings'), false, 'User profile API must not return server usage totals');
assert.equal(settings.includes('d.usage'), false, 'Settings UI must not render server usage totals');
assert.equal(settings.includes('📊 အသုံးပြုမှု'), false, 'Settings UI must not display D1 usage totals');

console.log('Usage tracking disabled contract: all checks passed.');
