import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { handleShopStudioRoutes } from '../worker/src/routes/studios/shop.routes.js';

const cases = [
  {
    path: '/api/studio/shop/audio/tts',
    body: { text: 'private shop audio text' },
    feature: 'voice.tts',
    type: '1',
  },
  {
    path: '/api/studio/shop/audio/srt',
    body: { audioBase64: 'cHJpdmF0ZS1hdWRpbw==' },
    feature: 'voice.srt',
    type: '2',
  },
  {
    path: '/api/studio/shop/audio/translate-srt',
    body: { srtText: '1\\n00:00:00,000 --> 00:00:01,000\\nprivate subtitle' },
    feature: 'voice.translate_srt',
    type: '2',
  },
];

for (const item of cases) {
  const unauthenticated = await handleShopStudioRoutes(
    new Request('https://test.local' + item.path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item.body),
    }),
    {},
    {},
    {
      bearer: () => '',
      verifyTokenSafe: async () => null,
      json: (data, status) => new Response(JSON.stringify(data), { status }),
      resolvePlan: async () => 'PRO',
      requireFeature: async () => null,
      trackUsageSafe: async () => {},
      friendlyError: () => 'safe error',
    },
  );
  assert.equal(unauthenticated.status, 401, item.path + ' must require authentication');

  let checkedFeature = '';
  const denied = await handleShopStudioRoutes(
    new Request('https://test.local' + item.path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item.body),
    }),
    {},
    {},
    {
      bearer: () => 'test-token',
      verifyTokenSafe: async () => ({ sub: 'test-user' }),
      json: (data, status) => new Response(JSON.stringify(data), { status }),
      resolvePlan: async () => 'PRO',
      requireFeature: async (_env, feature, _plan, type) => {
        checkedFeature = feature + ':' + type;
        return new Response(JSON.stringify({ error: 'feature_disabled' }), { status: 403 });
      },
      trackUsageSafe: async () => {},
      friendlyError: () => 'safe error',
    },
  );
  assert.equal(denied.status, 403, item.path + ' must honor its feature gate');
  assert.equal(checkedFeature, item.feature + ':' + item.type);
}

const frontend = await readFile(
  new URL('../worker/src/frontend/studios/shop/audio.js', import.meta.url),
  'utf8',
);
assert.ok(frontend.includes('/api/studio/shop/audio/tts'));
assert.ok(frontend.includes('/api/studio/shop/audio/srt'));
assert.ok(frontend.includes('/api/studio/shop/audio/translate-srt'));
assert.equal(frontend.includes('/api/studio/voice/tts'), false);
assert.equal(frontend.includes('/api/studio/voice/srt'), false);
assert.equal(frontend.includes('/api/studio/voice/translate-srt'), false);

const subtitle = await readFile(new URL('../worker/src/studios/subtitle.js', import.meta.url), 'utf8');
const shopAudio = await readFile(new URL('../worker/src/studios/shop/audio.js', import.meta.url), 'utf8');
assert.ok(subtitle.includes("getCMSData(env, CMS_STUDIO, 'PRO', '3')"));
assert.ok(subtitle.includes('export async function buildVoiceSrtPrompt(env, knownText)'));
assert.ok(shopAudio.includes('buildVoiceSrtPrompt(env, input.knownText)'));
assert.ok(shopAudio.includes('generateShopSrtShared'));
assert.ok(shopAudio.includes('translateShopSrtShared'));

console.log('Shop Audio Route Contracts: PASS');
