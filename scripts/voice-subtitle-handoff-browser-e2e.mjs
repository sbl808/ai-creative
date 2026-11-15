#!/usr/bin/env node
/**
 * Voice → Subtitle IndexedDB handoff end-to-end browser test.
 * Uses synthetic audio and a mocked Subtitle transcription endpoint.
 * No real user media or AI provider is contacted.
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { chromium } from 'playwright';

const url = process.env.AICS_BASE_URL || 'http://127.0.0.1:8787';
const fakeAudio = Buffer.from('voice-subtitle-handoff-e2e-audio');
const audioBase64 = fakeAudio.toString('base64');
const transcript = 'Voice handoff browser test transcript';
let browser;

try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const email = 'voice-subtitle-handoff-' + randomUUID() + '@example.invalid';
  const signup = await page.request.post(url + '/api/auth/signup', {
    data: { name: 'Voice Subtitle Handoff E2E', email, password: 'local-e2e-password-2026' },
  });
  assert.equal(signup.status(), 201, 'Local E2E account should be created');
  const account = await signup.json();
  const token = String(account.token || '');
  assert.ok(token, 'Local signup should return a session token');
  await context.addCookies([{
    name: 'aics_token', value: token, url,
    httpOnly: true, secure: new URL(url).protocol === 'https:', sameSite: 'Lax',
  }]);
  await page.addInitScript((value) => {
    localStorage.setItem('aics_token', value);
    localStorage.setItem('aics_plan', 'PRO');
  }, token);

  const voiceResponse = await page.goto(url + '/app/voice', { waitUntil: 'domcontentloaded' });
  assert.equal(voiceResponse?.status(), 200, 'Voice Studio should load');
  await page.locator('#voiceWorkflowBody').waitFor({ state: 'attached' });

  await page.evaluate(({ data, mimeType }) => {
    // Seed a synthetic completed Voice result; no TTS provider is called.
    LAST_AUDIO = { base64: data, mime: mimeType, url: '' };
    VOICE_STATE.audioResult = { data, mimeType };
    VOICE_STATE.view = 'result';
    VOICE_STATE.resultKind = 'audio';
    VOICE_INPUTS.voice = 'Kore';
  }, { data: audioBase64, mimeType: 'audio/wav' });

  await page.evaluate(() => handoffVoiceAudioToSubtitle());
  await page.waitForURL('**/app/subtitle?handoff=*');
  await page.locator('#subtitleHandoffStatus').waitFor({ state: 'visible' });
  await page.waitForFunction(() =>
    document.getElementById('subtitleHandoffStatus')?.textContent.includes('အောက်ပါခလုတ်ကို နှိပ်ပါ'));
  assert.equal(await page.locator('#subtitleConnectVoiceHandoffBtn').isVisible(), true,
    'Voice connection must wait for explicit user confirmation');

  const handoffId = new URL(page.url()).searchParams.get('handoff');
  assert.ok(handoffId, 'Subtitle URL should contain the handoff ID');
  const stored = await page.evaluate(async (id) => {
    const handoff = await window.AICS_HANDOFFS.get(id);
    const draft = await window.AICS_STUDIO_DRAFTS.load('voice');
    return {
      handoff,
      audio: draft?.data?.data?.state?.audioResult,
      handoffHasAudioBytes: Object.prototype.hasOwnProperty.call(handoff?.payload || {}, 'audioBase64'),
    };
  }, handoffId);
  assert.equal(stored.handoff?.source, 'voice');
  assert.equal(stored.handoff?.target, 'subtitle');
  assert.equal(stored.handoff?.payload?.kind, 'voice-audio-reference');
  assert.equal(stored.handoff?.payload?.mimeType, 'audio/wav');
  assert.equal(stored.handoff?.payload?.voiceName, 'Kore');
  assert.equal(stored.audio?.data, audioBase64, 'Audio bytes should remain in the Voice IndexedDB draft');
  assert.equal(stored.handoffHasAudioBytes, false, 'Handoff record must not duplicate audio bytes');

  // Confirm the Voice draft is not loaded until the user clicks Connect.
  const loadSpy = await page.evaluate(() => {
    const repository = window.AICS_STUDIO_DRAFTS;
    const originalLoad = repository.load.bind(repository);
    const calls = [];
    window.__voiceDraftLoadCalls = calls;
    repository.load = function (studio) {
      calls.push(studio);
      return originalLoad(studio);
    };
    return calls;
  });
  assert.deepEqual(loadSpy, [], 'No Voice draft read should occur before explicit confirmation');
  await page.locator('#subtitleConnectVoiceHandoffBtn').click();
  await page.waitForFunction(() =>
    document.getElementById('subtitleHandoffStatus')?.textContent.includes('Voice မှ Audio ကို ချိတ်ဆက်ပြီးပါပြီ'));
  const connected = await page.evaluate(() => ({
    mediaInput: SUBTITLE_STATE.mediaInput,
    status: document.getElementById('subtitleHandoffStatus')?.textContent || '',
    loadCalls: window.__voiceDraftLoadCalls ? window.__voiceDraftLoadCalls.slice() : [],
  }));
  assert.equal(connected.mediaInput?.source, 'voice');
  assert.equal(connected.mediaInput?.audioBase64, audioBase64);
  assert.equal(connected.mediaInput?.mimeType, 'audio/wav');
  assert.deepEqual(connected.loadCalls, ['voice'], 'Voice Draft should load only after the Connect click');

  // Mock the Subtitle API so the test validates the actual request contract
  // without contacting Gemini or transmitting real user media.
  await page.evaluate(() => {
    window.AICS_BYOK = {
      withGeminiKey: async (body) => ({ ...body, apiKey: 'voice-subtitle-e2e-key' }),
    };
  });
  let transcriptionRequest;
  await page.route('**/api/studio/subtitle/transcribe', async route => {
    transcriptionRequest = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, text: transcript }),
    });
  });
  await page.locator('#subtitleTranscribeBtn').click();
  await page.waitForFunction(() =>
    document.getElementById('subtitleTranscriptOutput')?.value === 'Voice handoff browser test transcript');
  assert.equal(transcriptionRequest?.audioBase64, audioBase64,
    'Subtitle transcription must receive the verified Voice audio');
  assert.equal(transcriptionRequest?.mimeType, 'audio/wav');
  assert.equal(transcriptionRequest?.type, '1');
  assert.equal(transcriptionRequest?.apiKey, 'voice-subtitle-e2e-key');

  const after = await page.evaluate(async (id) => ({
    handoff: await window.AICS_HANDOFFS.get(id),
    draft: await window.AICS_STUDIO_DRAFTS.load('voice'),
  }), handoffId);
  assert.ok(after.handoff, 'Handoff record should remain available after transcription');
  assert.equal(after.draft?.data?.data?.state?.audioResult?.data, audioBase64,
    'Voice audio draft should remain unchanged after Subtitle transcription');

  console.log('Voice → Subtitle Handoff browser E2E passed (IndexedDB reference, explicit consent, verified audio, transcription request, retention).');
  await context.close();
} finally {
  if (browser) await browser.close();
}
