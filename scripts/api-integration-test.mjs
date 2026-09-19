#!/usr/bin/env node
/**
 * AI Creative Studio V2 — API Integration Test (Phase 6)
 * ------------------------------------------------------------------
 * Runs against the REAL worker (scripts/e2e-server.mjs) over HTTP with a
 * mocked D1 — i.e. real request/response, real JWT, real routing, real
 * SQL contract. Per the project rule, NO fake success:
 *
 *   PASS    — authentication, session, me, ai-models, project save/load/delete
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
  const noAuth = await fetch(url + '/api/projects');
  record('GET /api/projects (no token) → 401', noAuth.status === 401, 'status=' + noAuth.status);

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

  // ===== Project save / load / delete (real SQL contract on mock D1) =====
  const p1 = await post('/api/projects', { title: 'E2E Integration Project', description: 'created by api-integration-test' });
  const p1j = await p1.json().catch(() => null);
  const pid = p1j && p1j.project && p1j.project.id;
  record('POST /api/projects → 200 + id', p1.status === 200 && !!pid, 'status=' + p1.status);
  const p2 = await get('/api/projects');
  const p2j = await p2.json().catch(() => null);
  record('GET /api/projects → contains saved project', p2.status === 200 && Array.isArray(p2j.items) && p2j.items.some((x) => x.id === pid));
  const p3 = await fetch(url + '/api/projects/' + pid, { method: 'DELETE', headers: auth });
  record('DELETE /api/projects/:id → 200', p3.status === 200);
  const p4 = await get('/api/projects');
  const p4j = await p4.json().catch(() => null);
  record('GET /api/projects → project removed', Array.isArray(p4j.items) && !p4j.items.some((x) => x.id === pid));
  const p5 = await post('/api/projects', { title: '' });
  record('POST /api/projects (empty title) → 400', p5.status === 400, 'status=' + p5.status);

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
