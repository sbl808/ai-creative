import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { handleSubtitleStudioRoutes } from '../worker/src/routes/studios/subtitle.routes.js';

const cases = [
  {
    path: '/api/studio/subtitle/transcribe',
    body: { audioBase64: 'YXVkaW8=', apiKey: 'PRIVATE_TEST_KEY', type: '1' },
    feature: 'voice.transcribe',
    defaultType: '1',
    missingError: 'missing_audio',
  },
  {
    path: '/api/studio/subtitle/srt',
    body: { audioBase64: 'YXVkaW8=', apiKey: 'PRIVATE_TEST_KEY', type: '2', knownText: 'PRIVATE_TEXT' },
    feature: 'voice.srt',
    defaultType: '2',
    missingError: 'missing_audio',
  },
  {
    path: '/api/studio/subtitle/translate-srt',
    body: { srtText: 'PRIVATE_SRT', apiKey: 'PRIVATE_TEST_KEY', type: '3' },
    feature: 'voice.translate_srt',
    defaultType: '2',
    missingError: 'missing_srt',
  },
];

function request(path, body, { token = 'valid-test-token', rawBody } = {}) {
  return new Request('https://test.local' + path, {
    method: 'POST',
    headers: token ? { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' } : {
      'Content-Type': 'application/json',
    },
    body: rawBody ?? JSON.stringify(body),
  });
}

function dependencies(overrides = {}) {
  return {
    bearer: (req) => req.headers.get('Authorization')?.replace(/^Bearer\\s+/i, '') || '',
    verifyTokenSafe: async () => ({ sub: 'subtitle-route-test-user' }),
    json: (data, status = 200, cors = {}) => new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...cors },
    }),
    resolvePlan: async () => 'PRO',
    requireFeature: async () => null,
    friendlyError: () => 'safe error',
    ...overrides,
  };
}

for (const item of cases) {
  const unauthenticated = await handleSubtitleStudioRoutes(
    request(item.path, item.body, { token: '' }),
    {}, {}, dependencies(),
  );
  assert.equal(unauthenticated.status, 401, item.path + ' must require authentication');
  assert.equal((await unauthenticated.json()).error, 'unauthorized');

  const invalidToken = await handleSubtitleStudioRoutes(
    request(item.path, item.body),
    {}, {}, dependencies({ verifyTokenSafe: async () => null }),
  );
  assert.equal(invalidToken.status, 401, item.path + ' must reject invalid sessions');
  assert.equal((await invalidToken.json()).error, 'invalid_token');

  const missingInput = await handleSubtitleStudioRoutes(
    request(item.path, item.path.endsWith('/translate-srt') ? {} : { srtText: 'not audio' }),
    {}, {}, dependencies(),
  );
  assert.equal(missingInput.status, 400, item.path + ' must validate its required input');
  assert.equal((await missingInput.json()).error, item.missingError);
  assert.equal(missingInput.headers.get('Cache-Control'), 'no-store');

  const malformedJson = await handleSubtitleStudioRoutes(
    request(item.path, {}, { rawBody: '{invalid-json' }),
    {}, {}, dependencies(),
  );
  assert.equal(malformedJson.status, 400, item.path + ' must reject malformed JSON');
  assert.equal((await malformedJson.json()).error, item.missingError);

  let checkedFeature = '';
  let checkedType = '';
  const denied = await handleSubtitleStudioRoutes(
    request(item.path, item.body),
    {}, {}, dependencies({
      requireFeature: async (_env, feature, _plan, type) => {
        checkedFeature = feature;
        checkedType = type;
        return new Response(JSON.stringify({ error: 'feature_disabled' }), {
          status: 403,
          headers: { 'Cache-Control': 'no-store' },
        });
      },
    }),
  );
  assert.equal(denied.status, 403, item.path + ' must honor its feature gate');
  assert.equal(checkedFeature, item.feature);
  assert.equal(checkedType, item.body.type);
}

let defaultType = '';
const defaultTypeResponse = await handleSubtitleStudioRoutes(
  request('/api/studio/subtitle/srt', { audioBase64: 'YXVkaW8=' }),
  {}, {}, dependencies({
    requireFeature: async (_env, _feature, _plan, type) => {
      defaultType = type;
      return new Response(JSON.stringify({ error: 'feature_disabled' }), { status: 403 });
    },
  }),
);
assert.equal(defaultTypeResponse.status, 403);
assert.equal(defaultType, '2', 'SRT must retain its existing default type');

const unknownRoute = await handleSubtitleStudioRoutes(
  request('/api/studio/subtitle/unknown', {}),
  {}, {}, dependencies(),
);
assert.equal(unknownRoute, null, 'unknown Subtitle paths must not be claimed by this route handler');

const source = await readFile(
  new URL('../worker/src/routes/studios/subtitle.routes.js', import.meta.url),
  'utf8',
);
assert.match(source, /path === '\/api\/studio\/subtitle\/transcribe' && request\.method === 'POST'/);
assert.match(source, /path === '\/api\/studio\/subtitle\/srt' && request\.method === 'POST'/);
assert.match(source, /path === '\/api\/studio\/subtitle\/translate-srt' && request\.method === 'POST'/);
assert.match(source, /audioBase64:\s*body\.audioBase64/);
assert.match(source, /knownText:\s*typeof body\.knownText === 'string' \? body\.knownText : ''/);
assert.match(source, /srtText:\s*body\.srtText/);
assert.match(source, /direction:\s*body\.direction \|\| 'MY_TO_CN'/);
assert.match(source, /friendlyError\(e\)/);
assert.doesNotMatch(source, /console\.(?:log|error|warn)\s*\(/);

console.log('Subtitle Studio Route Contracts: PASS');
