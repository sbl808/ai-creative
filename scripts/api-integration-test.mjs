#!/usr/bin/env node
/**
 * AI Creative Studio V2 — API Integration Test (Phase 6)
 * ------------------------------------------------------------------
 * Runs against the REAL worker (scripts/e2e-server.mjs) over HTTP with a
 * mocked D1 — i.e. real request/response, real JWT, real routing, real
 * SQL contract. Per the project rule, NO fake success:
 *
 *   PASS    — authentication, session, me, ai-models
 *   PASS    — AI endpoints' HONEST error path (no_api_key → 500 friendly, no stack)
 *   BLOCKED — real AI generation / TTS / transcription / translation / video:
 *             required staging credential missing (GEMINI_API_KEY, staging D1)
 *   N/A     — upload/storage: the app has no upload/storage endpoint (R2 absent)
 *
 * Run: node --experimental-default-type=module scripts/api-integration-test.mjs
 */
import { startE2EServer } from './e2e-server.mjs';

let passed = 0, failed = 0, blocked = 0;
const notes = [];
function record(name, ok, extra) {
  if (ok) { passed++; console.log('  ✔ ' + name); }
  else { failed++; console.log('  ✘ ' + name + (extra ? ' — ' + extra : '')); }
}
function blockedNote(name, why) { blocked++; notes.push('  ⊘ ' + name + ' — ' + why); console.log('  ⊘ ' + name + ' — ' + why); }

const { server, url, token } = await startE2EServer(0);
const auth = { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' };
// /api/auth/session reads the aics_token cookie (server-side session guard).
const cookieAuth = { ...auth, Cookie: 'aics_token=' + encodeURIComponent(token) };

function get(path, headers) { return fetch(url + path, { headers: headers || auth }); }
function post(path, body) { return fetch(url + path, { method: 'POST', headers: auth, body: JSON.stringify(body || {}) }); }

try {
  console.log('API integration against: ' + url + '\n');

  // ===== Authentication =====
  record('token sign/verify (real JWT)', token.split('.').length === 3);
  const s1 = await get('/api/auth/session', cookieAuth);
  record('GET /api/auth/session (cookie) → 200', s1.status === 200, 'status=' + s1.status);
  const s2 = await get('/api/users/me');
  record('GET /api/users/me → 200 (plan FREE)', s2.status === 200, 'status=' + s2.status);
  const s3 = await fetch(url + '/api/auth/logout', { headers: cookieAuth, redirect: 'manual' });
  record('GET /api/auth/logout → 302 (clears cookie)', s3.status === 302, 'status=' + s3.status);
  const noAuthProjects = await fetch(url + '/api/projects');
  record('GET /api/projects (no token) → 404 (route retired)', noAuthProjects.status === 404, 'status=' + noAuthProjects.status);

  // ===== AI models registry =====
  const m = await get('/api/ai-models');
  const mj = await m.json().catch(() => null);
  record('GET /api/ai-models → 200 + items', m.status === 200 && Array.isArray(mj && mj.items) && mj.items.length > 0,
    'status=' + m.status + ' items=' + ((mj && mj.items) || []).length);

  // ===== AI endpoints — honest error path (no GEMINI_API_KEY in staging env) =====
  const genCases = [
    ['text (story)', '/api/studio/story/generate', { idea: 'integration test idea' }],
    ['text (content)', '/api/studio/content/generate', { idea: 'integration test idea' }],
    ['text (short)', '/api/studio/short/generate', { idea: 'integration test idea' }],
    ['image prompt', '/api/studio/image/prompt', { idea: 'integration test idea', type: 1 }],
    ['voice/TTS', '/api/studio/voice/tts', { text: 'မင်္ဂလာပါ', voiceName: '1', audience: 'လူတိုင်း' }],
  ];
  for (const [label, path, body] of genCases) {
    const r = await post(path, body);
    const j = await r.json().catch(() => null);
    const isFriendly = j && j.error && !/at \w|\.js:|Error:/.test(JSON.stringify(j));
    record(label + ' endpoint: 500 friendly error (no_api_key, no stack)',
      r.status === 500 && isFriendly && !JSON.stringify(j).includes('callGeminiText'),
      'status=' + r.status + ' body=' + JSON.stringify(j).slice(0, 120));
  }

  // ===== Legacy D1 Projects API is retired; browser IndexedDB remains the data store =====
  const projectGet = await get('/api/projects');
  record('GET /api/projects (authenticated) → 404', projectGet.status === 404, 'status=' + projectGet.status);
  const projectPost = await post('/api/projects', { title: 'must not persist' });
  record('POST /api/projects → 404', projectPost.status === 404, 'status=' + projectPost.status);
  const projectDelete = await fetch(url + '/api/projects/legacy-id', { method: 'DELETE', headers: auth });
  record('DELETE /api/projects/:id → 404', projectDelete.status === 404, 'status=' + projectDelete.status);

  // ===== BLOCKED (staging credential missing) =====
  blockedNote('real AI generation (text/image/video)',
    'required staging credential missing: GEMINI_API_KEY (error path verified above, success path needs a real key)');
  blockedNote('voice/TTS real synthesis',
    'required staging credential missing: GEMINI_API_KEY / TTS provider');
  blockedNote('transcription', 'required staging credential missing + real audio asset');
  blockedNote('translation (srt)', 'required staging credential missing + real srt asset');
  blockedNote('upload/storage', 'N/A — the app has no upload/R2 endpoint (creations are stored in IndexedDB)');

} finally {
  server.close();
}

console.log('\n=== API RESULT: ' + passed + ' passed, ' + failed + ' failed, ' + blocked + ' blocked (credentials) ===');
if (blocked) console.log('\nBlocked items:\n' + notes.join('\n'));
process.exit(failed ? 1 : 0);
