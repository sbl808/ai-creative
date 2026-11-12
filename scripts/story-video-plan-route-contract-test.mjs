import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { handleStoryVideoPlanRoutes } from '../worker/src/routes/studios/story-video-plan.routes.js';

const cases = [
  {
    path: '/api/studio/story/video',
    body: { story: 'A story for video planning' },
    feature: 'story.video',
  },
  {
    path: '/api/studio/story/video-image',
    body: { prompt: 'A cinematic forest scene' },
    feature: 'story.video_image',
  },
];

function request(path, body) {
  return new Request('https://test.local' + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function dependencies(overrides = {}) {
  return {
    bearer: (req) => req.headers.get('Authorization')?.replace(/^Bearer\\s+/i, '') || '',
    verifyTokenSafe: async () => ({ sub: 'story-route-test-user' }),
    json: (data, status) => new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
    resolvePlan: async () => 'PRO',
    requireFeature: async () => null,
    trackUsageSafe: async () => {},
    friendlyError: () => 'safe error',
    ...overrides,
  };
}

for (const item of cases) {
  const unauthenticated = await handleStoryVideoPlanRoutes(
    request(item.path, item.body), {}, {}, dependencies({ bearer: () => '' }),
  );
  assert.equal(unauthenticated.status, 401, item.path + ' must require authentication');
  assert.equal((await unauthenticated.json()).error, 'unauthorized');

  let checkedFeature = '';
  let checkedType = '';
  const denied = await handleStoryVideoPlanRoutes(
    request(item.path, item.body), {}, {},
    dependencies({
      requireFeature: async (_env, feature, _plan, type) => {
        checkedFeature = feature;
        checkedType = type;
        return new Response(JSON.stringify({ error: 'feature_disabled' }), { status: 403 });
      },
    }),
  );
  assert.equal(denied.status, 403, item.path + ' must honor its feature gate');
  assert.equal(checkedFeature, item.feature);
  assert.equal(checkedType, '1');
}

const route = await readFile(
  new URL('../worker/src/routes/studios/story-video-plan.routes.js', import.meta.url),
  'utf8',
);
assert.match(route, /return json\\(\\{ ok: true, data: out\\.data, mimeType: out\\.mimeType \\}, 200, cors\\)/);
assert.match(route, /return json\\(\\{ error: 'image_error', detail: friendlyError\\(e\\) \\}, 500, cors\\)/);
assert.match(route, /path === '\\/api\\/studio\\/story\\/video-image'/);
assert.match(route, /requireFeature\\(env, 'story\\.video_image', plan, '1', cors\\)/);

console.log('Story Video Plan Route Contracts: PASS');
