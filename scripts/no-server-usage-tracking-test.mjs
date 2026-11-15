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
  assert.doesNotMatch(source, /\btrackUsage(?:Safe)?\b/, \`Server-side usage tracking reference remains in \${path}\`);
}

const workerEntry = await readFile('worker/src/index.js', 'utf8');
assert.match(workerEntry, /enforceSharedAiRateLimit/, 'Shared AI rate limiting must remain enabled');

const rateLimitSource = await readFile('worker/src/middleware/requestGuards.js', 'utf8');
assert.match(rateLimitSource, /INSERT INTO api_generation_limits/, 'Generation rate-limit storage must remain intact');

console.log('Server-side usage tracking is disabled; shared AI rate limiting remains enabled.');
