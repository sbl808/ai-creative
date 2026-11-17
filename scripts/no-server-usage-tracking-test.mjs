import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const trackingFiles = [
  'worker/src/index.js',
  'worker/src/core/usage.js',
  'worker/src/routes/ideas.routes.js',
  'worker/src/routes/studio.routes.js',
  'worker/src/routes/studios/content.routes.js',
  'worker/src/routes/studios/story.routes.js',
  'worker/src/routes/studios/story-video-plan.routes.js',
  'worker/src/routes/studios/short.routes.js',
  'worker/src/routes/studios/image.routes.js',
  'worker/src/routes/studios/voice.routes.js',
  'worker/src/routes/studios/shop.routes.js',
];

for (const path of trackingFiles) {
  const source = await readFile(path, 'utf8');
  assert.doesNotMatch(source, /\btrackUsage(?:Safe)?\b/, 'Server-side usage tracking reference remains in ' + path);
}

const usersRoute = await readFile('worker/src/routes/users.routes.js', 'utf8');
assert.doesNotMatch(usersRoute, /FROM\s+usage\b|\busage\s*,/, 'User API must not read or return D1 usage summaries');

const adminApi = await readFile('worker/src/admin/api.js', 'utf8');
assert.doesNotMatch(adminApi, /FROM\s+usage\b|JOIN\s+users\s+u\s+ON\s+u\.id=us\.user_id|\/api\/admin\/usage/, 'Admin API must not expose server-side usage analytics');

const adminUi = await readFile('worker/src/admin/ui.js', 'utf8');
assert.doesNotMatch(adminUi, /tabUsage|usageView|loadUsage|ai_today|voice_today|image_today|\/api\/admin\/usage/, 'Admin UI must not show server-side usage analytics');

const settingsUi = await readFile('worker/src/frontend/settings.js', 'utf8');
assert.doesNotMatch(settingsUi, /d\.usage|ai_requests|image_generations|voice_generations/, 'User settings must not display server-side usage counts');

const workerEntry = await readFile('worker/src/index.js', 'utf8');
assert.match(workerEntry, /enforceSharedAiRateLimit/, 'Shared AI rate limiting must remain enabled');

const rateLimitSource = await readFile('worker/src/middleware/requestGuards.js', 'utf8');
assert.doesNotMatch(rateLimitSource, /api_generation_limits|env[.]DB[.]prepare/, 'AI generation rate limiting must not use D1');
assert.match(rateLimitSource, /AI_GENERATION_RATE_LIMITER/, 'Cloudflare AI generation rate limiter must remain enabled');

console.log('Server-side usage tracking and summaries are disabled; rate limiting remains enabled.');
