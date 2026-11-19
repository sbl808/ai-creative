import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const voiceRoutes = readFileSync(new URL('../worker/src/routes/studios/voice.routes.js', import.meta.url), 'utf8');
const workerIndex = readFileSync(new URL('../worker/src/index.js', import.meta.url), 'utf8');

const voiceEndpoints = [
  '/api/studio/voice/tts',
  '/api/studio/voice/transcribe',
  '/api/studio/voice/srt',
  '/api/studio/voice/translate-srt',
];

for (const endpoint of voiceEndpoints) {
  assert.ok(voiceRoutes.includes(endpoint), 'Voice endpoint is missing: ' + endpoint);
}

assert.doesNotMatch(
  voiceRoutes,
  /\btrackUsageSafe\b|\btrackUsage\s*\(/,
  'Voice Studio routes must not write server-side usage records',
);

const voiceRegistration = workerIndex
  .split('\n')
  .find(line => line.includes('handleVoiceStudioRoutes(request'));
assert.ok(voiceRegistration, 'Voice Studio route registration must exist');
assert.doesNotMatch(
  voiceRegistration,
  /\btrackUsageSafe\b/,
  'Voice Studio must not receive the server-side usage tracker dependency',
);

// This task is intentionally limited to Voice. Other Studios retain their current tracker dependency.
for (const routeName of [
  'handleContentStudioRoutes',
  'handleStoryStudioRoutes',
  'handleShortStudioRoutes',
  'handleImageStudioRoutes',
  'handleShopStudioRoutes',
]) {
  const registration = workerIndex
    .split('\n')
    .find(line => line.includes(routeName + '(request'));
  assert.ok(registration, routeName + ' registration must exist');
  assert.match(
    registration,
    /\btrackUsageSafe\b/,
    routeName + ' tracking dependency is outside this task scope',
  );
}

console.log('Voice server-side usage tracking contract tests passed.');
